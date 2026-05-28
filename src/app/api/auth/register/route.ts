import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();
    const { name, birthYear, username, phone, address, password } = data;

    if (!name || !username || !password) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const lowercaseUsername = username.toLowerCase();

    // Kiểm tra username đã tồn tại chưa trong MongoDB User collection
    const existingUser = await User.findOne({ username: lowercaseUsername });
    if (existingUser) {
      return NextResponse.json({ error: "Tên đăng nhập đã tồn tại" }, { status: 400 });
    }

    // Hash mật khẩu
    const hashedPassword = await hashPassword(password);

    // Tạo user mới ở trạng thái PENDING
    const newUser = new User({
      name,
      birthYear: birthYear || "",
      username: lowercaseUsername,
      phone: phone || "",
      address: address || "",
      password: hashedPassword,
      status: "PENDING",
      role: "05", // Mặc định là nhân viên thử việc (NV THỬ VIỆC) khi chưa duyệt
      isOnline: false,
      taskCount: 0,
      kpiProgress: 0,
      lastActive: new Date()
    });

    await newUser.save();

    // Ghi Log hoạt động hệ thống
    try {
      const { Log } = await import('@/models/Log');
      await Log.create({
        user: name,
        role: "GUEST",
        action: `Đăng ký tài khoản mới: ${name} (${lowercaseUsername})`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (logErr) {
      console.error("Log error:", logErr);
    }

    const userObj = newUser.toObject();
    delete (userObj as any).password;

    return NextResponse.json({
      message: "Đăng ký thành công, vui lòng chờ duyệt",
      user: userObj
    }, { status: 201 });
  } catch (error: any) {
    console.error("Registration api error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + error.message }, { status: 500 });
  }
}
