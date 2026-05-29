import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Task } from "@/models/Task";
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
    if (data.title) data.title = sanitizeXSS(data.title);
    if (data.note) data.note = sanitizeXSS(data.note);
    if (data.mailRange) data.mailRange = sanitizeXSS(data.mailRange);
    if (data.batch) data.batch = sanitizeXSS(data.batch);
    if (data.range) data.range = sanitizeXSS(data.range);
    if (data.assigneeName) data.assigneeName = sanitizeXSS(data.assigneeName);

    const task = await Task.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

 // If assignee changed, notify new assignee via email
 if (data.assigneeId && data.assigneeId.toString() !== oldTask.assigneeId?.toString()) {
   try {
     const User = (await import("@/models/User")).default;
     const newAssignee = await User.findById(data.assigneeId).select("name email");
     if (newAssignee?.email) {
       sendTaskEmail(newAssignee.email, newAssignee.name || "Nhân viên", task.title || "", task.deadline || new Date(), task.note || "").catch(console.error);
     }
   } catch (_) {}
 }

 try {
 const { logAction } = await import('@/lib/logger');
 await logAction("system", `Cập nhật nhiệm vụ: ${task.title || id}`, `Cập nhật trạng thái/chi tiết nhiệm vụ.`);

  // Auto-update KPI & Mail status if transitioning to COMPLETED
  if (body.status === 'COMPLETED' && oldTask.status !== 'COMPLETED') {
    try {
      // 1. Cập nhật Mail vệ tinh thành ACTIVE
      try {
        const { SatelliteMail } = await import('@/models/SatelliteMail');
        if (task.satelliteMailId) {
          await SatelliteMail.findByIdAndUpdate(task.satelliteMailId, { status: 'ACTIVE' });
        }
        if (task.mailIds && task.mailIds.length > 0) {
          await SatelliteMail.updateMany(
            { _id: { $in: task.mailIds } },
            { $set: { status: 'ACTIVE' } }
          );
        }
      } catch (mailErr) {
        console.error("Lỗi cập nhật trạng thái Mail vệ tinh:", mailErr);
      }

      // 2. Update Global KPI in SyncStore
      try {
        const { SyncStore } = await import('@/models/SyncStore');
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
        const { Kpi } = await import('@/models/Kpi');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let userKpi = await Kpi.findOne({ userId: task.assigneeId, date: today });
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

        await Kpi.findOneAndUpdate(
          { userId: task.assigneeId, date: today },
          { $inc: { eligibleChannels: 1, completedChannels: 1 } },
          { new: true }
        );
      } catch (kpiErr) {
        console.error("Lỗi tự động cập nhật KPI:", kpiErr);
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
 const { Fine } = await import('@/models/Fine');
 const { Notification } = await import('@/models/Notification');
 
 // Check if fine already exists
 const existingFine = await Fine.findOne({ userId: task.assigneeId, reason: { $regex: /Trễ hạn Task/ } });
 if (!existingFine) {
 await Fine.create({
 userId: task.assigneeId,
 amount: 50000,
 reason: `Hoàn thành trễ hạn Task: ${task.title || id}`,
 status: 'UNPAID'
 });

// Send overdue fine email notification (fire-and-forget)
try {
  const User = (await import("@/models/User")).default;
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
  try {
  const { logAction } = await import('@/lib/logger');
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
