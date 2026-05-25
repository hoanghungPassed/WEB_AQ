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

 // Auto-update KPI if transitioning to COMPLETED
 if (body.status === 'COMPLETED' && oldTask.status !== 'COMPLETED') {
   try {
     // 1. Update Global KPI in SyncStore
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

     // 2. Update/Create individual Kpi record
     const { Kpi } = await import('@/models/Kpi');
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     let userKpi = await Kpi.findOne({ userId: task.assigneeId, date: today });
     if (!userKpi) {
       await Kpi.create({
         userId: task.assigneeId,
         date: today,
         completedChannels: 1,
         targetChannels: 50,
         fineAmount: 0
       });
     } else {
       userKpi.completedChannels = (userKpi.completedChannels || 0) + 1;
       await userKpi.save();
     }
   } catch (kpiErr) {
     console.error("Lỗi tự động cập nhật KPI:", kpiErr);
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
 } catch (error: any) {
 return NextResponse.json({ success: false, error: error.message }, { status: 400 });
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
 } catch (error: any) {
 return NextResponse.json({ success: false, error: error.message }, { status: 400 });
 }
}
