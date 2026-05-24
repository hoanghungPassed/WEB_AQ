import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { SyncStore } from"@/models/SyncStore";

export const dynamic ="force-dynamic";

// GET: Trả về toàn bộ key-value pairs từ SyncStore
export async function GET() {
 try {
 await dbConnect();
 const docs = await SyncStore.find({}).lean();
 const result: Record<string, string> = {};
 for (const doc of docs) {
 result[doc.key] = doc.value;
 }
 return NextResponse.json(result);
 } catch (error: any) {
 console.error("Sync GET error:", error);
 return NextResponse.json({});
 }
}

// POST: Upsert key-value pairs vào SyncStore
export async function POST(req: Request) {
 try {
 await dbConnect();
 const body = await req.json();

 const ops = Object.entries(body).map(([key, value]) => ({
 updateOne: {
 filter: { key },
 update: { $set: { key, value: value as string } },
 upsert: true,
 },
 }));

 if (ops.length > 0) {
 await SyncStore.bulkWrite(ops);
 }

 return NextResponse.json({ success: true });
 } catch (error: any) {
 console.error("Sync POST error:", error);
 return NextResponse.json(
 { success: false, error: error.message },
 { status: 500 }
 );
 }
}

// DELETE: Xóa key(s) từ SyncStore
export async function DELETE(req: Request) {
 try {
 await dbConnect();
 const { searchParams } = new URL(req.url);
 const key = searchParams.get("key");

 if (key) {
 await SyncStore.deleteOne({ key });
 } else {
 // Xóa tất cả (dùng cho reset DB)
 await SyncStore.deleteMany({});
 }

 return NextResponse.json({ success: true });
 } catch (error: any) {
 console.error("Sync DELETE error:", error);
 return NextResponse.json(
 { success: false, error: error.message },
 { status: 500 }
 );
 }
}
