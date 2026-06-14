import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { Task } from '@/models/Task';
import { Notification } from '@/models/Notification';
import { Log } from '@/models/Log';
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export const dynamic ="force-dynamic";

export async function GET(req: NextRequest) {
 try {
  await dbConnect();
  
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  const hasPermission = await checkPermission(userRole || "", 5, ["all"]);
  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_RUN_REMINDERS", "tasks", {}, req);
    return NextResponse.json({ error: "Không có quyền gửi nhắc nhở" }, { status: 403 });
  }
 
 // 1. Get staff
 const staffs = await User.find({ role: { $in: ["04","05"] } }).select("-password").lean();
 
 const now = new Date();
 const currentMins = now.getHours() * 60 + now.getMinutes();

 let notificationSentCount = 0;

 for (const staff of staffs) {
 // 2. Query incomplete tasks
 const incompleteTasks = await Task.find({
 assigneeId: staff._id,
 status: { $ne: 'COMPLETED' } // In system it might be different, but we'll use COMPLETED per request
 });

 if (incompleteTasks.length === 0) continue;

 // 3. Compare with offWorkTime
 const offWorkStr = staff.offWorkTime ||"17:30";
 const [offH, offM] = offWorkStr.split(":").map(Number);
 const offMins = offH * 60 + offM;
 
 const alertThreshold = offMins - 10;

 // Ensure we only alert ONCE around the 10 min mark. 
 // We'll check if current time is within [alertThreshold, offMins)
 if (currentMins >= alertThreshold && currentMins < offMins) {
 // Create Notification
 await Notification.create({
 recipientId: staff._id,
 title:"Cảnh báo KPI",
 message: `Bạn còn ${offMins - currentMins}p nữa là đến giờ nghỉ, vui lòng hoàn thành task ngay!`,
 type:"WARNING"
 });

 // Create Log
 await Log.create({
 user:"System",
 role:"ADMIN",
 action:"KPI_WARNING",
 type:"WARNING",
 details: `Cảnh báo ${offMins - currentMins}p trước giờ nghỉ cho ${staff.name}`,
 timestamp: new Date().toLocaleString("vi-VN")
 });

 notificationSentCount++;
 }
 }

  await logAuditTrail(userId || "system", "RUN_REMINDERS_SUCCESS", "tasks", { alertsSentCount: notificationSentCount }, req);

  return NextResponse.json({ success: true, count: notificationSentCount });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Error creating reminders:", error);
 return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}
