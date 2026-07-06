import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import { RootMail } from "@/models/RootMail";
import { SatelliteMail } from "@/models/SatelliteMail";
import { MonetizedMail } from "@/models/MonetizedMail";
import { getAuthUser } from "@/lib/auth";
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { sendMailAssignedEmail } from "@/lib/email";

export async function PUT(req: NextRequest) {
  try {
    let userId = req.headers.get("x-user-id");
    let userRole = req.headers.get("x-user-role");
    if (!userId) {
      const authUser = await getAuthUser();
      if (authUser) {
        userId = authUser.userId;
        userRole = authUser.role;
      }
    }

    const hasPermission = await checkPermission(userRole || "", 4, ["all", "tasks", "staff"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_BATCH_UPDATE_MAILS", "mails", {}, req);
      return NextResponse.json({ error: "Không có quyền thực hiện thao tác này" }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { ids, updateData } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: "Missing ids array" }, { status: 400 });
    }

    let totalModified = 0;
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const resRoot = await RootMail.updateMany({ _id: { $in: ids } }, { $set: updateData }, { session });
      const resSat = await SatelliteMail.updateMany({ _id: { $in: ids } }, { $set: updateData }, { session });
      const resMon = await MonetizedMail.updateMany({ _id: { $in: ids } }, { $set: updateData }, { session });

      totalModified = resRoot.modifiedCount + resSat.modifiedCount + resMon.modifiedCount;
      
      await session.commitTransaction();
    } catch (err: any) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, error: "Cập nhật lô thất bại: " + err.message }, { status: 400 });
    } finally {
      session.endSession();
    }

    await logAuditTrail(userId || "system", "BATCH_UPDATE_MAILS_SUCCESS", "mails", { idsCount: ids.length, modifiedCount: totalModified }, req);

    if (updateData?.assigneeId) {
      try {
        const User = (await import("@/models/User")).default;
        const assignee = await User.findById(updateData.assigneeId).select("name email");
        if (assignee?.email) {
          const details = `Batch gán ${totalModified} mail cho bạn. Tổng số ID: ${ids.length}.`;
          sendMailAssignedEmail(assignee.email, assignee.name || "Nhân viên", details).catch(console.error);
        }
      } catch (_) {}
    }

    try {
      const { pusherServer } = await import("@/lib/pusher");
      await pusherServer.trigger("private-system", "satellite-batches-updated", {});
    } catch (_) {}

    return NextResponse.json({ success: true, modifiedCount: totalModified });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
