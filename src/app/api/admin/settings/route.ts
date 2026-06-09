import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { SystemSetting } from "@/models/SystemSetting";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({
        brandName: "AQ MEDIA",
        openTime: "08:00",
        closeTime: "18:00",
        checkInTime: "17:30"
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("GET settings error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

function calculateEndTime(workStart: string, breakStart: string, breakEnd: string): string {
  try {
    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return (h * 60) + m;
    };

    const startMins = parseTime(workStart);
    const breakStartMins = parseTime(breakStart);
    const breakEndMins = parseTime(breakEnd);

    // Calculate break duration in minutes
    let breakDuration = 0;
    if (breakEndMins >= breakStartMins) {
      breakDuration = breakEndMins - breakStartMins;
    } else {
      // Handle cross-day break (unlikely but safe to have)
      breakDuration = (24 * 60 - breakStartMins) + breakEndMins;
    }

    // 8 hours = 480 minutes
    const totalDuration = 480 + breakDuration;
    const endMins = (startMins + totalDuration) % (24 * 60);

    const endH = Math.floor(endMins / 60);
    const endM = endMins % 60;

    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  } catch (e) {
    console.error("Error calculating end time:", e);
    return "17:30"; // Fallback
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "staff", "reports", "attendance", "tasks"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_UPDATE_SETTINGS", "settings", {}, req);
      return NextResponse.json(
        { error: "Không có quyền thực hiện thao tác này" },
        { status: 403 }
      );
    }

    await dbConnect();
    const data = await req.json();
    
    // Support both workStartTime/workEndTime and openTime/closeTime naming conventions
    const start = data.workStartTime !== undefined ? data.workStartTime : data.openTime;
    const bStart = data.breakStartTime !== undefined ? data.breakStartTime : "12:00";
    const bEnd = data.breakEndTime !== undefined ? data.breakEndTime : "13:30";

    const updateData: any = {};
    if (data.brandName !== undefined) updateData.brandName = data.brandName;
    if (start !== undefined) updateData.openTime = start;
    if (bStart !== undefined) updateData.breakStartTime = bStart;
    if (bEnd !== undefined) updateData.breakEndTime = bEnd;
    if (data.checkInTime !== undefined) updateData.checkInTime = data.checkInTime;

    // Automatically calculate closeTime (workEndTime)
    if (start !== undefined) {
       updateData.closeTime = calculateEndTime(start, updateData.breakStartTime || bStart, updateData.breakEndTime || bEnd);
    }

    const settings = await SystemSetting.findOneAndUpdate(
      {},
      { $set: updateData },
      { upsert: true, new: true }
    );

    await logAuditTrail(userId || "system", "UPDATE_SETTINGS_SUCCESS", "settings", updateData, req);

    return NextResponse.json({ success: true, data: settings });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("PUT settings error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
