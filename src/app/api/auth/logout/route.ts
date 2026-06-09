import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUser, COOKIE_NAME } from "@/lib/auth";
import { logAuditTrail } from "@/lib/permissions";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
 try {
 // Decode token trước khi xóa để cập nhật trạng thái offline
 const authUser = await getAuthUser();

  if (authUser) {
    try {
      await dbConnect();
      const now = new Date();
      await User.findByIdAndUpdate(authUser.userId, {
        isOnline: false,
        lastActive: now,
        checkOutTime: now.toISOString(),
      });

      // Trigger Real-time status update
      try {
        await pusherServer.trigger("system-users", "status-changed", {
          userId: authUser.userId,
          username: authUser.username,
          isOnline: false,
          lastActive: now
        });
      } catch (pushErr) {}

      // Cập nhật bản ghi Attendance khi logout
      const { Attendance } = await import("@/models/Attendance");
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const vnTime = new Date(utc + 3600000 * 7); // Vietnam GMT+7
      const yyyy = vnTime.getFullYear();
      const mm = String(vnTime.getMonth() + 1).padStart(2, "0");
      const dd = String(vnTime.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const attendance = await Attendance.findOne({ userId: authUser.userId, date: todayStr });
      if (attendance && attendance.checkInTime) {
        const checkOutTime = now;
        attendance.checkOutTime = checkOutTime;
        
        const diffInMs = checkOutTime.getTime() - new Date(attendance.checkInTime).getTime();
        const totalHours = diffInMs / (1000 * 60 * 60);
        
        attendance.totalHours = parseFloat((totalHours > 0 ? totalHours : 0).toFixed(2));
        await attendance.save();
      }
    } catch (dbErr) {
      // Vẫn cho logout ngay cả khi DB lỗi
      console.error("Logout DB update error:", dbErr);
    }
    await logAuditTrail(authUser.userId, "LOGOUT_SUCCESS", "auth", { username: authUser.username }, req);
  }

 // Xóa cookie
 const response = NextResponse.json({
 message:"Đăng xuất thành công",
 });

 response.cookies.set(COOKIE_NAME,"", {
 httpOnly: true,
 secure: process.env.NODE_ENV ==="production",
 sameSite:"lax",
 path:"/",
 maxAge: 0, // Xóa cookie ngay lập tức
 });

 return response;
 } catch (error: unknown) {
 const errMsg = error instanceof Error ? error.message :"Unknown error";
 console.error("Logout error:", errMsg);
 return NextResponse.json(
 { error:"Lỗi máy chủ:" + errMsg },
 { status: 500 }
 );
 }
}
