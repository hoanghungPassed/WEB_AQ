import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

async function handleMarkRead(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    let userRole = req.headers.get("x-user-role");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // If role not passed in headers, look up user
    if (!userRole) {
      const userDoc = await User.findById(userId).select("role").lean();
      if (userDoc) {
        userRole = (userDoc as any).role;
      }
    }

    const body = await req.json().catch(() => ({}));
    const { id } = body;

    if (id) {
      const notification = await Notification.findById(id);
      if (!notification) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông báo" }, { status: 404 });
      }

      // IDOR Protection: If recipientId is specified, ensure it belongs to the current user
      if (notification.recipientId && String(notification.recipientId) !== String(userId)) {
        return NextResponse.json({ success: false, error: "Bạn không có quyền sửa thông báo này" }, { status: 403 });
      }

      notification.isRead = true;
      await notification.save();
    } else {
      let mappedRole = userRole || "";
      const upper = String(userRole || "").toUpperCase();
      if (upper === "ADMIN" || upper === "01") mappedRole = "01";
      else if (upper.includes("CÔNG VIỆC") || upper === "QLCV" || upper === "02") mappedRole = "02";
      else if (upper.includes("NHÂN SỰ") || upper === "QLNS" || upper === "03") mappedRole = "03";
      else if (upper === "NHÂN VIÊN" || upper === "NHÂN VIÊN CHÍNH THỨC" || upper === "04") mappedRole = "04";
      else if (upper === "NV THỬ VIỆC" || upper === "NHÂN VIÊN THỬ VIỆC" || upper === "05") mappedRole = "05";

      const isManager = ["01", "02", "03"].includes(mappedRole);
      const filter: any = { isRead: false, type: { $ne: "INFO" } };
      
      const orConditions: any[] = [
        { recipientId: userId },
        { targetRole: mappedRole }
      ];
      
      if (isManager) {
        orConditions.push({
          $and: [
            { $or: [{ recipientId: { $exists: false } }, { recipientId: null }] },
            { $or: [{ targetRole: { $exists: false } }, { targetRole: null }, { targetRole: "" }] }
          ]
        });
      }
      
      filter.$or = orConditions;
      await Notification.updateMany(filter, { isRead: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("PUT/PATCH notifications mark-read error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return handleMarkRead(req);
}

export async function PATCH(req: NextRequest) {
  return handleMarkRead(req);
}
