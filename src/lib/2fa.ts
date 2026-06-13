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
  // Chuẩn hóa token: xóa khoảng trắng
  const cleanToken = String(token).replace(/\s+/g, '').trim();
  // Tăng window lên 20 (mỗi bước 30s) -> cho phép sai số +/- 10 phút giữa server và điện thoại
  // Khắc phục triệt để vấn đề lệch giờ lớn trên thiết bị người dùng
  return speakeasy.totp.verify({ 
    secret: secretBase32.replace(/\s+/g, '').toUpperCase(), 
    encoding: 'base32', 
    token: cleanToken, 
    window: 20 
  });
}

/**
 * Thử xác thực với nhiều loại encoding khác nhau (Base32, Hex, ASCII)
 * Có khả năng chịu lỗi lệch giờ cực cao (window=20 ~ 10 phút)
 */
export function verifyTokenAny(secret: string, token: string): boolean {
  if (!secret || !token) return false;
  
  const cleanToken = String(token).replace(/\s+/g, '').trim();
  const cleanSecret = String(secret).replace(/\s+/g, '').trim();
  const window = 20; // Cho phép sai số thời gian 10 phút
  
  // 1. Thử Base32 (Chuẩn nhất)
  try {
    if (speakeasy.totp.verify({ secret: cleanSecret.toUpperCase(), encoding: 'base32', token: cleanToken, window })) {
      return true;
    }
  } catch (e) {}

  // 2. Thử Hex (Dữ liệu cũ hoặc copy nhầm)
  try {
    if (speakeasy.totp.verify({ secret: cleanSecret.toUpperCase(), encoding: 'hex', token: cleanToken, window })) {
      return true;
    }
  } catch (e) {}

  // 3. Thử ASCII/UTF8 (Đề phòng trường hợp khóa lưu dạng thô)
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
