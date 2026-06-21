import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { comparePassword, hashPassword } from "@/lib/auth";
import { logAuditTrail } from "@/lib/permissions";
import { rateLimit } from "@/lib/limiter";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    const limitResult = await rateLimit(`change-pw:${ip}`, 5, 60000); // 5 attempts per minute
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Bạn đã thử đổi mật khẩu quá nhiều lần. Vui lòng thử lại sau 1 phút." },
        { status: 429 }
      );
    }

    await dbConnect();

    // Get userId from headers (injected by middleware)
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp mật khẩu cũ và mật khẩu mới" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "Người dùng không tồn tại" },
        { status: 404 }
      );
    }

    // Verify old password
    const isMatch = await comparePassword(oldPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Mật khẩu cũ không chính xác" },
        { status: 400 }
      );
    }

    // Hash new password and update
    user.password = await hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Log the event
    await logAuditTrail(userId, "CHANGE_PASSWORD", "auth", { username: user.username }, req);

    return NextResponse.json({
      message: "Đổi mật khẩu thành công",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Lỗi máy chủ: " + errorMessage },
      { status: 500 }
    );
  }
}
