import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Fine } from '@/models/Fine';
import { User } from '@/models/User';
import { Task } from '@/models/Task';
import { Kpi } from '@/models/Kpi';
import { logAction } from '@/lib/logger';

export const dynamic ="force-dynamic";

export async function POST() {
 try {
 await dbConnect();
 
 // Auto-fining logic: Check staff KPI and fine if they didn't meet the target after offWorkTime
 const staffs = await User.find({ role: { $in: ["04","05"] } });
 
 const now = new Date();
 const currentMins = now.getHours() * 60 + now.getMinutes();

 let count = 0;

 for (const staff of staffs) {
 const offWorkStr = staff.offWorkTime ||"17:30";
 const [offH, offM] = offWorkStr.split(":").map(Number);
 const offMins = offH * 60 + offM;

 // If past offWorkTime
 if (currentMins > offMins) {
 // Query incomplete tasks
 const incompleteTasks = await Task.find({
 assigneeId: staff._id,
 status: { $ne: 'COMPLETED' } 
 });

 if (incompleteTasks.length > 0) {
 // Check if fine already exists for today to avoid duplicate fines
 const startOfDay = new Date();
 startOfDay.setHours(0, 0, 0, 0);
 
 const existingFine = await Fine.findOne({
 userId: staff._id,
 reason: { $regex: /Không hoàn thành task/ },
 createdAt: { $gte: startOfDay }
 });

 if (!existingFine) {
 await Fine.create({
 userId: staff._id,
 reason: `Không hoàn thành task đúng hạn (sau ${offWorkStr})`,
 amount: 50000,
 status:"UNPAID"
 });
 count++;
 }
 }
 }
 }
 
 if (count > 0) {
 await logAction("system","Tự động tính toán và áp dụng phạt", `Đã kiểm tra KPI của ${staffs.length} nhân sự. Phạt: ${count} người.`);
 }

 return NextResponse.json({ success: true, message: `Auto fines calculation completed for ${staffs.length} staff members. Fined: ${count}` });
 } catch (error: any) {
 console.error("Error auto calculating fines:", error);
 return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}
