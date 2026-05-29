import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { logAuditTrail } from "@/lib/permissions";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { username, newPassword } = await req.json();

    if (!username || !newPassword) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ username và mật khẩu mới." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { error: "Tài khoản không tồn tại trong hệ thống." },
        { status: 404 }
      );
    }

    // Hash mật khẩu mới bằng bcryptjs
    const hashed = await hashPassword(newPassword);
    user.password = hashed;
    await user.save();

    // Send email notification for password reset (fire-and-forget)
    try {
      if (user.email) {
        sendPasswordResetEmail(user.email, user.name || "Nhân viên", "Yêu cầu khôi phục mật khẩu thành công").catch(console.error);
      }
    } catch (_) {}

    await logAuditTrail(user._id.toString(), "PASSWORD_RESET_SUCCESS", "auth", { username: user.username }, req);

    // Ghi log hệ thống
    try {
      const { Log } = await import('@/models/Log');
      await Log.create({
        user: username,
        role: user.role === "01" ? "ADMIN" : "NHÂN VIÊN",
        action: `Khôi phục/Đổi mật khẩu tài khoản: ${username}`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (logErr) {
      console.error("Log error in reset-password:", logErr);
    }

    return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công!" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Quên mật khẩu error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
