import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { User } from"@/models/User";
import { logAction } from"@/lib/logger";

export async function POST(req: Request) {
 try {
 await dbConnect();
 
 // Find users with checkInTime but no checkOutTime, sets checkOutTime='17:30:00' and isOnline=false
 const staffs = await User.find({
 role: { $in: ["03","04","05"] },
 isOnline: true,
 checkInTime: { $exists: true, $ne: null }
 });

 let updatedCount = 0;
 const today = new Date();
 const todayStr = today.toISOString().split("T")[0];

 for (const staff of staffs) {
 if (staff.checkInTime && staff.checkInTime.startsWith(todayStr)) {
 const hasCheckedOutToday = staff.checkOutTime && staff.checkOutTime.startsWith(todayStr);
 if (!hasCheckedOutToday) {
 const checkoutTime = new Date();
 checkoutTime.setHours(17, 30, 0, 0);
 
 staff.checkOutTime = checkoutTime.toISOString();
 staff.isOnline = false;
 await staff.save();
 
 await logAction(staff._id.toString(),"ATTENDANCE_AUTO_CHECKOUT", `Hệ thống tự động check-out lúc 17:30 cho user ${staff.username}`);
 updatedCount++;
 }
 }
 }
 
 return NextResponse.json({ success: true, message: `Auto checked out ${updatedCount} users` });
 } catch (error: any) {
 return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}
