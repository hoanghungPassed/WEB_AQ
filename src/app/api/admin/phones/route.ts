import { NextRequest, NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { Phone, IPhone } from"@/models/Phone";
import { User } from"@/models/User";
import { Log } from"@/models/Log";
import { checkPermission, logAuditTrail } from "@/lib/permissions";
export const dynamic ="force-dynamic";

interface PhoneImportItem {
 number: string;
 otpLink?: string;
 status?: string;
}

interface PhoneImportBody {
 batch: string;
 phones: PhoneImportItem[];
 username?: string;
}

type PhoneImportPayloadItem = {
 number: string;
 otpLink: string;
 status: string;
 assigneeId: IPhone['assigneeId'] | null;
 assignedTo: IPhone['assignedTo'] | null;
 assignedAt: IPhone['assignedAt'] | null;
 importedAt: string;
 batch: string;
};

type PhoneNumberOnly = {
 number: string;
};

type PhoneUpdateFields = Partial<{
 status: IPhone['status'];
 assigneeId: IPhone['assigneeId'];
 assignedTo: IPhone['assignedTo'];
 assignedAt: IPhone['assignedAt'];
 importedAt: IPhone['importedAt'];
 batch: string;
 otpLink: IPhone['otpLink'];
}>;

interface PhoneBulkUpdateBody {
 ids?: string[];
 update?: PhoneUpdateFields;
 id?: string;
 [key: string]: unknown;
}

export async function GET(req: NextRequest) {
 try {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  const hasPermission = await checkPermission(userRole || "", 1, ["all", "reports", "attendance", "staff", "tasks"]);
  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_GET_PHONES", "phones", {}, req);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const query: any = {};
  if (status) query.status = status;

  let mappedRole = userRole || "";
  const upper = String(userRole || "").toUpperCase();
  if (upper === "ADMIN") mappedRole = "01";
  else if (upper.includes("CÔNG VIỆC") || upper === "QLCV") mappedRole = "02";
  else if (upper.includes("NHÂN SỰ") || upper === "QLNS") mappedRole = "03";
  else if (upper === "NHÂN VIÊN" || upper === "NHÂN VIÊN CHÍNH THỨC") mappedRole = "04";
  else if (upper === "NV THỬ VIỆC" || upper === "NHÂN VIÊN THỬ VIỆC") mappedRole = "05";

  const isStaff = mappedRole === "03" || mappedRole === "04" || mappedRole === "05";
  if (isStaff) {
    const mongoose = (await import("mongoose")).default;
    const dbUser = await User.findById(userId);
    const username = dbUser?.username;

    query.$or = [
      { assigneeId: userId },
      { assigneeId: userId ? new mongoose.Types.ObjectId(userId) : null }
    ];
    if (username) {
      query.$or.push({ assigneeId: username });
      query.$or.push({ assigneeId: username.toLowerCase() });
    }
    query.status = { $ne: "Lỗi" };
  }

  const phones = await Phone.find(query).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ success: true, data: phones });
  } catch (unknownError) {
  const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
  return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
 try {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  const hasPermission = await checkPermission(userRole || "", 3, ["all", "reports", "attendance", "staff"]);
  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_IMPORT_PHONES", "phones", {}, req);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

 await dbConnect();
 const body = (await req.json()) as PhoneImportBody;
 const { batch, phones, username } = body;

 if (!batch || !phones || !Array.isArray(phones) || phones.length === 0) {
 return NextResponse.json({ success: false, error:"Thiếu thông tin lô SĐT hoặc danh sách rỗng." }, { status: 400 });
 }

 const payload: PhoneImportPayloadItem[] = phones.map((item) => ({
 number: item.number,
 otpLink: item.otpLink ?? "",
 status: item.status ?? "Chưa làm",
 assigneeId: null,
 assignedTo: null,
 assignedAt: null,
 importedAt: new Date().toISOString().split("T")[0],
 batch
 }));

 const numbersToImport = payload.map((p) => p.number);
	const existingPhones = (await Phone.find({ number: { $in: numbersToImport } }).lean()) as PhoneNumberOnly[];
	const existingNumbers = new Set(existingPhones.map((p: PhoneNumberOnly) => p.number));

 const uniquePayloadMap = new Map<string, PhoneImportPayloadItem>();
 for (const p of payload) {
 if (!existingNumbers.has(p.number) && !uniquePayloadMap.has(p.number)) {
 uniquePayloadMap.set(p.number, p);
 }
 }
 const finalPayload = Array.from(uniquePayloadMap.values());

 if (finalPayload.length === 0) {
 return NextResponse.json({ success: false, error:"Tất cả SĐT trong file đều đã tồn tại hoặc trùng lặp!" }, { status: 400 });
 }

 await Phone.insertMany(finalPayload);
 const duplicates = payload.length - finalPayload.length;
 let successMsg = `Import thành công lô ${batch}`;
 if (duplicates > 0) {
 successMsg += ` (đã bỏ qua ${duplicates} SĐT trùng)`;
 }

 if (username) {
 const adminUser = await User.findOne({ username });
 if (adminUser) {
 await Log.create({
 action: 'IMPORT_PHONES',
 details: 'Đã import lô SĐT: ' + batch + ` (${finalPayload.length} số mới)`,
 type: 'SUCCESS',
 role: adminUser.role || 'ADMIN',
 user: adminUser._id
 });
 }
 }

  await logAuditTrail(userId || "system", "IMPORT_PHONES_SUCCESS", "phones", { batch, importedCount: finalPayload.length }, req);
  return NextResponse.json({ success: true, message: successMsg, imported: finalPayload.length }, { status: 201 });
 } catch (unknownError) {
 const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
 return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}

export async function PUT(req: NextRequest) {
  try {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  const hasPermission = await checkPermission(userRole || "", 1, ["all", "reports", "attendance", "staff", "tasks"]);
  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_UPDATE_PHONES", "phones", {}, req);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

 await dbConnect();
 const body = (await req.json()) as PhoneBulkUpdateBody;
 const { ids, update } = body;

  if (body.amount && body.assigneeId) {
    const amount = Number(body.amount);
    const mongoose = (await import("mongoose")).default;
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const availablePhones = await Phone.find({
        $or: [{ assigneeId: null }, { assigneeId: { $exists: false } }],
        status: { $ne: "Lỗi" }
      })
      .limit(amount)
      .session(session);

      if (availablePhones.length < amount) {
        throw new Error(`Kho không còn đủ ${amount} số trống!`);
      }

      const idsToAssign = availablePhones.map(p => p._id);
      const now = new Date().toISOString().split("T")[0];

      await Phone.updateMany(
        { _id: { $in: idsToAssign } },
        {
          $set: {
            assigneeId: new mongoose.Types.ObjectId(body.assigneeId as string),
            assignedTo: (body.assignedTo as string) || "Nhân viên",
            assignedAt: now,
            status: "ASSIGNED"
          }
        },
        { session }
      );

      const { Notification } = await import("@/models/Notification");
      await Notification.create([{
        title: "Giao Lô Số Điện Thoại",
        message: `Bạn được phân công ${amount} SĐT mới để xác minh.`,
        type: "ASSIGNMENT",
        recipientId: new mongoose.Types.ObjectId(body.assigneeId as string),
        isRead: false
      }], { session });

      await session.commitTransaction();

      try {
        const { pusherServer } = await import("@/lib/pusher");
        await pusherServer.trigger(`user-${body.assigneeId}`, "new-task", {
          title: "Giao Lô Số Điện Thoại",
          message: `Bạn được phân công ${amount} SĐT mới để xác minh.`,
          type: "ASSIGNMENT"
        });
      } catch (err) {}

      return NextResponse.json({ success: true, count: amount });
    } catch (err: any) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    } finally {
      session.endSession();
    }
  }

  if (ids && Array.isArray(ids) && update) {
    const mongoose = (await import("mongoose")).default;
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updateSet: any = { ...update };
      if (updateSet.assigneeId) {
        updateSet.assigneeId = new mongoose.Types.ObjectId(updateSet.assigneeId as string);
        if (!updateSet.status) {
          updateSet.status = 'ASSIGNED';
        }

        // Query available phones in the requested set to see if they are still unassigned
        const availableCount = await Phone.countDocuments({
          _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) },
          $or: [{ assigneeId: null }, { assigneeId: { $exists: false } }]
        }).session(session);

        if (availableCount < ids.length) {
          throw new Error(`Kho không còn đủ ${ids.length} số trống!`);
        }
      }

      const result = await Phone.updateMany(
        { _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) } },
        { $set: updateSet },
        { session }
      );

      // Notify employee of bulk assignment
      if (updateSet.assigneeId) {
        const { Notification } = await import("@/models/Notification");
        await Notification.create([{
          title: "Giao Lô Số Điện Thoại",
          message: `Bạn được phân công ${ids.length} SĐT mới để xác minh.`,
          type: "ASSIGNMENT",
          recipientId: updateSet.assigneeId,
          isRead: false
        }], { session });
      }

      await session.commitTransaction();

      if (updateSet.assigneeId) {
        try {
          const { pusherServer } = await import("@/lib/pusher");
          await pusherServer.trigger(`user-${updateSet.assigneeId.toString()}`, "new-task", {
            title: "Giao Lô Số Điện Thoại",
            message: `Bạn được phân công ${ids.length} SĐT mới để xác minh.`,
            type: "ASSIGNMENT"
          });
        } catch (err) {
          console.error("Failed to notify user about phone assignment:", err);
        }
      }

      await logAuditTrail(userId || "system", "BULK_UPDATE_PHONES_SUCCESS", "phones", { idsCount: ids.length }, req);
      return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (err: any) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    } finally {
      session.endSession();
    }
  }

  const { id, ...updateData } = body;
  if (!id) {
    return NextResponse.json({ success: false, error: "Thiếu ID phone" }, { status: 400 });
  }

  const phone = await Phone.findByIdAndUpdate(id, updateData, { new: true });
  if (!phone) {
    return NextResponse.json({ success: false, error: "Không tìm thấy SĐT" }, { status: 404 });
  }

  // Notify employee of single assignment
  if (updateData.assigneeId) {
    try {
      const assigneeIdVal = updateData.assigneeId as string;
      const { Notification } = await import("@/models/Notification");
      await Notification.create({
        title: "Giao Số Điện Thoại",
        message: `Bạn được phân công SĐT ${phone.number} mới để xác minh.`,
        type: "ASSIGNMENT",
        recipientId: assigneeIdVal,
        isRead: false
      });

      const { pusherServer } = await import("@/lib/pusher");
      await pusherServer.trigger(`user-${assigneeIdVal}`, "new-task", {
        title: "Giao SĐT",
        message: `Bạn được phân công SĐT ${phone.number} mới để xác minh.`,
        type: "ASSIGNMENT"
      });
    } catch (err) {
      console.error("Failed to notify user about single phone assignment:", err);
    }
  }

 await logAuditTrail(userId || "system", "UPDATE_PHONE_SUCCESS", "phones", { id, number: phone.number }, req);

 return NextResponse.json({ success: true, data: phone });
 } catch (unknownError) {
 const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
 return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}

export async function DELETE(req: NextRequest) {
 try {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  const hasPermission = await checkPermission(userRole || "", 3, ["all", "reports", "attendance", "staff"]);
  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_DELETE_PHONE_BATCH", "phones", {}, req);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

 await dbConnect();
 const { searchParams } = new URL(req.url);
 const batch = searchParams.get('batch');
 const username = searchParams.get('username');
 if (!batch) {
 return NextResponse.json({ success: false, error:"Thiếu lô cần xóa" }, { status: 400 });
 }
 
 const result = await Phone.deleteMany({ $or: [{ batch }, { importBatch: batch }] });
 
 if (username) {
 const adminUser = await User.findOne({ username });
 if (adminUser) {
 await Log.create({
 action: 'DELETE_BATCH',
 details: 'Đã xóa lô SĐT: ' + batch,
 type: 'SUCCESS',
 role: adminUser.role || 'ADMIN',
 user: adminUser._id
 });
 }
 }
 
 await logAuditTrail(userId || "system", "DELETE_PHONE_BATCH_SUCCESS", "phones", { batch, deletedCount: result.deletedCount }, req);
 
 return NextResponse.json({ success: true, deletedCount: result.deletedCount }, { status: 200 });
 } catch (unknownError) {
 const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
 return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}
