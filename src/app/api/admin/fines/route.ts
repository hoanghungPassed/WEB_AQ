import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Fine } from '@/models/Fine';
import { Log } from '@/models/Log';

export async function GET() {
  try {
    await dbConnect();
    const fines = await Fine.find({}).populate('userId', 'name username role').sort({ createdAt: -1 });
    return NextResponse.json(fines || []);
  } catch (error: any) {
    console.error("Error fetching fines data:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    
    // Create new fine
    const newFine = await Fine.create(body);

    // Create log
    try {
      await Log.create({
        user: "System",
        role: "ADMIN",
        action: `Tạo báo cáo phạt mới cho nhân sự ID: ${body.userId}`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (logErr) {
      console.error("Failed to create log for fine:", logErr);
    }

    return NextResponse.json({ success: true, data: newFine }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating fine:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, status } = body;

    const fine = await Fine.findByIdAndUpdate(id, { status }, { new: true }).populate('userId', 'name');
    if (!fine) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    // Create log
    try {
      await Log.create({
        user: "System",
        role: "ADMIN",
        action: `Cập nhật trạng thái thanh toán phạt của ${(fine.userId as any)?.name} thành ${status}`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (logErr) {
      console.error("Failed to create log for fine update:", logErr);
    }

    return NextResponse.json({ success: true, data: fine });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

    const fine = await Fine.findByIdAndDelete(id).populate('userId', 'name');
    
    if (fine) {
      try {
        await Log.create({
          user: "System",
          role: "ADMIN",
          action: `Xóa báo cáo phạt của ${(fine.userId as any)?.name}`,
          type: "SUCCESS",
          timestamp: new Date().toLocaleString("vi-VN")
        });
      } catch (logErr) {}
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
