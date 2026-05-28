import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Next.js Production Proxy:
 * - Bảo vệ các subroute /admin/*: chỉ cho phép Admin (role 01, 02) và nhân sự (03, 04, 05) truy cập.
 * - Kiểm tra giờ làm việc (Auto-kick): nhân viên (03, 04, 05) truy cập ngoài giờ hành chính (sau closeTime hoặc 18:00) sẽ bị kick.
 * - Inject các header xác thực cho API routes.
 */

const COOKIE_NAME = "aq_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // Lấy token từ cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (isAdminApi) {
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
    // Verify JWT token signature using jose (Edge-compatible)
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "aq_media_jwt_secret_2026_xKp9mNvQ3rT8wZ"
    );
    const { payload } = await jwtVerify(token, secret);

    const userId = String(payload.userId || "");
    const role = String(payload.role || "").toUpperCase();
    const username = String(payload.username || "");

    const validRoles = ["01", "02", "03", "04", "05"];
    const isValidRole = validRoles.includes(role);

    // 1. PHÂN LUỒNG BẢO VỆ TUYỆT ĐỐI /admin/*
    // Nếu truy cập /admin* mà không có role hợp lệ -> Redirect về /login
    const isAdminPath = pathname.startsWith("/admin");

    if (!isValidRole && isAdminPath) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    // 2. TÍCH HỢP AUTO-KICK NGOÀI GIỜ HÀNH CHÍNH
    // Nếu ngoài giờ hành chính VÀ role là nhân viên (03, 04, 05) -> Redirect về /login?error=system_closed
    if (role === "03" || role === "04" || role === "05") {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const vnTime = new Date(utc + 3600000 * 7); // GMT+7

      const hours = vnTime.getHours();
      const minutes = vnTime.getMinutes();
      const currentMinutes = hours * 60 + minutes;

      // Mặc định giờ mở cửa là 08:00, giờ đóng cửa là 18:00
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
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("error", "system_closed");
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete(COOKIE_NAME);
        return response;
      }
    }

    // Token hợp lệ -> inject thông tin user vào headers cho API routes
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
    // Token không hợp lệ hoặc hết hạn
    const response = isAdminApi
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
