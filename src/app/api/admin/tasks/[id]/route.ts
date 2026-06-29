import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Task } from "@/models/Task";
import User from "@/models/User";
import { RootMail } from "@/models/RootMail";
import { MonetizedMail } from "@/models/MonetizedMail";
import { SatelliteMail } from "@/models/SatelliteMail";
import { SyncStore } from "@/models/SyncStore";
import { Kpi } from "@/models/Kpi";
import { Notification } from "@/models/Notification";
import { Fine } from "@/models/Fine";
import { logAction } from "@/lib/logger";
import { pusherServer } from "@/lib/pusher";
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { UpdateTaskSchema, sanitizeXSS } from "@/lib/validation";
import { sendTaskEmail, sendFineEmail } from "@/lib/email";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { id } = await params;
    const oldTask = await Task.findById(id);
    if (!oldTask) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    const hasManagerPermission = await checkPermission(userRole || "", 3, ["all", "tasks"]);
    if (!hasManagerPermission) {
      // Staff (level < 3) can only update status of their own task
      const isAssignedToUser = oldTask.assigneeId?.toString() === userId;
      if (!isAssignedToUser) {
        await logAuditTrail(userId || "unknown", "UNAUTHORIZED_TASK_EDIT_PEER", "tasks", { taskId: id }, req);
        return NextResponse.json({ error: "Không có quyền chỉnh sửa task của người khác" }, { status: 403 });
      }
      
      // Check if they are trying to edit fields other than 'status'
      const allowedFields = ["status"];
      const updatedFields = Object.keys(body);
      const hasDisallowedFields = updatedFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        await logAuditTrail(userId || "unknown", "UNAUTHORIZED_TASK_FIELDS_EDIT", "tasks", { taskId: id, updatedFields }, req);
        return NextResponse.json({ error: "Không có quyền thay đổi thông tin hành chính của task" }, { status: 403 });
      }
    }

    // Validate request body
    const parsed = UpdateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dữ liệu không hợp lệ",
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
    if (data.title) data.title = sanitizeXSS(data.title);
    if (data.note) data.note = sanitizeXSS(data.note);
    if (data.mailRange) data.mailRange = sanitizeXSS(data.mailRange);
    if (data.batch) data.batch = sanitizeXSS(data.batch);
    if (data.range) data.range = sanitizeXSS(data.range);
    if (data.assigneeName) data.assigneeName = sanitizeXSS(data.assigneeName);

    // Strictly enforce ownership for Staff roles
    const isStaff = userRole === "03" || userRole === "04" || userRole === "05";

    // --- BẮT ĐẦU KIỂM TRA ĐIỀU KIỆN HOÀN THÀNH (SERVER-SIDE VALIDATION) ---
    if (body.status === 'COMPLETED' && oldTask.status !== 'COMPLETED') {
      // Race Condition Protection: Only allow completing if it's currently PENDING or IN_PROGRESS
      if ((oldTask.status as string) === 'FAILED' || (oldTask.status as string) === 'CANCELLED') {
        return NextResponse.json({ error: "Task này đã bị hủy hoặc thu hồi trước đó." }, { status: 400 });
      }

      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
      
      if ((oldTask.type as string) === 'MAIL_VE_TINH' || (oldTask.type as string) === 'SATELLITE') {
        const MailModel = SatelliteMail;

        const batchIdentifier = oldTask.batch || (oldTask as any).batchName || (oldTask as any).batchId;
        let mailsToCheck: any[] = [];

        if (batchIdentifier) {
          mailsToCheck = await MailModel.find({ 
            $or: [{ batchName: batchIdentifier }, { batchId: batchIdentifier }, { batch: batchIdentifier }] 
          });
        } else if (oldTask.mailIds && oldTask.mailIds.length > 0) {
          mailsToCheck = await MailModel.find({ _id: { $in: oldTask.mailIds } });
        }

        if (mailsToCheck.length > 0) {
          const incompleteMails = mailsToCheck.filter((m: any) => {
            const links = m.links || [];
            const validLinks = links.filter((l: any) => typeof l === 'string' && l.trim() !== "");
            return validLinks.length < 3;
          });

          if (incompleteMails.length > 0) {
            return NextResponse.json({ 
              error: `KHÔNG THỂ HOÀN THÀNH: Còn ${incompleteMails.length} mail chưa đủ 3 link kênh. Vui lòng kiểm tra lại.` 
            }, { status: 400 });
          }

          const hasInvalidLinks = mailsToCheck.some((m: any) => 
            (m.links || []).some((l: any) => l && l.trim() !== "" && !youtubeRegex.test(l))
          );
          if (hasInvalidLinks) {
            return NextResponse.json({ 
              error: "KHÔNG THỂ HOÀN THÀNH: Có link kênh không đúng định dạng YouTube." 
            }, { status: 400 });
          }
        }
      }
    }
    // --- KẾT THÚC KIỂM TRA ĐIỀU KIỆN HOÀN THÀNH ---
    
    let task;
    if (isStaff) {
      // Find one that matches BOTH id and assigneeId
      task = await Task.findOneAndUpdate(
        { _id: id, assigneeId: userId },
        data,
        { new: true, runValidators: true }
      );
      if (!task) {
        // Either task doesn't exist OR it's not assigned to them
        await logAuditTrail(userId || "unknown", "UNAUTHORIZED_TASK_UPDATE_ATTEMPT", "tasks", { taskId: id }, req);
        return NextResponse.json({ error: "Nhiệm vụ không tồn tại hoặc bạn không có quyền cập nhật" }, { status: 403 });
      }
    } else {
      // Admin/Manager can update any task
      task = await Task.findByIdAndUpdate(id, data, { new: true, runValidators: true });
      if (!task) {
        return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
      }
    }

  // If assignee changed, notify new assignee via email and update associated email documents
  if (data.assigneeId && data.assigneeId.toString() !== oldTask.assigneeId?.toString()) {
    try {
      const newAssignee = await User.findById(data.assigneeId);
      if (newAssignee) {
        if (newAssignee.email) {
          sendTaskEmail(newAssignee.email, newAssignee.name || "Nhân viên", task.title || "", task.deadline || new Date(), task.note || "").catch(console.error);
        }
        
        // Sync associated mail documents with the new assignee
        if (task.mailIds && task.mailIds.length > 0) {
          let MailModel: any;
          if (task.type === 'MAIL_GOC') {
            MailModel = RootMail;
          } else if (task.type === 'MAIL_MONETIZED') {
            MailModel = MonetizedMail;
          } else {
            MailModel = SatelliteMail;
          }

          await MailModel.updateMany(
            { _id: { $in: task.mailIds } },
            {
              $set: {
                assignedTo: newAssignee.name,
                assigneeId: data.assigneeId,
                assignee: data.assigneeId
              }
            }
          );
        }
      }
    } catch (syncErr) {
      console.error("Failed to sync new assignee and emails:", syncErr);
    }
  }

 try {
 await logAction("system", `Cập nhật nhiệm vụ: ${task.title || id}`, `Cập nhật trạng thái/chi tiết nhiệm vụ.`);
 
  // Auto-update KPI & Mail status if transitioning to COMPLETED
  if (body.status === 'COMPLETED' && oldTask.status !== 'COMPLETED') {
    try {
      try {
        await pusherServer.trigger("private-system", "task-updated", {
          taskId: task._id,
          status: "COMPLETED",
          assigneeId: task.assigneeId
        });
      } catch (pushErr) {
        console.error("Task updated Pusher trigger error:", pushErr);
      }
      // 1. Cập nhật Mail thành USED và Đã làm cho toàn bộ lô/dải
      try {
        let MailModel: any;
        if (task.type === 'MAIL_GOC') {
          MailModel = RootMail;
        } else if (task.type === 'MAIL_MONETIZED') {
          MailModel = MonetizedMail;
        } else {
          MailModel = SatelliteMail;
        }
        
        // Find batch associated with this task
        const batchIdentifier = task.batch || (task as any).batchName || (task as any).batchId;
        
        if (batchIdentifier) {
          // Update entire batch
          await MailModel.updateMany(
            { 
              $or: [
                { batchName: batchIdentifier },
                { batchId: batchIdentifier },
                { batch: batchIdentifier }
              ]
            },
            { 
              $set: { 
                status: 'USED',
                workStatus: 'Đã làm',
                updatedBy: 'System (Task Completed)'
              } 
            }
          );
        }

        // Individual updates if mailIds were specified
        if (task.mailIds && task.mailIds.length > 0) {
          await MailModel.updateMany(
            { _id: { $in: task.mailIds } },
            { $set: { status: 'USED', workStatus: 'Đã làm' } }
          );
        }
      } catch (mailErr) {
        console.error("Lỗi cập nhật trạng thái Mail:", mailErr);
      }

      // 2. Update Global KPI in SyncStore
      try {
        const syncKpi = await SyncStore.findOne({ key: 'global_kpi_data' });
        if (syncKpi) {
          const kpiData = JSON.parse(syncKpi.value || '{}');
          if (task.mailType === 'MONETIZED') {
            kpiData.currentMonetized = Math.min(kpiData.targetMonetized || 0, (kpiData.currentMonetized || 0) + 1);
          } else {
            kpiData.currentWatchHours = Math.min(kpiData.targetWatchHours || 0, (kpiData.currentWatchHours || 0) + 1);
          }
          syncKpi.value = JSON.stringify(kpiData);
          await syncKpi.save();
        }
      } catch (syncKpiErr) {
        console.error("Lỗi cập nhật Global KPI:", syncKpiErr);
      }

      // 3. Cập nhật KPI cá nhân (Tăng completedChannels & eligibleChannels)
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const userKpi = await Kpi.findOne({ userId: task.assigneeId, date: today });
        if (!userKpi) {
          await Kpi.create({
            userId: task.assigneeId,
            date: today,
            completedChannels: 0,
            eligibleChannels: 0,
            targetChannels: 50,
            fineAmount: 0
          });
        }

        const channelsCount = task.mailCount || (task.mailIds ? task.mailIds.length : 0) || 1;
        await Kpi.findOneAndUpdate(
          { userId: task.assigneeId, date: today },
          { $inc: { eligibleChannels: channelsCount, completedChannels: channelsCount } },
          { new: true }
        );
      } catch (kpiErr) {
        console.error("Lỗi tự động cập nhật KPI:", kpiErr);
      }

      // 4. Thông báo cho Admin và Quản lý
      try {
        // Find all admins and managers
        const admins = await User.find({ role: { $in: ['01', '02'] } }).select('_id');
        const staffName = task.assigneeName || "Nhân viên";
        const batchName = task.batch || task.batchName || "Lô mail";

        const adminNotifications = admins.map(admin => ({
          title: "Hoàn thành nhiệm vụ",
          message: `Nhân viên ${staffName} vừa hoàn thành ${batchName}.`,
          type: "SUCCESS",
          recipientId: admin._id,
          isRead: false
        }));

        if (adminNotifications.length > 0) {
          await Notification.insertMany(adminNotifications);
        }
      } catch (notifErr) {
        console.error("Lỗi gửi thông báo cho Admin:", notifErr);
      }
    } catch (err) {
      console.error("Lỗi đồng bộ Task -> Mail -> KPI:", err);
    }
  }

 // Check if COMPLETED but overdue
 if (body.status === 'COMPLETED' && task.deadline) {
 const now = new Date();
 const deadlineDate = new Date(task.deadline);
 // Compare dates (end of day if no time specified)
 if (now > deadlineDate && now.getDate() !== deadlineDate.getDate()) {
 
 // Check if fine already exists
 const existingFine = await Fine.findOne({ userId: task.assigneeId, reason: `Hoàn thành trễ hạn Task: ${task.title || id}` });
 if (!existingFine) {
 await Fine.create({
 userId: task.assigneeId,
 amount: 50000,
 reason: `Hoàn thành trễ hạn Task: ${task.title || id}`,
 status: 'UNPAID'
 });

  try {
     await pusherServer.trigger("private-system", "new-fine", {
      userId: task.assigneeId,
      amount: 50000,
      reason: `Hoàn thành trễ hạn Task: ${task.title || id}`
    });
  } catch (pushErr) {}

// Send overdue fine email notification (fire-and-forget)
try {
  const overdueUser = await User.findById(task.assigneeId).select("name email");
  if (overdueUser?.email) {
    sendFineEmail(overdueUser.email, overdueUser.name || "Nhân viên", 50000, `Hoàn thành trễ hạn Task: ${task.title || id}`).catch(console.error);
  }
} catch (_) {}

 await Notification.create({
 recipientId: task.assigneeId,
 title:"Phạt Trễ Hạn",
 message: `Bạn bị phạt 50.000đ do hoàn thành trễ hạn nhiệm vụ: ${task.title || id}.`,
 type:"WARNING"
 });
 }
 }
 }
 } catch (logErr) {
 console.error("Log error:", logErr);
 }
  await logAuditTrail(userId || "system", "UPDATE_TASK_SUCCESS", "tasks", { taskId: task._id, title: task.title, status: task.status }, req);

  return NextResponse.json({ success: true, data: task });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
 }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 try {
  const { id } = await params;
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  const hasPermission = await checkPermission(userRole || "", 3, ["all", "tasks"]);
  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_DELETE_TASK", "tasks", { taskId: id }, req);
    return NextResponse.json({ error: "Không có quyền xóa nhiệm vụ" }, { status: 403 });
  }

  await dbConnect();
  const task = await Task.findByIdAndDelete(id);
  if (!task) {
    return NextResponse.json({ success: false, error:"Task not found" }, { status: 404 });
  }

  // Revert mail assignment status back to false
  if (task.mailIds && task.mailIds.length > 0) {
    try {
      let MailModel: any;
      if (task.type === 'MAIL_GOC') {
        MailModel = RootMail;
      } else if (task.type === 'MAIL_MONETIZED') {
        MailModel = MonetizedMail;
      } else {
        MailModel = SatelliteMail;
      }

      await MailModel.updateMany(
        { _id: { $in: task.mailIds } },
        {
          $set: {
            isAssigned: false,
            assignedTo: null,
            assigneeId: null,
            assignee: null,
            batchId: null,
            batchName: null
          }
        }
      );
    } catch (mailRevertErr) {
      console.error("Failed to unassign mails on task deletion:", mailRevertErr);
    }
  }
  try {
  await logAction("system", `Xóa nhiệm vụ: ${task.title || id}`, `Đã xóa nhiệm vụ.`);
  } catch (logErr) {
  console.error("Log error:", logErr);
  }

  await logAuditTrail(userId || "system", "DELETE_TASK_SUCCESS", "tasks", { taskId: id, title: task.title }, req);

  return NextResponse.json({ success: true, data: {} });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
 }
}
