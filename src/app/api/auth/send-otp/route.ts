import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ error: "Email và OTP là bắt buộc" }, { status: 400 });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #d4af37; text-align: center; text-transform: uppercase;">Xác thực tài khoản AQ Media</h2>
        <p>Xin chào,</p>
        <p>Bạn vừa yêu cầu nhận mã OTP để đăng ký tài khoản tại hệ thống quản lý AQ Media.</p>
        <p>Mã xác thực của bạn là:</p>
        <div style="background: #f9f9f9; border: 1px dashed #d4af37; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #333;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 12px; font-style: italic;">Lưu ý: Mã OTP này có hiệu lực trong vòng 5 phút và không được chia sẻ với bất kỳ ai.</p>
      </div>
    `;

    const success = await sendMail(
      email,
      "Mã xác thực đăng ký tài khoản AQ Media",
      htmlContent
    );

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Hệ thống email SMTP chưa được thiết lập" }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
