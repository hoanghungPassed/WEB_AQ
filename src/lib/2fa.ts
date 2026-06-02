import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { encrypt, decrypt } from './crypto';

export function generateSecret(email: string) {
  const secret = speakeasy.generateSecret({ length: 20, name: `AQ Media (${email})` });
  return secret; // contains base32, otpauth_url, etc.
}

export async function generateQrDataUrl(otpauthUrl: string): Promise<string> {
  return await QRCode.toDataURL(otpauthUrl);
}

export function verifyToken(secretBase32: string, token: string): boolean {
  // Tăng window lên 2 (mỗi bước 30s) -> cho phép sai số +/- 1 phút giữa server và điện thoại
  return speakeasy.totp.verify({ 
    secret: secretBase32, 
    encoding: 'base32', 
    token, 
    window: 2 
  });
}

/**
 * Thử xác thực với nhiều loại encoding khác nhau (Base32, Hex)
 */
export function verifyTokenAny(secret: string, token: string): boolean {
  const window = 2; // Cho phép sai số thời gian 1 phút
  
  // 1. Thử Base32 (Chuẩn nhất)
  try {
    if (speakeasy.totp.verify({ secret: secret.toUpperCase(), encoding: 'base32', token, window })) {
      return true;
    }
  } catch (e) {}

  // 2. Thử Hex (Dữ liệu cũ hoặc copy nhầm)
  try {
    if (speakeasy.totp.verify({ secret: secret.toUpperCase(), encoding: 'hex', token, window })) {
      return true;
    }
  } catch (e) {}

  return false;
}

export async function generateBackupCodes(count = 10) {
  const codes: { raw: string; hash: string }[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex'); // 8‑char code
    const hash = await bcrypt.hash(raw, 10);
    codes.push({ raw, hash });
  }
  return codes;
}

export async function verifyBackupCode(hashedCodes: string[], provided: string): Promise<boolean> {
  for (const hash of hashedCodes) {
    if (await bcrypt.compare(provided, hash)) {
      return true;
    }
  }
  return false;
}
