import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Notification } from "@/models/Notification";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    // Find the notification by ID
    const notification = await Notification.findById(id);

    if (!notification) {
      return NextResponse.json({ success: false, error: "Không tìm thấy thông báo" }, { status: 404 });
    }

    // IDOR Protection: If recipientId is specified, ensure it belongs to the current user
    if (notification.recipientId && String(notification.recipientId) !== String(userId)) {
      return NextResponse.json({ success: false, error: "Bạn không có quyền sửa thông báo này" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const isRead = body.isRead !== undefined ? !!body.isRead : true;

    notification.isRead = isRead;
    await notification.save();

    return NextResponse.json({ success: true, data: notification });

    return NextResponse.json({ success: true, data: notification });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("PUT notification read status error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
