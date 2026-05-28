import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import User from"@/models/User";
import { getAuthUser, COOKIE_NAME } from"@/lib/auth";

export async function POST() {
 try {
 // Decode token trước khi xóa để cập nhật trạng thái offline
 const authUser = await getAuthUser();

  if (authUser) {
    try {
      await dbConnect();
      await User.findByIdAndUpdate(authUser.userId, {
        isOnline: false,
        lastActive: new Date().toISOString(),
        checkOutTime: new Date().toISOString(),
      });

      // Cập nhật bản ghi Attendance khi logout
      const { Attendance } = await import("@/models/Attendance");
      const now = new Date();
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
