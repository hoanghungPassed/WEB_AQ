import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { Phone, IPhone } from"@/models/Phone";
import { User } from"@/models/User";
import { Log } from"@/models/Log";
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

export async function GET(req: Request) {
 try {
 await dbConnect();
 const { searchParams } = new URL(req.url);
 const status = searchParams.get("status");

 const query: Partial<Pick<IPhone, 'status'>> = {};
 if (status) query.status = status;

 const phones = await Phone.find(query).sort({ createdAt: -1 });
 return NextResponse.json({ success: true, data: phones });
 } catch (unknownError) {
 const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
 return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}

export async function POST(req: Request) {
 try {
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

 return NextResponse.json({ success: true, message: successMsg, imported: finalPayload.length }, { status: 201 });
 } catch (unknownError) {
 const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
 return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}

export async function PUT(req: Request) {
 try {
 await dbConnect();
 const body = (await req.json()) as PhoneBulkUpdateBody;
 const { ids, update } = body;

 if (ids && Array.isArray(ids) && update) {
 const result = await Phone.updateMany(
 { _id: { $in: ids } },
 { $set: update }
 );
 return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
 }

 const { id, ...updateData } = body;
 if (!id) {
 return NextResponse.json({ success: false, error:"Thiếu ID phone" }, { status: 400 });
 }

 const phone = await Phone.findByIdAndUpdate(id, updateData, { new: true });
 if (!phone) {
 return NextResponse.json({ success: false, error:"Không tìm thấy SĐT" }, { status: 404 });
 }

 return NextResponse.json({ success: true, data: phone });
 } catch (unknownError) {
 const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
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
 
 return NextResponse.json({ success: true, deletedCount: result.deletedCount }, { status: 200 });
 } catch (unknownError) {
 const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
 return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}

