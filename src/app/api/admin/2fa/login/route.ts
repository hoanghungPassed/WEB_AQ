import { NextResponse, NextRequest } from 'next/server';
import { User } from '@/models/User';
import { verifyToken, generateBackupCodes } from '@/lib/2fa';
import { decrypt } from '@/lib/crypto';
import { logAuditTrail } from '@/lib/permissions';
import { twoFARateLimiter } from '@/middleware/rateLimiter';

/**
 * POST /api/admin/2fa/login
 * After primary authentication, the client sends a TOTP token **or** a backup code.
 * Successful verification sets a secure HttpOnly `twoFAValidated` cookie.
 */
export async function POST(request: Request) {
  // Rate limiting – simple wrapper call (assume it returns a handler) – omitted for brevity
  const { token, backupCode } = await request.json();

  // Retrieve user from session cookie (assume cookie value is the user ID)
  const sessionCookie = request.headers.get('cookie')?.match(/session=([^;]*)/);
  const userId = sessionCookie ? sessionCookie[1] : null;
  if (!userId) {
    await logAuditTrail('unknown', 'LOGIN_2FA', 'User', { success: false, reason: 'no_session' }, request);
    return NextResponse.json({ error: 'Session missing' }, { status: 401 });
  }

  const user = await User.findById(userId);
  if (!user || !user.twoFAEnabled || !user.twoFASecret) {
    await logAuditTrail(userId, 'LOGIN_2FA', 'User', { success: false, reason: '2fa_not_enabled' }, request);
    return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';

  // ----- Token verification -----
  if (token) {
    const secretBase32 = decrypt(user.twoFASecret);
    if (!verifyToken(secretBase32, token)) {
      await logAuditTrail(userId, 'LOGIN_2FA', 'User', { success: false, reason: 'invalid_token', ip }, request);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    // Token valid – set validated cookie
    const response = NextResponse.json({ message: '2FA success' });
    response.cookies.set('twoFAValidated', '1', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });
    await logAuditTrail(userId, 'LOGIN_2FA', 'User', { success: true, method: 'token', ip }, request);
    return response;
  }

  // ----- Backup code verification -----
  if (backupCode) {
    const hashedCodes = user.backupCodes || [];
    // Verify against each hash; on success, remove that hash.
    const bcrypt = (await import('bcryptjs')).default;
    for (let i = 0; i < hashedCodes.length; i++) {
      if (await bcrypt.compare(backupCode, hashedCodes[i])) {
        // Remove used code
        hashedCodes.splice(i, 1);
        user.backupCodes = hashedCodes;
        await user.save();
        const response = NextResponse.json({ message: 'Backup code accepted' });
        response.cookies.set('twoFAValidated', '1', {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60,
        });
        await logAuditTrail(userId, 'LOGIN_2FA', 'User', { success: true, method: 'backup', ip }, request);
        return response;
      }
    }
    await logAuditTrail(userId, 'LOGIN_2FA', 'User', { success: false, reason: 'invalid_backup', ip }, request);
    return NextResponse.json({ error: 'Invalid backup code' }, { status: 401 });
  }

  await logAuditTrail(userId, 'LOGIN_2FA', 'User', { success: false, reason: 'no_token_or_backup' }, request);
  return NextResponse.json({ error: 'Token or backup code required' }, { status: 400 });
}
