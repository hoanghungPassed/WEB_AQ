import bcrypt from"bcryptjs";
import jwt from"jsonwebtoken";
import { cookies } from"next/headers";

const SALT_ROUNDS = 10;
const COOKIE_NAME ="aq_token";
const TOKEN_EXPIRY ="7d";

function getJwtSecret(): string {
 const secret = process.env.JWT_SECRET;
 if (!secret) {
 throw new Error("❌ JWT_SECRET chưa được định nghĩa trong .env.local");
 }
 return secret;
}

// ========================
// Password Utilities
// ========================

/** Mã hóa mật khẩu bằng bcrypt */
export async function hashPassword(password: string): Promise<string> {
 return bcrypt.hash(password, SALT_ROUNDS);
}

/** So sánh mật khẩu plaintext với hash */
export async function comparePassword(
 password: string,
 hash: string
): Promise<boolean> {
 return bcrypt.compare(password, hash);
}

/** Kiểm tra xem một chuỗi đã được hash bằng bcrypt chưa */
export function isHashed(password: string): boolean {
 return password.startsWith("$2a$") || password.startsWith("$2b$");
}

// ========================
// JWT Utilities
// ========================

export interface TokenPayload {
 userId: string;
 role: string;
 username: string;
 twoFAEnabled?: boolean;
 twoFAValidated?: boolean;
 overtimeBypass?: boolean;
 tokenVersion?: number;
 /** Trạng thái tài khoản tại thời điểm cấp token — dùng cho Middleware check không cần DB */
 userStatus?: "ACTIVE" | "LOCKED" | "PENDING";
 /** Trạng thái khóa đi muộn — dùng cho Middleware check không cần DB */
 isLateLocked?: boolean;
 openTime?: string;
 closeTime?: string;
}

/** Tạo JWT token */
export function signToken(payload: TokenPayload): string {
 return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

/** Giải mã và xác minh JWT token. Trả về payload hoặc null nếu invalid */
export function verifyToken(token: string): TokenPayload | null {
 try {
 const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;
 return decoded;
 } catch {
 return null;
 }
}

// ========================
// Cookie / Auth User
// ========================

/** Đọc cookie aq_token, decode JWT, trả về thông tin user hoặc null */
export async function getAuthUser(): Promise<TokenPayload | null> {
 try {
 const cookieStore = await cookies();
 const tokenCookie = cookieStore.get(COOKIE_NAME);

 if (!tokenCookie?.value) {
 return null;
 }

 return verifyToken(tokenCookie.value);
 } catch {
 return null;
 }
}

/** Tên cookie dùng chung */
export { COOKIE_NAME };
