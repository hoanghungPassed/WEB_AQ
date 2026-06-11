export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { Task } from "@/models/Task";
import { SatelliteMail } from "@/models/SatelliteMail";
import { RootMail } from "@/models/RootMail";
import { MonetizedMail } from "@/models/MonetizedMail";
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { UpdateUserSchema, sanitizeXSS } from "@/lib/validation";
import { sendPasswordResetEmail } from "@/lib/email";
import { pusherServer } from "@/lib/pusher";

// Lấy chi tiết thông tin nhân sự
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const reqUserId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(role || "", 3, ["all", "staff", "team_tasks"]);
    if (!hasPermission && reqUserId !== id) {
      await logAuditTrail(reqUserId || "unknown", "UNAUTHORIZED_GET_USER", "users", { targetUserId: id }, req);
      return NextResponse.json({ error: "Không có quyền xem thông tin nhân sự khác" }, { status: 403 });
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("GET user error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}

// Cập nhật thông tin nhân sự
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const body = await req.json();

    const reqUserId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(role || "", 3, ["all", "staff", "team_tasks"]);
    if (!hasPermission && reqUserId !== id) {
      await logAuditTrail(reqUserId || "unknown", "UNAUTHORIZED_UPDATE_USER", "users", { targetUserId: id }, req);
      return NextResponse.json({ error: "Không có quyền chỉnh sửa nhân sự khác" }, { status: 403 });
    }

    // Validate request body
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map(e => ({
            field: e.path.join("."),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Sanitize string inputs to prevent XSS
    if (data.name) data.name = sanitizeXSS(data.name);
    if (data.address) data.address = sanitizeXSS(data.address);
    if (data.phone) data.phone = sanitizeXSS(data.phone);

    // Nếu có đổi mật khẩu, thì hash mật khẩu mới
    if (data.password) {
      data.password = await hashPassword(data.password);
    }

    if ((data.status as any) === 'APPROVED' || data.status === 'ACTIVE') {
      (data as any).lastActive = null;
    }

    // { new: true } trả về document sau khi đã update, select('-password') bỏ mật khẩu
    const updatedUser = await User.findByIdAndUpdate(id, data, { new: true }).select('-password');
    
    if (!updatedUser) {
      return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    }
    
    try {
      const { Log } = await import('@/models/Log');
      await Log.create({
        user: "System",
        role: role === "01" ? "ADMIN" : "QL NHÂN SỰ",
        action: `Cập nhật thông tin nhân sự: ${updatedUser.name} (${updatedUser.username})`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (logErr) {
      console.error("Log error:", logErr);
    }
    
    await logAuditTrail(reqUserId || "system", "UPDATE_USER_SUCCESS", "users", { targetUserId: id, username: updatedUser.username }, req);

    if (body.password) {
      try {
        if (updatedUser.email) {
          sendPasswordResetEmail(updatedUser.email, updatedUser.name || "Nhân viên", "Mật khẩu tài khoản đã được thay đổi thành công.").catch(console.error);
        }
      } catch (_) {}
      await logAuditTrail(reqUserId || "system", "PASSWORD_CHANGED", "users", { targetUserId: id, username: updatedUser.username }, req);
    }

    try {
      await pusherServer.trigger(`user-${updatedUser.username.toLowerCase()}`, "status-update", {
        status: updatedUser.status
      });
    } catch (pushErr) {}

    return NextResponse.json({ 
      message: "Cập nhật thành công", 
      user: updatedUser 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("LỖI CHI TIẾT TẠI BACKEND (User Update):", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}

// PATCH update user
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const body = await req.json();

    const reqUserId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(role || "", 3, ["all", "staff", "team_tasks"]);
    if (!hasPermission && reqUserId !== id) {
      await logAuditTrail(reqUserId || "unknown", "UNAUTHORIZED_UPDATE_USER", "users", { targetUserId: id }, req);
      return NextResponse.json({ error: "Không có quyền chỉnh sửa nhân sự khác" }, { status: 403 });
    }

    // Validate request body
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map(e => ({
            field: e.path.join("."),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Sanitize string inputs to prevent XSS
    if (data.name) data.name = sanitizeXSS(data.name);
    if (data.address) data.address = sanitizeXSS(data.address);
    if (data.phone) data.phone = sanitizeXSS(data.phone);

    // Nếu có đổi mật khẩu, thì hash mật khẩu mới
    if (data.password) {
      data.password = await hashPassword(data.password);
    }

    if ((data.status as any) === 'APPROVED' || data.status === 'ACTIVE') {
      (data as any).lastActive = null;
    }

    const updatedUser = await User.findByIdAndUpdate(id, { $set: data }, { new: true }).select('-password');
    
    if (!updatedUser) {
      return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    }
    
    try {
      const { Log } = await import('@/models/Log');
      await Log.create({
        user: "System",
        role: role === "01" ? "ADMIN" : "QL NHÂN SỰ",
        action: `Cập nhật thông tin nhân sự (PATCH): ${updatedUser.name} (${updatedUser.username})`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (logErr) {
      console.error("Log error:", logErr);
    }
    
    await logAuditTrail(reqUserId || "system", "UPDATE_USER_SUCCESS", "users", { targetUserId: id, username: updatedUser.username }, req);

    if (body.password) {
      try {
        if (updatedUser.email) {
          sendPasswordResetEmail(updatedUser.email, updatedUser.name || "Nhân viên", "Mật khẩu tài khoản đã được thay đổi thành công.").catch(console.error);
        }
      } catch (_) {}
      await logAuditTrail(reqUserId || "system", "PASSWORD_CHANGED", "users", { targetUserId: id, username: updatedUser.username }, req);
    }

    try {
      await pusherServer.trigger(`user-${updatedUser.username.toLowerCase()}`, "status-update", {
        status: updatedUser.status
      });
    } catch (pushErr) {}

    return NextResponse.json({ 
      success: true,
      message: "Cập nhật thành công", 
      data: updatedUser 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("PATCH user error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}

// Lưu trữ nhân sự (Soft-delete)
export async function DELETE(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    const params = await paramsPromise;
    const id = params.id;
    const reqUserId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(role || "", 3, ["all", "staff", "team_tasks"]);
    if (!hasPermission) {
      await logAuditTrail(reqUserId || "unknown", "UNAUTHORIZED_DELETE_USER", "users", { targetUserId: id }, req);
      return NextResponse.json({ error: "Không có quyền lưu trữ nhân sự" }, { status: 403 });
    }

    // Không cho phép tự xóa/lưu trữ chính mình
    if (id === reqUserId) {
      return NextResponse.json({ error: "Không thể tự lưu trữ tài khoản của chính mình" }, { status: 400 });
    }

    const oldUser = await User.findById(id);
    if (!oldUser) {
      return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    const newUsername = `${oldUser.username}_deleted_${Date.now()}`;

    const archivedUser = await User.findByIdAndUpdate(
      id,
      { $set: { status: "LOCKED", deletedAt: new Date(), username: newUsername } },
      { new: true }
    ).select("-password");

    if (!archivedUser) {
      return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    try {
      const { Log } = await import('@/models/Log');
      await Log.create({
        user: "System",
        role: role === "01" ? "ADMIN" : "QL NHÂN SỰ",
        action: `Lưu trữ nhân sự (Soft-delete): ${archivedUser.name} (${archivedUser.username})`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (logErr) {
      console.error("Log error:", logErr);
    }

    await logAuditTrail(reqUserId || "system", "DELETE_USER_SUCCESS", "users", { targetUserId: id, username: archivedUser.username }, req);

    try {
      await pusherServer.trigger(`user-${archivedUser.username.toLowerCase()}`, "status-update", {
        status: "LOCKED"
      });
    } catch (pushErr) {}

    return NextResponse.json({ 
      success: true,
      message: "User archived successfully",
      data: archivedUser 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}
