import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware bảo mật: Kiểm tra JWT token cho các route cần xác thực.
 * - /admin/* -> Yêu cầu đăng nhập (có cookie aq_token hợp lệ)
 * - /api/admin/* -> Yêu cầu đăng nhập + role phù hợp
 *
 * Lưu ý: Middleware chạy ở Edge Runtime nên không thể dùng thư viện jsonwebtoken (Node.js).
 * Thay vào đó, ta decode JWT thủ công (base64) để kiểm tra nhanh.
 * Việc xác minh chữ ký đầy đủ sẽ do API route đảm nhiệm.
 */

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if ((parts || []).length !== 3) return null;

    const payload = parts[1];
    // Base64url decode
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function isTokenExpired(payload: Record<string, unknown>): boolean {
  const exp = payload.exp as number | undefined;
  if (!exp) return true;
  return Date.now() >= exp * 1000;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Chỉ bảo vệ các route /admin và /api/admin
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // Lấy token từ cookie
  const token = request.cookies.get("aq_token")?.value;

  if (!token) {
    // Không có token -> redirect về login (cho page) hoặc trả 401 (cho API)
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

  // Decode token (kiểm tra nhanh, không verify signature - signature sẽ được verify ở API)
  const payload = decodeJwtPayload(token);

  if (!payload || isTokenExpired(payload)) {
    // Token không hợp lệ hoặc hết hạn
    const response = isAdminApi
      ? NextResponse.json(
          { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." },
          { status: 401 }
        )
      : NextResponse.redirect(new URL("/login", request.url));

    // Xóa cookie hỏng
    response.cookies.delete("aq_token");
    return response;
  }

  // Token hợp lệ -> cho phép truy cập
  // Thêm thông tin user vào header để API routes có thể sử dụng
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", String(payload.userId || ""));
  requestHeaders.set("x-user-role", String(payload.role || ""));
  requestHeaders.set("x-user-username", String(payload.username || ""));

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
