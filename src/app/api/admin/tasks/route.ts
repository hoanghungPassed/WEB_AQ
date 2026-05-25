import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { Task } from"@/models/Task";

export const dynamic ="force-dynamic";

export async function GET(req: Request) {
 try {
 const userId = req.headers.get("x-user-id");
 if (!userId) return NextResponse.json({ error:"Unauthorized" }, { status: 401 });

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
 const userId = req.headers.get("x-user-id");
 if (!userId) return NextResponse.json({ error:"Unauthorized" }, { status: 401 });

 await dbConnect();
 const body = await req.json();
 body.createdBy = userId; // Force the creator to be the authenticated user
 const task = await Task.create(body);
 
 try {
 const { logAction } = await import('@/lib/logger');
 await logAction("system", `Phân công nhiệm vụ mới: ${task.title}`, `Phân công công việc.`);
 } catch (logErr) {
 console.error("Log error:", logErr);
 }

 return NextResponse.json({ success: true, data: task }, { status: 201 });
 } catch (error: any) {
 return NextResponse.json({ success: false, error: error.message }, { status: 400 });
 }
}
