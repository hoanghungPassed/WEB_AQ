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
    
    // Xử lý mapping dữ liệu (hỗ trợ cả import 1 mail và 1 mảng mail)
    let payload;
    if (Array.isArray(body)) {
      payload = body.map((item: any) => ({
        email: item.email,
        password: item.password || item.pass || "",
        recoveryMail: item.recoveryMail || item.recovery || "",
        twoFA: item.twoFA || "",
        phone: item.phone || "",
        phoneLink: item.phoneLink || item.otpLink || "",
        stt: item.stt || item.id || 0,
        type: item.type,
        status: item.status || "LIVE",
        workStatus: item.workStatus,
        verificationStatus: item.verificationStatus,
        cccdDate: item.cccdDate,
        batch: item.batch,
        batchName: item.batchName,
        batchId: item.batchId,
        assignee: item.assignee,
        assigneeId: item.assigneeId,
        assignedTo: item.assignedTo,
        updatedBy: item.updatedBy,
        lastUpdated: item.lastUpdated,
        links: item.links || [],
        eligibleChannels: item.eligibleChannels || [],
        createdAt: item.createdAt || new Date()
      }));
    } else {
      const { email, password, pass, recoveryMail, recovery, twoFA, phone, phoneLink, otpLink, stt, id, type, status, workStatus, verificationStatus, cccdDate, batch, batchName, batchId, assignee, assigneeId, assignedTo, updatedBy, lastUpdated, links, eligibleChannels } = body;
      payload = { 
        email, 
        password: password || pass || "", 
        recoveryMail: recoveryMail || recovery || "", 
        twoFA: twoFA || "", 
        phone: phone || "", 
        phoneLink: phoneLink || otpLink || "",
        stt: stt || id || 0,
        type,
        status: status || "LIVE",
        workStatus,
        verificationStatus,
        cccdDate,
        batch,
        batchName,
        batchId,
        assignee,
        assigneeId,
        assignedTo,
        updatedBy,
        lastUpdated,
        links: links || [],
        eligibleChannels: eligibleChannels || []
      };
    }

    let newMail;
    if (Array.isArray(payload)) {
      newMail = await Mail.insertMany(payload);
    } else {
      newMail = await Mail.create(payload);
    }
    if (!newMail) throw new Error("Không thể tạo bản ghi");
    return NextResponse.json({ success: true, data: newMail }, { status: 201 });
  } catch (error: any) {
    console.error("LỖI API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');
    const batchName = searchParams.get('batchName');

    if (!batchId && !batchName) {
      return NextResponse.json({ success: false, error: "Missing batchId or batchName" }, { status: 400 });
    }

    const query: any = {};
    if (batchId) query.batchId = batchId;
    else if (batchName) query.batchName = batchName;

    const result = await Mail.deleteMany(query);
    return NextResponse.json({ success: true, deletedCount: result.deletedCount }, { status: 200 });
  } catch (error: any) {
    console.error("LỖI API DELETE:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
