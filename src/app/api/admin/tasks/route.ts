import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Task } from "@/models/Task";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const assigneeId = searchParams.get("assigneeId");
    
    let query: any = {};
    if (assigneeId) query.assigneeId = assigneeId;

    const tasks = await Task.find(query).populate('assigneeId').sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const task = await Task.create(body);
    
    try {
      const { Log } = await import('@/models/Log');
      await Log.create({
        user: "System",
        role: "ADMIN",
        action: `Phân công nhiệm vụ mới: ${task.title}`,
        type: "SUCCESS",
        timestamp: new Date().toLocaleString("vi-VN")
      });
    } catch (logErr) {
      console.error("Log error:", logErr);
    }

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
