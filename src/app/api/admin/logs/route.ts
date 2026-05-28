import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Log } from '@/models/Log';

export async function GET(req: Request) {
 try {
 const userId = req.headers.get("x-user-id");
 const userRole = req.headers.get("x-user-role");
 if (!userId || (userRole !== "01" && userRole !== "02" && userRole !== "03")) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 await dbConnect();
 const logs = await Log.find({}).populate('user', 'name username').sort({ createdAt: -1 });
 return NextResponse.json(logs || []);
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Error fetching system logs:", error);
 return NextResponse.json([], { status: 500 });
 }
}

export async function POST(req: Request) {
 try {
 const userId = req.headers.get("x-user-id");
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 await dbConnect();
 const body = await req.json();
 const log = await Log.create(body);
 return NextResponse.json({ success: true, data: log }, { status: 201 });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Error creating system log:", error);
 return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}

export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    await Log.deleteMany({});
    
    try {
      const { logAction } = await import('@/lib/logger');
      await logAction(userId, "Đã xóa toàn bộ nhật ký hệ thống", "Dọn dẹp nhật ký.");
    } catch (logErr) {
      console.error("Log action err:", logErr);
    }

    return NextResponse.json({ success: true, message: "Cleared all logs" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Error clearing system logs:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
