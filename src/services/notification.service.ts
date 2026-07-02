import { pusherServer } from "@/lib/pusher";
import { sendFineEmail } from "@/lib/email";

export interface LoginNotificationData {
  userId: string;
  username: string;
  userEmail?: string;
  userName?: string;
  shouldBeOnline: boolean;
  now: Date;
  overtimeFineCreated?: {
    amount: number;
    reason: string;
  };
  lateFineCreated?: {
    amount: number;
    reason: string;
  };
}

/**
 * Safely triggers login-related notifications (Pusher triggers and emails).
 * All dispatches are wrapped in isolated try-catch blocks to prevent errors from blocking the login process.
 */
export async function triggerLoginNotifications(data: LoginNotificationData): Promise<void> {
  // 1. Online status Pusher notification
  try {
    await pusherServer.trigger("system-users", "status-changed", {
      userId: data.userId,
      username: data.username,
      isOnline: data.shouldBeOnline,
      lastActive: data.shouldBeOnline ? data.now : null
    });
    await pusherServer.trigger("private-system", "user-status-changed", {
      userId: data.userId,
      isOnline: data.shouldBeOnline,
      lastActive: data.shouldBeOnline ? data.now : null
    });
  } catch (pushErr) {
    console.error("Failed to trigger online status Pusher notification:", pushErr);
  }

  // 2. Overtime fine Pusher notification
  if (data.overtimeFineCreated) {
    try {
      await pusherServer.trigger("private-system", "new-fine", {
        userId: data.userId,
        amount: data.overtimeFineCreated.amount,
        reason: data.overtimeFineCreated.reason
      });
    } catch (pushErr) {
      console.error("Failed to trigger overtime fine Pusher notification:", pushErr);
    }
  }

  // 3. Late check-in Pusher notification & Email warning
  if (data.lateFineCreated) {
    try {
      await pusherServer.trigger("private-system", "new-fine", {
        userId: data.userId,
        amount: data.lateFineCreated.amount,
        reason: data.lateFineCreated.reason
      });
    } catch (pushErr) {
      console.error("Failed to trigger lateness fine Pusher notification:", pushErr);
    }

    try {
      if (data.userEmail) {
        // Run sendFineEmail asynchronously without waiting
        sendFineEmail(
          data.userEmail,
          data.userName || "Nhân viên",
          data.lateFineCreated.amount,
          data.lateFineCreated.reason
        ).catch((emailErr) => {
          console.error("Failed to send lateness fine notification email asynchronously:", emailErr);
        });
      }
    } catch (emailErr) {
      console.error("Failed to invoke lateness fine notification email sending:", emailErr);
    }
  }
}
