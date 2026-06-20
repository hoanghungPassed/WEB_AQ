import { NextRequest, NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { User } from"@/models/User";
import { Log } from"@/models/Log";
import { Attendance } from "@/models/Attendance";
import { pusherServer } from "@/lib/pusher";

export const dynamic ="force-dynamic";

// GET: Lấy thông tin chấm công của user hiện tại
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const sessionUserId = req.headers.get("x-user-id");
    const sessionRole = req.headers.get("x-user-role");
    if (!sessionUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const queryUserId = url.searchParams.get("userId");
    const targetUserId = queryUserId || sessionUserId;

    // Check permissions if accessing another user's records
    if (queryUserId && queryUserId !== sessionUserId) {
      const roleUpper = String(sessionRole || "").toUpperCase();
      const isAuthorized = ["01", "02", "03", "ADMIN"].some(r => roleUpper.includes(r)) || sessionUserId === "01";
      if (!isAuthorized) {
        return NextResponse.json({ error: "Forbidden: Bạn không có quyền truy cập dữ liệu này" }, { status: 403 });
      }
    }

    const user = await User.findById(targetUserId).select("checkInTime checkOutTime isOnline");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const history = url.searchParams.get("history");
    if (history === "true") {
      const list = await Attendance.find({ userId: targetUserId })
        .sort({ date: -1 })
        .limit(30)
        .lean();
      return NextResponse.json({ success: true, data: list });
    }

    // Also try to find today's attendance record
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const vnTime = new Date(utc + 3600000 * 7);
    const yyyy = vnTime.getFullYear();
    const mm = String(vnTime.getMonth() + 1).padStart(2, '0');
    const dd = String(vnTime.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const dailyAttendance = await Attendance.findOne({ userId: targetUserId, date: todayStr });

    return NextResponse.json({
      success: true,
      checkInTime: user.checkInTime,
      checkOutTime: user.checkOutTime,
      isOnline: user.isOnline,
      dailyStatus: dailyAttendance?.status || "Vắng mặt",
      data: {
        checkInTime: user.checkInTime,
        checkOutTime: user.checkOutTime,
        isOnline: user.isOnline,
        dailyStatus: dailyAttendance?.status || "Vắng mặt"
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST: Check-in hoặc Check-out
export async function POST(req: NextRequest) {
 try {
 await dbConnect();
 const userId = req.headers.get("x-user-id");
 if (!userId) {
 return NextResponse.json({ error:"Unauthorized" }, { status: 401 });
 }

 const body = await req.json();
 const { action } = body; //"CHECK_IN" or"CHECK_OUT"

 const user = await User.findById(userId);
 if (!user) {
 return NextResponse.json({ error:"User not found" }, { status: 404 });
 }

 const now = new Date();
 const utc = now.getTime() + now.getTimezoneOffset() * 60000;
 const vnTime = new Date(utc + 3600000 * 7);
 const yyyy = vnTime.getFullYear();
 const mm = String(vnTime.getMonth() + 1).padStart(2, '0');
 const dd = String(vnTime.getDate()).padStart(2, '0');
 const todayStr = `${yyyy}-${mm}-${dd}`;

 const timeStr = vnTime.toLocaleTimeString("vi-VN", {
 hour:"2-digit",
 minute:"2-digit",
 second:"2-digit",
 });

 if (action ==="CHECK_IN") {
 user.checkInTime = now.toISOString();
 user.checkOutTime = undefined;
 user.isOnline = true;
 user.lastActive = now;
 await user.save();

 // Create or update daily attendance
 await Attendance.findOneAndUpdate(
   { userId, date: todayStr },
   { 
     $setOnInsert: { 
       userId, 
       username: user.username, 
       name: user.name, 
       date: todayStr,
       checkInTime: now,
       status: "Đúng giờ" // Simple default, login route handles lateness better
     } 
   },
   { upsert: true, new: true }
 );

 try {
 await Log.create({
 user: user._id,
 role: user.role,
 action: `Check-in lúc ${timeStr}`,
 type:"SUCCESS",
 });
 } catch (logErr) {}

 // Notify status change
 try {
   await pusherServer.trigger("system-users", "status-changed", {
     userId: user._id.toString(),
     username: user.username,
     isOnline: true,
     lastActive: now
   });
 } catch (pushErr) {}

 return NextResponse.json({
 success: true,
 action:"CHECK_IN",
 time: timeStr,
 checkInTime: user.checkInTime,
 data: {
    action: "CHECK_IN",
    time: timeStr,
    checkInTime: user.checkInTime
  }
 });
 } else if (action ==="CHECK_OUT") {
 user.checkOutTime = now.toISOString();
 user.isOnline = false;
 await user.save();

  // Calculate working hours and update Attendance record
  let totalWorkingMins = 0;
  const attendance = await Attendance.findOne({ userId, date: todayStr });
  if (attendance && attendance.checkInTime) {
    attendance.checkOutTime = now;
    const dIn = new Date(attendance.checkInTime);
    const dInUtc = dIn.getTime() + dIn.getTimezoneOffset() * 60000;
    const dInVn = new Date(dInUtc + 3600000 * 7);
    const t_in = dInVn.getHours() * 60 + dInVn.getMinutes();
    const t_out = vnTime.getHours() * 60 + vnTime.getMinutes();
    
    // Typical 8:00 - 12:00, 13:30 - 18:00 logic
    const overlap1 = Math.max(0, Math.min(720, t_out) - Math.max(480, t_in));
    const overlap2 = Math.max(0, Math.min(1080, t_out) - Math.max(810, t_in));
    totalWorkingMins = overlap1 + overlap2;
    attendance.totalHours = parseFloat((totalWorkingMins / 60).toFixed(2));
    await attendance.save();
  }

 try {
 await Log.create({
 user: user._id,
 role: user.role,
 action: `Check-out lúc ${timeStr} (${(totalWorkingMins / 60).toFixed(2)}h)`,
 type:"SUCCESS",
 });
 } catch (logErr) {}

 // Notify status change
 try {
   await pusherServer.trigger("system-users", "status-changed", {
     userId: user._id.toString(),
     username: user.username,
     isOnline: false,
     lastActive: now
   });
 } catch (pushErr) {}

 return NextResponse.json({
 success: true,
 action:"CHECK_OUT",
 time: timeStr,
 checkOutTime: user.checkOutTime,
 totalWorkingHours: (totalWorkingMins / 60).toFixed(2),
 data: {
    action: "CHECK_OUT",
    time: timeStr,
    checkOutTime: user.checkOutTime,
    totalWorkingHours: (totalWorkingMins / 60).toFixed(2)
  }
 });
 }

 return NextResponse.json(
 { error:"Invalid action. Use CHECK_IN or CHECK_OUT" },
 { status: 400 }
 );
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 return NextResponse.json(
 { success: false, error: errorMessage },
 { status: 500 }
 );
 }
}

