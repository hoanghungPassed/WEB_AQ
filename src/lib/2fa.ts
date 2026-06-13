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
  if (!secretBase32 || !token) return false;

  // Chuẩn hóa token: xóa khoảng trắng
  const cleanToken = String(token).replace(/\s+/g, '').trim();
  // Chuẩn hóa secret: xóa khoảng trắng và chuyển chữ hoa cho Base32
  const cleanSecret = String(secretBase32).replace(/\s+/g, '').trim().toUpperCase();

  // Nới rộng window lên 6 (mỗi bước 30s) -> cho phép sai số ±3 phút
  // Giúp khắc phục triệt để lỗi lệch giờ (Time Drift) giữa thiết bị và server
  return speakeasy.totp.verify({ 
    secret: cleanSecret, 
    encoding: 'base32', 
    token: cleanToken, 
    window: 6 
  });
}

/**
 * Thử xác thực với nhiều loại encoding khác nhau (Base32, Hex, ASCII)
 * Sử dụng window: 6 (±3 phút) để đảm bảo độ tin cậy cao nhất.
 */
export function verifyTokenAny(secret: string, token: string): boolean {
  if (!secret || !token) return false;
  
  const cleanToken = String(token).replace(/\s+/g, '').trim();
  const cleanSecret = String(secret).replace(/\s+/g, '').trim();
  const window = 6; // Độ trễ ±3 phút (Dung sai an toàn cao)
  
  // 1. Thử Base32 (Phổ biến nhất - Google Authenticator)
  try {
    if (speakeasy.totp.verify({ secret: cleanSecret.toUpperCase(), encoding: 'base32', token: cleanToken, window })) {
      return true;
    }
  } catch (e) {}

  // 2. Thử Hex (Dành cho các loại khóa chuẩn cũ hoặc thiết bị chuyên dụng)
  try {
    if (speakeasy.totp.verify({ secret: cleanSecret.toUpperCase(), encoding: 'hex', token: cleanToken, window })) {
      return true;
    }
  } catch (e) {}

  // 3. Thử ASCII (Dành cho các chuỗi secret dạng ký tự thô)
  try {
    if (speakeasy.totp.verify({ secret: cleanSecret, encoding: 'ascii', token: cleanToken, window })) {
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
