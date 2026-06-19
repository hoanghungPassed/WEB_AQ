export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { paginate } from "@/lib/pagination";
import { CreateTaskSchema, sanitizeXSS } from "@/lib/validation";
import { sendTaskEmail } from "@/lib/email";
import { pusherServer } from "@/lib/pusher";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const assigneeId = searchParams.get("assigneeId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    const userRole = req.headers.get("x-user-role");
    // Strictly scope tasks for Staff (role other than 01, 02, 03)
    const isStaff = !["01", "02", "03"].includes(userRole || "");

    const filter: any = {};
    if (isStaff) {
      filter.assigneeId = userId;
    } else if (assigneeId && assigneeId !== "ALL") {
      filter.assigneeId = assigneeId;
    }
    
    if (status && status !== "ALL") filter.status = status;

    const today = searchParams.get("today");
    if (today === "true") {
      const now = new Date();
      const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
      
      // Get Start of Day VN (00:00:00) in UTC
      vnTime.setUTCHours(0, 0, 0, 0);
      const todayStart = new Date(vnTime.getTime() - (7 * 60 * 60 * 1000));
      
      // Get End of Day VN (23:59:59) in UTC
      vnTime.setUTCHours(23, 59, 59, 999);
      const todayEnd = new Date(vnTime.getTime() - (7 * 60 * 60 * 1000));

      filter.createdAt = {
        $gte: todayStart,
        $lte: todayEnd
      };
    }

    // Fallback: If no pagination params are provided, return the whole dataset (backward compatibility)
    if (!searchParams.has("page") && !searchParams.has("limit") && searchParams.get("all") !== "true") {
      const tasks = await Task.find(filter)
        .populate("assigneeId", "name username role email")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .lean();
      return NextResponse.json({ success: true, data: tasks });
    }

    const query = Task.find(filter).populate("assigneeId", "name username role email");
    const result = await paginate(query, page, limit, sortBy, sortOrder);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "tasks"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_CREATE_TASK", "tasks", {}, req);
      return NextResponse.json({ error: "Không có quyền giao việc" }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();

    // Validate body using Zod CreateTaskSchema
    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map(e => ({
            field: e.path.join("."),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Sanitize string inputs to prevent XSS
    data.title = sanitizeXSS(data.title);
    if (data.note) data.note = sanitizeXSS(data.note);
    if (data.mailRange) data.mailRange = sanitizeXSS(data.mailRange);
    if (data.batch) data.batch = sanitizeXSS(data.batch);
    if (data.range) data.range = sanitizeXSS(data.range);
    if (data.assigneeName) data.assigneeName = sanitizeXSS(data.assigneeName);

    const task = await Task.create({
      ...data,
      createdBy: userId || "system"
    } as any);

    // Automatically update the assigned mails in the DB based on the task type
    if (data.mailIds && data.mailIds.length > 0) {
      try {
        let MailModel: any;
        if (data.type === 'MAIL_GOC') {
          MailModel = (await import('@/models/RootMail')).RootMail;
        } else if (data.type === 'MAIL_MONETIZED') {
          MailModel = (await import('@/models/MonetizedMail')).MonetizedMail;
        } else {
          MailModel = (await import('@/models/SatelliteMail')).SatelliteMail;
        }

        const User = (await import("@/models/User")).default;
        const assigneeUser = await User.findById(data.assigneeId);
        const staffName = assigneeUser ? assigneeUser.name : "Nhân viên";

        const BatchModel = (await import("@/models/Batch")).default;
        const batchDoc = data.batch ? await BatchModel.findOne({ name: data.batch }).lean() : null;
        const finalBatchId = batchDoc ? batchDoc._id : undefined;
        const finalBatchName = batchDoc ? batchDoc.name : (data.batch || undefined);

        await MailModel.updateMany(
          { _id: { $in: data.mailIds } },
          {
            $set: {
              isAssigned: true,
              assignedTo: staffName,
              assigneeId: data.assigneeId,
              assignee: data.assigneeId,
              batchId: finalBatchId,
              batchName: finalBatchName
            }
          }
        );
      } catch (mailUpdateErr) {
        console.error("Failed to automatically update mails on task creation:", mailUpdateErr);
      }
    }

    // Create Notification and Trigger Pusher
    try {
      const { Notification } = await import("@/models/Notification");
      const User = (await import("@/models/User")).default;
      const assignee = await User.findById(data.assigneeId);
      
      const newNotif: any = await Notification.create({
        type: "TASK",
        title: "Nhiệm vụ mới",
        message: `Bạn được giao một công việc mới: ${task.title}`,
        recipientId: assignee?._id,
        author: userId || undefined,
        isRead: false
      });

      await pusherServer.trigger("system-notifications", "new-notification", {
        ...newNotif.toObject(),
        time: new Date().toLocaleTimeString("vi-VN") + " - " + new Date().toLocaleDateString("vi-VN")
      });

      // Trigger new-task on private channel of the assignee
      await pusherServer.trigger(`user-${data.assigneeId}`, "new-task", {
        taskId: task._id,
        title: "Nhiệm vụ mới",
        message: `Bạn được giao một công việc mới: ${task.title}`
      });
      
      // Luồng 2: Trigger for admin task list UI to update
      await pusherServer.trigger('system', 'task-list-updated', {});
    } catch (notifErr) {
      console.error("Task Notification error:", notifErr);
    }

    // Send task assignment email (fire-and-forget)
    try {
      const User = (await import("@/models/User")).default;
      const assignee = await User.findById(data.assigneeId).select("name email");
      if (assignee?.email) {
        sendTaskEmail(assignee.email, assignee.name || "Nhân viên", data.title, data.deadline || new Date(), data.note || "").catch(console.error);
      }
    } catch (_) {}
    
    try {
      const { logAction } = await import('@/lib/logger');
      await logAction("system", `Phân công nhiệm vụ mới: ${(task as any).title}`, `Phân công công việc.`);
    } catch (logErr) {
      console.error("Log error:", logErr);
    }

    await logAuditTrail(userId || "system", "CREATE_TASK_SUCCESS", "tasks", { taskId: (task as any)._id, title: (task as any).title }, req);

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
