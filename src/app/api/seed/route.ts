export const dynamic = 'force-dynamic';
import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import User from"@/models/User";
import { hashPassword } from"@/lib/auth";

export async function GET() {
 try {
 await dbConnect();
 
 // Kiểm tra xem database đã có user nào chưa
 const userCount = await User.countDocuments();
 if (userCount > 0) {
 return NextResponse.json({ message:"Dữ liệu đã tồn tại, không cần seed." });
 }

 const defaultPassword = await hashPassword("123456");

 // Dữ liệu mẫu với mật khẩu đã hash
 const defaultUsers = [
 { name:"Admin", username:"01", email:"admin@aqmedia.com", password: defaultPassword, role:"01", status:"ACTIVE" },
 { name:"QL Công Việc", username:"02", email:"qlcv@aqmedia.com", password: defaultPassword, role:"02", status:"ACTIVE" },
 { name:"QL Nhân Sự", username:"03", email:"qlns@aqmedia.com", password: defaultPassword, role:"03", status:"ACTIVE" },
 { name:"Nhân Viên", username:"04", email:"nv@aqmedia.com", password: defaultPassword, role:"04", status:"ACTIVE" },
 ];

 await User.insertMany(defaultUsers);

 return NextResponse.json({ message:"Đã khởi tạo dữ liệu mẫu thành công" });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Seed error:", error);
 return NextResponse.json({ error:"Lỗi khi khởi tạo dữ liệu:" + errorMessage }, { status: 500 });
 }
}
