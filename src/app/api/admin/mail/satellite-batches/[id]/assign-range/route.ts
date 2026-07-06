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
    const startStt = Number(body.startStt);
    const endStt = Number(body.endStt);

    const isByRange = !isNaN(startStt) && !isNaN(endStt) && startStt > 0 && endStt >= startStt;
    const isByAmount = !isNaN(amount) && amount > 0;

    if (!isByRange && !isByAmount) {
      return NextResponse.json({ success: false, error: "Thông tin gán mail không hợp lệ (yêu cầu Số lượng hoặc Dải STT)" }, { status: 400 });
    }

    await dbConnect();

    const batch = await Batch.findById(id);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Lô không tồn tại" }, { status: 404 });
    }

    let mailIds: any[] = [];
    let minStt = 0;
    let maxStt = 0;
    let modifiedCount = 0;
    let staffName = "Nhân viên";

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // STRICT CHECK: Ensure assignee exists and is valid
      if (!batch.assignedTo) {
        throw new Error("Lô chưa được gán cho nhân viên nào. Vui lòng gán nhân sự cho lô trước khi chia dải mail!");
      }

      const UserModel = (await import("@/models/User")).default;
      const staff = await UserModel.findById(batch.assignedTo).session(session);
      if (!staff) {
        throw new Error("Nhân viên được gán cho lô này không tồn tại hoặc đã bị xóa!");
      }
      staffName = staff.name;

      // 1. Tìm mail trống và khóa lại
      let availableMails = [];
      if (isByRange) {
        availableMails = await SatelliteMail.find({
          $or: [
            { isAssigned: false },
            { batchId: { $in: [null, "", undefined] } }
          ],
          type: 'SATELLITE',
          stt: { $gte: startStt, $lte: endStt }
        })
        .sort({ stt: 1 })
        .session(session);

        // STRICT CHECK: Range length enforcement
        const expectedCount = endStt - startStt + 1;
        if (availableMails.length !== expectedCount) {
          throw new Error(`Dải STT từ ${startStt} đến ${endStt} yêu cầu ${expectedCount} mail, nhưng chỉ tìm thấy ${availableMails.length} mail trống. Có thể một số mail trong dải đã bị gán cho người khác!`);
        }
      } else {
        availableMails = await SatelliteMail.find({
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
          throw new Error(`Kho chỉ còn ${availableMails.length} mail vệ tinh trống, không đủ ${amount} mail yêu cầu!`);
        }
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
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    } finally {
      session.endSession();
    }

    // Các side effects chạy ngầm (Không ảnh hưởng đến Transaction chính)
    try {
      const { pusherServer } = await import("@/lib/pusher");
      await pusherServer.trigger("private-system", "task-updated", {});
      await pusherServer.trigger("private-system", "satellite-batches-updated", {});
      if (batch.assignedTo) {
        await pusherServer.trigger(`user-${batch.assignedTo.toString()}`, "new-task", {
          title: "Nhiệm vụ mới",
          message: `Lô "${batch.name}" đã được phân công thêm dải mail vệ tinh.`
        });
      }
    } catch (pe) {}

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
      userId || "system", "ASSIGN_RANGE_SUCCESS", "mails",
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
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
