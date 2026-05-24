import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import mongoose from"mongoose";

export async function POST(request: Request) {
 try {
 await dbConnect();

 const db = mongoose.connection.db;
 if (!db) {
 return NextResponse.json({ error:"Không thể kết nối Database" }, { status: 500 });
 }

 const collections = await db.listCollections().toArray();
 
 for (const col of collections) {
 if (col.name !=="users" && !col.name.startsWith("system.")) {
 await db.dropCollection(col.name);
 }
 }

 try {
 const { logAction } = await import('@/lib/logger');
 await logAction("system","Reset Database","Đã xóa toàn bộ dữ liệu (trừ Users).");
 } catch(e) {}

 return NextResponse.json({ message:"Đã reset database thành công!" });
 } catch (error: any) {
 console.error("Reset DB error:", error);
 return NextResponse.json({ error:"Lỗi khi reset database:" + error.message }, { status: 500 });
 }
}
