export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "Thiếu username" }, { status: 400 });
    }

    const lowercaseUsername = username.toLowerCase();
    const user = await User.findOne({ username: lowercaseUsername });

    if (!user) {
      // Nếu không tìm thấy (admin xóa hoặc từ chối trực tiếp), coi như bị từ chối (REJECTED)
      return NextResponse.json({ status: "REJECTED" });
    }

    // Ánh xạ trạng thái từ Database:
    // PENDING -> PENDING
    // ACTIVE -> GRANTED
    // LOCKED -> REJECTED
    let responseStatus: "PENDING" | "GRANTED" | "REJECTED" = "PENDING";
    if (user.status === "ACTIVE") {
      responseStatus = "GRANTED";
      user.isOnline = true;
    } else {
      user.isOnline = false;
      if (user.status === "LOCKED") {
        responseStatus = "REJECTED";
      }
    }
    await user.save();

    return NextResponse.json({ status: responseStatus });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Lỗi API check-status:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}
