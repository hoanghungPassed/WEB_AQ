import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Message } from "@/models/Message";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const { partnerId, messageIds } = body;

    let filter: any = {};
    if (partnerId) {
      // Đánh dấu đã đọc toàn bộ tin nhắn từ partnerId gửi tới userId
      filter = { senderId: partnerId, receiverId: userId, isRead: false };
    } else if (Array.isArray(messageIds) && messageIds.length > 0) {
      // Đánh dấu đã đọc danh sách tin nhắn cụ thể
      filter = { _id: { $in: messageIds }, receiverId: userId };
    } else {
      return NextResponse.json({ error: "Thiếu partnerId hoặc messageIds" }, { status: 400 });
    }

    const result = await Message.updateMany(filter, { $set: { isRead: true } });

    return NextResponse.json({
      success: true,
      message: `Đã đánh dấu đã đọc ${result.modifiedCount} tin nhắn`,
      modifiedCount: result.modifiedCount
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("mark-read API error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
