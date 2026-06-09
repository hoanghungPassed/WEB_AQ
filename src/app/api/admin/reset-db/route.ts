import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  // Check: Admin role (level 5) required for "all"
  const hasPermission = await checkPermission(userRole || "", 5, ["all"]);

  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_RESET_DB", "database", {}, request);
    return NextResponse.json(
      { error: "Không có quyền thực hiện thao tác này" },
      { status: 403 }
    );
  }

  try {
    await dbConnect();

    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "Không thể kết nối Database" }, { status: 500 });
    }

    const collections = await db.listCollections().toArray();
    
    for (const col of collections) {
      if (
        col.name !== "users" && 
        col.name !== "system_settings" && 
        col.name !== "systemsettings" && 
        !col.name.startsWith("system.")
      ) {
        await db.dropCollection(col.name);
      }
    }

    // Delete all users EXCEPT role Admin ('01') to safeguard main account
    const User = (await import("@/models/User")).default;
    await User.deleteMany({ role: { $ne: "01" } });

    // Explicitly wipe direct messages, notifications, tasks, batches, fines, attendances
    const { Message } = await import("@/models/Message");
    const { AutoMessage } = await import("@/models/AutoMessage");
    const { Notification } = await import("@/models/Notification");
    const { Task } = await import("@/models/Task");
    const { Batch } = await import("@/models/Batch");
    const { Fine } = await import("@/models/Fine");
    const { Attendance } = await import("@/models/Attendance");
    const { RootMail } = await import("@/models/RootMail");
    const { SatelliteMail } = await import("@/models/SatelliteMail");
    const { MonetizedMail } = await import("@/models/MonetizedMail");

    await Message.deleteMany({});
    await AutoMessage.deleteMany({});
    await Notification.deleteMany({});
    await Task.deleteMany({});
    await Batch.deleteMany({});
    await Fine.deleteMany({});
    await Attendance.deleteMany({});
    
    // Xóa hoàn toàn kho mail thay vì chỉ giải phóng
    await RootMail.deleteMany({});
    await SatelliteMail.deleteMany({});
    await MonetizedMail.deleteMany({});

    try {
      const { logAction } = await import('@/lib/logger');
      await logAction("system", "Reset Database", "Đã xóa toàn bộ dữ liệu (bao gồm cả Users và Kho Mail).");
    } catch(e) {}

    // Log successful operation
    const result = { droppedCollectionsCount: collections.length - 2 };
    await logAuditTrail(userId || "system", "RESET_DB_SUCCESS", "database", result, request);

    return NextResponse.json({ success: true, message: "Đã reset database thành công!" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Reset DB error:", error);
    
    await logAuditTrail(userId || "system", "RESET_DB_ERROR", "database", 
      { error: errorMessage }, request);

    return NextResponse.json({ error: "Lỗi khi reset database: " + errorMessage }, { status: 500 });
  }
}
