export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Batch from "@/models/Batch";
import { SatelliteMail } from "@/models/SatelliteMail";
import { getAuthUser } from "@/lib/auth";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

// GET: Lấy toàn bộ danh sách các lô từ Database
export async function GET(req: NextRequest) {
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
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const batches = await Batch.find({ type: "SATELLITE" }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, batches });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("GET satellite batches error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST: Tự động hóa tạo lô mail vệ tinh (auto-slice 17 mail rảnh từ kho)
export async function POST(req: NextRequest) {
  try {
    // ── Auth ──
    let userId = req.headers.get("x-user-id");
    let userRole = req.headers.get("x-user-role");
    let userName = "Admin";

    if (!userId) {
      const authUser = await getAuthUser();
      if (authUser) {
        userId = authUser.userId;
        userRole = authUser.role;
      }
    }

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "tasks", "staff"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_CREATE_BATCH", "mails", {}, req);
      return NextResponse.json({ error: "Không có quyền tạo lô mail" }, { status: 403 });
    }

    // ── Parse body ──
    await dbConnect();
    const body = await req.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Thiếu tên lô" }, { status: 400 });
    }
    if (!body.assignedTo) {
      return NextResponse.json({ error: "Thiếu nhân sự gán" }, { status: 400 });
    }

    // ── 1. Kiểm tra trùng tên lô ──
    const exists = await Batch.findOne({ name: body.name.trim() });
    if (exists) {
      return NextResponse.json({ error: "Tên lô đã tồn tại" }, { status: 400 });
    }

    // ── 2. Tra cứu nhân sự & người tạo ──
    const UserModel = (await import("@/models/User")).default;
    const assigneeUser = await UserModel.findById(body.assignedTo);
    if (!assigneeUser) {
      return NextResponse.json({ error: "Nhân sự được gán không tồn tại" }, { status: 400 });
    }

    if (userId) {
      const creator = await UserModel.findById(userId);
      if (creator) userName = creator.name;
    }

    // ── 3. Auto-slice: Lấy tối đa 17 mail rảnh từ kho (FIFO) ──
    const availableMails = await SatelliteMail.find({
      $or: [{ isAssigned: false }, { isAssigned: { $exists: false } }],
      status: { $in: ["ACTIVE", "LIVE"] }
    })
      .limit(17)
      .sort({ createdAt: 1 });

    if (availableMails.length === 0) {
      return NextResponse.json(
        { error: "Trong kho không còn mail rảnh để gán" },
        { status: 400 }
      );
    }
    const mailIds = availableMails.map(m => m._id);

    // ── 4. Tìm Lô cuối cùng để nối tiếp STT ──
    const lastBatch = await Batch.findOne({ type: "SATELLITE" }).sort({ createdAt: -1 });
    const nextStartIndex = lastBatch && lastBatch.endIndex ? lastBatch.endIndex + 1 : 1;
    const newEndIndex = nextStartIndex + availableMails.length - 1;

    // ── 5. Atomic updateMany: đánh dấu mail đã gán ──
    const batchId = `batch-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    await SatelliteMail.updateMany(
      { _id: { $in: mailIds } },
      {
        $set: {
          isAssigned: true,
          assigneeId: body.assignedTo,
          assignedTo: assigneeUser.name,
          batchName: body.name.trim(),
          batchId: batchId
        }
      }
    );

    // ── 6. Tạo bản ghi Lô trong collection batches ──
    const newBatch = await Batch.create({
      name: body.name.trim(),
      type: "SATELLITE",
      importedAt: new Date().toISOString().split("T")[0],
      mailCount: availableMails.length,
      importedBy: body.importedBy || userName,
      startIndex: nextStartIndex,
      endIndex: newEndIndex,
      assignedTo: body.assignedTo
    });

    // ── 7. Ghi log ──
    try {
      const { Log } = await import("@/models/Log");
      await Log.create({
        user: userName,
        role: "ADMIN",
        action: `Tự động tạo lô "${body.name.trim()}" gán cho ${assigneeUser.name} (${availableMails.length} mail, STT ${nextStartIndex}→${newEndIndex})`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (_) {}

    await logAuditTrail(
      userId || "system",
      "CREATE_BATCH_SUCCESS",
      "mails",
      { name: body.name, assignedTo: body.assignedTo, mailCount: availableMails.length, startIndex: nextStartIndex, endIndex: newEndIndex },
      req
    );

    return NextResponse.json({ success: true, batch: newBatch });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("POST satellite batches error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
