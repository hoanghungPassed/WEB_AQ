import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Log } from '@/models/Log';
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "reports"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_GET_LOGS", "logs", {}, req);
      return NextResponse.json({ error: "Không có quyền truy cập nhật ký hệ thống" }, { status: 403 });
    }

    await dbConnect();
    const logs = await Log.find({}).populate('user', 'name username').sort({ createdAt: -1 });
    return NextResponse.json(logs || []);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Error fetching system logs:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 1, ["tasks"]);
    if (!hasPermission) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const log = await Log.create(body);
    return NextResponse.json({ success: true, data: log }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Error creating system log:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 5, ["all"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_CLEAR_LOGS", "logs", {}, req);
      return NextResponse.json({ error: "Chỉ Admin mới có quyền xóa nhật ký" }, { status: 403 });
    }

    await dbConnect();
    await Log.deleteMany({});
    
    try {
      const { logAction } = await import('@/lib/logger');
      await logAction(userId || "system", "Đã xóa toàn bộ nhật ký hệ thống", "Dọn dẹp nhật ký.");
    } catch (logErr) {
      console.error("Log action err:", logErr);
    }

    await logAuditTrail(userId || "system", "CLEAR_LOGS_SUCCESS", "logs", {}, req);

    return NextResponse.json({ success: true, message: "Cleared all logs" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Error clearing system logs:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
