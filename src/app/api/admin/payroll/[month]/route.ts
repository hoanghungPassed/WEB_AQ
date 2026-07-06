import mongoose from "mongoose";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Payroll } from "@/models/Payroll";
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { Fine } from "@/models/Fine";
import { Log } from "@/models/Log";

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
      .sort({ name: 1 })
      .lean();

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

    if (!id) return NextResponse.json({ error: "Payroll record ID is required" }, { status: 400 });

    const existingRecord = await Payroll.findById(id).lean();
    if (!existingRecord) return NextResponse.json({ error: "Không tìm thấy bản ghi lương" }, { status: 404 });

    const currentStatus = existingRecord.status || "DRAFT";
    const targetStatus = status || currentStatus;

    if (status && status !== currentStatus) {
      const VALID_TRANSITIONS: Record<string, string[]> = {
        DRAFT: ["PENDING"], PENDING: ["APPROVED", "DRAFT"], APPROVED: ["PAID", "PENDING", "DRAFT"], PAID: []
      };
      if (!(VALID_TRANSITIONS[currentStatus] || []).includes(status)) {
        return NextResponse.json({ error: `Không thể chuyển trạng thái từ ${currentStatus} sang ${status}.` }, { status: 400 });
      }
      if ((status === "APPROVED" || status === "PAID") && !["01", "02", "03"].includes(userRole || "")) {
        return NextResponse.json({ error: "Chỉ sếp hoặc quản lý mới được duyệt hoặc chi trả bảng lương" }, { status: 403 });
      }
    }

    const updateData: any = {};
    const allowedFields = ["status", "notes", "baseSalary", "allowance", "overtimePay", "bonus", "attendanceDays", "workingDays", "fines", "fineIds", "tax", "insurance", "grossPay", "totalDeductions", "netPay", "totalReceived"];
    for (const key of allowedFields) { if (body[key] !== undefined) updateData[key] = body[key]; }

    if (updateData.status === "APPROVED") {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    }

    if (currentStatus === "PAID" || targetStatus === "PAID") {
      ["baseSalary", "allowance", "overtimePay", "bonus", "fines", "fineIds", "tax", "insurance", "grossPay", "totalDeductions", "netPay", "totalReceived"].forEach(f => delete updateData[f]);
    }

    let record;
    // 🔒 BẮT ĐẦU TRANSACTION ĐỂ ĐẢM BẢO TÍNH ACID TÀI CHÍNH
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      record = await Payroll.findOneAndUpdate(
        { _id: id, status: currentStatus },
        { $set: updateData },
        { new: true, session }
      ).populate("userId", "name username role");

      if (!record) throw new Error("Cập nhật thất bại. Bảng lương đã bị thay đổi trạng thái bởi người khác.");

      // Nếu trạng thái chuyển thành PAID -> Chuyển trạng thái Phạt thành PAID đồng thời
      if (record.status === "PAID" && currentStatus !== "PAID") {
        const targetFineIds = (record as any).fineIds || [];
        if (targetFineIds.length > 0) {
          await Fine.updateMany(
            { _id: { $in: targetFineIds }, status: "UNPAID" },
            { $set: { status: "PAID" } },
            { session }
          );
        }
      }

      await session.commitTransaction();
    } catch (err: any) {
      await session.abortTransaction();
      return NextResponse.json({ error: err.message }, { status: 400 });
    } finally {
      session.endSession();
    }
    // 🔒 KẾT THÚC TRANSACTION

    try {
      await Log.create({
        user: userId || "System", role: userRole === "01" ? "ADMIN" : "QL CÔNG VIỆC",
        action: `${status === "APPROVED" ? "Duyệt" : "Cập nhật"} bảng lương tháng ${month} của ${record.name}`,
        type: "SUCCESS", timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (_) {}

    await logAuditTrail(userId || "system", "APPROVE_PAYROLL_SUCCESS", "payroll", { payrollId: id, status, month }, req);
    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
