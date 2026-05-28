import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Phone } from "@/models/Phone";
import { Log } from "@/models/Log";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    // Only Admin (01) or work manager (02) or HR (03) can delete batches
    if (!userId || (userRole !== "01" && userRole !== "02" && userRole !== "03")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      user: userId
    });

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
