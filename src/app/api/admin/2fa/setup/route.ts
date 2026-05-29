import { NextResponse } from 'next/server';
import { User } from '@/models/User';
import { generateSecret, generateQrDataUrl, generateBackupCodes } from '@/lib/2fa';
import { encrypt } from '@/lib/crypto';
import { logAuditTrail } from '@/utils/audit'; // adjust import path as needed

export async function POST(request: Request) {
  const { email, userId } = await request.json();
  // Only admins or the user themselves can initiate setup
  const sessionUserId = (await request.headers.get('x-session-user-id')) ?? '';
  if (sessionUserId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const secret = generateSecret(email);
  const encrypted = encrypt(secret.base32);

  const qrDataUrl = await generateQrDataUrl(secret.otpauth_url);
  const backup = await generateBackupCodes();
  const rawCodes = backup.map(b => b.raw);
  const hashedCodes = backup.map(b => b.hash);

  // Store encrypted secret but keep 2FA disabled until verification
  user.twoFASecret = encrypted;
  user.backupCodes = hashedCodes;
  user.twoFAEnabled = false;
  await user.save();

  await logAuditTrail(user.id, 'ENABLE_2FA', 'User', { method: 'setup' }, request);

  return NextResponse.json({ qrDataUrl, encryptedSecret: encrypted, backupCodes: rawCodes });
}
