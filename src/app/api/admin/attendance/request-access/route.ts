import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

/**
 * STAFF SENDS ACCESS REQUEST TO ADMIN
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const userId = req.headers.get("x-user-id");
    const body = await req.json();
    const { type, reason, staffName, username } = body;

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Update user status fields in Database
    if (type === "LATE_EXCUSE") {
      user.lateExcuseStatus = "PENDING_APPROVAL";
      await user.save();
    } else if (type === "FINE_PAYMENT") {
      user.finePaymentStatus = "PENDING_APPROVAL";
      await user.save();
    } else {
      // type === "ACCESS" (outside working hours or Sunday)
      user.status = "PENDING";
      await user.save();
    }

    // Save access request into Notification collection in MongoDB
    const title = type === "FINE_PAYMENT" 
      ? "Báo cáo nộp phạt" 
      : type === "LATE_EXCUSE" 
        ? "Giải trình đi muộn" 
        : "Yêu cầu truy cập";

    const dbNotif = await Notification.create({
      title: title,
      message: `${staffName || user.name} (@${username || user.username}): ${reason || "Xin phép truy cập hệ thống"}`,
      type: "ACCESS_REQUEST",
      link: "#approval-modal",
      author: userId,
      isRead: false
    });

    const requestData = {
      id: dbNotif._id.toString(),
      userId: userId,
      staffName: staffName || user.name,
      username: username || user.username,
      time: new Date().toLocaleTimeString("vi-VN"),
      reason: reason || "Xin phép truy cập hệ thống",
      type: type || "ACCESS", // ACCESS, LATE_EXCUSE, FINE_PAYMENT
      status: "PENDING"
    };

    // 1. Notify all admins via Pusher
    try {
      await pusherServer.trigger("system-notifications", "new-notification", {
        id: requestData.id,
        type: "ACCESS_REQUEST",
        title: title,
        message: `${requestData.staffName} (@${requestData.username}): ${requestData.reason}`,
        time: requestData.time,
        author: userId,
        data: requestData
      });
    } catch (pushErr) {
      console.error("Pusher trigger system-notifications error:", pushErr);
    }

    // 2. Trigger access-request on the general 'system' channel for popups & chimes
    let amount = body.amount;
    if (type === "FINE_PAYMENT" && (amount === undefined || amount === null)) {
      try {
        const { Fine } = await import("@/models/Fine");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayFine = await Fine.findOne({ userId, createdAt: { $gte: today }, status: { $ne: "PAID" } });
        if (todayFine) {
          amount = todayFine.amount;
        }
      } catch (err) {
        console.error("Error finding today's fine for payload:", err);
      }
    }

    const triggerPayload = {
      id: requestData.id,
      userId: user._id.toString(),
      name: user.name,
      username: user.username,
      type: type || 'ACCESS',
      reason: reason || "Xin phép truy cập hệ thống",
      amount: amount,
      createdAt: new Date()
    };
    console.log("Triggering Pusher access-request event to channel 'system' with payload:", triggerPayload);

    try {
      await pusherServer.trigger('system', 'access-request', triggerPayload);
    } catch (pushErr) {
      console.error("Pusher trigger access-request error:", pushErr);
    }

    return NextResponse.json({ success: true, data: requestData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
