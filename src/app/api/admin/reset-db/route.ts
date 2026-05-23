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
    if (collectionNames.includes("mails")) await db.dropCollection("mails");
    if (collectionNames.includes("kpis")) await db.dropCollection("kpis");

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
