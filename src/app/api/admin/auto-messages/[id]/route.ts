import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AutoMessage from "@/models/AutoMessage";

// Cập nhật tin nhắn tự động
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const role = req.headers.get("x-user-role");

    if (role !== "01" && role !== "02" && role !== "03") {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const data = await req.json();
    const updated = await AutoMessage.findByIdAndUpdate(id, data, { new: true });
    
    if (!updated) {
      return NextResponse.json({ error: "Không tìm thấy tin nhắn mẫu" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Cập nhật tin nhắn mẫu thành công", 
      data: updated 
    });
  } catch (error: any) {
    console.error("Update auto message error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + error.message }, { status: 500 });
  }
}

// Xóa tin nhắn tự động
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const role = req.headers.get("x-user-role");

    if (role !== "01" && role !== "02" && role !== "03") {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const deleted = await AutoMessage.findByIdAndDelete(id);
    
    if (!deleted) {
      return NextResponse.json({ error: "Không tìm thấy tin nhắn mẫu" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Xóa tin nhắn mẫu thành công" 
    });
  } catch (error: any) {
    console.error("Delete auto message error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + error.message }, { status: 500 });
  }
}
