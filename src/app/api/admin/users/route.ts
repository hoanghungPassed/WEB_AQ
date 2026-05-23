export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

// Lấy danh sách nhân sự
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Middleware đã set các header này từ JWT
    const role = req.headers.get("x-user-role");
    
    // Kiểm tra quyền (ví dụ chỉ role 01 và 03 mới được xem danh sách đầy đủ)
    // Nếu muốn ai cũng xem được thì bỏ check này
    if (role !== "01" && role !== "03") {
        return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    // Tìm tất cả users, bỏ qua trường password, sắp xếp theo role
    const users = await User.find().select('-password').sort({ role: 1, createdAt: -1 });
    
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + error.message }, { status: 500 });
  }
}

// Thêm nhân sự mới
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const role = req.headers.get("x-user-role");
    if (role !== "01" && role !== "03") {
        return NextResponse.json({ error: "Không có quyền tạo nhân sự" }, { status: 403 });
    }

    const data = await req.json();
    
    // Kiểm tra username đã tồn tại chưa
    const existing = await User.findOne({ username: data.username });
    if (existing) {
       return NextResponse.json({ error: "Username đã tồn tại" }, { status: 400 });
    }

    // Hash mật khẩu
    if (data.password) {
        data.password = await hashPassword(data.password);
    } else {
        return NextResponse.json({ error: "Vui lòng cung cấp mật khẩu" }, { status: 400 });
    }

    const newUser = new User(data);
    await newUser.save();

    const userObj = newUser.toObject();
    delete (userObj as any).password;

    try {
      const { Log } = await import('@/models/Log');
      await Log.create({
        user: "System",
        role: role === "01" ? "ADMIN" : "QL NHÂN SỰ",
        action: `Thêm nhân sự mới: ${data.name} (${data.username})`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (logErr) {
      console.error("Log error:", logErr);
    }

    return NextResponse.json({ 
      message: "Tạo nhân viên thành công", 
      user: userObj 
    }, { status: 201 });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + error.message }, { status: 500 });
  }
}
