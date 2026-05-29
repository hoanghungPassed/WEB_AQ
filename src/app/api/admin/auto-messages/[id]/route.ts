import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AutoMessage from "@/models/AutoMessage";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

// Cập nhật tin nhắn tự động
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const role = req.headers.get("x-user-role");
    const userId = req.headers.get("x-user-id");

    const hasPermission = await checkPermission(role || "", 3, ["all", "tasks"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_UPDATE_AUTO_MESSAGE", "auto-messages", { id }, req);
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const data = await req.json();
    const updated = await AutoMessage.findByIdAndUpdate(id, data, { new: true });
    
    if (!updated) {
      return NextResponse.json({ error: "Không tìm thấy tin nhắn mẫu" }, { status: 404 });
    }

    await logAuditTrail(userId || "system", "UPDATE_AUTO_MESSAGE_SUCCESS", "auto-messages", { id, title: updated.title }, req);

    return NextResponse.json({ 
      success: true, 
      message: "Cập nhật tin nhắn mẫu thành công", 
      data: updated 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Update auto message error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}

// Xóa tin nhắn tự động
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const role = req.headers.get("x-user-role");
    const userId = req.headers.get("x-user-id");

    const hasPermission = await checkPermission(role || "", 3, ["all", "tasks"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_DELETE_AUTO_MESSAGE", "auto-messages", { id }, req);
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const deleted = await AutoMessage.findByIdAndDelete(id);
    
    if (!deleted) {
      return NextResponse.json({ error: "Không tìm thấy tin nhắn mẫu" }, { status: 404 });
    }

    await logAuditTrail(userId || "system", "DELETE_AUTO_MESSAGE_SUCCESS", "auto-messages", { id, title: deleted.title }, req);

    return NextResponse.json({ 
      success: true, 
      message: "Xóa tin nhắn mẫu thành công" 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Delete auto message error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}
