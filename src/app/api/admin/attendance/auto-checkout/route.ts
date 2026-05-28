import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { User } from"@/models/User";
import { Attendance } from "@/models/Attendance";
import { logAction } from"@/lib/logger";

export async function GET(req: Request) {
  return POST(req);
}

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
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 3600000 * 7); // Vietnam GMT+7
  const yyyy = vnTime.getFullYear();
  const mm = String(vnTime.getMonth() + 1).padStart(2, "0");
  const dd = String(vnTime.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  for (const staff of staffs) {
    if (staff.checkInTime && staff.checkInTime.startsWith(todayStr)) {
      const hasCheckedOutToday = staff.checkOutTime && staff.checkOutTime.startsWith(todayStr);
      if (!hasCheckedOutToday) {
        const checkoutTime = new Date();
        checkoutTime.setHours(17, 30, 0, 0);
        
        staff.checkOutTime = checkoutTime.toISOString();
        staff.isOnline = false;
        await staff.save();
        
        // Cập nhật bản ghi Attendance của ngày hôm nay
        const attendance = await Attendance.findOne({ userId: staff._id, date: todayStr });
        if (attendance && attendance.checkInTime) {
          attendance.checkOutTime = checkoutTime;
          const checkInMs = new Date(attendance.checkInTime).getTime();
          const checkOutMs = checkoutTime.getTime();
          const workedHours = (checkOutMs - checkInMs) / 3600000;
          
          attendance.totalHours = parseFloat((workedHours > 0 ? workedHours : 0).toFixed(2));
          await attendance.save();
        }

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
