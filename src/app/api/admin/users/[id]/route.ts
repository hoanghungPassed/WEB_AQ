import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { Task } from "@/models/Task";
import { SatelliteMail } from "@/models/SatelliteMail";
import { RootMail } from "@/models/RootMail";
import { MonetizedMail } from "@/models/MonetizedMail";

// Cập nhật thông tin nhân sự
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 console.log("--- BẮT ĐẦU XỬ LÝ API (USER PUT) ---");
 console.log("Request Method:", req.method);
 try {
 await dbConnect();
 
 const { id } = await params;
 const data = await req.json();
 console.log("Payload nhận được:", data);

 const reqUserId = req.headers.get("x-user-id");
 const role = req.headers.get("x-user-role");

 // Nếu không phải admin (01) hoặc HR (03) thì chỉ được sửa thôngৃদtin của chính mình
 if (role !=="01" && role !=="03" && reqUserId !== id) {
 return NextResponse.json({ error:"Không có quyền chỉnh sửa nhân sự khác" }, { status: 403 });
 }

 // Nếu có đổi mật khẩu, thì hash mật khẩu mới
 if (data.password) {
 data.password = await hashPassword(data.password);
 }

 // { new: true } trả về document sau khi đã update, select('-password') bỏ mật khẩu
 const updatedUser = await User.findByIdAndUpdate(id, data, { new: true }).select('-password');
 
 if (!updatedUser) {
 return NextResponse.json({ error:"Không tìm thấy nhân viên" }, { status: 404 });
 }
 
 try {
 const { Log } = await import('@/models/Log');
 await Log.create({
 user:"System",
 role: role ==="01" ?"ADMIN" :"QL NHÂN SỰ",
 action: `Cập nhật thông tin nhân sự: ${updatedUser.name} (${updatedUser.username})`,
 type:"SUCCESS",
 timestamp: new Date().toLocaleString("vi-VN")
 });
 } catch (logErr) {
 console.error("Log error:", logErr);
 }
 
 console.log("Kết quả lưu vào MongoDB (User):", updatedUser);

 return NextResponse.json({ 
 message:"Cập nhật thành công", 
 user: updatedUser 
 });
 } catch (error: any) {
 console.error("LỖI CHI TIẾT TẠI BACKEND (User Update):", error);
 return NextResponse.json({ error:"Lỗi máy chủ:" + error.message }, { status: 500 });
 }
}

// Xóa nhân sự
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 try {
 await dbConnect();
 
 const { id } = await params;
 const reqUserId = req.headers.get("x-user-id");
 const role = req.headers.get("x-user-role");

 if (role !=="01" && role !=="03") {
 return NextResponse.json({ error:"Không có quyền xóa nhân sự" }, { status: 403 });
 }

 // Không cho phép tự xóa chính mình
 if (id === reqUserId) {
 return NextResponse.json({ error:"Không thể tự xóa tài khoản của chính mình" }, { status: 400 });
 }

  // 6. BẢO TOÀN DỮ LIỆU KHI XÓA USER: Thu hồi toàn bộ Tasks và Mails về kho chung
  // Update Tasks assigned to this user
  await Task.updateMany(
    { $or: [{ assigneeId: id }, { assignee: id }, { assignedTo: id }] },
    { $set: { assigneeId: null, assigneeName: null, assignee: null, assignedTo: null, isAssigned: false } }
  );

  // Update Mails (Satellite, Root, Monetized) assigned to this user
  const mailQuery = { $or: [{ assignee: id }, { assigneeId: String(id) }, { assignedTo: id }] };
  const mailUpdate = { $set: { assignee: null, assigneeId: null, assignedTo: null, isAssigned: false } };

  await SatelliteMail.updateMany(mailQuery, mailUpdate);
  await RootMail.updateMany(mailQuery, mailUpdate);
  await MonetizedMail.updateMany(mailQuery, mailUpdate);

  const deletedUser = await User.findByIdAndDelete(id);
  
  if (!deletedUser) {
 return NextResponse.json({ error:"Không tìm thấy nhân viên" }, { status: 404 });
 }

 try {
 const { Log } = await import('@/models/Log');
 await Log.create({
 user:"System",
 role: role ==="01" ?"ADMIN" :"QL NHÂN SỰ",
 action: `Xóa nhân sự: ${deletedUser.name} (${deletedUser.username})`,
 type:"SUCCESS",
 timestamp: new Date().toLocaleString("vi-VN")
 });
 } catch (logErr) {
 console.error("Log error:", logErr);
 }

 return NextResponse.json({ message:"Đã xóa nhân viên thành công" });
 } catch (error: any) {
 console.error("Delete user error:", error);
 return NextResponse.json({ error:"Lỗi máy chủ:" + error.message }, { status: 500 });
 }
}
