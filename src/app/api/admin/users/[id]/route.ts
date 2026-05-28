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
 try {
 await dbConnect();
 
 const { id } = await params;
 const data = await req.json();

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

  const body = data;
  if (body.status === 'APPROVED' || body.status === 'ACTIVE') {
    body.lastActive = null;
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
 
 return NextResponse.json({ 
 message:"Cập nhật thành công", 
 user: updatedUser 
 });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("LỖI CHI TIẾT TẠI BACKEND (User Update):", error);
 return NextResponse.json({ error:"Lỗi máy chủ:" + errorMessage }, { status: 500 });
 }
}

// Xóa nhân sự
export async function DELETE(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  try {
  await dbConnect();
  
  const params = await paramsPromise;
  const id = params.id;
  const reqUserId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");

  if (role !=="01" && role !=="03") {
  return NextResponse.json({ error:"Không có quyền xóa nhân sự" }, { status: 403 });
  }

  // Không cho phép tự xóa chính mình
  if (id === reqUserId) {
  return NextResponse.json({ error:"Không thể tự xóa tài khoản của chính mình" }, { status: 400 });
  }

  // Dynamically import dependent models to prevent schema registration errors
  const { Attendance } = await import("@/models/Attendance");
  const { Message } = await import("@/models/Message");
  const { Kpi } = await import("@/models/Kpi");
  const { Payroll } = await import("@/models/Payroll");
  const { Fine } = await import("@/models/Fine");
  const { Notification } = await import("@/models/Notification");

  // CHUỖI LỆNH DỌN SẠCH MỌI DỮ LIỆU LIÊN QUAN ĐẾN USER (BẮT BUỘC)
  await Attendance.deleteMany({ userId: params.id });
  await Message.deleteMany({ $or: [{ senderId: params.id }, { receiverId: params.id }] });
  await Task.updateMany({ assignedTo: params.id }, { assignedTo: null, isAssigned: false, status: 'PENDING' });
  await SatelliteMail.updateMany({ assignedTo: params.id }, { assignedTo: null, isAssigned: false });
  await RootMail.updateMany({ assignedTo: params.id }, { assignedTo: null, isAssigned: false });
  await Kpi.deleteMany({ userId: params.id });
  await Payroll.deleteMany({ userId: params.id });
  await Fine.deleteMany({ userId: params.id });
  await Notification.deleteMany({ author: params.id });

  // Additional cleanup to safeguard fallback assignee fields and monetized mails
  await Task.updateMany(
    { $or: [{ assigneeId: params.id }, { assignee: params.id }] },
    { $set: { assigneeId: null, assigneeName: null, assignee: null, isAssigned: false, status: 'PENDING' } }
  );
  await SatelliteMail.updateMany(
    { $or: [{ assignee: params.id }, { assigneeId: String(params.id) }] },
    { $set: { assignee: null, assigneeId: null, isAssigned: false } }
  );
  await RootMail.updateMany(
    { $or: [{ assignee: params.id }, { assigneeId: String(params.id) }] },
    { $set: { assignee: null, assigneeId: null, isAssigned: false } }
  );
  await MonetizedMail.updateMany(
    { $or: [{ assignee: params.id }, { assigneeId: String(params.id) }, { assignedTo: params.id }] },
    { $set: { assignee: null, assigneeId: null, assignedTo: null, isAssigned: false } }
  );

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
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Delete user error:", error);
 return NextResponse.json({ error:"Lỗi máy chủ:" + errorMessage }, { status: 500 });
 }
}
