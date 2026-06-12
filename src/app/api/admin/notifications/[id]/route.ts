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

    // IDOR Protection: Find the notification AND ensure it belongs to the current user
    const notification = await Notification.findOne({ _id: id, recipientId: userId });

    if (!notification) {
      return NextResponse.json({ success: false, error: "Không tìm thấy thông báo hoặc bạn không có quyền" }, { status: 404 });
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
