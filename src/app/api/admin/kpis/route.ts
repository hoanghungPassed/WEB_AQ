export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import dbConnect from '@/lib/mongodb';
import { RootMail } from '@/models/RootMail';
import { SatelliteMail } from '@/models/SatelliteMail';
import { MonetizedMail } from '@/models/MonetizedMail';
import { User } from '@/models/User';
import { Payroll } from '@/models/Payroll';
import { SyncStore } from '@/models/SyncStore';
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "reports"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_GET_KPIS", "kpis", {}, req);
      return NextResponse.json({ error: "Không có quyền thực hiện thao tác này" }, { status: 403 });
    }

    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [year, month] = monthParam.split("-").map(Number);
    
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, -7, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 16, 59, 59, 999));

    // 1. Calculate Monthly Summary Stats
    const stats = await SatelliteMail.aggregate([
      { $match: { updatedAt: { $gte: startOfMonth, $lte: endOfMonth }, type: "SATELLITE" } },
      { $group: {
          _id: null,
          totalEligibleChannels: { $sum: { $size: { $ifNull: ["$links", []] } } },
          totalDone: { $sum: { $cond: [{ $eq: ["$workStatus", "Đã làm"] }, 1, 0] } }
        }
      }
    ]);

    const mailCounts = await Promise.all([
      RootMail.countDocuments({}),
      SatelliteMail.countDocuments({}),
      MonetizedMail.countDocuments({}),
      SatelliteMail.countDocuments({ status: "DIE", updatedAt: { $gte: startOfMonth, $lte: endOfMonth } })
    ]);

    // 2. Calculate Staff Leaderboard (Monthly)
    const leaderboard = await SatelliteMail.aggregate([
      { $match: { updatedAt: { $gte: startOfMonth, $lte: endOfMonth }, type: "SATELLITE", assigneeId: { $ne: null } } },
      { $group: {
          _id: "$assigneeId",
          monthlyChannels: { $sum: { $size: { $ifNull: ["$links", []] } } },
          completedTasks: { $sum: { $cond: [{ $eq: ["$workStatus", "Đã làm"] }, 1, 0] } }
        }
      },
      { $sort: { monthlyChannels: -1 } }
    ]);

    // 3. Daily Cumulative Data for Chart
    const dailyStats = await SatelliteMail.aggregate([
      { $match: { updatedAt: { $gte: startOfMonth, $lte: endOfMonth }, type: "SATELLITE" } },
      { $project: {
          day: { $dayOfMonth: { $add: ["$updatedAt", 7 * 60 * 60 * 1000] } },
          channelCount: { $size: { $ifNull: ["$links", []] } }
        }
      },
      { $group: { _id: "$day", count: { $sum: "$channelCount" } } },
      { $sort: { _id: 1 } }
    ]);

    // Fetch required metadata
    const [staff, payrollRecords, syncKpi] = await Promise.all([
      User.find({ role: { $in: ["04", "05"] } }).select("name username role status").lean(),
      Payroll.find({ month: monthParam }).sort({ createdAt: -1 }).lean(),
      SyncStore.findOne({ key: 'global_kpi_data' }).lean()
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        total: mailCounts[0] + mailCounts[1] + mailCounts[2],
        rootCount: mailCounts[0],
        satelliteCount: mailCounts[1],
        monetizedCount: mailCounts[2],
        totalDone: stats[0]?.totalDone || 0,
        totalEligibleChannels: stats[0]?.totalEligibleChannels || 0,
        dieMails: mailCounts[3]
      },
      leaderboard,
      dailyStats,
      staff,
      payrollRecords,
      kpi: syncKpi ? JSON.parse((syncKpi as any).value) : null
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Error fetching KPI data:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 4, ["all", "reports"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_UPDATE_KPIS", "kpis", {}, req);
      return NextResponse.json({ error: "Không có quyền thực hiện thao tác này" }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    
    // Save to SyncStore under 'global_kpi_data'
    const syncStore = await SyncStore.findOneAndUpdate(
      { key: 'global_kpi_data' },
      { value: JSON.stringify(body) },
      { new: true, upsert: true }
    );
    
    await logAuditTrail(userId || "system", "UPDATE_KPIS_SUCCESS", "kpis", body, req);

    return NextResponse.json({ success: true, data: syncStore });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Error updating KPI configuration:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

