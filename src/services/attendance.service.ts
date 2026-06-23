import User, { IUser } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { Fine } from "@/models/Fine";
import { Notification } from "@/models/Notification";
import { ISystemSetting } from "@/models/SystemSetting";

export interface ProcessAttendanceResult {
  overtimeBypass: boolean;
  shouldBeOnline: boolean;
  overtimeFineCreated?: {
    amount: number;
    reason: string;
  };
  lateFineCreated?: {
    amount: number;
    reason: string;
  };
}

/**
 * Handles the business logic for verifying working hours, lateness locking,
 * logging attendance, and registering fines during login.
 * Modifies the user object state and saves changes to the database.
 */
export async function processLoginAttendance(
  user: IUser,
  settings: ISystemSetting
): Promise<ProcessAttendanceResult> {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 3600000 * 7); // Vietnam GMT+7
  const currentMins = vnTime.getHours() * 60 + vnTime.getMinutes();

  const yyyy = vnTime.getFullYear();
  const mm = String(vnTime.getMonth() + 1).padStart(2, "0");
  const dd = String(vnTime.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const todayAttendance = await Attendance.findOne({
    userId: user._id,
    date: todayStr,
  });

  if (todayAttendance) {
    const isLocked = user.status !== "ACTIVE" || !!user.isLateLocked;
    user.isOnline = !isLocked;
    user.lastActive = !isLocked ? now : null;
    await user.save();

    return {
      overtimeBypass: false,
      shouldBeOnline: !isLocked,
    };
  }
  const isStaff =
    (user.role === "03" ||
      user.role === "04" ||
      user.role === "05" ||
      String(user.role).includes("03") ||
      String(user.role).includes("04") ||
      String(user.role).includes("05")) &&
    user.username !== "01";

  let overtimeBypass = false;
  let overtimeFineCreated: { amount: number; reason: string } | undefined = undefined;
  let lateFineCreated: { amount: number; reason: string } | undefined = undefined;

  if (isStaff) {
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

        const nowForFine = new Date();
        const vnTimeForFine = new Date(nowForFine.getTime() + 7 * 60 * 60 * 1000);
        vnTimeForFine.setUTCHours(0, 0, 0, 0);
        const todayStart = new Date(vnTimeForFine.getTime() - 7 * 60 * 60 * 1000);
        vnTimeForFine.setUTCHours(23, 59, 59, 999);
        const todayEnd = new Date(vnTimeForFine.getTime() - 7 * 60 * 60 * 1000);

        const existingFine = await Fine.findOne({
          userId: user._id,
          reason: { $regex: /Đăng nhập ngoài giờ/i },
          createdAt: { $gte: todayStart, $lte: todayEnd },
        });

        if (!existingFine) {
          const reason = `Đăng nhập ngoài giờ làm việc lúc ${timeString} (quy định ${openTime} - ${closeTime})`;
          await Fine.create({
            userId: user._id,
            reason,
            amount: 50000,
            status: "UNPAID",
            canAppeal: true,
            monthYear: monthStart,
          });

          overtimeFineCreated = {
            amount: 50000,
            reason,
          };
        }
      }

      overtimeBypass = true;
    }
  }

  // Check Sunday, working hours, and lateness locks
  let shouldBeOnline = true;
  if (user.status !== "ACTIVE") {
    shouldBeOnline = false;
  }

  if (isStaff) {
    const openTime = settings?.openTime || "08:00";
    const closeTime = settings?.closeTime || "18:00";
    const [openHour, openMinute] = openTime.split(":").map(Number);
    const [closeHour, closeMinute] = closeTime.split(":").map(Number);
    const openMins = (openHour || 8) * 60 + (openMinute || 0);
    const closeMins = (closeHour || 18) * 60 + (closeMinute || 0);

    const isSunday = vnTime.getDay() === 0;
    const isSundayLocked = isSunday;
    const isWithinWorkingHours = currentMins >= openMins - 10 && currentMins < closeMins;
    const isOutsideHoursLocked = !isWithinWorkingHours;
    const isLate = currentMins > openMins;

    const attendanceCount = await Attendance.countDocuments({ userId: user._id });
    const isFirstCheckIn = attendanceCount === 0;
    const willBeLateLocked = isLate && !isFirstCheckIn;

    if (willBeLateLocked) {
      user.isLateLocked = true;
    }

    const hasAccessApproval =
      user.accessApprovedUntil && new Date(user.accessApprovedUntil) > new Date();

    if (
      user.isLateLocked ||
      willBeLateLocked ||
      (isSundayLocked && !hasAccessApproval) ||
      (isOutsideHoursLocked && !hasAccessApproval)
    ) {
      shouldBeOnline = false;
    }
  }

  // Cập nhật trạng thái online và check-in
  user.isOnline = shouldBeOnline;
  user.lastActive = shouldBeOnline ? now : null;
  if (!user.checkInTime || !user.checkInTime.startsWith(now.toISOString().split("T")[0])) {
    user.checkInTime = now.toISOString();
    user.checkOutTime = undefined; // Reset checkout for new day
  }
  await user.save();

  if (shouldBeOnline) {
    await User.findByIdAndUpdate(user._id, { lastActive: new Date() });
  }

  // --- AUTOMATIC CHECK-IN & LATENESS CHECK ---
  try {
    const yyyy = vnTime.getFullYear();
    const mm = String(vnTime.getMonth() + 1).padStart(2, "0");
    const dd = String(vnTime.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    let attendance = await Attendance.findOne({
      userId: user._id,
      date: todayStr,
    });

    if (!attendance) {
      const roleUpper = String(user.role || "").toUpperCase();
      const isAdminOrWorkManager =
        roleUpper === "01" ||
        roleUpper === "02" ||
        roleUpper === "ADMIN" ||
        roleUpper === "QL CÔNG VIỆC" ||
        roleUpper === "QUẢN LÝ CÔNG VIỆC" ||
        user.username === "01";

      if (isAdminOrWorkManager) {
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
              date: todayStr,
            });
          } else {
            throw e;
          }
        }
      } else {
        let checkInLimitStr = "08:00";
        if (settings && settings.openTime) {
          checkInLimitStr = settings.openTime;
        }

        const [limitHour, limitMinute] = checkInLimitStr.split(":").map(Number);
        const limitTotalMins = (limitHour || 8) * 60 + (limitMinute || 0);
        const currentTotalMins = vnTime.getHours() * 60 + vnTime.getMinutes();

        const isLate = currentTotalMins > limitTotalMins;
        const status = isLate ? "Đi muộn" : "Đúng giờ";

        try {
          attendance = await Attendance.create({
            userId: user._id,
            username: user.username,
            name: user.name,
            date: todayStr,
            checkInTime: now,
            status,
          });

          const totalAttendances = await Attendance.countDocuments({ userId: user._id });
          const isFirstCheckInEver = totalAttendances <= 1;

          if (isLate && !isFirstCheckInEver) {
            const timeString = vnTime.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            });

            await Notification.create({
              title: "Cảnh báo đi muộn",
              message: `Nhân viên ${user.name} vừa đăng nhập đi muộn vào lúc ${timeString}`,
              type: "LATE_WARNING",
              author: user._id,
              isRead: false,
            });

            const lateMinutes = currentTotalMins - limitTotalMins;

            const thisMonth = new Date();
            const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
            const previousFinesCount = await Fine.countDocuments({
              userId: user._id,
              createdAt: { $gte: monthStart },
              status: { $ne: "CANCELLED" },
            });

            let fineAmount = 10000;
            if (lateMinutes >= 20) {
              fineAmount = 50000;
            } else if (lateMinutes >= 5) {
              fineAmount = 20000;
            }

            if (previousFinesCount >= 3) {
              fineAmount *= 2;
            }

            const reason = `Đi muộn ${lateMinutes} phút (${timeString}, qui định ${checkInLimitStr})`;
            await Fine.create({
              userId: user._id,
              reason,
              amount: fineAmount,
              status: "UNPAID",
              lateMinutes,
              canAppeal: true,
              monthYear: monthStart,
            });

            lateFineCreated = {
              amount: fineAmount,
              reason,
            };
          }
        } catch (e: any) {
          if (e.code === 11000) {
            attendance = await Attendance.findOne({
              userId: user._id,
              date: todayStr,
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

  return {
    overtimeBypass,
    shouldBeOnline,
    overtimeFineCreated,
    lateFineCreated,
  };
}
