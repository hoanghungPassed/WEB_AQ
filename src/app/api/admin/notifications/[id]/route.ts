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

    const body = await req.json().catch(() => ({}));
    const isRead = body.isRead !== undefined ? !!body.isRead : true;

    // Set notification as read
    const notification = await Notification.findByIdAndUpdate(
      id,
      { $set: { isRead } },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json({ success: false, error: "Không tìm thấy thông báo" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: notification });
  } catch (error: any) {
    console.error("PUT notification read status error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
