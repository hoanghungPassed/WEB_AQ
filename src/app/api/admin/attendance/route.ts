import { NextRequest, NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { User } from"@/models/User";
import { Log } from"@/models/Log";

export const dynamic ="force-dynamic";

// GET: Lấy thông tin chấm công của user hiện tại
export async function GET(req: NextRequest) {
 try {
 await dbConnect();
 const userId = req.headers.get("x-user-id");
 if (!userId) {
 return NextResponse.json({ error:"Unauthorized" }, { status: 401 });
 }

 const user = await User.findById(userId).select("checkInTime checkOutTime isOnline"
 );
 if (!user) {
 return NextResponse.json({ error:"User not found" }, { status: 404 });
 }

 return NextResponse.json({
 success: true,
 checkInTime: user.checkInTime,
 checkOutTime: user.checkOutTime,
 isOnline: user.isOnline,
 data: {
    checkInTime: user.checkInTime,
    checkOutTime: user.checkOutTime,
    isOnline: user.isOnline,
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
 const timeStr = now.toLocaleTimeString("vi-VN", {
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

 try {
 await Log.create({
 user: user._id,
 role: user.role,
 action: `Check-in lúc ${timeStr}`,
 type:"SUCCESS",
 });
 } catch (logErr) {
 console.error("Log error:", logErr);
 }

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

 // Calculate working hours
 let totalWorkingMins = 0;
 if (user.checkInTime) {
 const dIn = new Date(user.checkInTime);
 const t_in = dIn.getHours() * 60 + dIn.getMinutes();
 const t_out = now.getHours() * 60 + now.getMinutes();
 const overlap1 = Math.max(0, Math.min(720, t_out) - Math.max(480, t_in));
 const overlap2 = Math.max(0, Math.min(1080, t_out) - Math.max(810, t_in));
 totalWorkingMins = overlap1 + overlap2;
 }

 try {
 await Log.create({
 user: user._id,
 role: user.role,
 action: `Check-out lúc ${timeStr} (${(totalWorkingMins / 60).toFixed(2)}h)`,
 type:"SUCCESS",
 });
 } catch (logErr) {
 console.error("Log error:", logErr);
 }

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
