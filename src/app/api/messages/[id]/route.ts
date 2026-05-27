import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Message } from "@/models/Message";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const message = await Message.findById(id);
    if (!message) {
      return NextResponse.json({ success: false, error: "Không tìm thấy tin nhắn" }, { status: 404 });
    }

    // Only the message sender or Admin/Manager can recall the message
    const isSender = String(message.senderId) === String(userId);
    const isAdmin = userRole === "01" || userRole === "ADMIN" || userRole === "02";

    if (!isSender && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền thu hồi tin nhắn này" }, { status: 403 });
    }

    // Recall message content
    message.content = "Tin nhắn đã được thu hồi";
    await message.save();

    return NextResponse.json({ success: true, data: message });
  } catch (error: any) {
    console.error("PUT message error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const message = await Message.findById(id);
    if (!message) {
      return NextResponse.json({ success: false, error: "Không tìm thấy tin nhắn" }, { status: 404 });
    }

    // Only the sender or Admin/Manager can delete the message
    const isSender = String(message.senderId) === String(userId);
    const isAdmin = userRole === "01" || userRole === "ADMIN" || userRole === "02";

    if (!isSender && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền xóa tin nhắn này" }, { status: 403 });
    }

    await Message.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Đã xóa tin nhắn thành công" });
  } catch (error: any) {
    console.error("DELETE message error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
