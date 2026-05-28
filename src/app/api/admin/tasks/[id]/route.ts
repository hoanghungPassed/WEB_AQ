import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { Task } from"@/models/Task";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
 try {
 const userId = req.headers.get("x-user-id");
 if (!userId) return NextResponse.json({ error:"Unauthorized" }, { status: 401 });

 await dbConnect();
 const body = await req.json();
 const { id } = await params;
 const oldTask = await Task.findById(id);
 if (!oldTask) {
   return NextResponse.json({ success: false, error:"Task not found" }, { status: 404 });
 }

 const task = await Task.findByIdAndUpdate(id, body, { new: true, runValidators: true });
 if (!task) {
 return NextResponse.json({ success: false, error:"Task not found" }, { status: 404 });
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
 return NextResponse.json({ success: true, data: task });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
 }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
 try {
 const userId = req.headers.get("x-user-id");
 if (!userId) return NextResponse.json({ error:"Unauthorized" }, { status: 401 });

 await dbConnect();
 const { id } = await params;
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
 return NextResponse.json({ success: true, data: {} });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
 }
}
