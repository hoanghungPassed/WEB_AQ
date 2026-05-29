export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Payroll } from "@/models/Payroll";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

// GET payroll records for a specific month (YYYY-MM)
export async function GET(req: NextRequest, { params }: { params: Promise<{ month: string }> }) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "reports"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_GET_PAYROLL_MONTH", "payroll", {}, req);
      return NextResponse.json({ error: "Không có quyền xem bảng lương" }, { status: 403 });
    }

    await dbConnect();
    const { month } = await params;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Month must be in YYYY-MM format" }, { status: 400 });
    }

    const records = await Payroll.find({ month })
      .populate("userId", "name username role avatar")
      .populate("approvedBy", "name username")
      .sort({ name: 1 });

    // Compute summary statistics
    const totalGross = records.reduce((sum, r) => sum + (r.grossPay || 0), 0);
    const totalDeductions = records.reduce((sum, r) => sum + (r.totalDeductions || 0), 0);
    const totalNet = records.reduce((sum, r) => sum + (r.netPay || 0), 0);
    const approvedCount = records.filter(r => r.status === "APPROVED" || r.status === "PAID").length;

    return NextResponse.json({
      success: true,
      month,
      summary: {
        totalEmployees: records.length,
        totalGross,
        totalDeductions,
        totalNet,
        approvedCount,
        pendingCount: records.length - approvedCount
      },
      data: records
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("GET payroll by month error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT - Approve or update a payroll record
// Body: { id: string, status: "APPROVED" | "PAID", notes?: string }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ month: string }> }) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 4, ["all", "reports"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_APPROVE_PAYROLL", "payroll", {}, req);
      return NextResponse.json({ error: "Không có quyền duyệt bảng lương" }, { status: 403 });
    }

    await dbConnect();
    const { month } = await params;
    const body = await req.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Payroll record ID is required" }, { status: 400 });
    }

    const validStatuses = ["DRAFT", "PENDING", "APPROVED", "PAID"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "APPROVED") {
        updateData.approvedBy = userId;
        updateData.approvedAt = new Date();
      }
    }
    if (notes !== undefined) updateData.notes = notes;

    const record = await Payroll.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).populate("userId", "name username role");

    if (!record) {
      return NextResponse.json({ error: "Không tìm thấy bản ghi lương" }, { status: 404 });
    }

    // Create system log
    try {
      const { Log } = await import("@/models/Log");
      await Log.create({
        user: userId || "System",
        role: userRole === "01" ? "ADMIN" : "QL CÔNG VIỆC",
        action: `${status === "APPROVED" ? "Duyệt" : "Cập nhật"} bảng lương tháng ${month} của ${record.name}`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (logErr) {
      console.error("Log error:", logErr);
    }

    await logAuditTrail(userId || "system", "APPROVE_PAYROLL_SUCCESS", "payroll", { payrollId: id, status, month }, req);

    return NextResponse.json({ success: true, data: record });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("PUT payroll approval error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
