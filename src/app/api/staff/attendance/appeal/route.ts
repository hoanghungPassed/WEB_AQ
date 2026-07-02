import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: 04 (Nhân viên chính thức) or 05 (Nhân viên thử việc) are allowed to complain
    if (userRole !== "04" && userRole !== "05") {
      return NextResponse.json({ error: "Chỉ nhân viên mới được phép khiếu nại công" }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { date, reason } = body;

    if (!date || !reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: "Thiếu ngày khiếu nại hoặc lý do khiếu nại" }, { status: 400 });
    }

    // Format date validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: "Định dạng ngày không hợp lệ. Yêu cầu YYYY-MM-DD" }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy thông tin nhân viên" }, { status: 404 });
    }

    // 1. Find existing record for this user on this day
    let attendance = await Attendance.findOne({ userId, date });

    if (!attendance) {
      // Create new absent attendance record
      attendance = new Attendance({
        userId,
        username: user.username,
        name: user.name,
        date,
        status: "Vắng mặt",
        totalHours: 0,
        complainText: reason.trim(),
        complainStatus: "PENDING"
      });
      await attendance.save();
    } else {
      // Update existing record
      attendance.complainText = reason.trim();
      attendance.complainStatus = "PENDING";
      await attendance.save();
    }

    // 2. Trigger Pusher event to private-system channel to notify admins
    try {
      await pusherServer.trigger("private-system", "attendance-appeal", {
        attendanceId: attendance._id.toString(),
        userId: userId,
        username: user.username,
        name: user.name,
        date,
        reason: reason.trim(),
        status: attendance.status
      });
    } catch (pushErr) {
      console.error("Pusher trigger failed inside attendance appeal route:", pushErr);
    }

    return NextResponse.json({ success: true, data: attendance });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
