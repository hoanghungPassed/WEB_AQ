import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { SatelliteMail } from "@/models/SatelliteMail";
import { RootMail } from "@/models/RootMail";
import { MonetizedMail } from "@/models/MonetizedMail";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * RECLAIM ABANDONED TASKS API
 * 
 * This endpoint identifies tasks that have been 'PENDING' for more than 48 hours
 * and automatically cancels them, returning the associated mails to the warehouse.
 * 
 * Can be triggered by:
 * 1. Admin manual trigger
 * 2. Vercel Cron Job
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    // Security: Check for Cron Secret OR Admin Permission
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronCall) {
      const hasPermission = await checkPermission(userRole || "", 4, ["all", "tasks"]);
      if (!hasPermission) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    await dbConnect();

    // 1. Calculate the 48-hour threshold
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // 2. Find abandoned tasks
    const abandonedTasks = await Task.find({
      status: "PENDING",
      createdAt: { $lt: fortyEightHoursAgo }
    });

    if (abandonedTasks.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "Không có task nào cần thu hồi.",
        reclaimedCount: 0 
      });
    }

    let reclaimedCount = 0;
    const batchIdentifiers = abandonedTasks.map(t => t.batch || (t as any).batchName || (t as any).batchId).filter(Boolean);
    const taskIds = abandonedTasks.map(t => t._id);

    // 3. Update Tasks to FAILED/CANCELLED
    await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: { status: "FAILED", note: "Hệ thống tự động thu hồi do quá 48h không hoàn thành." } }
    );

    // 4. Reclaim Mails (Unassign)
    // We unassign based on batch name/id found in tasks
    if (batchIdentifiers.length > 0) {
      const unassignFilter = {
        $or: [
          { batchName: { $in: batchIdentifiers } },
          { batchId: { $in: batchIdentifiers } },
          { batch: { $in: batchIdentifiers } }
        ]
      };
      
      const unassignUpdate = {
        $set: {
          isAssigned: false,
          assigneeId: null,
          assignedTo: null,
          batchId: null,
          batchName: null
        }
      };

      await Promise.all([
        SatelliteMail.updateMany(unassignFilter, unassignUpdate),
        RootMail.updateMany(unassignFilter, unassignUpdate),
        MonetizedMail.updateMany(unassignFilter, unassignUpdate)
      ]);
    }

    reclaimedCount = abandonedTasks.length;

    // 5. Audit & Log for each task to keep detailed history
    try {
      const { Log } = await import("@/models/Log");
      const logEntries = abandonedTasks.map(task => ({
        user: "System",
        role: "SYSTEM",
        action: `[Auto-Reclaim] Đã thu hồi Task "${task.title}" của nhân viên ID: ${task.assigneeId || 'Không rõ'} do quá 48h.`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      }));
      await Log.insertMany(logEntries);
    } catch (_) {}

    await logAuditTrail(userId || "system", "RECLAIM_TASKS_SUCCESS", "tasks", { count: reclaimedCount, taskIds: taskIds.map(id => id.toString()) }, req);

    return NextResponse.json({
      success: true,
      message: `Đã thu hồi thành công ${reclaimedCount} task bỏ dở.`,
      reclaimedCount
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Reclaim tasks error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// Allow GET for simple CRON triggers
export async function GET(req: NextRequest) {
  return POST(req);
}
