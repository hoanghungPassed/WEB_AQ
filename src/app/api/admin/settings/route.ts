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
    let start = data.workStartTime !== undefined ? data.workStartTime : data.openTime;
    let end = data.workEndTime !== undefined ? data.workEndTime : data.closeTime;

    if (start !== undefined && end === undefined) {
      // Automatically add 8 hours to start time to calculate closeTime (workEndTime)
      const parts = start.split(":");
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const endHours = (hours + 8) % 24;
      end = `${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }

    const updateData: any = {};
    if (data.brandName !== undefined) updateData.brandName = data.brandName;
    if (start !== undefined) updateData.openTime = start;
    if (end !== undefined) updateData.closeTime = end;
    if (data.checkInTime !== undefined) updateData.checkInTime = data.checkInTime;

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
