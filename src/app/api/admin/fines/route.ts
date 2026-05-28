import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Fine } from '@/models/Fine';
import { Log } from '@/models/Log';

export async function GET(req: Request) {
 try {
 const userId = req.headers.get("x-user-id");
 const userRole = req.headers.get("x-user-role");
 if (!userId || (userRole !== "01" && userRole !== "02" && userRole !== "03")) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 await dbConnect();
 const fines = await Fine.find({}).populate('userId').sort({ createdAt: -1 });
 return NextResponse.json(fines || []);
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Error fetching fines data:", error);
 return NextResponse.json([], { status: 500 });
 }
}

export async function POST(req: Request) {
 try {
 const requestorId = req.headers.get("x-user-id");
 const requestorRole = req.headers.get("x-user-role");
 if (!requestorId || (requestorRole !== "01" && requestorRole !== "02" && requestorRole !== "03")) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 await dbConnect();
 const body = await req.json();
 
 // Create new fine
 const newFine = await Fine.create(body);

 // Create log
 try {
 await Log.create({
 user:"System",
 role:"ADMIN",
 action: `Tạo báo cáo phạt mới cho nhân sự ID: ${body.userId}`,
 type:"SUCCESS",
 timestamp: new Date().toLocaleString("vi-VN")
 });
 } catch (logErr) {
 console.error("Failed to create log for fine:", logErr);
 }

 return NextResponse.json({ success: true, data: newFine }, { status: 201 });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Error creating fine:", error);
 return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}

export async function PUT(req: Request) {
 try {
 const userId = req.headers.get("x-user-id");
 const userRole = req.headers.get("x-user-role");
 if (!userId || (userRole !== "01" && userRole !== "02" && userRole !== "03")) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

  await dbConnect();
  const body = await req.json();
  const { id, status, amount } = body;

  const existingFine = await Fine.findById(id);
  if (!existingFine) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const updateData: any = {};
  if (status !== undefined) updateData.status = status;
  if (amount !== undefined) {
    updateData.amount = amount;
  } else {
    updateData.amount = existingFine.amount; // Preserve original amount
  }

  const fine = await Fine.findByIdAndUpdate(id, { $set: updateData }, { new: true }).populate('userId', 'name');
  if (!fine) return NextResponse.json({ success: false, error:"Not found" }, { status: 404 });

 // Create log
 try {
 await Log.create({
 user: userId,
 role: userRole === "01" ? "ADMIN" : userRole === "02" ? "QL CÔNG VIỆC" : "QL NHÂN SỰ",
 action: `Cập nhật trạng thái thanh toán phạt của ${(fine.userId as any)?.name} thành ${status}`,
 type:"SUCCESS",
 timestamp: new Date().toLocaleString("vi-VN")
 });
 } catch (logErr) {
 console.error("Failed to create log for fine update:", logErr);
 }

 return NextResponse.json({ success: true, data: fine });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}

export async function DELETE(req: Request) {
 try {
 const userId = req.headers.get("x-user-id");
 const userRole = req.headers.get("x-user-role");
 if (!userId || (userRole !== "01" && userRole !== "02" && userRole !== "03")) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 await dbConnect();
 const { searchParams } = new URL(req.url);
 const id = searchParams.get('id');
 
 if (!id) return NextResponse.json({ success: false, error:"ID is required" }, { status: 400 });

 const fine = await Fine.findByIdAndDelete(id).populate('userId', 'name');
 
 if (fine) {
 try {
 await Log.create({
 user:"System",
 role:"ADMIN",
 action: `Xóa báo cáo phạt của ${(fine.userId as any)?.name}`,
 type:"SUCCESS",
 timestamp: new Date().toLocaleString("vi-VN")
 });
 } catch (logErr) {}
 }

 return NextResponse.json({ success: true });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}
