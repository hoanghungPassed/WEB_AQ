import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Mail } from "@/models/Mail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    
    let query: any = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const mails = await Mail.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: mails });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const newMail = await Mail.create(body); // Bắt buộc phải AWAIT
    if (!newMail) throw new Error("Không thể tạo bản ghi");
    return NextResponse.json({ success: true, data: newMail }, { status: 201 });
  } catch (error: any) {
    console.error("LỖI API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
