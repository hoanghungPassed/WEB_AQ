import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { Fine } from "@/models/Fine";
import { Notification } from "@/models/Notification";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

/**
 * ADMIN APPROVES OR DENIES ACCESS REQUEST
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params; // Request ID (MongoDB Notification ID or Date.now string)
    const body = await req.json();
    const { status, userId, type, username, staffName } = body; // APPROVED or DENIED

    if (status === "APPROVED" && userId) {
      const userUpdate: any = { isLateLocked: false, status: "ACTIVE", isOnline: true, lastActive: new Date() };
      if (type === "FINE_PAYMENT" || !type) userUpdate.finePaymentStatus = "APPROVED";
      if (type === "LATE_EXCUSE" || !type) userUpdate.lateExcuseStatus = "APPROVED";
      if (type === "ACCESS") {
        const now = new Date();
        const utc = now.getTime() + now.getTimezoneOffset() * 60000;
        const vnTime = new Date(utc + 3600000 * 7); // Vietnam GMT+7
        vnTime.setHours(23, 59, 59, 999);
        userUpdate.accessApprovedUntil = new Date(vnTime.getTime() - 3600000 * 7);
      }
      
      const updatedUser = await User.findByIdAndUpdate(userId, userUpdate, { new: true });
      if (updatedUser) {
        try {
          await pusherServer.trigger('system', 'user-status-changed', { 
            userId: updatedUser._id.toString(), 
            isOnline: true 
          });
          await pusherServer.trigger('system-users', 'status-changed', {
            userId: updatedUser._id.toString(),
            username: updatedUser.username,
            isOnline: true,
            lastActive: userUpdate.lastActive
          });
        } catch (pushErr) {
          console.error("Pusher error in approve-access approval:", pushErr);
        }
      }
      
      // If it's fine payment, auto-mark today's late fine as PAID
      if (type === "FINE_PAYMENT" || !type) {
         const today = new Date();
         today.setHours(0,0,0,0);
         await Fine.findOneAndUpdate(
           { userId, createdAt: { $gte: today }, status: { $ne: "PAID" } },
           { status: "PAID" }
         );
      }
    } else if (status === "DENIED" && userId) {
      const userUpdate: any = { isOnline: false };
      if (type === "ACCESS") {
        userUpdate.status = "LOCKED";
      } else if (type === "FINE_PAYMENT") {
        userUpdate.finePaymentStatus = "DENIED";
      } else if (type === "LATE_EXCUSE") {
        userUpdate.lateExcuseStatus = "DENIED";
      } else {
        userUpdate.status = "LOCKED";
        userUpdate.finePaymentStatus = "DENIED";
        userUpdate.lateExcuseStatus = "DENIED";
      }
      const updatedUser = await User.findByIdAndUpdate(userId, userUpdate, { new: true });
      if (updatedUser) {
        try {
          await pusherServer.trigger('system', 'user-status-changed', { 
            userId: updatedUser._id.toString(), 
            isOnline: false 
          });
          await pusherServer.trigger('system-users', 'status-changed', {
            userId: updatedUser._id.toString(),
            username: updatedUser.username,
            isOnline: false,
            lastActive: null
          });
        } catch (pushErr) {
          console.error("Pusher error in approve-access denial:", pushErr);
        }
      }
    }

    // Update corresponding DB notification to isRead: true
    if (id && id !== "undefined" && id !== "null") {
      try {
        await Notification.findByIdAndUpdate(id, { isRead: true });
      } catch (e) {
        console.error("Failed to update notification by ID:", e);
      }
    }

    // Also mark all other ACCESS_REQUEST notifications from this user as read
    if (userId) {
      await Notification.updateMany(
        { author: userId, type: "ACCESS_REQUEST", isRead: false },
        { isRead: true }
      );
    }

    // Notify the specific user
    await pusherServer.trigger(`user-${userId}`, "access-response", {
      status,
      message: status === "APPROVED" 
        ? "Yêu cầu của bạn đã được phê duyệt. Hệ thống đã mở khóa!" 
        : "Yêu cầu của bạn đã bị từ chối. Vui lòng liên hệ Admin.",
      type
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
