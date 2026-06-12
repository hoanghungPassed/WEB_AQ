import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "aq_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  const isAdminPage = pathname.startsWith("/admin");
  const isApiCall = pathname.startsWith("/api");

  // Chỉ xử lý các route /admin/* hoặc các route API /api/*
  if (!isAdminPage && !isApiCall) {
    return NextResponse.next();
  }

  // Bỏ qua xác thực cho các API công khai (Đăng nhập, Đăng ký, Xác thực 2FA lúc đăng nhập, Reset mật khẩu)
  const isPublicApi = 
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/check-status") ||
    pathname.startsWith("/api/auth/check-username") ||
    pathname.startsWith("/api/admin/2fa/login") ||
    pathname.startsWith("/api/auth/reset-password");

  if (isPublicApi) {
    return NextResponse.next();
  }

  // Lấy token từ cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (isApiCall) {
      return NextResponse.json(
        { error: "Không có quyền truy cập. Vui lòng đăng nhập." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Xác thực JWT token (Edge-compatible)
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "aq_media_jwt_secret_2026_xKp9mNvQ3rT8wZ"
    );
    const { payload } = await jwtVerify(token, secret);

    const userId = String(payload.userId || "");
    const role = String(payload.role || "").toUpperCase();
    const username = String(payload.username || "");

    const validRoles = ["01", "02", "03", "04", "05"];
    const isValidRole = validRoles.includes(role);

    if (!isValidRole) {
      if (isApiCall) {
        return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    // 2FA Security check: if user has 2FA enabled but not verified in JWT, kick to login
    const twoFAEnabled = !!payload.twoFAEnabled;
    const twoFAValidated = !!payload.twoFAValidated;

    if (twoFAEnabled && !twoFAValidated) {
      if (isApiCall) {
        return NextResponse.json(
          { error: "Yêu cầu xác thực 2FA. Vui lòng hoàn tất 2FA tại trang đăng nhập." },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "2fa_required");
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    const isStaff = role === "03" || role === "04" || role === "05";

    // 0. BẮT BUỘC Admin (role 01) phải cài đặt 2FA nếu chưa có
    if (role === "01" && !payload.twoFAEnabled && !pathname.startsWith("/admin/2fa") && !pathname.startsWith("/api/admin/2fa")) {
      if (isAdminPage) {
        return NextResponse.redirect(new URL("/admin/2fa/setup", request.url));
      }
    }

    // 1. KIỂM TRA PHÂN QUYỀN TRÊN GIAO DIỆN UI /admin/* (Sử dụng Blacklist & Whitelist đúng đắn)
    if (isAdminPage && isStaff) {
      // Blacklist các trang quản trị cấp cao
      const blacklist = [
        "/admin/staff",
        "/admin/payroll",
        "/admin/mail",
        "/admin/phone"
      ];

      const isBlacklisted = blacklist.some(
        (path) => pathname === path || pathname.startsWith(path + "/")
      );

      const isAllowedStaffPage = 
        pathname === "/admin/mail/satellite" ||
        pathname === "/admin/phone/list" ||
        pathname === "/admin/settings";

      // Nếu nằm trong blacklist và không thuộc whitelist được phép, chặn truy cập và redirect về /admin/tasks
      if (isBlacklisted && !isAllowedStaffPage) {
        return NextResponse.redirect(new URL("/admin/tasks", request.url));
      }
    }

    // 2. KIỂM TRA GIỜ HÀNH CHÍNH (AUTO-KICK) CHO NHÂN VIÊN
    const overtimeBypass = !!payload.overtimeBypass;
    if (isStaff && !overtimeBypass) {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const vnTime = new Date(utc + 3600000 * 7); // GMT+7

      const hours = vnTime.getHours();
      const minutes = vnTime.getMinutes();
      const currentMinutes = hours * 60 + minutes;

      let openHour = 8;
      let openMinute = 0;
      let closeHour = 18;
      let closeMinute = 0;

      const openTimeCookie = request.cookies.get("open_time")?.value;
      if (openTimeCookie && openTimeCookie.includes(":")) {
        const parts = openTimeCookie.split(":");
        openHour = parseInt(parts[0], 10) || 8;
        openMinute = parseInt(parts[1], 10) || 0;
      }

      const closeTimeCookie = request.cookies.get("close_time")?.value;
      if (closeTimeCookie && closeTimeCookie.includes(":")) {
        const parts = closeTimeCookie.split(":");
        closeHour = parseInt(parts[0], 10) || 18;
        closeMinute = parseInt(parts[1], 10) || 0;
      }

      const openMinutes = openHour * 60 + openMinute;
      const closeMinutes = closeHour * 60 + closeMinute;

      if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
        if (isApiCall) {
          return NextResponse.json(
            { error: "Hệ thống đã đóng cửa ngoài giờ làm việc." },
            { status: 403 }
          );
        }
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("error", "system_closed");
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete(COOKIE_NAME);
        return response;
      }
    }

    if (isApiCall && isStaff) {
      const isAllowedEndpoint = 
        pathname.startsWith("/api/auth/me") ||
        pathname.startsWith("/api/auth/change-password") ||
        pathname.startsWith("/api/admin/tasks") ||
        pathname.startsWith("/api/admin/attendance") ||
        pathname.startsWith("/api/admin/notifications") ||
        pathname.startsWith("/api/admin/messages") ||
        pathname.startsWith("/api/messages") ||
        pathname.startsWith("/api/admin/fines") ||
        pathname.startsWith("/api/admin/2fa/setup") ||
        pathname.startsWith("/api/admin/2fa/verify") ||
        pathname.startsWith("/api/admin/mails") ||
        (pathname.startsWith("/api/admin/settings") && method === "GET") ||
        (pathname.startsWith("/api/admin/users") && method === "GET");

      if (pathname.startsWith("/api/admin") && !isAllowedEndpoint) {
        return NextResponse.json(
          { error: "Bạn không có quyền truy cập API này" },
          { status: 403 }
        );
      }
    }

    // Inject thông tin người dùng vào headers cho các API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", userId);
    requestHeaders.set("x-user-role", role);
    requestHeaders.set("x-user-username", username);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err) {
    const response = isApiCall
      ? NextResponse.json(
          { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." },
          { status: 401 }
        )
      : NextResponse.redirect(new URL("/login", request.url));

    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

// Proxy alias export to satisfy both old/new Next.js configurations
export async function proxy(request: NextRequest) {
  return middleware(request);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*'
  ],
};
