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

    if (!id) {
      return NextResponse.json({ error: "Payroll record ID is required" }, { status: 400 });
    }

    const validStatuses = ["DRAFT", "PENDING", "APPROVED", "PAID"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    // Retrieve the existing payroll record to validate state transition and freeze state
    const existingRecord = await Payroll.findById(id).lean();
    if (!existingRecord) {
      return NextResponse.json({ error: "Không tìm thấy bản ghi lương" }, { status: 404 });
    }

    const currentStatus = existingRecord.status || "DRAFT";
    const targetStatus = status || currentStatus;

    if (status && status !== currentStatus) {
      const VALID_TRANSITIONS: Record<string, string[]> = {
        DRAFT: ["PENDING"],
        PENDING: ["APPROVED", "DRAFT"],
        APPROVED: ["PAID", "PENDING", "DRAFT"],
        PAID: [] // PAID is a terminal state
      };

      const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json({
          error: `Không thể chuyển trạng thái từ ${currentStatus} sang ${status}. Luồng hợp lệ: DRAFT → PENDING → APPROVED → PAID.`
        }, { status: 400 });
      }

      // Safety Lock 3: Role-based transitions for approving/paying
      if ((status === "APPROVED" || status === "PAID") && !["01", "02", "03"].includes(userRole || "")) {
        return NextResponse.json({ error: "Chỉ sếp hoặc quản lý mới được duyệt hoặc chi trả bảng lương" }, { status: 403 });
      }
    }

    // Build the update payload
    const updateData: any = {};
    
    // Copy allowlisted fields from body if they are defined
    const allowedFields = [
      "status", "notes", "baseSalary", "allowance", "overtimePay", "bonus",
      "attendanceDays", "workingDays", "fines", "tax", "insurance",
      "grossPay", "totalDeductions", "netPay", "totalReceived"
    ];
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    // Special logic for status approved metadata
    if (updateData.status === "APPROVED") {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    }

    // Safety Lock 2: Freeze financial fields if state is PAID or target is PAID
    const isPaidState = currentStatus === "PAID" || targetStatus === "PAID";
    if (isPaidState) {
      const financialFields = [
        "baseSalary", "allowance", "overtimePay", "bonus", "fines",
        "tax", "insurance", "grossPay", "totalDeductions", "netPay", "totalReceived"
      ];
      for (const field of financialFields) {
        delete updateData[field];
      }
    }

    // Safety Lock 1: Atomic update to prevent race conditions
    const record = await Payroll.findOneAndUpdate(
      { _id: id, status: currentStatus },
      { $set: updateData },
      { new: true }
    ).populate("userId", "name username role");

    if (!record) {
      return NextResponse.json({ 
        error: "Cập nhật thất bại. Bảng lương đã bị thay đổi trạng thái bởi người khác hoặc không tồn tại." 
      }, { status: 400 });
    }

    // Auto-settle unpaid fines if the payroll status has transitioned to PAID
    if (record.status === "PAID" && currentStatus !== "PAID") {
      try {
        const [yearStr, monthStr] = month.split("-");
        const year = parseInt(yearStr);
        const monthNum = parseInt(monthStr);
        const monthStartUTC = new Date(Date.UTC(year, monthNum - 1, 1, -7, 0, 0, 0));
        const monthEndUTC = new Date(Date.UTC(year, monthNum, 1, -7, 0, 0, 0));

        const targetUserId = (record.userId && typeof record.userId === "object" && "_id" in record.userId)
          ? (record.userId as any)._id
          : record.userId;

        const settleResult = await Fine.updateMany(
          {
            userId: targetUserId,
            status: "UNPAID",
            createdAt: {
              $gte: monthStartUTC,
              $lt: monthEndUTC
            }
          },
          { $set: { status: "PAID" } }
        );
        console.log(`Auto-settled ${settleResult.modifiedCount} unpaid fines to PAID for user ${record.name} (${month})`);
      } catch (fineErr) {
        console.error("Auto-settle fines error:", fineErr);
      }
    }

    // Create system log
    try {
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
