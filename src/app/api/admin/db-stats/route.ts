import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    if (!mongoose.connection.db) {
      throw new Error("Không thể kết nối đến database command");
    }
    const stats = await mongoose.connection.db.command({ dbStats: 1 });
    
    return NextResponse.json({
      success: true,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize
    });
  } catch (error: any) {
    console.error("Lỗi lấy DB Stats:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
