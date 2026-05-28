import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Message } from "@/models/Message";

export async function POST(req: NextRequest) {
  try {
    let userId = req.headers.get("x-user-id");
    
    // Fallback: Decode token from cookie if header is not present
    if (!userId) {
      const { getAuthUser } = await import("@/lib/auth");
      const authUser = await getAuthUser();
      if (authUser) {
        userId = authUser.userId;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    // Chạy lệnh: updateMany receiverId: userId, isRead: false -> isRead: true
    const result = await Message.updateMany(
      { receiverId: userId, isRead: false },
      { isRead: true }
    );

    return NextResponse.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      },
      modifiedCount: result.modifiedCount
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("mark-read API error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
