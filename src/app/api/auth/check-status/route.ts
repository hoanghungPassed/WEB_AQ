export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { pusherServer } from "@/lib/pusher";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "Thiếu username" }, { status: 400 });
    }

    const lowercaseUsername = username.toLowerCase();
    const user = await User.findOne({ username: lowercaseUsername });

    if (!user) {
      // Nếu không tìm thấy (admin xóa hoặc từ chối trực tiếp), coi như bị từ chối (REJECTED)
      return NextResponse.json({ status: "REJECTED" });
    }

    // Vietnam ICT Time check
    const nowTime = new Date();
    const utcTime = nowTime.getTime() + nowTime.getTimezoneOffset() * 60000;
    const vnTime = new Date(utcTime + 3600000 * 7); // Vietnam GMT+7
    const vnTotalMinutes = vnTime.getHours() * 60 + vnTime.getMinutes();
    const isSunday = vnTime.getDay() === 0;

    let openTimeStr = "08:00";
    let closeTimeStr = "17:30";
    try {
      const { SystemSetting } = await import("@/models/SystemSetting");
      const settings = await SystemSetting.findOne({});
      if (settings) {
        if (settings.openTime) openTimeStr = settings.openTime;
        if (settings.closeTime) closeTimeStr = settings.closeTime;
      }
    } catch (e) {
      console.error("Failed to load settings in check-status:", e);
    }

    const [openH, openM] = openTimeStr.split(":").map(Number);
    const [closeH, closeM] = closeTimeStr.split(":").map(Number);
    const startMins = openH * 60 + openM - 10; // Allow 10 minutes early check-in
    const closeMins = closeH * 60 + closeM;

    const isWithinWorkingHours = vnTotalMinutes >= startMins && vnTotalMinutes < closeMins;
    const roleStr = String(user.role || "");
    const isRestrictedRole = (roleStr === "03" || roleStr === "04" || roleStr === "05") && user.username !== "01";

    const isSundayLocked = isSunday && isRestrictedRole;
    const isOutsideHoursLocked = !isWithinWorkingHours && isRestrictedRole;

    let isAccessGranted = user.status === "ACTIVE" && !user.isLateLocked;

    if (isAccessGranted && (isSundayLocked || isOutsideHoursLocked)) {
      // Must have unexpired access approval date in DB
      const hasAccessApproval = user.accessApprovedUntil && new Date(user.accessApprovedUntil) > new Date();
      if (!hasAccessApproval) {
        isAccessGranted = false;
      }
    }

    // Ánh xạ trạng thái từ Database:
    // PENDING -> PENDING
    // ACTIVE -> ACTIVE (only if not late-locked and inside authorized access time)
    // LOCKED -> REJECTED
    let responseStatus: "PENDING" | "ACTIVE" | "REJECTED" = "PENDING";

    const shouldBeOnline = isAccessGranted;
    if (user.isOnline !== shouldBeOnline) {
      user.isOnline = shouldBeOnline;
      if (shouldBeOnline) {
        user.lastActive = new Date();
      }
      await user.save();

      try {
        await pusherServer.trigger("system", "user-status-changed", {
          userId: user._id.toString(),
          isOnline: shouldBeOnline
        });
        await pusherServer.trigger("system-users", "status-changed", {
          userId: user._id.toString(),
          username: user.username,
          isOnline: shouldBeOnline,
          lastActive: shouldBeOnline ? user.lastActive : null
        });
      } catch (pushErr) {
        console.error("Pusher error in check-status:", pushErr);
      }
    } else if (shouldBeOnline) {
      user.lastActive = new Date();
      await user.save();
    }

    if (isAccessGranted) {
      responseStatus = "ACTIVE";
    } else {
      if (user.status === "LOCKED" || user.isLateLocked) {
        responseStatus = "REJECTED";
      }
    }

    return NextResponse.json({ 
      status: responseStatus,
      isLateLocked: user.isLateLocked || false,
      userStatus: user.status || "PENDING"
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Lỗi API check-status:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}
