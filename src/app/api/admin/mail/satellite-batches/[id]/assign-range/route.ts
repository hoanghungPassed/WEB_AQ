import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Batch from "@/models/Batch";
import { SatelliteMail } from "@/models/SatelliteMail";
import { getAuthUser } from "@/lib/auth";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let userId = req.headers.get("x-user-id");
    let userRole = req.headers.get("x-user-role");

    if (!userId) {
      const authUser = await getAuthUser();
      if (authUser) {
        userId = authUser.userId;
        userRole = authUser.role;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "tasks", "staff"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_ASSIGN_RANGE", "mails", {}, req);
      return NextResponse.json({ error: "Không có quyền gán dải mail" }, { status: 403 });
    }

    const { id } = await params;
    const { mailIds, startIndex, endIndex } = await req.json();

    if (!mailIds || !Array.isArray(mailIds)) {
      return NextResponse.json({ success: false, error: "Thiếu danh sách mailIds" }, { status: 400 });
    }

    await dbConnect();

    const batch = await Batch.findById(id);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Lô không tồn tại" }, { status: 404 });
    }

    // Tra cứu thông tin nhân sự để lấy tên gán vào mail
    let staffName = "Nhân viên";
    const UserModel = (await import("@/models/User")).default;
    const staff = await UserModel.findById(batch.assignedTo);
    if (staff) {
      staffName = staff.name;
    }

    // 1. Cập nhật các mail trong dải đã chọn
    const updateResult = await SatelliteMail.updateMany(
      { _id: { $in: mailIds } },
      {
        $set: {
          isAssigned: true,
          assignedTo: staffName,
          assigneeId: batch.assignedTo,
          assignee: batch.assignedTo,
          batchId: batch._id,
          batchName: batch.name
        }
      }
    );

    // 2. Cập nhật thông tin lô
    batch.totalMails = mailIds.length;
    batch.mailCount = mailIds.length;
    if (startIndex !== undefined) batch.startIndex = startIndex;
    if (endIndex !== undefined) batch.endIndex = endIndex;
    
    await batch.save();

    // 3. Ghi log activity
    try {
      const { Log } = await import("@/models/Log");
      await Log.create({
        user: staffName,
        role: userRole === "01" ? "ADMIN" : userRole === "02" ? "QL CÔNG VIỆC" : "QL NHÂN SỰ",
        action: `Gán dải mail ${startIndex}-${endIndex} của "${batch.name}" cho nhân sự ${staffName}`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (_) {}

    await logAuditTrail(
      userId || "system",
      "ASSIGN_RANGE_SUCCESS",
      "mails",
      { batchId: batch._id, batchName: batch.name, startIndex, endIndex, mailCount: mailIds.length },
      req
    );

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
