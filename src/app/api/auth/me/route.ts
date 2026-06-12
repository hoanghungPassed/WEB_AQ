export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import dbConnect from"@/lib/mongodb";
import User from"@/models/User";
import { getAuthUser } from"@/lib/auth";

export async function GET() {
 try {
 const authUser = await getAuthUser();

 if (!authUser) {
 return NextResponse.json(
 { error:"Chưa đăng nhập" },
 { status: 401 }
 );
 }

 await dbConnect();

 // Truy vấn DB để lấy thông tin mới nhất (loại bỏ password)
 const user = await User.findById(authUser.userId).select("-password");

 if (!user) {
    // Nếu user không còn trong DB (do reset), ném ra 401 ngay lập tức
    return NextResponse.json(
      { error: "Tài khoản không tồn tại" },
      { status: 401 }
    );
  }

  // Cập nhật lastActive và isOnline khi người dùng tương tác/gọi API
  await User.findByIdAndUpdate(user._id, { lastActive: new Date(), isOnline: true });

 const userObj = user.toObject() as any;
 delete userObj.password;
 userObj.id = userObj._id.toString();

 return NextResponse.json({ user: userObj });
 } catch (error: unknown) {
 const errMsg = error instanceof Error ? error.message :"Unknown error";
 console.error("Auth/me error:", errMsg);
 return NextResponse.json(
 { error:"Lỗi máy chủ:" + errMsg },
 { status: 500 }
 );
 }
}
