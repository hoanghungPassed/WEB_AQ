import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import mongoose from"mongoose";

export async function POST(request: Request) {
 try {
 const userId = request.headers.get("x-user-id");
 const userRole = request.headers.get("x-user-role");
 if (!userId || userRole !== "01") {
 return NextResponse.json({ error:"Unauthorized: Chỉ Admin mới có quyền reset database" }, { status: 401 });
 }

 await dbConnect();

  const db = mongoose.connection.db;
  if (!db) {
  return NextResponse.json({ error:"Không thể kết nối Database" }, { status: 500 });
  }

  const collections = await db.listCollections().toArray();
  
  for (const col of collections) {
    if (col.name !=="users" && col.name !=="system_settings" && col.name !=="systemsettings" && !col.name.startsWith("system.")) {
      await db.dropCollection(col.name);
    }
  }

  // Delete all users EXCEPT role Admin ('01') to safeguard main account
  const User = (await import("@/models/User")).default;
  await User.deleteMany({ role: { $ne: "01" } });

  // Explicitly wipe direct messages and templates to avoid ghost data
  const { Message } = await import("@/models/Message");
  const { AutoMessage } = await import("@/models/AutoMessage");
  await Message.deleteMany({});
  await AutoMessage.deleteMany({});

 try {
 const { logAction } = await import('@/lib/logger');
 await logAction("system","Reset Database","Đã xóa toàn bộ dữ liệu (trừ Users).");
 } catch(e) {}

 return NextResponse.json({ message:"Đã reset database thành công!" });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Reset DB error:", error);
 return NextResponse.json({ error:"Lỗi khi reset database:" + errorMessage }, { status: 500 });
 }
}
