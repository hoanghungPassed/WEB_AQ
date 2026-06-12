import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Batch from "@/models/Batch";
import { Task } from "@/models/Task";
import { SatelliteMail } from "@/models/SatelliteMail";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    // Require level 3 (Manager) or higher to delete batches
    const hasPermission = await checkPermission(userRole || "", 3, ["all", "tasks", "staff"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_DELETE_BATCH_ATTEMPT", "mails", { batchId: id }, req);
      return NextResponse.json({ error: "Không có quyền xóa lô mail" }, { status: 403 });
    }

    await dbConnect();
    
    // Phase 2: Protect against deleting batches with active tasks
    const activeTask = await Task.findOne({ 
      $or: [{ batchId: id }, { batch: id }], 
      status: 'PENDING' 
    });
    
    if (activeTask) {
      return NextResponse.json({ 
        error: "Không thể xóa Lô Mail này vì đang có Nhân viên đang thực hiện Task (PENDING). Vui lòng hoàn thành hoặc hủy Task trước." 
      }, { status: 400 });
    }

    // Find the batch first to get its name for cleanup
    const batch = await Batch.findById(id);
    if (!batch) {
      return NextResponse.json({ error: "Lô mail không tồn tại" }, { status: 404 });
    }

    const batchName = batch.name;

    // Perform cascading cleanup in parallel for speed
    await Promise.all([
      // 1. Delete associated tasks that were assigned this batch
      Task.deleteMany({ 
        $or: [
          { batch: batchName },
          { batchName: batchName }
        ]
      }),
      // 2. Unassign all satellite mails associated with this batch and return to warehouse
      SatelliteMail.updateMany(
        { 
          $or: [
            { batchName: batchName },
            { batchId: id }
          ]
        },
        { 
          $set: { 
            isAssigned: false, 
            assignedTo: "", 
            assigneeId: "", 
            batchName: "", 
            batchId: null,
            workStatus: "Chưa làm"
          } 
        }
      )
    ]);

    // 3. Delete the batch record itself
    await Batch.findByIdAndDelete(id);

    try {
      const { logAction } = await import('@/lib/logger');
      await logAction(userId || "system", "DELETE_BATCH_SUCCESS", `Xóa lô mail "${batchName}" và dọn dẹp Task/Mail liên quan.`);
    } catch (_) {}

    await logAuditTrail(userId || "system", "DELETE_BATCH_SUCCESS", "mails", { id, name: batchName }, req);

    return NextResponse.json({ 
      success: true, 
      message: `Đã xóa thành công lô "${batchName}" và các dữ liệu liên quan.` 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("DELETE batch error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
