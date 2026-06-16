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

    // Safety Lock: Prevent Path Traversal
    const safeName = path.basename(file.name);

    // Safety Lock: File Extension Whitelist
    const ext = path.extname(safeName).toLowerCase();
    const whitelist = [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".txt", ".csv", ".xlsx", ".xls"];
    const blacklist = [".php", ".sh", ".exe", ".js", ".html", ".htm", ".bat", ".cmd", ".msi", ".jar", ".py", ".pl"];

    if (!whitelist.includes(ext) || blacklist.includes(ext)) {
      return NextResponse.json(
        { error: "Định dạng file không được phép. Chỉ cho phép các định dạng ảnh, pdf, txt, csv, excel." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${safeName.replace(/\s+/g, "_")}`;
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
