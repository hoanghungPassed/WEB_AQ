import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Phone } from "@/models/Phone";
import { User } from "@/models/User";
import { Log } from "@/models/Log";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    
    let query: any = {};
    if (status) query.status = status;

    const phones = await Phone.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: phones });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { batch, phones, username } = await req.json();

    if (!batch || !phones || !Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin lô SĐT hoặc danh sách rỗng." }, { status: 400 });
    }

    const payload = phones.map((item: any) => ({
      number: item.number,
      otpLink: item.otpLink || "",
      status: item.status || "Chưa làm",
      assigneeId: null,
      assignedTo: null,
      assignedAt: null,
      importedAt: new Date().toISOString().split("T")[0],
      batch: batch
    }));

    const numbersToImport = payload.map((p: any) => p.number);
    const existingPhones = await Phone.find({ number: { $in: numbersToImport } }).lean();
    const existingNumbers = new Set(existingPhones.map((p: any) => p.number));

    const uniquePayloadMap = new Map();
    for (const p of payload) {
      if (!existingNumbers.has(p.number) && !uniquePayloadMap.has(p.number)) {
        uniquePayloadMap.set(p.number, p);
      }
    }
    const finalPayload = Array.from(uniquePayloadMap.values());

    if (finalPayload.length === 0) {
      return NextResponse.json({ success: false, error: "Tất cả SĐT trong file đều đã tồn tại hoặc trùng lặp!" }, { status: 400 });
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

    return NextResponse.json({ success: true, message: successMsg, imported: finalPayload.length }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const batch = searchParams.get('batch');
    const username = searchParams.get('username');
    if (!batch) {
      return NextResponse.json({ success: false, error: "Thiếu lô cần xóa" }, { status: 400 });
    }
    
    const result = await Phone.deleteMany({ batch });
    
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
    
    return NextResponse.json({ success: true, deletedCount: result.deletedCount }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
