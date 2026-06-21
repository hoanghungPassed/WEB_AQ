export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Log } from "@/models/Log";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    // Require staff management or admin permissions (level >= 3)
    const hasPermission = await checkPermission(userRole || "", 3, ["all", "staff"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_GET_USER_ACTIVITY", "users", {}, req);
      return NextResponse.json({ error: "Không có quyền truy cập nhật ký hoạt động nhân sự" }, { status: 403 });
    }

    await dbConnect();
    
    // Check if a specific target user ID filter was passed
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");
    
    let filter: any = {};
    if (targetUserId) {
      filter = {
        $or: [
          { user: targetUserId },
          { userId: targetUserId }
        ]
      };
    }

    const logs = await Log.find(filter)
      .populate("user", "name username")
      .sort({ createdAt: -1 })
      .limit(100) // Limit to 100 recent actions to prevent slow queries
      .lean();

    return NextResponse.json(logs || []);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Error fetching user activity:", error);
    return NextResponse.json([], { status: 500 });
  }
}
