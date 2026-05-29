export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Payroll } from "@/models/Payroll";
import User from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { Fine } from "@/models/Fine";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

// GET all payroll records (with optional month filter)
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "reports"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_GET_PAYROLL", "payroll", {}, req);
      return NextResponse.json({ error: "Không có quyền xem bảng lương" }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "YYYY-MM"

    let filter: any = {};
    if (month) filter.month = month;

    const records = await Payroll.find(filter)
      .populate("userId", "name username role")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: records });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("GET payroll error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST - Save a single payroll record (backward compatible) OR calculate monthly payroll
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 4, ["all", "reports"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_CREATE_PAYROLL", "payroll", {}, req);
      return NextResponse.json({ error: "Không có quyền tạo bảng lương" }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();

    // If action is "calculate", run the full monthly payroll calculation
    if (body.action === "calculate") {
      return await calculateMonthlyPayroll(body, userId, req);
    }

    // Otherwise, save single record (backward compatibility)
    const month = body.month || new Date().toISOString().slice(0, 7);

    const record = await Payroll.findOneAndUpdate(
      { staffId: body.staffId || body.id, month },
      { ...body, month },
      { upsert: true, new: true }
    );

    await logAuditTrail(userId || "system", "CREATE_PAYROLL_SUCCESS", "payroll", { staffId: body.staffId, month }, req);

    return NextResponse.json({ success: true, data: record });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("POST payroll error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

/**
 * Calculate monthly payroll for all active staff
 *
 * Formula:
 *   grossPay   = (baseSalary / workingDays) * attendanceDays + allowance + overtimePay + bonus
 *   deductions = fines + tax + insurance
 *   netPay     = grossPay - deductions
 */
async function calculateMonthlyPayroll(body: any, requesterId: string | null, req: NextRequest) {
  const month = body.month; // Required: "YYYY-MM"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Month is required in YYYY-MM format" }, { status: 400 });
  }

  const baseSalaryDefault = body.baseSalary || 5000000;
  const allowanceDefault = body.allowance || 500000;
  const workingDaysDefault = body.workingDays || 26;

  // Get all ACTIVE users
  const users = await User.find({ status: "ACTIVE" }).select("-password");

  // Parse month boundaries for querying attendance and fines
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr);
  const monthNum = parseInt(monthStr);
  const monthStart = `${month}-01`;
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}`;

  const results: any[] = [];

  for (const user of users) {
    const uid = user._id.toString();

    // Count attendance days in the month
    const attendanceCount = await Attendance.countDocuments({
      userId: uid,
      date: { $gte: monthStart, $lte: monthEnd },
      status: { $in: ["Đúng giờ", "Đi muộn"] } // Both count as present
    });

    // Sum total unpaid fines for this user in the month
    const finesAgg = await Fine.aggregate([
      {
        $match: {
          userId: user._id,
          status: { $ne: "CANCELLED" },
          createdAt: {
            $gte: new Date(year, monthNum - 1, 1),
            $lt: new Date(year, monthNum, 1)
          }
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const totalFines = finesAgg.length > 0 ? finesAgg[0].total : 0;
    const attendanceDays = attendanceCount || 0;

    // Calculate payroll
    const baseSalary = baseSalaryDefault;
    const allowance = allowanceDefault;
    const overtimePay = 0; // Can be expanded later
    const bonus = 0; // Can be expanded later

    const proratedSalary = Math.round((baseSalary / workingDaysDefault) * attendanceDays);
    const grossPay = proratedSalary + allowance + overtimePay + bonus;

    const tax = 0; // Can be expanded later
    const insurance = 0; // Can be expanded later
    const totalDeductions = totalFines + tax + insurance;

    const netPay = Math.max(0, grossPay - totalDeductions);

    const payrollData = {
      userId: uid,
      staffId: uid,
      name: user.name,
      username: user.username,
      role: user.role,
      month,
      baseSalary,
      allowance,
      overtimePay,
      bonus,
      attendanceDays,
      workingDays: workingDaysDefault,
      fines: totalFines,
      tax,
      insurance,
      grossPay,
      totalDeductions,
      netPay,
      totalReceived: netPay,
      status: "DRAFT" as const,
      timestamp: new Date()
    };

    // Upsert: update if exists for this user+month, create otherwise
    const record = await Payroll.findOneAndUpdate(
      { userId: uid, month },
      { $set: payrollData },
      { upsert: true, new: true }
    );

    results.push(record);
  }

  await logAuditTrail(
    requesterId || "system",
    "CALCULATE_PAYROLL_SUCCESS",
    "payroll",
    { month, usersProcessed: results.length },
    req
  );

  // Create system log
  try {
    const { Log } = await import("@/models/Log");
    await Log.create({
      user: "System",
      role: "ADMIN",
      action: `Tính lương tháng ${month} cho ${results.length} nhân sự`,
      type: "SUCCESS",
      timestamp: new Date().toLocaleString("vi-VN")
    });
  } catch (logErr) {
    console.error("Log error:", logErr);
  }

  return NextResponse.json({
    success: true,
    message: `Đã tính lương tháng ${month} cho ${results.length} nhân sự`,
    data: results
  });
}
