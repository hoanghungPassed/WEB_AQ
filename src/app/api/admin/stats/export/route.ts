import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { RootMail } from '@/models/RootMail';
import { User } from '@/models/User';
import { checkPermission, logAuditTrail } from '@/lib/permissions';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    const hasPermission = await checkPermission(userRole || "", 3, ["all", "reports", "stats"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_EXPORT_STATS", "stats", {}, req);
      return NextResponse.json({ error: "Không có quyền truy cập xuất báo cáo" }, { status: 403 });
    }

    await dbConnect();
    // Load data similar to the front‑end calculations
    const [mails, staffList] = await Promise.all([
      RootMail.find().lean(),
      User.find({ role: { $in: ["04", "05"] } }).lean(),
    ]);

    // Helper to count eligible channels
    const countChannels = (mail: any) => {
      if (mail.type !== "SATELLITE") return 0;
      const linkCount = Array.isArray(mail.links) ? mail.links.filter((l: string) => typeof l === 'string' && l.trim() !== "").length : 0;
      const eligibleCount = Array.isArray(mail.eligibleChannels) ? mail.eligibleChannels.filter(Boolean).length : 0;
      return linkCount || eligibleCount;
    };

    // Compute staff leaderboard (same logic as front end)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const leaderboard = staffList.map((staff: any) => {
      const myMails = (mails as any[]).filter(m => String(m.assigneeId) === String(staff.id));
      const weeklyMails = myMails.filter(m => !m.updatedAt || new Date(m.updatedAt) >= monday);
      const monthlyMails = myMails.filter(m => {
        if (!m.updatedAt) return false;
        const d = new Date(m.updatedAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      const weeklyChannels = weeklyMails.reduce((sum, m) => sum + countChannels(m), 0);
      const monthlyChannels = monthlyMails.reduce((sum, m) => sum + countChannels(m), 0);
      const targetWeekly = 300; // 50 * 6 days
      const progress = targetWeekly > 0 ? Math.round((weeklyChannels / targetWeekly) * 100) : 0;
      let efficiency = "C";
      if (progress >= 90) efficiency = "A+";
      else if (progress >= 75) efficiency = "A";
      else if (progress >= 50) efficiency = "B";
      return {
        name: staff.name,
        username: staff.username,
        weeklyChannels,
        monthlyChannels,
        progress,
        efficiency,
      };
    }).sort((a, b) => b.progress - a.progress);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');
    sheet.columns = [
      { header: 'STT', key: 'index', width: 6 },
      { header: 'Tên nhân viên', key: 'name', width: 30 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Kênh đủ giờ (Tuần)', key: 'weekly', width: 20 },
      { header: 'Tổng tháng (Kênh đủ giờ)', key: 'monthly', width: 25 },
      { header: 'KPI Tuần (%)', key: 'progress', width: 15 },
      { header: 'Xếp loại', key: 'efficiency', width: 12 },
    ];
    leaderboard.forEach((staff, idx) => {
      sheet.addRow({
        index: idx + 1,
        name: staff.name,
        username: staff.username,
        weekly: staff.weeklyChannels,
        monthly: staff.monthlyChannels,
        progress: staff.progress,
        efficiency: staff.efficiency,
      });
    });

    // Set header style
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB8860B' } }; // gold background
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `AQ_MEDIA_REPORT_MONTHLY_${currentMonth + 1}_${currentYear}.xlsx`;
    await logAuditTrail(userId || "system", "EXPORT_EXCEL_STATS", "stats", { fileName }, req);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
    console.error('Error exporting Excel stats:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
