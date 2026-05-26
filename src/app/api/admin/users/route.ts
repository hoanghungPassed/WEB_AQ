export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import User from"@/models/User";
import { hashPassword } from"@/lib/auth";

// Lấy danh sách nhân sự (Hỗ trợ lọc online)
export async function GET(req: NextRequest) {
  try {
  await dbConnect();
  
  const role = req.headers.get("x-user-role");
  if (!role) {
  return NextResponse.json({ error:"Chưa đăng nhập" }, { status: 401 });
  }
 
  const statusParam = req.nextUrl.searchParams.get("status");
  
  // Thiết lập truy vấn lọc theo trạng thái online
  let query: any = {};
  if (statusParam === "online") {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  query.lastActive = { $gte: tenMinutesAgo };
  query.status = "ACTIVE";
  }

  // Tìm các users, loại bỏ mật khẩu
  const users = await User.find(query).select('-password').sort({ role: 1, createdAt: -1 });
  
  // Tính toán động trường isOnline dựa trên lastActive trong 10 phút gần nhất
  const mappedUsers = users.map(u => {
  const userObj = u.toObject() as any;
  const lastActiveDate = u.lastActive ? new Date(u.lastActive) : null;
  userObj.isOnline = lastActiveDate ? (lastActiveDate.getTime() > Date.now() - 10 * 60 * 1000) : false;
  userObj.id = userObj._id.toString();
  return userObj;
  });
  
  return NextResponse.json({ success: true, data: mappedUsers, users: mappedUsers });
  } catch (error: any) {
  console.error("Get users error:", error);
  return NextResponse.json({ error:"Lỗi máy chủ:" + error.message }, { status: 500 });
  }
}

// Thêm nhân sự mới
export async function POST(req: NextRequest) {
 try {
 await dbConnect();
 
 const userId = req.headers.get("x-user-id");
 if (!userId) return NextResponse.json({ error:"Unauthorized" }, { status: 401 });
 
 const role = req.headers.get("x-user-role");
 if (role !=="01" && role !=="03") {
 return NextResponse.json({ error:"Không có quyền tạo nhân sự" }, { status: 403 });
 }

 const data = await req.json();
 
 // Kiểm tra username đã tồn tại chưa
 const existing = await User.findOne({ username: data.username });
 if (existing) {
 return NextResponse.json({ error:"Username đã tồn tại" }, { status: 400 });
 }

 // Hash mật khẩu
 if (data.password) {
 data.password = await hashPassword(data.password);
 } else {
 return NextResponse.json({ error:"Vui lòng cung cấp mật khẩu" }, { status: 400 });
 }

 const newUser = new User(data);
 await newUser.save();

 const userObj = newUser.toObject();
 delete (userObj as any).password;

 try {
 const { Log } = await import('@/models/Log');
 await Log.create({
 user:"System",
 role: role ==="01" ?"ADMIN" :"QL NHÂN SỰ",
 action: `Thêm nhân sự mới: ${data.name} (${data.username})`,
 type:"SUCCESS",
 timestamp: new Date().toLocaleString("vi-VN")
 });
 } catch (logErr) {
 console.error("Log error:", logErr);
 }

 return NextResponse.json({ 
 message:"Tạo nhân viên thành công", 
 user: userObj 
 }, { status: 201 });
 } catch (error: any) {
 console.error("Create user error:", error);
 return NextResponse.json({ error:"Lỗi máy chủ:" + error.message }, { status: 500 });
 }
}
