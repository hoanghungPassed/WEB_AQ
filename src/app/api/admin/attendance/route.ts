import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { logAction } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    await dbConnect();
    
    // Auto checkout at 17:30 (1050 minutes)
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    if (currentMins >= 1050) {
      const todayStr = now.toISOString().split("T")[0];
      
      const staffs = await User.find({
        role: { $in: ["03", "04", "05"] }
      });

      let updatedCount = 0;
      for (const staff of staffs) {
        // If they checked in today but haven't checked out today
        if (staff.checkInTime && staff.checkInTime.startsWith(todayStr)) {
          const hasCheckedOutToday = staff.checkOutTime && staff.checkOutTime.startsWith(todayStr);
          
          if (!hasCheckedOutToday) {
            const checkoutTime = new Date(now);
            checkoutTime.setHours(17, 30, 0, 0);
            
            staff.checkOutTime = checkoutTime.toISOString();
            staff.isOnline = false;
            await staff.save();
            
            await logAction(staff._id.toString(), "ATTENDANCE_AUTO_CHECKOUT", `Hệ thống tự động check-out lúc 17:30 cho user ${staff.username}`);
            updatedCount++;
          }
        }
      }
      
      return NextResponse.json({ success: true, message: `Auto checked out ${updatedCount} users` });
    }

    return NextResponse.json({ success: true, message: "Not time for auto checkout yet" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
