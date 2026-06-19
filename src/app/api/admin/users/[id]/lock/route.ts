export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const reqUserId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role");

    // Enforce administrative permissions (level >= 3)
    const hasPermission = await checkPermission(role || "", 3, ["all", "staff"]);
    if (!hasPermission) {
      await logAuditTrail(reqUserId || "unknown", "UNAUTHORIZED_LOCK_TOGGLE", "users", { targetUserId: id }, req);
      return NextResponse.json({ error: "Không có quyền thay đổi trạng thái khóa nhân sự" }, { status: 403 });
    }

    // Prevent locking yourself
    if (id === reqUserId) {
      return NextResponse.json({ error: "Không thể tự thay đổi trạng thái khóa tài khoản của chính mình" }, { status: 400 });
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    // Toggle lock/active status
    const previousStatus = user.status;
    const newStatus = previousStatus === "LOCKED" ? "ACTIVE" : "LOCKED";
    
    user.status = newStatus;
    if (newStatus === "ACTIVE") {
      user.lastActive = null;
      (user as any).isLateLocked = false;
      (user as any).finePaymentStatus = "APPROVED";
      (user as any).lateExcuseStatus = "APPROVED";
    }
    
    await user.save();

    // Trigger pusher alert to the locked/unlocked user channel
    try {
      await pusherServer.trigger(`user-${user._id.toString()}`, "status-update", {
        status: newStatus
      });
    } catch (pushErr) {
      console.error("Pusher error in user lock toggle:", pushErr);
    }

    // Remove password from response
    const userObj = user.toObject();
    delete (userObj as any).password;

    // Create system log
    try {
      const { Log } = await import("@/models/Log");
      await Log.create({
        user: "System",
        role: role === "01" ? "ADMIN" : "QL NHÂN SỰ",
        action: `${newStatus === "LOCKED" ? "Khóa" : "Mở khóa"} tài khoản của ${user.name} (${user.username})`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (logErr) {
      console.error("Log error:", logErr);
    }

    await logAuditTrail(reqUserId || "system", "LOCK_USER_SUCCESS", "users", { targetUserId: id, status: newStatus }, req);

    return NextResponse.json({
      success: true,
      message: `User ${newStatus === "LOCKED" ? "locked" : "unlocked"} successfully`,
      data: userObj
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Lock toggle error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}
