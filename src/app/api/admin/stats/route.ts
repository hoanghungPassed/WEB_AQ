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

// In-memory cache for admin stats (avoids redundant heavy DB aggregation)
let cachedStats: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 60 seconds

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    await dbConnect();

    // Specific logic for staff roles (excluding 01, 02, 03 managers)
    const isStaff = !["01", "02", "03"].includes(userRole || "");
    if (isStaff) {
      const now = new Date();
      const vnNow = new Date(now.getTime() + 7 * 3600000);
      const todayStr = vnNow.toISOString().split('T')[0];
      
      // VN 00:00 today is UTC yesterday 17:00
      const startOfDay = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate(), -7, 0, 0, 0));

      const attendance = await Attendance.findOne({ userId, date: todayStr }).select("checkInTime checkOutTime").lean();
      
      const myTasks = await Task.countDocuments({ 
        assigneeId: userId, 
        status: { $in: ["PENDING", "IN_PROGRESS", "OVERDUE"] }
      });

      // Aggregate unpaid fines
      const mongoose = (await import("mongoose")).default;
      const unpaidFinesResult = await Fine.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId || ""), status: "UNPAID" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      const myFines = unpaidFinesResult[0]?.total || 0;
      
      const rootMailsToday = await RootMail.countDocuments({ 
        $or: [{ assignee: userId }, { assigneeId: userId }], 
        updatedAt: { $gte: startOfDay },
        workStatus: { $in: ['Đã làm', 'Lỗi'] }
      });
      const satMailsToday = await SatelliteMail.countDocuments({ 
        $or: [{ assignee: userId }, { assigneeId: userId }], 
        updatedAt: { $gte: startOfDay },
        workStatus: { $in: ['Đã làm', 'Lỗi'] }
      });
      const myMails = rootMailsToday + satMailsToday;

      const liveRoot = await RootMail.countDocuments({ $or: [{ assignee: userId }, { assigneeId: userId }], status: 'LIVE' });
      const liveSat = await SatelliteMail.countDocuments({ $or: [{ assignee: userId }, { assigneeId: userId }], status: 'LIVE' });
      const liveMails = liveRoot + liveSat;

      const dieRoot = await RootMail.countDocuments({ $or: [{ assignee: userId }, { assigneeId: userId }], status: 'DIE' });
      const dieSat = await SatelliteMail.countDocuments({ $or: [{ assignee: userId }, { assigneeId: userId }], status: 'DIE' });
      const dieMails = dieRoot + dieSat;

      const warehouseQuery = { status: { $in: ["AVAILABLE", "UNPROCESSED"] } };
      const [r, s, m] = await Promise.all([
        RootMail.countDocuments(warehouseQuery),
        SatelliteMail.countDocuments(warehouseQuery),
        MonetizedMail.countDocuments(warehouseQuery)
      ]);
      const warehouseMailsCount = r + s + m;

      return NextResponse.json({
        success: true,
        data: {
          myTasks,
          myFines,
          myMails,
          liveMails,
          dieMails,
          warehouseMailsCount,
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

    // ========== IN-MEMORY CACHE CHECK ==========
    const now = Date.now();
    if (cachedStats && (now - lastFetchTime < CACHE_TTL)) {
      return NextResponse.json(cachedStats);
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const [
      rootCount,
      satCount,
      monCount,
      rootDie,
      satDie,
      monDie,
      activeStaff,
      onlineUsers,
      taskPending,
      taskCompleted,
      priceAggregation,
      eligibleMails
    ] = await Promise.all([
      RootMail.countDocuments(),
      SatelliteMail.countDocuments(),
      MonetizedMail.countDocuments(),
      RootMail.countDocuments({ status: "DIE" }),
      SatelliteMail.countDocuments({ status: "DIE" }),
      MonetizedMail.countDocuments({ status: "DIE" }),
      User.countDocuments({ role: { $in: ["03","04","05"] }, status: "ACTIVE" }),
      User.countDocuments({ isOnline: true, lastActive: { $gte: fifteenMinutesAgo } }),
      Task.countDocuments({ status: "PENDING" }),
      Task.countDocuments({ status: "COMPLETED" }),
      Fine.aggregate([
        { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } }
      ]),
      SatelliteMail.find({ eligibleChannels: true }).select("email batchName assignedTo channelNames eligibleChannels").lean()
    ]);

    const totalMails = rootCount + satCount + monCount;
    const totalDie = rootDie + satDie + monDie;
    const totalFines = (priceAggregation[0]?.total as number) || 0;

    let eligibleChannelsCount = 0;
    const eligibleChannelsList: any[] = [];

    for (const mail of eligibleMails) {
      const eChannels = mail.eligibleChannels || [];
      const cNames = mail.channelNames || [];
      for (let i = 0; i < eChannels.length; i++) {
        if (eChannels[i] === true) {
          eligibleChannelsCount++;
          eligibleChannelsList.push({
            id: `${mail._id}_${i}`,
            email: mail.email,
            batchName: mail.batchName || "Không rõ lô",
            assignedTo: mail.assignedTo || "Chưa giao",
            channelName: cNames[i] || `Kênh ${i + 1}`
          });
        }
      }
    }

    await logAuditTrail(userId || "system", "REPORT_GENERATED", "stats", { totalMails, activeStaff, totalFines }, req);

    const responsePayload = { 
      success: true,
      data: {
        totalMails,
        rootCount,
        satCount,
        monCount,
        totalDie,
        activeStaff,
        onlineUsers,
        totalFines,
        eligibleChannelsCount,
        eligibleChannelsList,
        tasks: {
          pending: taskPending,
          completed: taskCompleted,
          total: taskPending + taskCompleted
        }
      }
    };

    // Update in-memory cache
    cachedStats = responsePayload;
    lastFetchTime = Date.now();

    return NextResponse.json(responsePayload);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: errorMessage, totalMails: 0, activeStaff: 0, totalFines: 0 }, { status: 500 });
  }
}
