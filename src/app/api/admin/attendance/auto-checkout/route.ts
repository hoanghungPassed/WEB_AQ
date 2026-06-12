export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { Notification } from "@/models/Notification";
import { logAction } from "@/lib/logger";
import { logAuditTrail } from "@/lib/permissions";
import { pusherServer } from "@/lib/pusher";

/**
 * Auto Checkout Job
 * 
 * Runs daily at 18:30 (or configurable) to automatically checkout
 * staff who forgot to checkout. This prevents missing working hours.
 * 
 * Trigger methods:
 *   1. Frontend timer in layout.tsx (client-side fallback at 17:30)
 *   2. External cron / Vercel Cron hitting GET or POST
 *   3. Manual admin trigger via POST
 * 
 * Security: GET is open for cron services (secured via CRON_SECRET header).
 *           POST requires level-5 permission OR valid CRON_SECRET.
 */

// GET — designed for external cron services (Vercel Cron, system crontab)
export async function GET(req: NextRequest) {
  // Validate cron secret if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return runAutoCheckout(req, "CRON");
}

// POST — admin or client-side trigger
export async function POST(req: NextRequest) {
  // Allow cron secret OR rely on existing permission check
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCronCall) {
    const userRole = req.headers.get("x-user-role");
    const userId = req.headers.get("x-user-id");
    
    // Strictly only allow Admin/Manager (Level 4+) to trigger manually
    const { checkPermission } = await import("@/lib/permissions");
    const hasPermission = await checkPermission(userRole || "", 4, ["all", "attendance"]);
    
    if (!hasPermission) {
      return NextResponse.json({ error: "Không có quyền kích hoạt lệnh này" }, { status: 403 });
    }
  }

  return runAutoCheckout(req, isCronCall ? "CRON" : "MANUAL");
}

async function runAutoCheckout(req: NextRequest, triggerSource: "CRON" | "MANUAL") {
  try {
    await dbConnect();

    // Automatically sweep stale online statuses before doing checkout
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      await User.updateMany(
        { isOnline: true, lastActive: { $lt: fifteenMinutesAgo } },
        { $set: { isOnline: false } }
      );
    } catch (_) {}

    // 1. Get Vietnam time (UTC+7)
    const now = new Date();
    // Use an explicit UTC offset to get VN time regardless of server TZ
    const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const yyyy = vnTime.getUTCFullYear();
    const mm = String(vnTime.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(vnTime.getUTCDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const vnHours = vnTime.getUTCHours();
    const vnMinutes = vnTime.getUTCMinutes();
    const vnTimeStr = `${String(vnHours).padStart(2, "0")}:${String(vnMinutes).padStart(2, "0")}`;

    // 2. Find all Attendance records for today and prior days that have checkInTime but NO checkOutTime
    const incompleteAttendance = await Attendance.find({
      date: { $lte: todayStr },
      checkInTime: { $exists: true, $ne: null },
      $or: [
        { checkOutTime: { $exists: false } },
        { checkOutTime: null }
      ]
    }).populate("userId");

    // Count currently online staff for logging (roles: 03, 04, 05)
    const staffOnlineCount = await User.countDocuments({
      isOnline: true,
      role: { $in: ["03", "04", "05"] },
      status: "ACTIVE"
    });

    let checkedOutCount = 0;
    let skippedCount = 0;
    const results: Array<{ username: string; name: string; totalHours: number }> = [];
    const userBulkOps = [];
    const attendanceBulkOps = [];

    for (const record of incompleteAttendance) {
      try {
        const staff = record.userId as any;
        if (!staff || staff.deletedAt) continue;

        // Skip Admin/Manager (roles 01, 02)
        if (!["03", "04", "05"].includes(staff.role)) {
          skippedCount++;
          continue;
        }

        // Determine checkout time: use staff's offWorkTime or default 18:00
        const offTime = staff.offWorkTime || "18:00";
        let [offH, offM] = offTime.split(":").map(Number);
        if (isNaN(offH) || isNaN(offM)) {
          offH = 18;
          offM = 0;
        }
        
        // Build checkout date in UTC
        const [recY, recM, recD] = record.date.split("-").map(Number);
        let checkoutTime = new Date(Date.UTC(recY, recM - 1, recD, offH - 7, offM, 0, 0));

        if (record.checkInTime && checkoutTime.getTime() <= new Date(record.checkInTime).getTime()) {
          checkoutTime = new Date(new Date(record.checkInTime).getTime() + 60 * 1000);
        }

        // Calculate total hours
        let totalHours = 0;
        if (record.checkInTime) {
          const diffInMs = checkoutTime.getTime() - new Date(record.checkInTime).getTime();
          totalHours = diffInMs / (1000 * 60 * 60);
          totalHours = parseFloat((totalHours > 0 ? totalHours : 0).toFixed(2));
        }

        // A. Queue Attendance update
        attendanceBulkOps.push({
          updateOne: {
            filter: { _id: record._id },
            update: { $set: { checkOutTime: checkoutTime, totalHours: totalHours } }
          }
        });

        // B. Queue User update
        userBulkOps.push({
          updateOne: {
            filter: { _id: staff._id },
            update: { $set: { 
              checkOutTime: checkoutTime.toISOString(),
              isOnline: false,
              lastActive: now 
            } }
          }
        });

        // C. Create notification (separate as they are new documents)
        try {
          await Notification.create({
            title: "Tự động Checkout",
            message: `Bạn đã được hệ thống tự động checkout lúc ${offTime}. Tổng giờ làm: ${totalHours.toFixed(1)}h.`,
            type: "SYSTEM",
            recipientId: staff._id,
            isRead: false,
          });
        } catch (_) {}

        // D. Log & Pusher (fire and forget)
        try {
          pusherServer.trigger("system-users", "status-changed", {
            userId: staff._id.toString(),
            username: staff.username,
            isOnline: false,
            lastActive: now,
            autoCheckout: true
          }).catch(() => {});
        } catch (_) {}

        results.push({
          username: staff.username,
          name: staff.name,
          totalHours,
        });

        checkedOutCount++;
      } catch (staffErr) {
        console.error(`Auto-checkout calculation failed for attendance record ${record._id}:`, staffErr);
      }
    }

    // Execute Bulk Updates
    if (attendanceBulkOps.length > 0) await Attendance.bulkWrite(attendanceBulkOps);
    if (userBulkOps.length > 0) await User.bulkWrite(userBulkOps);

    // Audit trail
    await logAuditTrail(
      "system",
      "RUN_AUTO_CHECKOUT_SUCCESS",
      "attendance",
      {
        triggerSource,
        date: todayStr,
        time: vnTimeStr,
        checkedOutCount,
        skippedCount,
        totalOnline: staffOnlineCount,
      },
      req
    );

    // System log
    try {
      const { Log } = await import("@/models/Log");
      await Log.create({
        user: "System",
        role: "SYSTEM",
        action: `[Auto-Checkout] ${todayStr} lúc ${vnTimeStr}: Đã checkout ${checkedOutCount}/${staffOnlineCount} nhân viên (${triggerSource})`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN"),
      });
    } catch (logErr) {
      console.error("System log error:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Auto checkout hoàn tất: ${checkedOutCount} nhân viên đã được checkout`,
      data: {
        date: todayStr,
        time: vnTimeStr,
        triggerSource,
        checkedOutCount,
        skippedCount,
        totalOnline: staffOnlineCount,
        details: results,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Auto-checkout error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
