export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AutoMessage from "@/models/AutoMessage";

// Lấy danh sách tin nhắn tự động
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const role = req.headers.get("x-user-role");

    // Chỉ Admin (01), QL Công việc (02), QL Nhân sự (03) được truy cập
    if (role !== "01" && role !== "02" && role !== "03") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    const messages = await AutoMessage.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, messages });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Get auto messages error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}

// Tạo tin nhắn tự động mới
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const role = req.headers.get("x-user-role");

    if (role !== "01" && role !== "02" && role !== "03") {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const data = await req.json();
    if (!data.title || !data.content) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ tiêu đề và nội dung" }, { status: 400 });
    }

    const newMessage = new AutoMessage(data);
    await newMessage.save();

    return NextResponse.json({ 
      success: true, 
      message: "Tạo tin nhắn mẫu thành công", 
      data: newMessage 
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Create auto message error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}
