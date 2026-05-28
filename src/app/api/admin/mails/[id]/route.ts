import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { RootMail } from"@/models/RootMail";
import { SatelliteMail } from"@/models/SatelliteMail";
import { MonetizedMail } from"@/models/MonetizedMail";
import { getAuthUser } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  let userId = req.headers.get("x-user-id");
  if (!userId) {
    const authUser = await getAuthUser();
    if (authUser) {
      userId = authUser.userId;
    }
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 await dbConnect();
 const body = await req.json();
 const { id } = await params;
 
 let mail = await RootMail.findByIdAndUpdate(id, body, { new: true, runValidators: true });
 if (!mail) {
 mail = await SatelliteMail.findByIdAndUpdate(id, body, { new: true, runValidators: true });
 }
 if (!mail) {
 mail = await MonetizedMail.findByIdAndUpdate(id, body, { new: true, runValidators: true });
 }

 if (!mail) {
 return NextResponse.json({ success: false, error:"Mail not found" }, { status: 404 });
 }
 return NextResponse.json({ success: true, data: mail });
 } catch (error: any) {
 return NextResponse.json({ success: false, error: error.message }, { status: 400 });
 }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  let userId = req.headers.get("x-user-id");
  if (!userId) {
    const authUser = await getAuthUser();
    if (authUser) {
      userId = authUser.userId;
    }
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 await dbConnect();
 const { id } = await params;
 
 let mail = await RootMail.findByIdAndDelete(id);
 if (!mail) {
 mail = await SatelliteMail.findByIdAndDelete(id);
 }
 if (!mail) {
 mail = await MonetizedMail.findByIdAndDelete(id);
 }

 if (!mail) {
 return NextResponse.json({ success: false, error:"Mail not found" }, { status: 404 });
 }
 return NextResponse.json({ success: true, data: {} });
 } catch (error: any) {
 return NextResponse.json({ success: false, error: error.message }, { status: 400 });
 }
}
