import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import User from"@/models/User";
import { getAuthUser, COOKIE_NAME } from"@/lib/auth";

export async function POST() {
 try {
 // Decode token trước khi xóa để cập nhật trạng thái offline
 const authUser = await getAuthUser();

 if (authUser) {
 try {
 await dbConnect();
 await User.findByIdAndUpdate(authUser.userId, {
 isOnline: false,
 lastActive: new Date().toISOString(),
 });
 } catch (dbErr) {
 // Vẫn cho logout ngay cả khi DB lỗi
 console.error("Logout DB update error:", dbErr);
 }
 }

 // Xóa cookie
 const response = NextResponse.json({
 message:"Đăng xuất thành công",
 });

 response.cookies.set(COOKIE_NAME,"", {
 httpOnly: true,
 secure: process.env.NODE_ENV ==="production",
 sameSite:"lax",
 path:"/",
 maxAge: 0, // Xóa cookie ngay lập tức
 });

 return response;
 } catch (error: unknown) {
 const errMsg = error instanceof Error ? error.message :"Unknown error";
 console.error("Logout error:", errMsg);
 return NextResponse.json(
 { error:"Lỗi máy chủ:" + errMsg },
 { status: 500 }
 );
 }
}
