import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { SyncStore } from"@/models/SyncStore";
import { getAuthUser } from "@/lib/auth";

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
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Sync GET error:", error);
 return NextResponse.json({});
 }
}

// POST: Upsert key-value pairs vào SyncStore
export async function POST(req: Request) {
 try {
 await dbConnect();
 const body = await req.json();
 
 const authUser = await getAuthUser();
 const roleStr = String(authUser?.role || "").toUpperCase();
 const isAdminOrManager = 
   roleStr === "01" || 
   roleStr === "02" || 
   roleStr === "ADMIN" || 
   roleStr.includes("QUẢN LÝ") || 
   roleStr === "QL CÔNG VIỆC";

 const ops = [];
 for (const [key, value] of Object.entries(body)) {
   // BẢO MẬT TỐI ĐA: Nhân viên KHÔNG được phép ghi đè các key nhạy cảm
   const isSensitiveKey = 
     key === "global_users" || 
     key.startsWith("access_response_") || 
     key.startsWith("access_") || 
     key === "admin_notifications" || 
     key === "pending_access_requests";
     
   if (isSensitiveKey && !isAdminOrManager) {
     // Nếu là employee mà cố tình gửi key nhạy cảm -> Bỏ qua key này
     continue;
   }

   ops.push({
     updateOne: {
       filter: { key },
       update: { $set: { key, value: value as string } },
       upsert: true,
     },
   });
 }

 if (ops.length > 0) {
 await SyncStore.bulkWrite(ops);
 }

 return NextResponse.json({ success: true });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Sync POST error:", error);
 return NextResponse.json(
 { success: false, error: errorMessage },
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
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Sync DELETE error:", error);
 return NextResponse.json(
 { success: false, error: errorMessage },
 { status: 500 }
 );
 }
}
