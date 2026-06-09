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
    // Existing permission check: any logged-in user can trigger (level 5 = lowest)
    // The frontend already calls this for all users at 17:30
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

    const userId = req.headers.get("x-user-id");

    // Get Vietnam time
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const vnTime = new Date(utc + 3600000 * 7); // Vietnam GMT+7
    const yyyy = vnTime.getFullYear();
    const mm = String(vnTime.getMonth() + 1).padStart(2, "0");
    const dd = String(vnTime.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const vnHours = vnTime.getHours();
    const vnMinutes = vnTime.getMinutes();
    const vnTimeStr = `${String(vnHours).padStart(2, "0")}:${String(vnMinutes).padStart(2, "0")}`;

    // Find staff who are still online (roles: 03=QL Nhân sự, 04=Nhân viên, 05=NV Thử việc)
    const staffOnline = await User.find({
      isOnline: true,
      role: { $in: ["03", "04", "05"] },
      status: "ACTIVE"
    });

    let checkedOutCount = 0;
    let skippedCount = 0;
    const results: Array<{ username: string; name: string; totalHours: number }> = [];

    for (const staff of staffOnline) {
      try {
        // Check if this user has already checked out today
        const hasCheckedOutToday = staff.checkOutTime && staff.checkOutTime.startsWith(todayStr);
        if (hasCheckedOutToday) {
          skippedCount++;
          continue;
        }

        // Check if they have a check-in today
        const hasCheckedInToday = staff.checkInTime && staff.checkInTime.startsWith(todayStr);
        if (!hasCheckedInToday) {
          skippedCount++;
          continue;
        }

        // Determine checkout time: use staff's offWorkTime or default 17:30
        const offTime = staff.offWorkTime || "17:30";
        const [offH, offM] = offTime.split(":").map(Number);
        const checkoutTime = new Date(vnTime);
        checkoutTime.setHours(offH, offM, 0, 0);

        // Update User record
        staff.checkOutTime = checkoutTime.toISOString();
        staff.isOnline = false;
        staff.lastActive = now;
        await staff.save();

        // Update Attendance record
        let totalHours = 0;
        const attendance = await Attendance.findOne({
          userId: staff._id,
          date: todayStr,
        });

        if (attendance && attendance.checkInTime) {
          if (!attendance.checkOutTime) {
            attendance.checkOutTime = checkoutTime;
            
            const diffInMs = checkoutTime.getTime() - new Date(attendance.checkInTime).getTime();
            totalHours = diffInMs / (1000 * 60 * 60);
            totalHours = parseFloat((totalHours > 0 ? totalHours : 0).toFixed(2));
            
            attendance.totalHours = totalHours;
            await attendance.save();
          } else {
            // Already has checkout time in attendance, compute hours
            totalHours = attendance.totalHours || 0;
          }
        }

        // Create notification for the staff member
        try {
          await Notification.create({
            title: "Tự động Checkout",
            message: `Bạn đã được hệ thống tự động checkout lúc ${offTime}. Tổng giờ làm: ${totalHours.toFixed(1)}h. Nếu bạn cần điều chỉnh, vui lòng liên hệ quản lý.`,
            type: "SYSTEM",
            recipientId: staff._id,
            isRead: false,
          });
        } catch (notifErr) {
          console.error(`Failed to create notification for ${staff.username}:`, notifErr);
        }

        // Log the action
        try {
          await logAction(
            staff._id.toString(),
            "ATTENDANCE_AUTO_CHECKOUT",
            `Hệ thống tự động check-out lúc ${vnTimeStr} cho ${staff.name} (@${staff.username}). Tổng giờ: ${totalHours.toFixed(2)}h`
          );
        } catch (logErr) {
          console.error("Log action error:", logErr);
        }

        // Trigger Real-time status update for auto-checkout
        try {
          await pusherServer.trigger("system-users", "status-changed", {
            userId: staff._id.toString(),
            username: staff.username,
            isOnline: false,
            lastActive: now,
            autoCheckout: true
          });
          
          // Private notification for the user to be kicked out or notified
          await pusherServer.trigger(`user-${staff._id}`, "auto-checkout", {
            message: `Hệ thống tự động check-out lúc ${offTime}`,
            totalHours
          });
        } catch (pushErr) {}

        results.push({
          username: staff.username,
          name: staff.name,
          totalHours,
        });

        checkedOutCount++;
      } catch (staffErr) {
        console.error(`Auto-checkout failed for ${staff.username}:`, staffErr);
      }
    }

    // Audit trail
    await logAuditTrail(
      userId || "system",
      "RUN_AUTO_CHECKOUT_SUCCESS",
      "attendance",
      {
        triggerSource,
        date: todayStr,
        time: vnTimeStr,
        checkedOutCount,
        skippedCount,
        totalOnline: staffOnline.length,
      },
      req
    );

    // System log
    try {
      const { Log } = await import("@/models/Log");
      await Log.create({
        user: "System",
        role: "SYSTEM",
        action: `[Auto-Checkout] ${todayStr} lúc ${vnTimeStr}: Đã checkout ${checkedOutCount}/${staffOnline.length} nhân viên (${triggerSource})`,
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
        totalOnline: staffOnline.length,
        details: results,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Auto-checkout error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
