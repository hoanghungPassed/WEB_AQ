import nodemailer from "nodemailer";

const getTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "587");
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Enforces dynamic styled HTML layouts with Inter / Outfit fonts and gold accents.
 */
const buildHtmlTemplate = (title: string, bodyContent: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: #0c0c0c;
          color: #e5e5e5;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: #121212;
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .header {
          background: linear-gradient(135deg, #1b1b1b 0%, #111111 100%);
          padding: 30px;
          text-align: center;
          border-bottom: 2px solid #d4af37;
        }
        .logo {
          font-size: 24px;
          font-weight: 900;
          color: #d4af37;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .title {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: -0.02em;
        }
        .button {
          display: inline-block;
          background: #d4af37;
          color: #0c0c0c !important;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 25px;
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
        }
        .footer {
          background: #0a0a0a;
          padding: 20px 30px;
          text-align: center;
          font-size: 11px;
          color: #666666;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .footer a {
          color: #d4af37;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">AQ MEDIA</div>
        </div>
        <div class="content">
          ${bodyContent}
        </div>
        <div class="footer">
          Đây là email tự động từ hệ thống quản lý nhân sự AQ Media.<br>
          Nếu bạn cần hỗ trợ, vui lòng liên hệ <a href="mailto:admin@aqmedia.vn">quản trị viên</a>.
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Main wrapper to safely transmit emails in background without blocking requests
 */
export async function sendMail(to: string, subject: string, html: string) {
  try {
    const cleanTo = (to || "").trim();
    if (!cleanTo) {
      console.warn("[MAIL WARNING]: Skipper - Recipient address is empty.");
      return false;
    }

    const transporter = getTransporter();
    if (!transporter) {
      console.warn(`[MAIL WARNING]: Transporter offline - Skip sending to ${cleanTo}. Set EMAIL_HOST/USER/PASS env variables.`);
      return false;
    }

    const fromAddress = process.env.EMAIL_FROM || '"AQ Media Notifications" <no-reply@aqmedia.vn>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to: cleanTo,
      subject: subject,
      html: html,
    });

    return true;
  } catch (err) {
    console.error(`[MAIL ERROR]: Failed to send notification email to ${to}:`, err);
    return false;
  }
}

/**
 * Triggers alerts when fines are created
 */
export async function sendFineEmail(to: string, userName: string, amount: number, reason: string) {
  const body = `
    <div class="title">Thông Báo Nhận Khoản Phạt Mới</div>
    <p>Xin chào <strong>${userName}</strong>,</p>
    <p>Hệ thống đã ghi nhận một khoản phạt mới đối với tài khoản của bạn:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: rgba(255,255,255,0.02); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 12px 15px; color: #888888; font-size: 13px; font-weight: bold; text-transform: uppercase;">Số tiền phạt</td>
        <td style="padding: 12px 15px; color: #ff5555; font-size: 16px; font-weight: 900;">${amount.toLocaleString("vi-VN")} VND</td>
      </tr>
      <tr>
        <td style="padding: 12px 15px; color: #888888; font-size: 13px; font-weight: bold; text-transform: uppercase;">Lý do vi phạm</td>
        <td style="padding: 12px 15px; color: #ffffff; font-size: 14px; font-weight: bold;">${reason}</td>
      </tr>
    </table>
    <p>Nếu bạn tin rằng có nhầm lẫn xảy ra hoặc có mong muốn gửi đơn giải trình vi phạm, vui lòng đăng nhập hệ thống và gửi giải trình của bạn trước kỳ kết toán lương tháng này.</p>
    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin" class="button">Gửi Đơn Giải Trình</a>
    </div>
  `;
  return sendMail(to, "Cảnh báo khoản phạt mới phát sinh - AQ Media", buildHtmlTemplate("Thông Báo Phạt Mới", body));
}

/**
 * Triggers alerts when new tasks are assigned
 */
export async function sendTaskEmail(
  to: string,
  userName: string,
  taskTitle: string,
  deadline: Date | string,
  note = ""
) {
  const formattedDeadline = new Date(deadline).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const body = `
    <div class="title">Bạn Đã Được Giao Nhiệm Vụ Mới</div>
    <p>Xin chào <strong>${userName}</strong>,</p>
    <p>Trưởng phòng kỹ thuật vừa phân công một nhiệm vụ mới dành cho bạn:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: rgba(255,255,255,0.02); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 12px 15px; color: #888888; font-size: 13px; font-weight: bold; text-transform: uppercase;">Tên nhiệm vụ</td>
        <td style="padding: 12px 15px; color: #ffffff; font-size: 15px; font-weight: 900;">${taskTitle}</td>
      </tr>
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 12px 15px; color: #888888; font-size: 13px; font-weight: bold; text-transform: uppercase;">Thời hạn</td>
        <td style="padding: 12px 15px; color: #d4af37; font-size: 14px; font-weight: bold;">${formattedDeadline}</td>
      </tr>
      ${
        note
          ? `
      <tr>
        <td style="padding: 12px 15px; color: #888888; font-size: 13px; font-weight: bold; text-transform: uppercase;">Ghi chú</td>
        <td style="padding: 12px 15px; color: #cccccc; font-size: 13px; font-style: italic;">${note}</td>
      </tr>
      `
          : ""
      }
    </table>
    <p>Vui lòng tiến hành tiếp nhận công việc, theo dõi các yêu cầu, và cập nhật kết quả trước thời hạn được giao để tránh vi phạm tiến độ.</p>
    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin" class="button">Tiếp Nhận Nhiệm Vụ</a>
    </div>
  `;
  return sendMail(to, "Thông báo nhiệm vụ công việc mới được phân công - AQ Media", buildHtmlTemplate("Nhiệm vụ mới", body));
}

/**
 * Triggers alerts when mails are allocated
 */
export async function sendMailAssignedEmail(to: string, userName: string, details: string) {
  const body = `
    <div class="title">Phân Phối Tài Nguyên Mail Mới</div>
    <p>Xin chào <strong>${userName}</strong>,</p>
    <p>Quản trị hệ thống vừa phân phối tài nguyên mail mới được liên kết trực tiếp tới tài khoản của bạn:</p>
    <div style="background: rgba(255,255,255,0.02); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.05); margin: 20px 0; color: #ffffff; font-size: 14px; font-weight: bold; line-height: 1.6; font-family: monospace; white-space: pre-wrap;">
${details}
    </div>
    <p>Vui lòng tiến hành kiểm tra, kích hoạt và thực hiện các nhiệm vụ được giao tương thích với tài nguyên mới này.</p>
    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin" class="button">Quản Lý Mail Nhân Sự</a>
    </div>
  `;
  return sendMail(to, "Phân phối tài nguyên email làm việc mới - AQ Media", buildHtmlTemplate("Phân phối tài nguyên", body));
}

/**
 * Triggers alerts when password change succeeds
 */
export async function sendPasswordResetEmail(to: string, userName: string, resetDetails: string) {
  const body = `
    <div class="title">Thay Đổi Mật Khẩu Thành Công</div>
    <p>Xin chào <strong>${userName}</strong>,</p>
    <p>Mật khẩu của tài khoản của bạn đã được cập nhật thành công trên hệ thống quản lý AQ Media.</p>
    <div style="background: rgba(255,255,255,0.02); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.05); margin: 20px 0; color: #ffffff; font-size: 14px; line-height: 1.6;">
      <strong>Hình thức cập nhật:</strong> ${resetDetails}<br>
      <strong>Thời gian thực hiện:</strong> ${new Date().toLocaleString("vi-VN")}
    </div>
    <p style="color: #ff5555; font-weight: bold; font-size: 13px;">CẢNH BÁO AN TOÀN: Nếu bạn không phải người thực hiện hành động này, vui lòng tiến hành khôi phục mật khẩu ngay lập tức hoặc liên hệ trực tiếp quản trị viên hệ thống để tạm khóa tài khoản.</p>
    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login" class="button">Đăng Nhập Lại</a>
    </div>
  `;
  return sendMail(to, "Cảnh báo bảo mật: Thay đổi mật khẩu thành công - AQ Media", buildHtmlTemplate("Bảo mật mật khẩu", body));
}
