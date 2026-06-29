import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUser, COOKIE_NAME } from "@/lib/auth";
import { logAuditTrail } from "@/lib/permissions";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  try {
    // 1. Decode Token để lấy userId TRƯỚC KHI xóa cookie
    const authUser = await getAuthUser();

    if (authUser) {
      try {
        await dbConnect();
        const now = new Date();
        
        // 2. Cập nhật DB: isOnline = false
        await User.findByIdAndUpdate(authUser.userId, {
          isOnline: false,
          lastActive: now,
          checkOutTime: now.toISOString(),
        });

        // 3. Bắn Pusher báo Offline
        try {
          await pusherServer.trigger("private-system", "user-status-changed", {
            userId: authUser.userId,
            isOnline: false
          });

          // Đồng bộ channel cũ nếu cần
          await pusherServer.trigger("system-users", "status-changed", {
            userId: authUser.userId,
            username: authUser.username,
            isOnline: false,
            lastActive: now
          });
        } catch (pushErr) {
          console.error("Pusher trigger error:", pushErr);
        }

        // Cập nhật Attendance
        try {
          const { Attendance } = await import("@/models/Attendance");
          const utc = now.getTime() + now.getTimezoneOffset() * 60000;
          const vnTime = new Date(utc + 3600000 * 7);
          const yyyy = vnTime.getFullYear();
          const mm = String(vnTime.getMonth() + 1).padStart(2, "0");
          const dd = String(vnTime.getDate()).padStart(2, "0");
          const todayStr = `${yyyy}-${mm}-${dd}`;

          const attendance = await Attendance.findOne({ userId: authUser.userId, date: todayStr });
          if (attendance && attendance.checkInTime) {
            attendance.checkOutTime = now;
            const diffInMs = now.getTime() - new Date(attendance.checkInTime).getTime();
            const totalHours = diffInMs / (1000 * 60 * 60);
            attendance.totalHours = parseFloat((totalHours > 0 ? totalHours : 0).toFixed(2));
            await attendance.save();
          }
        } catch (attErr) {
          console.error("Attendance update error:", attErr);
        }

        await logAuditTrail(authUser.userId, "LOGOUT_SUCCESS", "auth", { username: authUser.username }, req);
      } catch (dbErr) {
        console.error("Logout DB update error:", dbErr);
      }
    }

    // 4. Xóa cookie sau khi đã xử lý xong logic
    const response = NextResponse.json({
      message: "Đăng xuất thành công",
    });

    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Logout error:", errMsg);
    return NextResponse.json(
      { error: "Lỗi máy chủ: " + errMsg },
      { status: 500 }
    );
  }
}
