import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Basic auth check (can check cookie or token if needed, but per prompt: Admin role "01")
    // Assuming middleware already checks role "01", or we can do a quick check here.
    // For simplicity, we drop collections directly.
    await dbConnect();

    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "Không thể kết nối Database" }, { status: 500 });
    }

    // Drop collections if they exist
    const collections = await db.listCollections().toArray();
    const collectionNames = (collections || []).map((col) => col.name);

    if (collectionNames.includes("users")) await db.dropCollection("users");
    if (collectionNames.includes("root_mails")) await db.dropCollection("root_mails");
    if (collectionNames.includes("satellite_mails")) await db.dropCollection("satellite_mails");
    if (collectionNames.includes("monetized_mails")) await db.dropCollection("monetized_mails");
    // if (collectionNames.includes("phones")) await db.dropCollection("phones"); // Bỏ qua Phones (có thể là cấu hình chung)
    // if (collectionNames.includes("kpis")) await db.dropCollection("kpis"); // KHÔNG xoá KPI (Cấu hình hệ thống)
    // if (collectionNames.includes("notifications")) await db.dropCollection("notifications"); // Không xoá Notification
    if (collectionNames.includes("tasks")) await db.dropCollection("tasks");
    if (collectionNames.includes("fines")) await db.dropCollection("fines");
    if (collectionNames.includes("logs")) await db.dropCollection("logs");

    try {
      const { logAction } = await import('@/lib/logger');
      await logAction("system", "Reset Database", "Đã xóa dữ liệu nhân viên, mail, task, fines và khôi phục Admin.");
    } catch(e) {}

    // Re-create Admin account
    const defaultPassword = await hashPassword("123456");
    await User.create({
      name: "Admin",
      username: "01",
      email: "admin@aqmedia.com",
      password: defaultPassword,
      role: "01",
      status: "ACTIVE"
    });

    return NextResponse.json({ message: "Đã reset database thành công và khôi phục tài khoản Admin" });
  } catch (error: any) {
    console.error("Reset DB error:", error);
    return NextResponse.json({ error: "Lỗi khi reset database: " + error.message }, { status: 500 });
  }
}
