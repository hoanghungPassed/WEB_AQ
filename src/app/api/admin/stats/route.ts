export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import dbConnect from '@/lib/mongodb';
import { RootMail } from '@/models/RootMail';
import { SatelliteMail } from '@/models/SatelliteMail';
import { MonetizedMail } from '@/models/MonetizedMail';
import { User } from '@/models/User';
import { Fine } from '@/models/Fine';
import { Attendance } from '@/models/Attendance';
import { Task } from '@/models/Task';
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    await dbConnect();

    // Specific logic for staff roles (03 and 04)
    if (userRole === "03" || userRole === "04") {
      const todayStr = new Date(new Date().getTime() + 7 * 3600000).toISOString().split('T')[0];
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const attendance = await Attendance.findOne({ userId, date: todayStr });
      
      const myTasks = await Task.countDocuments({ 
        assigneeId: userId, 
        createdAt: { $gte: startOfDay } 
      });
      
      const rootMailsToday = await RootMail.countDocuments({ 
        assignee: userId, 
        updatedAt: { $gte: startOfDay } 
      });
      const satMailsToday = await SatelliteMail.countDocuments({ 
        assignee: userId, 
        updatedAt: { $gte: startOfDay } 
      });
      const myMails = rootMailsToday + satMailsToday;

      const liveRoot = await RootMail.countDocuments({ assignee: userId, status: 'LIVE' });
      const liveSat = await SatelliteMail.countDocuments({ assignee: userId, status: 'LIVE' });
      const liveMails = liveRoot + liveSat;

      const dieRoot = await RootMail.countDocuments({ assignee: userId, status: 'DIE' });
      const dieSat = await SatelliteMail.countDocuments({ assignee: userId, status: 'DIE' });
      const dieMails = dieRoot + dieSat;

      return NextResponse.json({
        success: true,
        data: {
          myTasks,
          myMails,
          liveMails,
          dieMails,
          checkInTime: attendance?.checkInTime || null,
          checkOutTime: attendance?.checkOutTime || null
        }
      });
    }

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "reports", "tasks"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_GET_STATS", "stats", {}, req);
      return NextResponse.json(
        { error: "Không có quyền truy cập thông tin thống kê" },
        { status: 403 }
      );
    }
    const rootCount = await RootMail.countDocuments();
    const satCount = await SatelliteMail.countDocuments();
    const monCount = await MonetizedMail.countDocuments();
    const totalMails = rootCount + satCount + monCount;
    
    const activeStaff = await User.countDocuments({
      role: { $in: ["03","04","05"] }
    });

    const priceAggregation = await Fine.aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } }
    ]);
    const totalFines = (priceAggregation[0]?.total as number) || 0;

    await logAuditTrail(userId || "system", "REPORT_GENERATED", "stats", { totalMails, activeStaff, totalFines }, req);

    return NextResponse.json({ totalMails, activeStaff, totalFines });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: errorMessage, totalMails: 0, activeStaff: 0, totalFines: 0 }, { status: 500 });
  }
}
