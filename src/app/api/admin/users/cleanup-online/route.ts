export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { logAuditTrail, checkPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  return handleCleanup(req);
}

export async function POST(req: NextRequest) {
  return handleCleanup(req);
}

async function handleCleanup(req: NextRequest) {
  try {
    await dbConnect();

    // Check authorization: Cron secret OR Admin/Manager headers
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!isCronCall) {
      const hasPermission = await checkPermission(userRole || "", 3, ["all", "staff", "attendance"]);
      if (!hasPermission) {
        await logAuditTrail(userId || "unknown", "UNAUTHORIZED_RUN_ONLINE_CLEANUP", "users", {}, req);
        return NextResponse.json({ error: "Không có quyền chạy dọn dẹp trạng thái" }, { status: 403 });
      }
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Find users who are marked online but inactive for > 15 minutes
    const staleUsers = await User.find({
      isOnline: true,
      lastActive: { $lt: fifteenMinutesAgo }
    }).select("username name lastActive");

    const staleUserIds = staleUsers.map(u => u._id);

    // Atomic update
    const result = await User.updateMany(
      { _id: { $in: staleUserIds } },
      { $set: { isOnline: false } }
    );

    if (staleUsers.length > 0) {
      await logAuditTrail(
        userId || "system",
        "CLEANUP_ONLINE_SUCCESS",
        "users",
        {
          sweptCount: staleUsers.length,
          users: staleUsers.map(u => ({ username: u.username, name: u.name, lastActive: u.lastActive }))
        },
        req
      );

      try {
        const { Log } = await import("@/models/Log");
        await Log.create({
          user: "System",
          role: "SYSTEM",
          action: `[Dọn dẹp Trạng thái] Đã quét chuyển Offline ${staleUsers.length} nhân sự không hoạt động > 15 phút.`,
          type: "SUCCESS",
          timestamp: new Date().toLocaleString("vi-VN")
        });
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `Đã quét dọn dẹp xong. Chuyển offline ${staleUsers.length} nhân sự.`,
      sweptCount: staleUsers.length,
      users: staleUsers.map(u => u.username)
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Cleanup online status error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
