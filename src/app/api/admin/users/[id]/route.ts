import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

// Cập nhật thông tin nhân sự
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const data = await req.json();
    const reqUserId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role");

    // Nếu không phải admin (01) hoặc HR (03) thì chỉ được sửa thông tin của chính mình
    if (role !== "01" && role !== "03" && reqUserId !== id) {
        return NextResponse.json({ error: "Không có quyền chỉnh sửa nhân sự khác" }, { status: 403 });
    }

    // Nếu có đổi mật khẩu, thì hash mật khẩu mới
    if (data.password) {
        data.password = await hashPassword(data.password);
    }

    // { new: true } trả về document sau khi đã update, select('-password') bỏ mật khẩu
    const updatedUser = await User.findByIdAndUpdate(id, data, { new: true }).select('-password');
    
    if (!updatedUser) {
      return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "Cập nhật thành công", 
      user: updatedUser 
    });
  } catch (error: any) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + error.message }, { status: 500 });
  }
}

// Xóa nhân sự
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const reqUserId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role");

    if (role !== "01" && role !== "03") {
        return NextResponse.json({ error: "Không có quyền xóa nhân sự" }, { status: 403 });
    }

    // Không cho phép tự xóa chính mình
    if (id === reqUserId) {
        return NextResponse.json({ error: "Không thể tự xóa tài khoản của chính mình" }, { status: 400 });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    
    if (!deletedUser) {
      return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    return NextResponse.json({ message: "Đã xóa nhân viên thành công" });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + error.message }, { status: 500 });
  }
}
