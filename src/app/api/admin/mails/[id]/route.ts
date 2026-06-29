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
  
  // Mass Assignment Protection: Staff can only update specific fields
  if (!hasPermission) {
    const allowedFields = ['links', 'note', 'status', 'isDone', 'processStatus', 'workStatus', 'channelNames', 'eligibleChannels', 'verificationStatus', 'cccdDate'];
    const filteredBody: any = {};
    allowedFields.forEach(field => {
      if (body[field] !== undefined) filteredBody[field] = body[field];
    });
    
    // Check if staff is trying to update restricted fields
    const restrictedFields = ['assigneeId', 'batchId', 'email', 'type'];
    const attemptingRestricted = restrictedFields.some(f => body[f] !== undefined);
    
    if (attemptingRestricted) {
      return NextResponse.json({ error: "Bạn không có quyền thay đổi các thông tin quản trị của mail" }, { status: 403 });
    }

    mail = await RootMail.findByIdAndUpdate(id, { $set: filteredBody }, { new: true });
    if (!mail) mail = await SatelliteMail.findByIdAndUpdate(id, { $set: filteredBody }, { new: true });
    if (!mail) mail = await MonetizedMail.findByIdAndUpdate(id, { $set: filteredBody }, { new: true });
  } else {
    // Admin/Manager can update everything
    mail = await RootMail.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!mail) {
      mail = await SatelliteMail.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    }
    if (!mail) {
      mail = await MonetizedMail.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    }
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

  // Phase 4: Auto-update Task Progress
  try {
    const { Task } = await import("@/models/Task");
    const activeTasks = await Task.find({ 
      status: { $ne: "COMPLETED" }, 
      $or: [
        { mailIds: id }, 
        { batch: mail.batchId }, 
        { batchName: mail.batchName },
        { batch: mail.batchName },
        { batchName: mail.batchId }
      ] 
    });

    for (const task of activeTasks) {
      let totalCount = 0;
      let completedCount = 0;

      if (task.mailIds && task.mailIds.length > 0) {
        totalCount = task.mailIds.length;
        
        const [satCompleted, rootCompleted, monCompleted] = await Promise.all([
          SatelliteMail.countDocuments({
            _id: { $in: task.mailIds },
            $or: [
              { workStatus: { $in: ["Đã làm", "Lỗi"] } },
              { "links.2": { $exists: true, $ne: "" } }
            ]
          }),
          RootMail.countDocuments({
            _id: { $in: task.mailIds },
            workStatus: { $in: ["Đã làm", "Lỗi"] }
          }),
          MonetizedMail.countDocuments({
            _id: { $in: task.mailIds },
            workStatus: { $in: ["Đã làm", "Lỗi"] }
          })
        ]);
        completedCount = satCompleted + rootCompleted + monCompleted;
      } else if (task.batchName || task.batch) {
        const term = task.batchName || task.batch;
        const [satTotal, rootTotal, monTotal, satCompleted, rootCompleted, monCompleted] = await Promise.all([
          SatelliteMail.countDocuments({ $or: [{ batchName: term }, { batchId: term }] }),
          RootMail.countDocuments({ $or: [{ batchName: term }, { batchId: term }] }),
          MonetizedMail.countDocuments({ $or: [{ batchName: term }, { batchId: term }] }),
          SatelliteMail.countDocuments({
            $and: [
              { $or: [{ batchName: term }, { batchId: term }] },
              {
                $or: [
                  { workStatus: { $in: ["Đã làm", "Lỗi"] } },
                  { "links.2": { $exists: true, $ne: "" } }
                ]
              }
            ]
          }),
          RootMail.countDocuments({
            $or: [{ batchName: term }, { batchId: term }],
            workStatus: { $in: ["Đã làm", "Lỗi"] }
          }),
          MonetizedMail.countDocuments({
            $or: [{ batchName: term }, { batchId: term }],
            workStatus: { $in: ["Đã làm", "Lỗi"] }
          })
        ]);
        
        totalCount = satTotal + rootTotal + monTotal;
        completedCount = satCompleted + rootCompleted + monCompleted;
      }

      if (totalCount > 0) {
        const newProgress = Math.round((completedCount / totalCount) * 100);
        task.progress = newProgress;

        const isTransitioningToCompleted = newProgress === 100 && task.status !== "COMPLETED";

        if (newProgress === 100) {
          task.status = "COMPLETED";
          task.progress = 100;
        }
        await task.save();

        if (isTransitioningToCompleted) {
          const { pusherServer } = await import("@/lib/pusher");
          await pusherServer.trigger('private-system', 'task-updated', {
            taskId: task._id,
            status: "COMPLETED",
            assigneeId: task.assigneeId
          });
          await pusherServer.trigger('private-system', 'satellite-batches-updated', {});
          await pusherServer.trigger('private-system', 'task-list-updated', {});
        }
      }
    }
  } catch (taskErr) {
    console.error("Task auto-update error:", taskErr);
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
