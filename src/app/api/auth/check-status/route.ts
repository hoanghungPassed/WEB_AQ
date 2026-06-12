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
    // ACTIVE -> ACTIVE (only if not late-locked)
    // LOCKED -> REJECTED
    let responseStatus: "PENDING" | "ACTIVE" | "REJECTED" = "PENDING";
    
    const isAccessGranted = user.status === "ACTIVE" && !user.isLateLocked;

    if (isAccessGranted) {
      responseStatus = "ACTIVE";
      user.isOnline = true;
      user.lastActive = new Date();
      await user.save();
    } else {
      // Only save to DB if we need to transition isOnline to false, avoiding duplicate writes on polling
      if (user.isOnline) {
        user.isOnline = false;
        await user.save();
      }
      if (user.status === "LOCKED" || user.isLateLocked) {
        responseStatus = "REJECTED";
      }
    }

    return NextResponse.json({ 
      status: responseStatus,
      isLateLocked: user.isLateLocked || false,
      userStatus: user.status || "PENDING"
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Lỗi API check-status:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}
