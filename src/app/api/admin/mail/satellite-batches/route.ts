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

    const assignedTo = req.nextUrl.searchParams.get("assignedTo") || req.nextUrl.searchParams.get("userId");
    if (assignedTo) {
      const batchCount = await Batch.countDocuments({ assignedTo, type: "SATELLITE" });
      if (batchCount === 0) {
        const UserModel = (await import("@/models/User")).default;
        const assigneeUser = await UserModel.findById(assignedTo);
        const suffix = assigneeUser ? ` (${assigneeUser.username})` : "";

        // Tự động sinh 6 lô rỗng mặc định
        const defaultBatches = [];
        for (let i = 1; i <= 6; i++) {
          defaultBatches.push({
            name: `Lô ${i}${suffix}`,
            type: "SATELLITE",
            importedAt: new Date().toISOString().split("T")[0],
            importedBy: "Hệ thống",
            assignedTo,
            mailCount: 0,
            totalMails: 0,
            startIndex: 0,
            endIndex: 0
          });
        }
        await Batch.insertMany(defaultBatches);
      }
    }

    const filter: any = { type: "SATELLITE" };
    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }
    const batches = await Batch.find(filter).sort({ createdAt: 1 }); // Sort by creation time ascending to show Lo 1, 2, 3...

    return NextResponse.json({ success: true, batches });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("GET satellite batches error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST: Tạo lô mail vệ tinh rỗng
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

    if (!body.assignedTo) {
      return NextResponse.json({ error: "Thiếu nhân sự gán" }, { status: 400 });
    }

    // ── 1. Tra cứu nhân sự ──
    const UserModel = (await import("@/models/User")).default;
    const assigneeUser = await UserModel.findById(body.assignedTo);
    if (!assigneeUser) {
      return NextResponse.json({ error: "Nhân sự được gán không tồn tại" }, { status: 400 });
    }

    if (userId) {
      const creator = await UserModel.findById(userId);
      if (creator) userName = creator.name;
    }

    // ── 2. Đếm tổng số lô CỦA RIÊNG nhân viên đó ──
    const userBatchCount = await Batch.countDocuments({ assignedTo: body.assignedTo, type: "SATELLITE" });
    const suffix = assigneeUser ? ` (${assigneeUser.username})` : "";
    
    // Auto-name: Lô + (số lô hiện có + 1)
    let baseName = body.name?.trim();
    if (!baseName) {
      baseName = `Lô ${userBatchCount + 1}`;
    }
    const batchName = baseName.includes(suffix) ? baseName : `${baseName}${suffix}`;

    // ── 3. Kiểm tra trùng tên lô ──
    const exists = await Batch.findOne({ name: batchName });
    if (exists) {
      return NextResponse.json({ error: "Tên lô đã tồn tại" }, { status: 400 });
    }

    // Tạo lô rỗng
    const newBatch = await Batch.create({
      name: batchName,
      type: "SATELLITE",
      importedAt: new Date().toISOString().split("T")[0],
      importedBy: body.importedBy || userName,
      assignedTo: body.assignedTo,
      mailCount: 0,
      totalMails: 0,
      startIndex: 0,
      endIndex: 0
    });

    // ── 4. Ghi log ──
    try {
      const { Log } = await import("@/models/Log");
      await Log.create({
        user: userName,
        role: "ADMIN",
        action: `Tạo lô rỗng "${batchName}" gán cho ${assigneeUser.name}`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (_) {}

    await logAuditTrail(
      userId || "system",
      "CREATE_BATCH_SUCCESS",
      "mails",
      { name: batchName, assignedTo: body.assignedTo, mailCount: 0, startIndex: 0, endIndex: 0 },
      req
    );

    return NextResponse.json({ success: true, data: newBatch, batch: newBatch });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("POST satellite batches error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
