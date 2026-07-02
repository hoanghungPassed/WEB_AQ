import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "tasks"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_DELETE_TASKS_BY_BATCH", "tasks", {}, req);
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const batchName = searchParams.get("batchName");

    if (!batchName) {
      return NextResponse.json({ success: false, error: "Thiếu tên lô cần xóa" }, { status: 400 });
    }

    // Delete tasks matching the batch name
    const result = await Task.deleteMany({
      $or: [
        { batchName: batchName },
        { batch: batchName }
      ]
    });

    // Notify clients via Pusher to update dashboards
    try {
      await pusherServer.trigger("private-system", "task-updated", {
        batchName,
        action: "DELETED"
      });
    } catch (pushErr) {
      console.error("Pusher trigger failed inside delete task by batch:", pushErr);
    }

    await logAuditTrail(userId || "system", "DELETE_TASKS_BY_BATCH_SUCCESS", "tasks", { batchName, deletedCount: result.deletedCount }, req);

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
