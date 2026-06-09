import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'aq_token';
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_build');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that require authentication
  const isApiAdmin = pathname.startsWith('/api/admin');
  const isApiUsers = pathname.startsWith('/api/users');
  const isPageAdmin = pathname.startsWith('/admin') && !pathname.startsWith('/admin/login') && !pathname.startsWith('/admin/2fa');

  if (isApiAdmin || isApiUsers || isPageAdmin) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      if (isPageAdmin) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(token, secret);
      
      // Clone headers to inject verified user data securely
      const requestHeaders = new Headers(request.headers);
      
      // CRITICAL SECURITY FIX: Overwrite any client-spoofed headers with verified token data
      requestHeaders.set('x-user-id', String(payload.userId || ''));
      requestHeaders.set('x-user-role', String(payload.role || ''));
      requestHeaders.set('x-user-username', String(payload.username || ''));

      // 2FA Enforcement logic (migrated from src/middleware/require2FA.ts)
      if (payload.role === '01' && !payload.twoFAEnabled && !pathname.startsWith('/api/admin/2fa') && !pathname.startsWith('/admin/2fa')) {
        if (isPageAdmin) {
           return NextResponse.redirect(new URL('/admin/2fa/setup', request.url));
        }
      }

      if (payload.twoFAEnabled && !request.cookies.get('twoFAValidated')) {
        if (isPageAdmin && !pathname.startsWith('/admin/2fa')) {
           return NextResponse.redirect(new URL('/admin/2fa/challenge', request.url));
        }
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (err) {
      // Invalid token
      if (isPageAdmin) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/users/:path*',
    '/admin/:path*'
  ],
};
