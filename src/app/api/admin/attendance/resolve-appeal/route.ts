import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import { Attendance } from "@/models/Attendance";
import { User } from "@/models/User";
import { Fine } from "@/models/Fine";
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    // Only Admin/Manager role (01, 02, 03) can resolve appeals
    const hasPermission = await checkPermission(userRole || "", 3, ["all", "staff", "attendance"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_RESOLVE_APPEAL", "attendance", {}, req);
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { attendanceId, action, newStatus } = body; // action is "APPROVE" | "REJECT", newStatus is "Đúng giờ" | "Đi muộn" | "Vắng mặt"

    if (!attendanceId || !action) {
      return NextResponse.json({ success: false, error: "Thiếu ID chấm công hoặc hành động xử lý" }, { status: 400 });
    }

    let attendance;
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      attendance = await Attendance.findById(attendanceId).session(session);
      if (!attendance) {
        throw new Error("Không tìm thấy bản ghi chấm công");
      }

      if (action === "APPROVE") {
        attendance.complainStatus = "RESOLVED";
        if (newStatus) {
          attendance.status = newStatus;
          
          // If approved and status is not "Vắng mặt", set checkInTime if missing to avoid downstream errors
          if (newStatus !== "Vắng mặt" && !attendance.checkInTime) {
            attendance.checkInTime = new Date(attendance.date + "T08:00:00.000Z");
          }
        }
        
        // Auto-unlock user
        await User.findByIdAndUpdate(attendance.userId, {
          isLateLocked: false,
          status: "ACTIVE"
        }).session(session);

        // Delete unpaid late/early fines for this day
        const dateStr = attendance.date;
        const startOfDay = new Date(`${dateStr}T00:00:00+07:00`);
        const endOfDay = new Date(`${dateStr}T23:59:59.999+07:00`);

        await Fine.deleteMany({
          userId: attendance.userId,
          status: "UNPAID",
          reason: { $regex: /đi muộn|về sớm/i },
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).session(session);

      } else if (action === "REJECT") {
        attendance.complainStatus = "REJECTED";
      } else {
        throw new Error("Hành động xử lý không hợp lệ (yêu cầu APPROVE hoặc REJECT)");
      }

      await attendance.save({ session });
      await session.commitTransaction();
    } catch (err: any) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    } finally {
      session.endSession();
    }

    // Trigger Pusher notification back to the staff/system (After commit)
    try {
      await pusherServer.trigger("private-system", "attendance-updated", {
        attendanceId: attendance._id.toString(),
        userId: attendance.userId.toString(),
        date: attendance.date,
        status: attendance.status
      });
      await pusherServer.trigger(`user-${attendance.userId.toString()}`, "appeal-resolved", {
        attendanceId: attendance._id.toString(),
        date: attendance.date,
        complainStatus: attendance.complainStatus
      });
    } catch (pushErr) {
      console.error("Pusher trigger failed inside resolve appeal route:", pushErr);
    }

    await logAuditTrail(userId || "system", "RESOLVE_APPEAL_SUCCESS", "attendance", { attendanceId, action, username: attendance.username, date: attendance.date }, req);

    return NextResponse.json({ success: true, data: attendance });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
