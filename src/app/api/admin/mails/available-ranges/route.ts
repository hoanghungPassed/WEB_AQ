export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { SatelliteMail } from "@/models/SatelliteMail";
import { getAuthUser } from "@/lib/auth";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    let userId = req.headers.get("x-user-id");
    let userRole = req.headers.get("x-user-role");

    if (!userId) {
      const authUser = await getAuthUser();
      if (authUser) {
        userId = authUser.userId;
        userRole = authUser.role;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "tasks", "staff"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_ACCESS_AVAILABLE_RANGES", "mails", {}, req);
      return NextResponse.json({ error: "Không có quyền truy cập kho mail" }, { status: 403 });
    }

    await dbConnect();

    // Truy vấn tất cả SatelliteMail rảnh (isAssigned: false), sắp xếp theo thời gian tạo cũ nhất trước.
    const availableMails = await SatelliteMail.find({
      isAssigned: false,
      type: 'SATELLITE'
    }).sort({ createdAt: 1 });

    const chunkSize = 17;
    const chunks = [];

    for (let i = 0; i < availableMails.length; i += chunkSize) {
      const chunkMails = availableMails.slice(i, i + chunkSize);
      const rangeIndex = Math.floor(i / chunkSize) + 1;
      
      chunks.push({
        rangeIndex,
        count: chunkMails.length,
        startIndex: i + 1,
        endIndex: i + chunkMails.length,
        mailIds: chunkMails.map(m => m._id.toString())
      });
    }

    return NextResponse.json(chunks);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("GET available ranges error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
