import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { rateLimit } from "@/lib/limiter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    const limitResult = await rateLimit(ip, 5, 60000); // limit to 5 OTP requests per minute per IP
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Bạn đã gửi quá nhiều yêu cầu OTP. Vui lòng thử lại sau 1 phút." },
        { status: 429 }
      );
    }
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ error: "Email và OTP là bắt buộc" }, { status: 400 });
    }

    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 465;
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;

    if (!user || !pass) {
      return NextResponse.json(
        { error: "Biến môi trường SMTP/EMAIL cấu hình chưa đúng ở file .env" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Mã Xác Thực OTP</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #0f0f0f; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 30px auto; background-color: #161616; border: 1px solid #d4af37; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.8); }
          .logo { font-size: 24px; font-weight: bold; color: #d4af37; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; }
          .title { font-size: 20px; color: #ffffff; margin-bottom: 10px; font-weight: bold; }
          .description { font-size: 14px; color: #a0a0a0; margin-bottom: 30px; }
          .otp-box { background-color: #000000; border: 1px dashed #d4af37; border-radius: 12px; padding: 20px; font-size: 36px; font-weight: bold; color: #d4af37; letter-spacing: 8px; display: inline-block; margin-bottom: 30px; font-family: monospace; }
          .footer { font-size: 11px; color: #555555; border-top: 1px solid #222; padding-top: 20px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">AQ MEDIA</div>
          <div class="title">XÁC THỰC MÃ OTP</div>
          <div class="description">Chào bạn, đây là mã xác thực của bạn để hoàn tất đăng ký/khôi phục tài khoản tại hệ thống AQ Media. Vui lòng sử dụng mã dưới đây:</div>
          <div class="otp-box">${otp}</div>
          <div class="description">Mã OTP có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</div>
          <div class="footer">
            Đây là email tự động từ hệ thống AQ Media. Vui lòng không trả lời email này.
          </div>
        </div>
      </body>
      </html>
    `;

    // Gửi mail đến chính xác địa chỉ email nhận từ frontend (không fix cứng admin)
    await transporter.sendMail({
      from: '"Hệ Thống WEB AQ" <' + user + '>',
      to: email.trim(),
      subject: "Mã xác thực tài khoản AQ Media",
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Nodemailer SMTP Error:", err);
    return NextResponse.json({ error: "Lỗi gửi Mail: " + err.message }, { status: 500 });
  }
}
