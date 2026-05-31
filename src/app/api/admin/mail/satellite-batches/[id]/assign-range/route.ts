import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Batch from "@/models/Batch";
import { SatelliteMail } from "@/models/SatelliteMail";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { mailIds, startIndex, endIndex } = await req.json();

    if (!mailIds || !Array.isArray(mailIds)) {
      return NextResponse.json({ success: false, error: "Thiếu danh sách mailIds" }, { status: 400 });
    }

    await dbConnect();

    const batch = await Batch.findById(id);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Lô không tồn tại" }, { status: 404 });
    }

    // 1. Cập nhật các mail trong dải đã chọn
    const updateResult = await SatelliteMail.updateMany(
      { _id: { $in: mailIds } },
      {
        $set: {
          isAssigned: true,
          assignedTo: batch.assignedTo,
          batchId: batch._id,
          batchName: batch.name,
          assigneeId: batch.assignedTo
        }
      }
    );

    // 2. Cập nhật thông tin lô
    batch.totalMails = mailIds.length;
    batch.mailCount = mailIds.length;
    if (startIndex !== undefined) batch.startIndex = startIndex;
    if (endIndex !== undefined) batch.endIndex = endIndex;
    
    await batch.save();

    return NextResponse.json({ 
      success: true, 
      message: `Đã gán thành công ${mailIds.length} mail vào ${batch.name}`,
      updatedCount: updateResult.modifiedCount
    });
  } catch (error: any) {
    console.error("Assign range error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
