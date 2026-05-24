import { NextRequest, NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import User from"@/models/User";

// Cập nhật thông tin nhân sự
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 try {
 await dbConnect();
 
 const { id } = await params;
 const data = await req.json();

 // { new: true } trả về document sau khi đã update, select('-password') bỏ mật khẩu
 const updatedUser = await User.findByIdAndUpdate(id, data, { new: true }).select('-password');
 
 if (!updatedUser) {
 return NextResponse.json({ error:"Không tìm thấy nhân viên" }, { status: 404 });
 }

 return NextResponse.json({ 
 message:"Cập nhật thành công", 
 user: updatedUser 
 });
 } catch (error: any) {
 console.error("Update user error:", error);
 return NextResponse.json({ error:"Lỗi máy chủ:" + error.message }, { status: 500 });
 }
}

// Xóa nhân sự
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 try {
 await dbConnect();
 
 const { id } = await params;
 const deletedUser = await User.findByIdAndDelete(id);
 
 if (!deletedUser) {
 return NextResponse.json({ error:"Không tìm thấy nhân viên" }, { status: 404 });
 }

 return NextResponse.json({ message:"Đã xóa nhân viên thành công" });
 } catch (error: any) {
 console.error("Delete user error:", error);
 return NextResponse.json({ error:"Lỗi máy chủ:" + error.message }, { status: 500 });
 }
}
