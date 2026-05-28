import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { Task } from '@/models/Task';
import { Notification } from '@/models/Notification';
import { Log } from '@/models/Log';

export const dynamic ="force-dynamic";

export async function GET() {
 try {
 await dbConnect();
 
 // 1. Get staff
 const staffs = await User.find({ role: { $in: ["04","05"] } });
 
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

 return NextResponse.json({ success: true, count: notificationSentCount });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Error creating reminders:", error);
 return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}
