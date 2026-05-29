import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Phone } from "@/models/Phone";
import { Log } from "@/models/Log";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "reports", "attendance", "staff"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_DELETE_PHONE_BATCH", "phones", {}, req);
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu tên lô cần xóa" }, { status: 400 });
    }

    await dbConnect();

    // Safe deletion with fallback matching on batch, importBatch, and batchId fields
    const result = await Phone.deleteMany({
      $or: [
        { batch: id },
        { importBatch: id },
        { batchId: id }
      ]
    });

    await Log.create({
      action: "DELETE_BATCH",
      details: `Đã xóa lô SĐT qua API: ${id} (${result.deletedCount} số điện thoại đã bị xóa)`,
      type: "SUCCESS",
      role: userRole || "ADMIN",
      user: (userId || undefined) as any
    });

    await logAuditTrail(userId || "system", "DELETE_PHONE_BATCH_SUCCESS", "phones", { batchId: id, deletedCount: result.deletedCount }, req);

    return NextResponse.json({
      success: true,
      message: `Đã xóa thành công lô SĐT ${id}`,
      deletedCount: result.deletedCount
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("DELETE phone batch API error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
