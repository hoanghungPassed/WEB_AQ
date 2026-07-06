import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Fine } from '@/models/Fine';
import { User } from '@/models/User';
import { Task } from '@/models/Task';
import { Kpi } from '@/models/Kpi';
import { logAction } from '@/lib/logger';
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { sendFineEmail } from "@/lib/email";

export const dynamic ="force-dynamic";

export async function POST(req: NextRequest) {
 try {
  await dbConnect();
  
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  const hasPermission = await checkPermission(userRole || "", 3, ["all", "attendance"]);
  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_RUN_AUTO_FINES", "fines", {}, req);
    return NextResponse.json({ error: "Không có quyền chạy tự động tính phạt" }, { status: 403 });
  }
 
  // Auto-fining logic: Check staff KPI and fine if they didn't meet the target after offWorkTime
  const staffs = await User.find({ role: { $in: ["04","05"] } }).select("-password").lean();
  
  const now = new Date();
  const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  const currentMins = vnTime.getUTCHours() * 60 + vnTime.getUTCMinutes();

  let count = 0;

  for (const staff of staffs) {
  const offWorkStr = staff.offWorkTime ||"17:30";
  const [offH, offM] = offWorkStr.split(":").map(Number);
  const offMins = offH * 60 + offM;

  // If past offWorkTime
  if (currentMins > offMins) {
  // Query incomplete tasks
  const incompleteTasks = await Task.find({
  assigneeId: staff._id,
  status: { $ne: 'COMPLETED' } 
  });

  if (incompleteTasks.length > 0) {
  // Check if fine already exists for today to avoid duplicate fines
  const startOfDay = new Date(Date.UTC(
    vnTime.getUTCFullYear(),
    vnTime.getUTCMonth(),
    vnTime.getUTCDate(),
    0, 0, 0, 0
  ));
  startOfDay.setTime(startOfDay.getTime() - (7 * 60 * 60 * 1000));
  
          const fineReason = `Không hoàn thành task đúng hạn (sau ${offWorkStr})`;
          
          const result = await Fine.findOneAndUpdate(
            {
              userId: staff._id,
              reason: fineReason,
              createdAt: { $gte: startOfDay }
            },
            {
              $setOnInsert: {
                userId: staff._id,
                reason: fineReason,
                amount: 50000,
                status: "UNPAID"
              }
            },
            { upsert: true, new: false } // new: false trả về null nếu đây là lần insert mới
          );

          // Nếu result là null, nghĩa là khoản phạt VỪA MỚI được tạo ra (Insert thành công)
          if (!result) {
            try {
              const { pusherServer } = await import("@/lib/pusher");
              await pusherServer.trigger("private-system", "new-fine", {
                userId: staff._id, amount: 50000, reason: fineReason
              });
            } catch (pushErr) {}

            if (staff.email) {
              sendFineEmail(staff.email, staff.name || "Nhân viên", 50000, fineReason).catch(console.error);
            }
            count++;
          }
  }
  }
  }
 
 if (count > 0) {
 await logAction("system","Tự động tính toán và áp dụng phạt", `Đã kiểm tra KPI của ${staffs.length} nhân sự. Phạt: ${count} người.`);
 }

 await logAuditTrail(userId || "system", "RUN_AUTO_FINES_SUCCESS", "fines", { staffsChecked: staffs.length, finedCount: count }, req);

 return NextResponse.json({ success: true, message: `Auto fines calculation completed for ${staffs.length} staff members. Fined: ${count}` });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("Error auto calculating fines:", error);
 return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}
