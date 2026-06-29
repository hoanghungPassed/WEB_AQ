import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { Notification } from "@/models/Notification";
import { hashPassword } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();
    const { name, birthYear, username, phone, email, address, password } = data;

    if (!name || !username || !password || !email || !phone) {
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
      email: email || "",
      phone: phone || "",
      address: address || "",
      password: hashedPassword,
      status: "PENDING",
      role: "05", // Mặc định là nhân viên thử việc (NV THỬ VIỆC) khi chưa duyệt
      isOnline: false,
      taskCount: 0,
      kpiProgress: 0
    });

    await newUser.save();

    // Gửi thông báo phê duyệt đăng ký cho Admin
    try {
      const newNotif = await Notification.create({
        type: 'REGISTRATION',
        title: 'Yêu cầu đăng ký mới',
        message: 'Tài khoản ' + username + ' đang chờ duyệt',
        targetRole: '01',
        author: newUser._id,
        isRead: false
      });

      // Trigger realtime admin notification
      try {
        await pusherServer.trigger("system-notifications", "new-notification", newNotif);
      } catch (pushErr) {}

      // Trigger register-request on 'system' channel for chimes & modals
      try {
        await pusherServer.trigger("private-system", "register-request", {
          id: newNotif._id.toString(),
          userId: newUser._id.toString(),
          name: newUser.name,
          username: newUser.username,
          createdAt: newNotif.createdAt,
          type: "REGISTRATION",
          message: newNotif.message
        });
      } catch (pushErr) {
        console.error("Pusher register-request trigger error:", pushErr);
      }
    } catch (notifErr) {
      console.error("Lỗi tự động tạo thông báo đăng ký:", notifErr);
    }

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Registration api error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}
