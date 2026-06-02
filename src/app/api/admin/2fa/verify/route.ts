import { NextResponse, NextRequest } from 'next/server';
import { User } from '@/models/User';
import { verifyTokenAny } from '@/lib/2fa';
import { decrypt, encrypt } from '@/lib/crypto';
import { logAuditTrail } from '@/lib/permissions';
import dbConnect from '@/lib/mongodb';

/**
 * POST /api/admin/2fa/verify
 * Accepts a TOTP token and verifies it against the stored encrypted secret.
 * On success, enables 2FA for the user and generates fresh backup codes.
 */
export async function POST(request: Request) {
  await dbConnect();
  const { token, userId } = await request.json();

  const sessionUserId = request.headers.get('x-user-id') || request.headers.get('x-session-user-id') || '';
  // Users can only verify their own account (or admins can verify others via admin UI – not needed here)
  if (sessionUserId !== userId) {
    await logAuditTrail(sessionUserId, 'VERIFY_2FA', 'User', { success: false, reason: 'unauthorized' }, request);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const user = await User.findById(userId);
  if (!user || !user.twoFASecret) {
    await logAuditTrail(userId, 'VERIFY_2FA', 'User', { success: false, reason: 'no_secret' }, request);
    return NextResponse.json({ error: '2FA chưa được thiết lập khởi tạo.' }, { status: 400 });
  }

  let secretBase32 = "";
  let decryptionFailed = false;
  const storedSecret = user.twoFASecret;
  const looksLikeEncrypted = storedSecret.length > 40 && (storedSecret.includes("==") || storedSecret.length > 44);

  if (looksLikeEncrypted) {
    try {
      secretBase32 = decrypt(storedSecret);
    } catch (decErr) {
      decryptionFailed = true;
      console.warn("2FA Verify: Decryption failed, checking for Base32 fallback...");
    }
  } else {
    decryptionFailed = true;
  }

  if (decryptionFailed) {
    // Fallback: If decryption fails, check if it's raw Base32 or Hex
    if (verifyTokenAny(storedSecret, token)) {
      secretBase32 = storedSecret.toUpperCase();
    } else {
      console.error("2FA Verify: Secret is neither valid encrypted data nor a compatible raw string.");
      return NextResponse.json({ error: 'Lỗi giải mã khóa bảo mật. Vui lòng liên hệ Admin.' }, { status: 500 });
    }
  }

  const isValid = verifyTokenAny(secretBase32, token);

  if (!isValid) {
    await logAuditTrail(userId, 'VERIFY_2FA', 'User', { success: false, reason: 'invalid_token' }, request);
    return NextResponse.json({ error: 'Mã xác thực không chính xác hoặc đã hết hạn.' }, { status: 401 });
  }

  // Enable 2FA and generate fresh backup codes
  const { generateBackupCodes } = await import('@/lib/2fa');
  const backup = await generateBackupCodes();
  const rawCodes = backup.map(b => b.raw);
  const hashedCodes = backup.map(b => b.hash);

  user.twoFAEnabled = true;
  user.backupCodes = hashedCodes;

  // Auto-encrypt if it was a fallback success
  if (decryptionFailed) {
    try {
      user.twoFASecret = encrypt(secretBase32);
    } catch (e) {
      console.error("Auto-encrypt failed in verify:", e);
    }
  }

  await user.save();

  await logAuditTrail(userId, 'VERIFY_2FA', 'User', { success: true }, request);

  return NextResponse.json({ message: '2FA enabled', backupCodes: rawCodes });
}
