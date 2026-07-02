import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Attendance } from "@/models/Attendance";
import { User } from "@/models/User";
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

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return NextResponse.json({ success: false, error: "Không tìm thấy bản ghi chấm công" }, { status: 404 });
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
      try {
        await User.findByIdAndUpdate(attendance.userId, {
          isLateLocked: false,
          status: "ACTIVE"
        });
      } catch (userErr) {
        console.error("Failed to unlock user on appeal approval:", userErr);
      }
    } else if (action === "REJECT") {
      attendance.complainStatus = "REJECTED";
      // Keeps the status as "Vắng mặt" or whatever it originally was
    } else {
      return NextResponse.json({ success: false, error: "Hành động xử lý không hợp lệ (yêu cầu APPROVE hoặc REJECT)" }, { status: 400 });
    }

    await attendance.save();

    // Trigger Pusher notification back to the staff/system
    try {
      await pusherServer.trigger("private-system", "attendance-appeal-resolved", {
        attendanceId: attendance._id.toString(),
        userId: attendance.userId.toString(),
        username: attendance.username,
        date: attendance.date,
        status: attendance.status,
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
