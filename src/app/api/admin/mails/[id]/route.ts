import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Mail } from "@/models/Mail";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const body = await req.json();
    const mail = await Mail.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!mail) {
      return NextResponse.json({ success: false, error: "Mail not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: mail });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const mail = await Mail.findByIdAndDelete(params.id);
    if (!mail) {
      return NextResponse.json({ success: false, error: "Mail not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
