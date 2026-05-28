import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file tải lên." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    // Tạo thư mục public/uploads nếu chưa tồn tại
    await fs.mkdir(uploadDir, { recursive: true });

    // Ghi file vào thư mục
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    // Trả về URL tương đối để truy cập qua static files
    const url = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Lỗi upload ảnh:", error);
    return NextResponse.json({ error: "Lỗi upload file: " + errorMessage }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
