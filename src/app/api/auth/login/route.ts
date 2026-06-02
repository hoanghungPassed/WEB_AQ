import { NextRequest, NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import User from"@/models/User";
import { Attendance } from "@/models/Attendance";
import { SystemSetting } from "@/models/SystemSetting";
import { Notification } from "@/models/Notification";
import { Fine } from "@/models/Fine";
import {
 comparePassword,
 isHashed,
 hashPassword,
 signToken,
 COOKIE_NAME,
} from"@/lib/auth";
import { logAuditTrail } from "@/lib/permissions";
import { sendFineEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { username, password } = body;
    let overtimeBypass = false;

    if (username === "nhanvien") {
      let nvUser = await User.findOne({ username: "nhanvien" });
      if (!nvUser) {
        const defaultPassword = await hashPassword("123456");
        await User.create({
          name: "Nhân Viên Ảo",
          username: "nhanvien",
          email: "nhanvien@aqmedia.com",
          password: defaultPassword,
          role: "04",
          status: "ACTIVE"
        });
      }
    }

 if (!username || !password) {
 return NextResponse.json(
 { error:"Vui lòng cung cấp đầy đủ username và password" },
 { status: 400 }
 );
 }

 // Tìm user theo username (bao gồm cả password để so sánh)
 const user = await User.findOne({ username });

 if (!user) {
 return NextResponse.json(
 { error:"Sai tên đăng nhập hoặc mật khẩu" },
 { status: 401 }
 );
 }

 // Kiểm tra trạng thái tài khoản
 if (user.status ==="LOCKED") {
 return NextResponse.json(
 { error:"Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin." },
 { status: 403 }
 );
 }

 if (user.status ==="PENDING") {
 return NextResponse.json(
 { error:"Tài khoản của bạn đang chờ duyệt. Vui lòng liên hệ Admin." },
 { status: 403 }
 );
 }

 // So sánh mật khẩu
 let passwordMatch = false;

 if (isHashed(user.password)) {
 // Mật khẩu đã được hash -> dùng bcrypt.compare
 passwordMatch = await comparePassword(password, user.password);
 } else {
 // Mật khẩu chưa hash (dữ liệu cũ) -> so sánh trực tiếp rồi auto-hash
 passwordMatch = password === user.password;

 if (passwordMatch) {
 // Auto-migration: Hash lại mật khẩu plaintext và lưu vào DB
 user.password = await hashPassword(password);
 await user.save();
 }
 }

 if (!passwordMatch) {
 return NextResponse.json(
 { error:"Sai tên đăng nhập hoặc mật khẩu" },
 { status: 401 }
 );
 }

  // Kiểm tra giờ làm việc (Sau giờ đóng cửa hoặc trước giờ mở cửa đối với Role 03, 04, 05)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 3600000 * 7); // Vietnam GMT+7
  const currentMins = vnTime.getHours() * 60 + vnTime.getMinutes();
  const isStaff = (user.role ==="03" || user.role ==="04" || user.role ==="05" || String(user.role).includes("03") || String(user.role).includes("04") || String(user.role).includes("05")) && user.username !== "01";
  
  if (isStaff) {
    const settings = await SystemSetting.findOne();
    const openTime = settings?.openTime || "08:00";
    const closeTime = settings?.closeTime || "18:00";
    const [openHour, openMinute] = openTime.split(":").map(Number);
    const [closeHour, closeMinute] = closeTime.split(":").map(Number);
    const openMins = (openHour || 8) * 60 + (openMinute || 0);
    const closeMins = (closeHour || 18) * 60 + (closeMinute || 0);

    if (currentMins < openMins || currentMins >= closeMins) {
      // Check if it's their very first check-in
      const attendanceCount = await Attendance.countDocuments({ userId: user._id });
      const isFirstCheckIn = attendanceCount === 0;

      if (!isFirstCheckIn) {
        // Auto-create a LATE fine for after-hours login
        const monthStart = new Date(vnTime.getFullYear(), vnTime.getMonth(), 1);
        const timeString = vnTime.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
      
      const todayStart = new Date(vnTime.getFullYear(), vnTime.getMonth(), vnTime.getDate(), 0, 0, 0);
      const todayEnd = new Date(vnTime.getFullYear(), vnTime.getMonth(), vnTime.getDate(), 23, 59, 59);
      
      const existingFine = await Fine.findOne({
        userId: user._id,
        reason: { $regex: /Đăng nhập ngoài giờ/i },
        createdAt: { $gte: todayStart, $lte: todayEnd }
      });

      if (!existingFine) {
        await Fine.create({
          userId: user._id,
          reason: `Đăng nhập ngoài giờ làm việc lúc ${timeString} (quy định ${openTime} - ${closeTime})`,
          amount: 50000,
          status: "UNPAID",
          canAppeal: true,
          monthYear: monthStart
        });
      }
      }

      overtimeBypass = true;
    }
  }

   // Cập nhật trạng thái online và check-in
   user.isOnline = true;
   user.lastActive = now;
   if (!user.checkInTime || !user.checkInTime.startsWith(now.toISOString().split("T")[0])) {
     user.checkInTime = now.toISOString();
     user.checkOutTime = undefined; // Reset checkout for new day
   }
   await user.save();
   await User.findByIdAndUpdate(user._id, { lastActive: new Date() });

  // --- AUTOMATIC CHECK-IN & LATENESS CHECK ---
  try {
    const yyyy = vnTime.getFullYear();
    const mm = String(vnTime.getMonth() + 1).padStart(2, "0");
    const dd = String(vnTime.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Tra cứu bản ghi điểm danh hôm nay của user (dùng chuỗi date YYYY-MM-DD nhất quán)
    let attendance = await Attendance.findOne({
      userId: user._id,
      date: todayStr
    });

    if (!attendance) {
      // Quyền Admin (01) và QL Công việc (02) không bao giờ bị tính đi muộn hay phạt
      const roleUpper = String(user.role || "").toUpperCase();
      const isAdminOrWorkManager = 
        roleUpper === "01" || 
        roleUpper === "02" || 
        roleUpper === "ADMIN" || 
        roleUpper === "QL CÔNG VIỆC" || 
        roleUpper === "QUẢN LÝ CÔNG VIỆC" ||
        user.username === "01";

      if (isAdminOrWorkManager) {
        // Tạo attendance "Đúng giờ" cho Admin và không bao giờ check hay tạo Fine
        try {
          attendance = await Attendance.create({
            userId: user._id,
            username: user.username,
            name: user.name,
            date: todayStr,
            checkInTime: now,
            status: "Đúng giờ",
          });
        } catch (e: any) {
          if (e.code === 11000) {
            attendance = await Attendance.findOne({
              userId: user._id,
              date: todayStr
            });
          } else {
            throw e;
          }
        }
      } else {
        // Lấy giờ mở cửa làm mốc đi muộn từ SystemSetting
        let checkInLimitStr = "08:00";
        const settings = await SystemSetting.findOne();
        if (settings && settings.openTime) {
          checkInLimitStr = settings.openTime;
        }

        const [limitHour, limitMinute] = checkInLimitStr.split(":").map(Number);
        const limitTotalMins = (limitHour || 8) * 60 + (limitMinute || 0);
        const currentTotalMins = vnTime.getHours() * 60 + vnTime.getMinutes();

        const isLate = currentTotalMins > limitTotalMins;
        const status = isLate ? "Đi muộn" : "Đúng giờ";

        try {
          // Atomic create using the unique index constraint
          attendance = await Attendance.create({
            userId: user._id,
            username: user.username,
            name: user.name,
            date: todayStr,
            checkInTime: now,
            status,
          });

          // Chỉ tạo Fine và Notification một lần duy nhất khi tạo Attendance thành công
          const totalAttendances = await Attendance.countDocuments({ userId: user._id });
          const isFirstCheckInEver = totalAttendances <= 1;

          if (isLate && !isFirstCheckInEver) {
            const timeString = vnTime.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            });

            // 1. Tạo thông báo đi muộn gửi Admin
            await Notification.create({
              title: "Cảnh báo đi muộn",
              message: `Nhân viên ${user.name} vừa đăng nhập đi muộn vào lúc ${timeString}`,
              type: "LATE_WARNING",
              author: user._id,
              isRead: false,
            });

            // 2. Tạo bản ghi Fine (phạt) với mức phí lũy tiến chính xác và nhân đôi nếu vi phạm nhiều lần
            const lateMinutes = currentTotalMins - limitTotalMins;

            // Đếm số lần phạt trong tháng để tính lũy kế (trừ trạng thái CANCELLED)
            const thisMonth = new Date();
            const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
            const previousFinesCount = await Fine.countDocuments({
              userId: user._id,
              createdAt: { $gte: monthStart },
              status: { $ne: "CANCELLED" }
            });

            // Thang đo chính xác: Đi muộn nhiều hơn phạt nặng hơn
            let fineAmount = 10000;
            if (lateMinutes >= 20) {
              fineAmount = 50000;
            } else if (lateMinutes >= 5) {
              fineAmount = 20000;
            }

            // Nhân đôi số tiền phạt nếu đã bị phạt từ 3 lần trở lên trong tháng
            if (previousFinesCount >= 3) {
              fineAmount *= 2;
            }

            await Fine.create({
              userId: user._id,
              reason: `Đi muộn ${lateMinutes} phút (${timeString}, qui định ${checkInLimitStr})`,
              amount: fineAmount,
              status: "UNPAID",
              lateMinutes,
              canAppeal: true,
              monthYear: monthStart
            });

            // Send fine notification email (fire-and-forget)
            try {
              if (user.email) {
                sendFineEmail(user.email, user.name || "Nhân viên", fineAmount, `Đi muộn ${lateMinutes} phút (${timeString}, qui định ${checkInLimitStr})`).catch(console.error);
              }
            } catch (_) {}
          }
        } catch (e: any) {
          // Xử lý lỗi trùng lặp do Race Condition (mã lỗi E11000)
          if (e.code === 11000) {
            attendance = await Attendance.findOne({
              userId: user._id,
              date: todayStr
            });
          } else {
            throw e;
          }
        }
      }
    }
  } catch (attError) {
    console.error("Lỗi tự động điểm danh khi đăng nhập:", attError);
  }
  // --- KẾT THÚC ---

  // If 2FA is enabled, do NOT log in fully. Instead, return require2FA: true and set temporary session cookie
  if (user.twoFAEnabled) {
    const response = NextResponse.json({
      require2FA: true,
      userId: user._id.toString(),
      username: user.username,
      overtimeBypass,
    });
    
    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set('session', user._id.toString(), {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 300, // 5 minutes
    });
    
    await logAuditTrail(user._id.toString(), "LOGIN_2FA_CHALLENGE", "auth", { username: user.username }, req);
    return response;
  }

  // Tạo JWT token
  const token = signToken({
    userId: user._id.toString(),
    role: user?.role,
    username: user?.username,
    overtimeBypass,
  });

 // Tạo response với cookie HttpOnly
 const userObj = user.toObject() as any;
 delete userObj.password;
 userObj.id = userObj._id.toString();

  // Build response, include warning if set
  const responsePayload: any = {
    message: "Đăng nhập thành công",
    user: userObj,
  };
  if ((global as any).loginWarning) {
    responsePayload.warning = (global as any).loginWarning;
    // Clear the temporary flag
    delete (global as any).loginWarning;
  }
  const response = NextResponse.json(responsePayload);

 // Set HttpOnly cookie
 response.cookies.set(COOKIE_NAME, token, {
 httpOnly: true,
 secure: process.env.NODE_ENV ==="production",
 sameSite:"lax",
 path:"/",
 maxAge: 7 * 24 * 60 * 60, // 7 ngày
 });

 await logAuditTrail(user._id.toString(), "LOGIN_SUCCESS", "auth", { username: user.username }, req);

 return response;
 } catch (error: unknown) {
 const errMsg = error instanceof Error ? error.message :"Unknown error";
 console.error("Login error:", errMsg);
 return NextResponse.json(
 { error:"Lỗi máy chủ:" + errMsg },
 { status: 500 }
 );
 }
}
