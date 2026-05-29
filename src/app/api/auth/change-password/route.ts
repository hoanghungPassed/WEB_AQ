import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { comparePassword, hashPassword } from "@/lib/auth";
import { logAuditTrail } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
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
    await user.save();

    // Log the event
    await logAuditTrail(userId, "CHANGE_PASSWORD", "auth", { username: user.username }, req);

    return NextResponse.json({
      message: "Đổi mật khẩu thành công",
    });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Lỗi máy chủ: " + error.message },
      { status: 500 }
    );
  }
}
