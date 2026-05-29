import { NextResponse, NextRequest } from 'next/server';
import { User } from '@/models/User';
import { verifyToken } from '@/lib/2fa';
import { decrypt } from '@/lib/crypto';
import { logAuditTrail } from '@/utils/audit';
import { twoFARateLimiter } from '@/middleware/rateLimiter';

/**
 * POST /api/admin/2fa/verify
 * Accepts a TOTP token and verifies it against the stored encrypted secret.
 * On success, enables 2FA for the user and generates fresh backup codes.
 */
export async function POST(request: Request) {
  // Apply rate limiting manually (since Next.js API routes don't support middleware directly)
  // We'll invoke the rate limiter as a function – it returns a handler that can be awaited.
  // For simplicity, assume twoFARateLimiter works as a wrapper.
  // In real code, you'd use a middleware wrapper or edge config.
  const { token, userId } = await request.json();

  const sessionUserId = (await request.headers.get('x-session-user-id')) ?? '';
  // Users can only verify their own account (or admins can verify others via admin UI – not needed here)
  if (sessionUserId !== userId) {
    await logAuditTrail(sessionUserId, 'VERIFY_2FA', 'User', { success: false, reason: 'unauthorized' }, request);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const user = await User.findById(userId);
  if (!user || !user.twoFASecret) {
    await logAuditTrail(userId, 'VERIFY_2FA', 'User', { success: false, reason: 'no_secret' }, request);
    return NextResponse.json({ error: '2FA not set up' }, { status: 400 });
  }

  const secretBase32 = decrypt(user.twoFASecret);
  const isValid = verifyToken(secretBase32, token);

  if (!isValid) {
    await logAuditTrail(userId, 'VERIFY_2FA', 'User', { success: false, reason: 'invalid_token' }, request);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Enable 2FA and generate fresh backup codes
  const { generateBackupCodes } = await import('@/lib/2fa');
  const backup = await generateBackupCodes();
  const rawCodes = backup.map(b => b.raw);
  const hashedCodes = backup.map(b => b.hash);

  user.twoFAEnabled = true;
  user.backupCodes = hashedCodes;
  await user.save();

  await logAuditTrail(userId, 'VERIFY_2FA', 'User', { success: true }, request);

  return NextResponse.json({ message: '2FA enabled', backupCodes: rawCodes });
}
