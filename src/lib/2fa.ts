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

export function verifyToken(secretInput: string, token: string): boolean {
  if (!secretInput || !token) return false;

  // 1. Chuẩn hóa Token: Ép kiểu string và xóa sạch khoảng trắng (VD: "123 456" -> "123456")
  const cleanToken = String(token).replace(/\s+/g, '');

  try {
    // 2. Xử lý Secret: Kiểm tra xem secret truyền vào là dạng mã hóa hay thô
    let secretBase32 = "";
    
    // Nếu chuỗi có độ dài lớn, khả năng cao là đã được encrypt
    if (secretInput.length > 32) {
      try {
        secretBase32 = decrypt(secretInput).trim();
      } catch (decErr) {
        console.error("Lỗi giải mã 2FA Secret, hãy kiểm tra lại biến môi trường mã hóa (ENCRYPTION_KEY):", decErr);
        // Fallback: Nếu không giải mã được, thử dùng trực tiếp (đề phòng dữ liệu cũ)
        secretBase32 = secretInput.trim();
      }
    } else {
      secretBase32 = secretInput.trim();
    }

    if (!secretBase32) return false;

    // 3. Sử dụng speakeasy.totp.verify với encoding: 'base32' để tương thích tuyệt đối với Google Authenticator
    return speakeasy.totp.verify({
      secret: secretBase32.toUpperCase(),
      encoding: 'base32',
      token: cleanToken,
      window: 2 // Cho phép sai số ±60 giây (Dung sai an toàn tiêu chuẩn)
    });
  } catch (error) {
    console.error("Lỗi hệ thống khi xác thực 2FA:", error);
    return false;
  }
}

/**
 * Thử xác thực với nhiều loại encoding khác nhau (Base32, Hex, ASCII)
 * Đảm bảo bắt lỗi giải mã và xóa khoảng trắng token.
 */
export function verifyTokenAny(secretInput: string, token: string): boolean {
  if (!secretInput || !token) return false;
  
  const cleanToken = String(token).replace(/\s+/g, '');
  const window = 2; // Dung sai ±60 giây
  
  let secret = "";
  try {
    // Luôn thử giải mã trước để đảm bảo an toàn dữ liệu
    if (secretInput.length > 32) {
      secret = decrypt(secretInput).trim();
    } else {
      secret = secretInput.trim();
    }
  } catch (error) {
    console.error("Lỗi giải mã 2FA, hãy kiểm tra lại biến môi trường mã hóa:", error);
    secret = secretInput.trim(); // Fallback dùng trực tiếp
  }

  if (!secret) return false;

  // 1. Google Authenticator Standard (Base32) - Ưu tiên hàng đầu
  try {
    if (speakeasy.totp.verify({ 
      secret: secret.toUpperCase(), 
      encoding: 'base32',
      token: cleanToken, 
      window 
    })) {
      return true;
    }
  } catch (e) {}

  // 2. TOTP Hex (Dành cho các chuẩn cũ)
  try {
    if (speakeasy.totp.verify({ 
      secret: secret.toUpperCase(), 
      encoding: 'hex', 
      token: cleanToken, 
      window 
    })) {
      return true;
    }
  } catch (e) {}

  // 3. TOTP ASCII (Dành cho khóa dạng chuỗi thô)
  try {
    if (speakeasy.totp.verify({ 
      secret: secret, 
      encoding: 'ascii', 
      token: cleanToken, 
      window 
    })) {
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
