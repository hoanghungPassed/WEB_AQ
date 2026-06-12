export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import dbConnect from '@/lib/mongodb';
import { Fine } from '@/models/Fine';
import { Log } from '@/models/Log';
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { paginate } from "@/lib/pagination";
import { CreateFineSchema, UpdateFineSchema, sanitizeXSS } from "@/lib/validation";
import { sendFineEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    const status = searchParams.get("status");

    const filter: any = {};
    if (status && status !== "ALL") filter.status = status;

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "attendance"]);
    if (!hasPermission) {
      if (!userId) {
        await logAuditTrail("unknown", "UNAUTHORIZED_GET_FINES", "fines", {}, req);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Staff members can only view their own fines
      filter.userId = userId;
    }

    // Fallback: If pagination parameters are omitted, return the legacy raw array format
    if (!searchParams.has("page") && !searchParams.has("limit") && searchParams.get("all") !== "true") {
      const fines = await Fine.find(filter).populate("userId").sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 });
      return NextResponse.json(fines || []);
    }

    const query = Fine.find(filter).populate("userId");
    const result = await paginate(query, page, limit, sortBy, sortOrder);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Error fetching fines data:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
 try {
  const requestorId = req.headers.get("x-user-id");
  const requestorRole = req.headers.get("x-user-role");

  const hasPermission = await checkPermission(requestorRole || "", 4, ["all", "attendance"]);
  if (!hasPermission) {
    await logAuditTrail(requestorId || "unknown", "UNAUTHORIZED_CREATE_FINE", "fines", {}, req);
    return NextResponse.json({ error: "Không có quyền tạo báo cáo phạt" }, { status: 403 });
  }

  await dbConnect();
  const body = await req.json();

  // Validate body using Zod CreateFineSchema
  const parsed = CreateFineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { 
        error: "Validation failed",
        details: parsed.error.issues.map(e => ({
          field: e.path.join("."),
          message: e.message
        }))
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Sanitize string inputs to prevent XSS
  data.reason = sanitizeXSS(data.reason);
  
  // Create new fine
  const newFine = await Fine.create(data);

  // Send fine notification email (fire-and-forget)
  try {
    const User = (await import("@/models/User")).default;
    const finedUser = await User.findById(data.userId).select("name email");
    if (finedUser?.email) {
      sendFineEmail(finedUser.email, finedUser.name || "Nhân viên", data.amount, data.reason).catch(console.error);
    }
  } catch (_) {}

  // Create log
  try {
  await Log.create({
  user:"System",
  role:"ADMIN",
  action: `Tạo báo cáo phạt mới cho nhân sự ID: ${data.userId}`,
  type:"SUCCESS",
  timestamp: new Date().toLocaleString("vi-VN")
  });
  } catch (logErr) {
  console.error("Failed to create log for fine:", logErr);
  }

  await logAuditTrail(requestorId || "system", "CREATE_FINE_SUCCESS", "fines", data, req);

  return NextResponse.json({ success: true, data: newFine }, { status: 201 });
 } catch (error: unknown) {
     const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
  console.error("Error creating fine:", error);
  return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}

export async function PUT(req: NextRequest) {
 try {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");
  const isStaff = userRole === "03" || userRole === "04" || userRole === "05";

   await dbConnect();
   const body = await req.json();
   const { id } = body;

   if (!id) {
     return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
   }

   const existingFine = await Fine.findById(id);
   if (!existingFine) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

   // IDOR & Permission Protection
   if (isStaff) {
     // Staff can only update their own fines
     if (existingFine.userId?.toString() !== userId) {
       await logAuditTrail(userId || "unknown", "UNAUTHORIZED_FINE_UPDATE_ATTEMPT", "fines", { fineId: id }, req);
       return NextResponse.json({ error: "Không có quyền cập nhật báo cáo phạt của người khác" }, { status: 403 });
     }
     // Staff cannot alter the fine amount or status
     if (body.amount !== undefined && Number(body.amount) !== existingFine.amount) {
       await logAuditTrail(userId || "unknown", "UNAUTHORIZED_FINE_AMOUNT_UPDATE", "fines", { fineId: id }, req);
       return NextResponse.json({ error: "Nhân viên không được phép sửa đổi số tiền phạt" }, { status: 403 });
     }
     if (body.status !== undefined && body.status !== existingFine.status) {
       await logAuditTrail(userId || "unknown", "UNAUTHORIZED_FINE_STATUS_UPDATE", "fines", { fineId: id }, req);
       return NextResponse.json({ error: "Nhân viên không được phép cập nhật trạng thái thanh toán" }, { status: 403 });
     }
   } else {
     // Non-staff requires manager/admin permissions (level 4)
     const hasPermission = await checkPermission(userRole || "", 4, ["all", "attendance"]);
     if (!hasPermission) {
       await logAuditTrail(userId || "unknown", "UNAUTHORIZED_UPDATE_FINE", "fines", {}, req);
       return NextResponse.json({ error: "Không có quyền cập nhật báo cáo phạt" }, { status: 403 });
     }
   }

   // Validate using Zod UpdateFineSchema

   const updateData: any = {
     status: body.status,
     amount: body.amount !== undefined ? body.amount : existingFine.amount
   };

   const fine = await Fine.findByIdAndUpdate(id, { $set: updateData }, { new: true }).populate('userId', 'name');
   if (!fine) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

   // Create log
   try {
   await Log.create({
   user: (userId || undefined) as any,
   role: userRole === "01" ? "ADMIN" : userRole === "02" ? "QL CÔNG VIỆC" : "QL NHÂN SỰ",
   action: `Cập nhật trạng thái thanh toán phạt của ${(fine.userId as any)?.name} thành ${body.status}`,
   type:"SUCCESS",
   timestamp: new Date().toLocaleString("vi-VN")
   });
   } catch (logErr) {
   console.error("Failed to create log for fine update:", logErr);
   }

   await logAuditTrail(userId || "system", "UPDATE_FINE_SUCCESS", "fines", { id, ...body }, req);

  return NextResponse.json({ success: true, data: fine });
 } catch (error: unknown) {
     const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
  return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}

export async function DELETE(req: NextRequest) {
 try {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  const hasPermission = await checkPermission(userRole || "", 4, ["all", "attendance"]);
  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_DELETE_FINE", "fines", {}, req);
    return NextResponse.json({ error: "Không có quyền xóa báo cáo phạt" }, { status: 403 });
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  if (!id) return NextResponse.json({ success: false, error:"ID is required" }, { status: 400 });

  const existingFine = await Fine.findById(id);
  if (!existingFine) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  // Strictly enforce Manager+ permission for deletion
  const hasManagerPermission = await checkPermission(userRole || "", 4, ["all", "attendance"]);
  if (!hasManagerPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_DELETE_FINE", "fines", { fineId: id }, req);
    return NextResponse.json({ error: "Không có quyền xóa báo cáo phạt" }, { status: 403 });
  }

  const fine = await Fine.findByIdAndDelete(id).populate('userId', 'name');
  
  if (fine) {
  try {
  await Log.create({
  user:"System",
  role:"ADMIN",
  action: `Xóa báo cáo phạt của ${(fine.userId as any)?.name}`,
  type:"SUCCESS",
  timestamp: new Date().toLocaleString("vi-VN")
  });
  } catch (logErr) {}
  }

  await logAuditTrail(userId || "system", "DELETE_FINE_SUCCESS", "fines", { id }, req);

  return NextResponse.json({ success: true });
 } catch (error: unknown) {
     const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
  return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}
