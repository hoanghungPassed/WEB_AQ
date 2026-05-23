import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Phone } from "@/models/Phone";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    
    let query: any = {};
    if (status) query.status = status;

    const phones = await Phone.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: phones });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    
    let payload;
    if (Array.isArray(body)) {
      payload = body.map((item: any) => ({
        number: item.number,
        otpLink: item.otpLink || "",
        status: item.status || "Chưa làm",
        assigneeId: item.assigneeId,
        assignedTo: item.assignedTo,
        assignedAt: item.assignedAt,
        importedAt: item.importedAt,
        importBatch: item.importBatch
      }));
    } else {
      payload = body;
    }

    let newPhones;
    if (Array.isArray(payload)) {
      newPhones = await Phone.insertMany(payload);
    } else {
      newPhones = await Phone.create(payload);
    }
    
    return NextResponse.json({ success: true, data: newPhones }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
