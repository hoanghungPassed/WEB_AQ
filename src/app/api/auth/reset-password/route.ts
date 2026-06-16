import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { logAuditTrail } from "@/lib/permissions";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit } from "@/lib/limiter";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    const limitResult = rateLimit(ip, 5, 60000); // limit to 5 password reset attempts per minute per IP
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Bạn đã thử khôi phục mật khẩu quá nhiều lần. Vui lòng thử lại sau 1 phút." },
        { status: 429 }
      );
    }
    await dbConnect();
    const { username, email, newPassword } = await req.json();

    if ((!username && !email) || !newPassword) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ thông tin tài khoản và mật khẩu mới." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    const query = email ? { email: email.toLowerCase() } : { username };
    const user = await User.findOne(query);
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
