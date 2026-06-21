import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { SystemSetting } from "@/models/SystemSetting";
import { getAuthUser, signToken, COOKIE_NAME } from "@/lib/auth";

async function handleRefresh(req: NextRequest) {
  try {
    await dbConnect();
    const payload = await getAuthUser();
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Không tìm thấy token hợp lệ" }, { status: 401 });
    }

    const [user, settings] = await Promise.all([
      User.findById(payload.userId),
      SystemSetting.findOne().lean(),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Người dùng không tồn tại" }, { status: 404 });
    }

    // Tạo JWT mới với thông tin status và isLateLocked mới nhất từ DB
    const newToken = signToken({
      userId: user._id.toString(),
      role: user.role,
      username: user.username,
      twoFAEnabled: !!payload.twoFAEnabled,
      twoFAValidated: !!payload.twoFAValidated,
      overtimeBypass: !!payload.overtimeBypass,
      tokenVersion: user.tokenVersion || 0,
      userStatus: user.status,
      isLateLocked: user.isLateLocked,
      openTime: settings?.openTime || "08:00",
      closeTime: settings?.closeTime || "17:30",
    });

    const response = NextResponse.json({
      success: true,
      isLateLocked: user.isLateLocked,
      userStatus: user.status,
    });

    // Set lại Cookie mới
    response.cookies.set(COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 ngày
    });

    return response;
  } catch (error: any) {
    console.error("Refresh token error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ khi làm mới token: " + error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleRefresh(req);
}

export async function POST(req: NextRequest) {
  return handleRefresh(req);
}
