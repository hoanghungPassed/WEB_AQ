import { NextRequest, NextResponse } from"next/server";
import dbConnect from"@/lib/mongodb";
import { RootMail } from"@/models/RootMail";
import { SatelliteMail } from"@/models/SatelliteMail";
import { MonetizedMail } from"@/models/MonetizedMail";
import { getAuthUser } from "@/lib/auth";
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { sendMailAssignedEmail } from "@/lib/email";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  let userId = req.headers.get("x-user-id");
  let userRole = req.headers.get("x-user-role");
  if (!userId) {
    const authUser = await getAuthUser();
    if (authUser) {
      userId = authUser.userId;
      userRole = authUser.role;
    }
  }

  await dbConnect();
  const { id } = await params;

  let mail = await RootMail.findById(id);
  if (!mail) mail = await SatelliteMail.findById(id);
  if (!mail) mail = await MonetizedMail.findById(id);

  if (!mail) {
    return NextResponse.json({ success: false, error: "Mail không tồn tại" }, { status: 404 });
  }

  const hasPermission = await checkPermission(userRole || "", 4, ["all", "tasks", "staff"]);
  if (!hasPermission) {
    const isAssignedToUser = String(mail.assigneeId) === String(userId) || String(mail.assignee) === String(userId);
    if (!isAssignedToUser) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_UPDATE_MAIL", "mails", {}, req);
      return NextResponse.json({ error: "Bạn không có quyền cập nhật mail này" }, { status: 403 });
    }
  }

  const body = await req.json();
  
  mail = await RootMail.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!mail) {
    mail = await SatelliteMail.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  }
  if (!mail) {
    mail = await MonetizedMail.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  }

 if (!mail) {
 return NextResponse.json({ success: false, error:"Mail not found" }, { status: 404 });
 }

 await logAuditTrail(userId || "system", "UPDATE_MAIL_SUCCESS", "mails", { id, email: mail.email }, req);

 // If mail was assigned to a user, send notification email
 if (body.assigneeId) {
   try {
     const User = (await import("@/models/User")).default;
     const assignee = await User.findById(body.assigneeId).select("name email");
     if (assignee?.email) {
       sendMailAssignedEmail(assignee.email, assignee.name || "Nhân viên", `Email: ${mail.email || "N/A"}`).catch(console.error);
     }
   } catch (_) {}
   await logAuditTrail(userId || "system", "MAIL_ASSIGNED", "mails", { mailId: id, assigneeId: body.assigneeId, email: mail.email }, req);
 }

 return NextResponse.json({ success: true, data: mail });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
 }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  let userId = req.headers.get("x-user-id");
  let userRole = req.headers.get("x-user-role");
  if (!userId) {
    const authUser = await getAuthUser();
    if (authUser) {
      userId = authUser.userId;
      userRole = authUser.role;
    }
  }

  const hasPermission = await checkPermission(userRole || "", 4, ["all", "tasks", "staff"]);
  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_DELETE_MAIL", "mails", {}, req);
    return NextResponse.json({ error: "Không có quyền xóa mail" }, { status: 403 });
  }

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

 await logAuditTrail(userId || "system", "DELETE_MAIL_SUCCESS", "mails", { id, email: mail.email }, req);

 return NextResponse.json({ success: true, data: {} });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
 }
}
