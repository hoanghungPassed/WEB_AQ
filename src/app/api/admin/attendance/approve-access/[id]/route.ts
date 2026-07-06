import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { Fine } from "@/models/Fine";
import { Notification } from "@/models/Notification";
import { pusherServer } from "@/lib/pusher";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * ADMIN APPROVES OR DENIES ACCESS REQUEST
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params; // Request ID (MongoDB Notification ID or Date.now string)
    
    const userRole = req.headers.get("x-user-role");
    const sessionUserId = req.headers.get("x-user-id") || "unknown";
    const hasPermission = await checkPermission(userRole || "", 3, ["all", "attendance"]);
    if (!hasPermission) {
      await logAuditTrail(sessionUserId, "UNAUTHORIZED_ACCESS_APPROVAL_ATTEMPT", "attendance", { id }, req);
      return NextResponse.json({ error: "Không có quyền thực hiện thao tác này" }, { status: 403 });
    }

    const body = await req.json();
    const { status, userId, type, username, staffName, reason } = body; // APPROVED or DENIED

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
          await pusherServer.trigger('private-system', 'user-status-changed', { 
            userId: updatedUser._id.toString(), 
            isOnline: true,
            lastActive: userUpdate.lastActive
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
      
      // Update fine and send email based on type
      if (updatedUser) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (type === "FINE_PAYMENT" || !type) {
          // 1. Chuyển status khoản phạt (Fine) của ngày đó thành PAID
          const fine = await Fine.findOneAndUpdate(
            { userId, createdAt: { $gte: today }, status: { $ne: "PAID" } },
            { status: "PAID" },
            { new: true }
          );
          if (fine) {
            // 2. CỘNG TIỀN khoản phạt đó vào SystemSetting.fund (Quỹ hệ thống)
            try {
              const { SystemSetting } = await import("@/models/SystemSetting");
              await SystemSetting.findOneAndUpdate(
                {},
                { $inc: { fund: fine.amount } },
                { upsert: true }
              );
            } catch (sysErr) {
              console.error("SystemSetting fund update error:", sysErr);
            }
            // 3. Gọi hàm sendFinePaymentApprovedEmail
            const amountVal = fine.amount || 50000;
            const reasonVal = fine.reason || "Nộp phạt đi muộn";
            const { sendFinePaymentApprovedEmail } = await import("@/lib/email");
            await sendFinePaymentApprovedEmail(updatedUser.email, updatedUser.name || updatedUser.username, amountVal, reasonVal).catch(console.error);
          }
        } else if (type === "LATE_EXCUSE" || type === "ACCESS") {
          // 1. Chuyển status khoản phạt (Fine) thành CANCELLED
          const fine = await Fine.findOneAndUpdate(
            { userId, createdAt: { $gte: today }, status: { $ne: "PAID" } },
            { status: "CANCELLED" },
            { new: true }
          );
          // 2. TUYỆT ĐỐI KHÔNG cộng tiền vào Quỹ
          // 3. Gọi hàm sendLateExcuseApprovedEmail
          const { sendLateExcuseApprovedEmail } = await import("@/lib/email");
          await sendLateExcuseApprovedEmail(updatedUser.email, updatedUser.name || updatedUser.username, reason || "Giải trình đi muộn").catch(console.error);
        }
      }
    } else if (status === "DENIED" && userId) {
      const userUpdate: any = { isOnline: false, lastActive: new Date(0) };
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
      
      // Update attendance for today to "Vắng mặt"
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const { Attendance } = await import("@/models/Attendance");
        await Attendance.findOneAndUpdate(
          { userId, date: todayStr },
          { status: "Vắng mặt", checkInTime: null }
        );
      } catch (attErr) {
        console.error("Lỗi cập nhật bảng công khi từ chối:", attErr);
      }

      if (updatedUser) {
        try {
          await pusherServer.trigger('private-system', 'user-status-changed', { 
            userId: updatedUser._id.toString(), 
            isOnline: false,
            lastActive: null
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
    try {
      await pusherServer.trigger(`user-${userId}`, "access-response", {
        status,
        message: status === "APPROVED" 
          ? "Yêu cầu của bạn đã được phê duyệt. Hệ thống đã mở khóa!" 
          : "Yêu cầu của bạn đã bị từ chối. Vui lòng liên hệ Admin.",
        type
      });
    } catch (pushErr) {
      console.error("Pusher trigger access-response error:", pushErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
