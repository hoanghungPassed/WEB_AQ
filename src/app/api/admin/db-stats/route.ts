import { NextRequest, NextResponse } from"next/server";
import mongoose from"mongoose";
import dbConnect from"@/lib/mongodb";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export const dynamic ="force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "reports"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_GET_DB_STATS", "database", {}, req);
      return NextResponse.json(
        { error: "Unauthorized: Không có quyền truy cập" },
        { status: 403 }
      );
    }

    await dbConnect();
    if (!mongoose.connection.db) {
      throw new Error("Không thể kết nối đến database command");
    }
    const stats = await mongoose.connection.db.command({ dbStats: 1 });
    
    return NextResponse.json({
      success: true,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Lỗi lấy DB Stats:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
