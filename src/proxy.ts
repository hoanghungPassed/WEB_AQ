import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Proxy bảo mật (Next.js 16): Kiểm tra JWT token cho các route cần xác thực.
 * - /admin/* -> Yêu cầu đăng nhập (có cookie aq_token hợp lệ)
 * - /api/admin/* -> Yêu cầu đăng nhập + inject role headers
 * - Thêm kiểm tra giờ làm việc (Auto-kick) cho các tài khoản không phải Admin
 *
 * Sử dụng thư viện `jose` để verify JWT signature (tương thích Edge Runtime).
 */

const COOKIE_NAME = "aq_token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Chỉ bảo vệ các route /admin và /api/admin
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
    // Verify JWT signature + check expiry bằng jose
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "aq_media_jwt_secret_2026_xKp9mNvQ3rT8wZ"
    );
    const { payload } = await jwtVerify(token, secret);

    const userId = String(payload.userId || "");
    const role = String(payload.role || "").toUpperCase();
    const username = String(payload.username || "");

    // 2. BẢO MẬT PROXY (AUTO-KICK HẾT GIỜ LÀM VIỆC)
    // Check if user role is NOT Admin ("01" or "ADMIN")
    const isAdmin = role === "01" || role === "ADMIN";

    if (!isAdmin) {
      // Get current Vietnam time (GMT+7)
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const vnTime = new Date(utc + 3600000 * 7);

      const hours = vnTime.getHours();
      const minutes = vnTime.getMinutes();

      // Retrieve closeTime configuration (default: 18:00)
      let limitHour = 18;
      let limitMinute = 0;

      const closeTimeCookie = request.cookies.get("close_time")?.value;
      if (closeTimeCookie && closeTimeCookie.includes(":")) {
        const parts = closeTimeCookie.split(":");
        limitHour = parseInt(parts[0], 10) || 18;
        limitMinute = parseInt(parts[1], 10) || 0;
      }

      // If outside working hours, automatically kick user out
      if (hours > limitHour || (hours === limitHour && minutes >= limitMinute)) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("error", "closed");
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
  } catch {
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

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
