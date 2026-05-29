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

    const isStaff = role === "03" || role === "04" || role === "05";

    // 1. KIỂM TRA PHÂN QUYỀN TRÊN GIAO DIỆN UI /admin/* (Sử dụng Blacklist & Whitelist đúng đắn)
    if (isAdminPage && isStaff) {
      // Nếu truy cập chính xác trang /admin hoặc /admin/, tự động chuyển hướng nhân viên về /admin/tasks
      if (pathname === "/admin" || pathname === "/admin/") {
        return NextResponse.redirect(new URL("/admin/tasks", request.url));
      }

      // Blacklist các trang quản trị cấp cao
      const blacklist = [
        "/admin/staff",
        "/admin/settings",
        "/admin/payroll",
        "/admin/mail",
        "/admin/phone"
      ];

      const isBlacklisted = blacklist.some(
        (path) => pathname === path || pathname.startsWith(path + "/")
      );

      // Nếu nằm trong blacklist, chặn truy cập và redirect về /admin/tasks
      if (isBlacklisted) {
        return NextResponse.redirect(new URL("/admin/tasks", request.url));
      }
    }

    // 2. KIỂM TRA GIỜ HÀNH CHÍNH (AUTO-KICK) CHO NHÂN VIÊN
    if (isStaff) {
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

    // 3. KIỂM TRA PHÂN QUYỀN API CHO NHÂN VIÊN
    // BẮT BUỘC whitelist các API cần thiết cho role 03, 04, 05: /api/auth/me, /api/admin/tasks, /api/admin/attendance, /api/admin/notifications, /api/messages
    if (isApiCall && isStaff) {
      const isAllowedEndpoint = 
        pathname.startsWith("/api/auth/me") ||
        pathname.startsWith("/api/admin/tasks") ||
        pathname.startsWith("/api/admin/attendance") ||
        pathname.startsWith("/api/admin/notifications") ||
        pathname.startsWith("/api/admin/messages") ||
        pathname.startsWith("/api/messages") ||
        pathname.startsWith("/api/admin/fines") ||
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
