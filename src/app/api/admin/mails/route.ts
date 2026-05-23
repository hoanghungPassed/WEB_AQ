import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Mail } from "@/models/Mail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    
    let query: any = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const mails = await Mail.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: mails });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect(); // Kết nối DB
    const body = await req.json();
    
    // 1. Log dữ liệu để chắc chắn Frontend đã gửi đúng
    console.log("Dữ liệu nhận được từ FE:", body);

    // 2. ÉP BUỘC PHẢI DÙNG AWAIT
    // Nếu thiếu "await", Node.js sẽ chạy tiếp mà không đợi ghi xong
    const newMail = await Mail.create(body); 

    // 3. Log sau khi lưu
    console.log("DB đã lưu bản ghi:", newMail._id);

    return NextResponse.json({ success: true, data: newMail }, { status: 201 });
  } catch (error: any) {
    // 4. BẮT BUỘC LOG LỖI MÀU ĐỎ ĐỂ TÔI THẤY
    console.error("LỖI LƯU DB:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi không xác định" },
      { status: 500 }
    );
  }
}
