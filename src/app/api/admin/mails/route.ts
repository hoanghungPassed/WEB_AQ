import { NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { RootMail } from"@/models/RootMail";
import { SatelliteMail } from"@/models/SatelliteMail";
import { MonetizedMail } from"@/models/MonetizedMail";

export const dynamic ="force-dynamic";

export async function GET(req: Request) {
 try {
 const userId = req.headers.get("x-user-id");
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 await dbConnect();
 const { searchParams } = new URL(req.url);
 const type = searchParams.get("type");
 const status = searchParams.get("status");
 
 let query: any = {};
 if (status) query.status = status;

 let mails: any[] = [];
 if (!type || type ==="ROOT") {
 const rootMails = await RootMail.find(query).sort({ createdAt: -1 });
 mails = [...mails, ...rootMails];
 }
 if (!type || type ==="SATELLITE") {
 const satelliteMails = await SatelliteMail.find(query).sort({ createdAt: -1 });
 mails = [...mails, ...satelliteMails];
 }
 if (!type || type ==="MONETIZED") {
 const monetizedMails = await MonetizedMail.find(query).sort({ createdAt: -1 });
 mails = [...mails, ...monetizedMails];
 }
 
 // Sort all combined descending
 mails.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

 return NextResponse.json({ success: true, data: mails });
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
 
 let payload;
 if (Array.isArray(body)) {
 payload = body.map((item: any) => ({
 email: item.email,
 password: item.password || item.pass ||"",
 recoveryMail: item.recoveryMail || item.recovery ||"",
 twoFA: item.twoFA ||"",
 phone: item.phone ||"",
 phoneLink: item.phoneLink || item.otpLink ||"",
 stt: item.stt || item.id || 0,
 type: item.type,
 status: item.status ||"LIVE",
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
 channelNames: item.channelNames || [],
 eligibleChannels: item.eligibleChannels || [],
 reClickDate: item.reClickDate,
 step2PendingDate: item.step2PendingDate,
 channelStatusDetail: item.channelStatusDetail,
 inviteStatus: item.inviteStatus,
 createdAt: item.createdAt || new Date()
 }));
 } else {
 payload = body;
 }

 let newMails = [];
 let items = Array.isArray(payload) ? payload : [payload];

 const rootItems = items.filter(i => i.type ==="ROOT");
 const satelliteItems = items.filter(i => i.type ==="SATELLITE");
 const monetizedItems = items.filter(i => i.type ==="MONETIZED");

 if (rootItems.length > 0) {
 const res = await RootMail.insertMany(rootItems);
 newMails.push(...res);
 }
 if (satelliteItems.length > 0) {
 const res = await SatelliteMail.insertMany(satelliteItems);
 newMails.push(...res);
 }
 if (monetizedItems.length > 0) {
 const res = await MonetizedMail.insertMany(monetizedItems);
 newMails.push(...res);
 }

 if (newMails.length === 0) throw new Error("Không thể tạo bản ghi hoặc sai type");
 
 try {
 const { logAction } = await import('@/lib/logger');
 const count = items.length;
 await logAction("system", `Nhập lô mới: ${count} mail`, `Lô mail mới được nhập thành công.`);
 } catch (logErr) {
 console.error("Log error:", logErr);
 }
 
 return NextResponse.json({ success: true, data: Array.isArray(payload) ? newMails : newMails[0] }, { status: 201 });
 } catch (error: any) {
 console.error("LỖI API POST:", error);
 return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}

export async function DELETE(req: Request) {
 try {
 const userId = req.headers.get("x-user-id");
 if (!userId) return NextResponse.json({ error:"Unauthorized" }, { status: 401 });

 await dbConnect();
 const { searchParams } = new URL(req.url);
 const batchId = searchParams.get('batchId');
 const batchName = searchParams.get('batchName');

 if (!batchId && !batchName) {
 return NextResponse.json({ success: false, error:"Missing batchId or batchName" }, { status: 400 });
 }

 const query: any = {};
 if (batchId) query.batchId = batchId;
 else if (batchName) query.batchName = batchName;

 const resRoot = await RootMail.deleteMany(query);
 const resSat = await SatelliteMail.deleteMany(query);
 const resMon = await MonetizedMail.deleteMany(query);
 
 const deletedCount = resRoot.deletedCount + resSat.deletedCount + resMon.deletedCount;

 try {
 const { logAction } = await import('@/lib/logger');
 await logAction("system", `Xóa lô mail: ${batchName || batchId} (${deletedCount} mail)`, `Đã xóa lô mail.`);
 } catch (logErr) {
 console.error("Log error:", logErr);
 }
 
 return NextResponse.json({ success: true, deletedCount }, { status: 200 });
 } catch (error: any) {
 console.error("LỖI API DELETE:", error);
 return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}
