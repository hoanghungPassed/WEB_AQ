import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
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
    const body = await req.json();
    const amount = Number(body.amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Số lượng không hợp lệ" }, { status: 400 });
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

    let mailIds: any[] = [];
    let minStt = 0;
    let maxStt = 0;
    let modifiedCount = 0;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // 1. Tìm mail trống và khóa lại
      const availableMails = await SatelliteMail.find({
        $or: [
          { isAssigned: false },
          { batchId: { $in: [null, "", undefined] } }
        ],
        type: 'SATELLITE'
      })
      .sort({ stt: 1 })
      .limit(amount)
      .session(session);

      if (availableMails.length < amount) {
        throw new Error(`Kho chỉ còn ${availableMails.length} mail trống, không đủ ${amount} mail yêu cầu!`);
      }

      mailIds = availableMails.map(m => m._id);
      const stts = availableMails.map(m => m.stt).filter((stt): stt is number => typeof stt === "number");
      minStt = stts.length > 0 ? Math.min(...stts) : 0;
      maxStt = stts.length > 0 ? Math.max(...stts) : 0;

      // 2. Cập nhật đồng loạt các mail vừa nhặt được
      const updateResult = await SatelliteMail.updateMany(
        { _id: { $in: mailIds } },
        {
          $set: {
            isAssigned: true,
            assignedTo: staffName,
            assigneeId: batch.assignedTo,
            assignee: batch.assignedTo,
            batchId: String(batch._id),
            batchName: batch.name
          }
        },
        { session }
      );
      modifiedCount = updateResult.modifiedCount;

      // 3. Cập nhật lại số lượng mail và chỉ số của Batch
      batch.mailCount = await SatelliteMail.countDocuments({ batchId: String(batch._id) }).session(session);
      batch.totalMails = batch.mailCount;
      if (minStt > 0) batch.startIndex = minStt;
      if (maxStt > 0) batch.endIndex = maxStt;
      
      await batch.save({ session });

      await session.commitTransaction();
    } catch (error: any) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
      session.endSession();
    }

    // Trigger Pusher events to update real-time screens
    try {
      const { pusherServer } = await import("@/lib/pusher");
      await pusherServer.trigger("private-system", "task-updated", {});
      await pusherServer.trigger("private-system", "satellite-batches-updated", {});
    } catch (pe) {
      console.error("Failed to trigger pusher event:", pe);
    }

    // 3. Ghi log activity
    try {
      const { Log } = await import("@/models/Log");
      await Log.create({
        user: staffName,
        role: userRole === "01" ? "ADMIN" : userRole === "02" ? "QL CÔNG VIỆC" : "QL NHÂN SỰ",
        action: `Gán ${mailIds.length} mail (${minStt}-${maxStt}) của "${batch.name}" cho nhân sự ${staffName}`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (_) {}

    await logAuditTrail(
      userId || "system",
      "ASSIGN_RANGE_SUCCESS",
      "mails",
      { batchId: batch._id, batchName: batch.name, startIndex: minStt, endIndex: maxStt, mailCount: mailIds.length },
      req
    );

    return NextResponse.json({ 
      success: true, 
      message: `Đã gán thành công ${mailIds.length} mail vào ${batch.name}`,
      updatedCount: modifiedCount
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Assign range error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
