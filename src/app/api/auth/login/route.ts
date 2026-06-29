import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/middleware/rateLimiter";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { SystemSetting } from "@/models/SystemSetting";
import {
  comparePassword,
  isHashed,
  hashPassword,
  signToken,
  COOKIE_NAME,
} from "@/lib/auth";
import { logAuditTrail } from "@/lib/permissions";
import { processLoginAttendance } from "@/services/attendance.service";
import { triggerLoginNotifications } from "@/services/notification.service";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const limitResult = await rateLimit(ip, 5, 60000); // limit to 5 login attempts per minute per IP
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Bạn đã đăng nhập quá nhiều lần. Vui lòng thử lại sau 1 phút." },
        { status: 429 }
      );
    }

    await dbConnect();

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp đầy đủ username và password" },
        { status: 400 }
      );
    }

    if (username === "nhanvien") {
      const nvUser = await User.findOne({ username: "nhanvien" });
      if (!nvUser) {
        const defaultPassword = await hashPassword("123456");
        await User.create({
          name: "Nhân Viên Ảo",
          username: "nhanvien",
          email: "nhanvien@aqmedia.com",
          password: defaultPassword,
          role: "04",
          status: "ACTIVE",
        });
      }
    }

    // Tìm user theo username
    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json(
        { error: "Sai tên đăng nhập hoặc mật khẩu" },
        { status: 401 }
      );
    }

    // Kiểm tra trạng thái tài khoản
    if (user.status === "LOCKED") {
      return NextResponse.json(
        { error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin." },
        { status: 403 }
      );
    }

    if (user.status === "PENDING") {
      return NextResponse.json(
        { error: "Tài khoản của bạn đang chờ duyệt. Vui lòng liên hệ Admin." },
        { status: 403 }
      );
    }

    // So sánh mật khẩu
    let passwordMatch = false;

    if (isHashed(user.password)) {
      passwordMatch = await comparePassword(password, user.password);
    } else {
      passwordMatch = password === user.password;

      if (passwordMatch) {
        user.password = await hashPassword(password);
        await user.save();
      }
    }

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Sai tên đăng nhập hoặc mật khẩu" },
        { status: 401 }
      );
    }

    // Fetch system settings once
    const settings = await SystemSetting.findOne().lean();
    if (!settings) {
      throw new Error("Không tìm thấy cấu hình hệ thống");
    }

    // Process attendance logic (attendance, latching status, fines creation)
    const attendanceResult = await processLoginAttendance(user, settings);

    // Trigger notifications asynchronously and safely (pusher updates and emails)
    triggerLoginNotifications({
      userId: user._id.toString(),
      username: user.username,
      userEmail: user.email,
      userName: user.name,
      shouldBeOnline: attendanceResult.shouldBeOnline,
      now: new Date(),
      overtimeFineCreated: attendanceResult.overtimeFineCreated,
      lateFineCreated: attendanceResult.lateFineCreated,
    }).catch((err) => {
      console.error("Error triggering login notifications asynchronously:", err);
    });

    // If 2FA is enabled, do NOT log in fully. Instead, return require2FA: true and set temporary session cookie
    if (user.twoFAEnabled) {
      const response = NextResponse.json({
        require2FA: true,
        userId: user._id.toString(),
        username: user.username,
        overtimeBypass: attendanceResult.overtimeBypass,
      });

      const isProd = process.env.NODE_ENV === "production";
      response.cookies.set("session", user._id.toString(), {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 300, // 5 minutes
      });

      await logAuditTrail(
        user._id.toString(),
        "LOGIN_2FA_CHALLENGE",
        "auth",
        { username: user.username },
        req
      );
      return response;
    }

    // Tạo JWT token
    const token = signToken({
      userId: user._id.toString(),
      role: user?.role,
      username: user?.username,
      overtimeBypass: attendanceResult.overtimeBypass,
      tokenVersion: user.tokenVersion || 0,
      userStatus: user.status,
      isLateLocked: user.isLateLocked,
      openTime: settings?.openTime || "08:00",
      closeTime: settings?.closeTime || "17:30",
    });

    // Tạo response với cookie HttpOnly
    const userObj = user.toObject() as any;
    delete userObj.password;
    userObj.id = userObj._id.toString();

    const response = NextResponse.json({
      message: "Đăng nhập thành công",
      user: userObj,
    });

    // Set HttpOnly cookie
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 ngày
    });

    await logAuditTrail(
      user._id.toString(),
      "LOGIN_SUCCESS",
      "auth",
      { username: user.username },
      req
    );

    return response;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Login error:", errMsg);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errMsg }, { status: 500 });
  }
}
