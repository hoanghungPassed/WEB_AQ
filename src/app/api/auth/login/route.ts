import { NextRequest, NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import User from"@/models/User";
import {
 comparePassword,
 isHashed,
 hashPassword,
 signToken,
 COOKIE_NAME,
} from"@/lib/auth";

export async function POST(req: NextRequest) {
 try {
 await dbConnect();

 const body = await req.json();
 const { username, password } = body;

 if (!username || !password) {
 return NextResponse.json(
 { error:"Vui lòng cung cấp đầy đủ username và password" },
 { status: 400 }
 );
 }

 // Tìm user theo username (bao gồm cả password để so sánh)
 const user = await User.findOne({ username });

 if (!user) {
 return NextResponse.json(
 { error:"Sai tên đăng nhập hoặc mật khẩu" },
 { status: 401 }
 );
 }

 // Kiểm tra trạng thái tài khoản
 if (user.status ==="LOCKED") {
 return NextResponse.json(
 { error:"Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin." },
 { status: 403 }
 );
 }

 if (user.status ==="PENDING") {
 return NextResponse.json(
 { error:"Tài khoản của bạn đang chờ duyệt. Vui lòng liên hệ Admin." },
 { status: 403 }
 );
 }

 // So sánh mật khẩu
 let passwordMatch = false;

 if (isHashed(user.password)) {
 // Mật khẩu đã được hash -> dùng bcrypt.compare
 passwordMatch = await comparePassword(password, user.password);
 } else {
 // Mật khẩu chưa hash (dữ liệu cũ) -> so sánh trực tiếp rồi auto-hash
 passwordMatch = password === user.password;

 if (passwordMatch) {
 // Auto-migration: Hash lại mật khẩu plaintext và lưu vào DB
 console.log(`🔄 Auto-hashing password for user: ${user?.username}`);
 user.password = await hashPassword(password);
 await user.save();
 }
 }

 if (!passwordMatch) {
 return NextResponse.json(
 { error:"Sai tên đăng nhập hoặc mật khẩu" },
 { status: 401 }
 );
 }

 // Kiểm tra giờ làm việc (Sau 18:00 chặn Role 03, 04)
 const now = new Date();
 const currentMins = now.getHours() * 60 + now.getMinutes();
 const isStaff = user.role ==="03" || user.role ==="04" || user.role ==="05" || String(user.role).includes("03") || String(user.role).includes("04") || String(user.role).includes("05");
 
 if (isStaff && currentMins >= 1080) { // 1080 = 18:00
 return NextResponse.json(
 { error:"Đã quá giờ làm việc (18:00). Bạn không thể đăng nhập. Vui lòng gửi yêu cầu duyệt nếu cần truy cập." },
 { status: 403 }
 );
 }

 // Cập nhật trạng thái online và check-in
 user.isOnline = true;
 user.lastActive = now.toISOString();
 if (!user.checkInTime || !user.checkInTime.startsWith(now.toISOString().split("T")[0])) {
 user.checkInTime = now.toISOString();
 user.checkOutTime = undefined; // Reset checkout for new day
 }
 await user.save();

 // Tạo JWT token
 const token = signToken({
 userId: user._id.toString(),
 role: user?.role,
 username: user?.username,
 });

 // Tạo response với cookie HttpOnly
 const userObj = user.toObject() as any;
 delete userObj.password;
 userObj.id = userObj._id.toString();

 const response = NextResponse.json({
 message:"Đăng nhập thành công",
 user: userObj,
 });

 // Set HttpOnly cookie
 response.cookies.set(COOKIE_NAME, token, {
 httpOnly: true,
 secure: process.env.NODE_ENV ==="production",
 sameSite:"lax",
 path:"/",
 maxAge: 7 * 24 * 60 * 60, // 7 ngày
 });

 return response;
 } catch (error: unknown) {
 const errMsg = error instanceof Error ? error.message :"Unknown error";
 console.error("Login error:", errMsg);
 return NextResponse.json(
 { error:"Lỗi máy chủ:" + errMsg },
 { status: 500 }
 );
 }
}
