export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { Notification } from "@/models/Notification"; // Import Model Notification

// Lấy danh sách nhân sự
export async function GET() {
  try {
    await dbConnect();
    
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
    
    const data = await req.json();
    
    // Kiểm tra username đã tồn tại chưa
    const existing = await User.findOne({ username: data.username });
    if (existing) {
      return NextResponse.json({ error: "Tên đăng nhập đã tồn tại" }, { status: 400 });
    }

    const newUser = new User(data);
    await newUser.save();

    // --- BẮT ĐẦU: GỬI THÔNG BÁO CHO ADMIN ---
    try {
      await Notification.create({
        title: "Yêu cầu đăng ký mới",
        message: `Nhân viên ${data.name || data.username} vừa đăng ký tài khoản và chờ duyệt`,
        type: "SYSTEM",
        isRead: false,
        author: newUser._id,
        createdAt: new Date()
      });
    } catch (notifError) {
      console.error("Không thể tạo thông báo cho Admin:", notifError);
    }
    // --- KẾT THÚC ---

    const userObj = newUser.toObject();
    delete (userObj as any).password;

    return NextResponse.json({ 
      message: "Tạo nhân viên thành công", 
      user: userObj 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + error.message }, { status: 500 });
  }
}