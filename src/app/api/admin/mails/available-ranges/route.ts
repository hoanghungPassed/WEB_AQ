export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { SatelliteMail } from "@/models/SatelliteMail";
import { getAuthUser } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    // ── Auth & Permissions ──
    let userId = req.headers.get("x-user-id");
    let userRole = req.headers.get("x-user-role");

    if (!userId) {
      const authUser = await getAuthUser();
      if (authUser) {
        userId = authUser.userId;
        userRole = authUser.role;
      }
    }

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "tasks", "staff"]);
    if (!hasPermission) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    await dbConnect();

    // Query active unassigned satellite mails.
    // We check for isAssigned: false or missing, and status as ACTIVE or LIVE to be fully robust.
    const availableMails = await SatelliteMail.find({
      $or: [{ isAssigned: false }, { isAssigned: { $exists: false } }],
      status: { $in: ["ACTIVE", "LIVE"] }
    }).sort({ createdAt: 1 });

    const ranges = [];
    const chunkSize = 17;
    for (let i = 0; i < availableMails.length; i += chunkSize) {
      const chunk = availableMails.slice(i, i + chunkSize);
      ranges.push({
        rangeIndex: (i / chunkSize) + 1, // Dải 1, Dải 2...
        count: chunk.length, // 17, 15...
        startIndex: i + 1, // STT bắt đầu 1, 18...
        endIndex: i + chunk.length, // STT kết thúc 17, 32...
        mailIds: chunk.map(m => m._id) // Mảng ID để đem đi gán
      });
    }

    return NextResponse.json({ success: true, data: ranges });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("GET available-ranges error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
