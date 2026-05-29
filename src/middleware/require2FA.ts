import { NextResponse, NextRequest } from 'next/server';
import { User } from '@/models/User';
import { logAuditTrail } from '@/utils/audit'; // adjust path if needed

/**
 * Middleware to enforce 2FA requirements.
 * - Admins must have 2FA enabled.
 * - If 2FA is enabled, a session must be marked as validated via a cookie.
 * - Staff can opt‑in/out via self‑service endpoints, so no mandatory redirect.
 */
export async function middleware(req: NextRequest) {
  // Retrieve session identifier (e.g., JWT or session ID stored in a cookie)
  const sessionToken = req.cookies.get('session');
  if (!sessionToken) return NextResponse.next();

  // Minimal DB hit: fetch only fields needed for the check
  const user = await User.findById(sessionToken.value, 'role twoFAEnabled');
  if (!user) return NextResponse.next();

  // Admin enforcement
  if (user.role === 'ADMIN' && !user.twoFAEnabled) {
    // Log the redirect for audit purposes
    await logAuditTrail(user.id, 'ENFORCE_2FA', 'User', { reason: 'admin_missing_2fa' }, req);
    return NextResponse.redirect(new URL('/admin/2fa/setup', req.url));
  }

  // If 2FA is enabled, ensure the session has been validated
  const twoFAValidated = req.cookies.get('twoFAValidated');
  if (user.twoFAEnabled && !twoFAValidated) {
    const protectedPath = req.nextUrl.pathname.startsWith('/admin');
    if (protectedPath) {
      return NextResponse.redirect(new URL('/admin/2fa/challenge', req.url));
    }
  }

  return NextResponse.next();
}
