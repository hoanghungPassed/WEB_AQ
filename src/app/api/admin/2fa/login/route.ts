import { NextResponse, NextRequest } from 'next/server';
import { User } from '@/models/User';
import { SystemSetting } from '@/models/SystemSetting';
import { verifyTokenAny, generateBackupCodes } from '@/lib/2fa';
import { decrypt, encrypt } from '@/lib/crypto';
import { logAuditTrail } from '@/lib/permissions';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';

import { rateLimit } from '@/middleware/rateLimiter';

/**
 * POST /api/admin/2fa/login
 * After primary authentication, the client sends a TOTP token **or** a backup code.
 * Successful verification sets a secure HttpOnly `twoFAValidated` cookie.
 */
export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const limitResult = await rateLimit(ip, 5, 60000);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Bạn đã xác thực quá nhiều lần. Vui lòng thử lại sau 1 phút.' },
        { status: 429 }
      );
    }

    await dbConnect();
    const body = await request.json();
    const { token, backupCode, overtimeBypass, userId: userIdFromBody } = body;

    // Use the reliable manual cookie parsing
    let userId = "";
    try {
      const cookieStore = request.headers.get('cookie');
      if (cookieStore) {
        // Robust manual parsing for session cookie
        const pairs = cookieStore.split(';').map(c => c.trim().split('='));
        const sessionPair = pairs.find(p => p[0] === 'session');
        if (sessionPair) userId = sessionPair[1];
      }
    } catch (e) {
      console.error("2FA Cookie Parsing Error:", e);
    }

    if (!userId) {
      await logAuditTrail('unknown', 'LOGIN_2FA', 'User', { success: false, reason: 'no_session' }, request);
      return NextResponse.json({ error: 'Phiên làm việc tạm thời đã hết hạn hoặc bị trình duyệt chặn (Local). Vui lòng thử đăng nhập lại.' }, { status: 401 });
    }

    const [user, settings] = await Promise.all([
      User.findById(userId),
      SystemSetting.findOne().lean(),
    ]);
    if (!user || !user.twoFAEnabled || !user.twoFASecret) {
      await logAuditTrail(userId, 'LOGIN_2FA', 'User', { success: false, reason: '2fa_not_enabled' }, request);
      return NextResponse.json({ error: '2FA chưa được kích hoạt cho tài khoản này.' }, { status: 400 });
    }


    // ----- Token verification -----
    if (token && String(token).trim().length === 6) {
      const storedSecret = String(user.twoFASecret || "").trim();
      if (!storedSecret) {
         return NextResponse.json({ error: 'Khóa bảo mật 2FA trống. Vui lòng liên hệ Admin.' }, { status: 500 });
      }

      let secretBase32 = "";
      let isVerified = false;
      let needsReEncryption = false;

      // STRATEGY 1: Try current decryption
      try {
        secretBase32 = decrypt(storedSecret).trim();
        if (verifyTokenAny(secretBase32, token)) {
          isVerified = true;
        }
      } catch (e) {
        console.warn("2FA Login: Decryption failed, likely due to ENCRYPTION_KEY mismatch.");
      }

      // STRATEGY 2: If fail, maybe it's unencrypted Base32 or Hex (legacy)
      if (!isVerified) {
        if (verifyTokenAny(storedSecret.trim(), token)) {
          secretBase32 = storedSecret.trim().toUpperCase();
          isVerified = true;
          needsReEncryption = true;
          console.log("2FA Login: Verified via raw legacy fallback.");
        }
      }

      if (!isVerified) {
        const serverTime = new Date().toLocaleTimeString("vi-VN");
        const serverUnix = Math.floor(Date.now() / 1000);
        console.log(`2FA Failure: User=${userId}, ServerTime=${serverTime}, Unix=${serverUnix}, Token=${token}`);
        
        // Nếu OTP sai, không trả về lỗi ngay mà để trôi xuống kiểm tra Backup Code bên dưới
        // trừ khi token chắc chắn không phải là mã dự phòng (ví dụ: chỉ có 6 số)
        if (String(token).trim().length !== 8) {
          await logAuditTrail(userId, 'LOGIN_2FA', 'User', { success: false, reason: 'invalid_token_all_strategies', ip }, request);
          const serverTime = new Date().toLocaleTimeString("vi-VN");
          return NextResponse.json({ 
            error: `Mã OTP không chính xác hoặc đã hết hạn (Giờ máy chủ: ${serverTime}). Hãy đảm bảo giờ trên điện thoại đã được đặt ở chế độ TỰ ĐỘNG để đối chiếu.`,
            server_time: serverTime
          }, { status: 401 });
        }
        console.log("2FA: OTP failed, but token length is 8, trying as backup code...");
      } else {
        // AUTO-MIGRATION: Update DB with encrypted secret using current key
        if (needsReEncryption) {
          try {
            user.twoFASecret = encrypt(secretBase32);
            await user.save();
            console.log(`2FA: Successfully migrated/re-encrypted secret for ${user.username}`);
          } catch (migErr) {
            console.error("2FA: Migration encryption failed:", migErr);
          }
        }

        // Token valid – sign full JWT token with 2FA verified flags
        const userObj = user.toObject() as any;
        delete userObj.password;
        userObj.id = userObj._id.toString();

        const jwtToken = signToken({
          userId: user._id.toString(),
          role: user.role,
          username: user.username,
          twoFAEnabled: true,
          twoFAValidated: true,
          overtimeBypass: !!overtimeBypass,
          tokenVersion: user.tokenVersion,
          userStatus: user.status,
          isLateLocked: user.isLateLocked,
          openTime: settings?.openTime || "08:00",
          closeTime: settings?.closeTime || "17:30",
        });

        const response = NextResponse.json({
          message: 'Xác thực 2FA thành công',
          user: userObj,
        });

        const isProd = process.env.NODE_ENV === "production";

        // Set the standard aq_token cookie
        response.cookies.set(COOKIE_NAME, jwtToken, {
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        // Set twoFAValidated cookie for compatibility
        response.cookies.set('twoFAValidated', '1', {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60, // 1 hour
        });

        // Clear temporary session cookie
        response.cookies.delete('session');

        await logAuditTrail(userId, 'LOGIN_2FA', 'User', { success: true, method: 'token', ip }, request);
        return response;
      }
    }

    // ----- Backup code verification -----
    if (backupCode) {
      const hashedCodes = user.backupCodes || [];
      const bcrypt = (await import('bcryptjs')).default;
      
      let foundIndex = -1;
      for (let i = 0; i < hashedCodes.length; i++) {
        if (await bcrypt.compare(backupCode, hashedCodes[i])) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== -1) {
        // Remove used code
        hashedCodes.splice(foundIndex, 1);
        user.backupCodes = hashedCodes;
        await user.save();

        const userObj = user.toObject() as any;
        delete userObj.password;
        userObj.id = userObj._id.toString();

        const jwtToken = signToken({
          userId: user._id.toString(),
          role: user.role,
          username: user.username,
          twoFAEnabled: true,
          twoFAValidated: true,
          overtimeBypass: !!overtimeBypass,
          tokenVersion: user.tokenVersion,
          userStatus: user.status,
          isLateLocked: user.isLateLocked,
          openTime: settings?.openTime || "08:00",
          closeTime: settings?.closeTime || "17:30",
        });

        const response = NextResponse.json({
          message: 'Mã dự phòng chính xác',
          user: userObj,
        });

        const isProd = process.env.NODE_ENV === "production";

        // Set the standard aq_token cookie
        response.cookies.set(COOKIE_NAME, jwtToken, {
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });

        // Set twoFAValidated cookie for compatibility
        response.cookies.set('twoFAValidated', '1', {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60,
        });

        // Clear temporary session cookie
        response.cookies.delete('session');

        await logAuditTrail(userId, 'LOGIN_2FA', 'User', { success: true, method: 'backup', ip }, request);
        return response;
      }
      
      await logAuditTrail(userId, 'LOGIN_2FA', 'User', { success: false, reason: 'invalid_backup', ip }, request);
      return NextResponse.json({ error: 'Mã dự phòng không chính xác.' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Vui lòng nhập mã xác thực hoặc mã dự phòng.' }, { status: 400 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("2FA Login Error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi xác thực 2FA: ' + errorMessage }, { status: 500 });
  }
}
