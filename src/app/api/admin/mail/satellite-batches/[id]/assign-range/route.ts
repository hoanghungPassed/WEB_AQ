export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
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
    // ── Auth & Permissions ──
    let userId = req.headers.get("x-user-id");
    let userRole = req.headers.get("x-user-role");

    if (!userId) {
      const authUser = await getAuthUser();
      if (authUser) {
        userId = authUser.userId;
        userRole = authUser.role;
      }
    }

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "tasks", "staff"]);
    if (!hasPermission) {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    // ── Connect & Parse ──
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const { mailIds } = body;
    if (!Array.isArray(mailIds) || mailIds.length === 0) {
      return NextResponse.json({ error: "Thiếu danh sách mailIds" }, { status: 400 });
    }

    // ── Find Batch ──
    const batch = await Batch.findById(id);
    if (!batch) {
      return NextResponse.json({ error: "Không tìm thấy lô mail" }, { status: 404 });
    }

    // ── Bulk update SatelliteMail ──
    await SatelliteMail.updateMany(
      { _id: { $in: mailIds } },
      {
        $set: {
          isAssigned: true,
          assigneeId: batch.assignedTo,
          assignedTo: batch.assignedTo, // as specified: assignedTo: batch.assignedTo
          batchId: batch._id,
          batchName: batch.name
        }
      }
    );

    // ── Update Batch totalMails & mailCount ──
    batch.totalMails = (batch.totalMails || 0) + mailIds.length;
    batch.mailCount = (batch.mailCount || 0) + mailIds.length;
    await batch.save();

    // ── Log success ──
    await logAuditTrail(
      userId || "system",
      "ASSIGN_RANGE_SUCCESS",
      "mails",
      { batchId: batch._id, count: mailIds.length },
      req
    );

    return NextResponse.json({ success: true, data: batch, message: "Gán dải mail vào lô thành công" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("PUT assign-range error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
