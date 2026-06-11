export const dynamic = 'force-dynamic';
import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { RootMail } from '@/models/RootMail';
import { SatelliteMail } from '@/models/SatelliteMail';
import { MonetizedMail } from '@/models/MonetizedMail';
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

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [year, month] = monthParam.split("-").map(Number);

    await dbConnect();
    // Load data from all mail collections
    const [roots, sats, mons, staffList] = await Promise.all([
      RootMail.find().lean(),
      SatelliteMail.find().lean(),
      MonetizedMail.find().lean(),
      User.find({ role: { $in: ["04", "05", "NHÂN VIÊN", "NV THỬ VIỆC"] } }).lean(),
    ]);

    const mails = [...roots, ...sats, ...mons];

    // Helper to count eligible channels
    const countChannels = (mail: any) => {
      if (mail.type !== "SATELLITE") return 0;
      const linkCount = Array.isArray(mail.links) ? mail.links.filter((l: string) => typeof l === 'string' && l.trim() !== "").length : 0;
      const eligibleCount = Array.isArray(mail.eligibleChannels) ? mail.eligibleChannels.filter(Boolean).length : 0;
      return linkCount || eligibleCount;
    };

    // Compute staff leaderboard for the selected month
    const leaderboard = staffList.map((staff: any) => {
      const myMails = (mails as any[]).filter(m => String(m.assigneeId) === String(staff.id) || String(m.assigneeId) === String(staff._id));
      
      const monthlyMails = myMails.filter(m => {
        if (!m.updatedAt) return false;
        const d = new Date(m.updatedAt);
        return d.getMonth() === month - 1 && d.getFullYear() === year;
      });

      const monthlyChannels = monthlyMails.reduce((sum, m) => sum + countChannels(m), 0);
      const targetMonthly = 26 * 50; 
      const progress = targetMonthly > 0 ? Math.round((monthlyChannels / targetMonthly) * 100) : 0;
      
      let efficiency = "C";
      if (progress >= 100) efficiency = "A+";
      else if (progress >= 85) efficiency = "A";
      else if (progress >= 70) efficiency = "B";

      return {
        name: staff.name,
        username: staff.username,
        monthlyChannels,
        progress,
        efficiency,
      };
    }).sort((a, b) => b.monthlyChannels - a.monthlyChannels);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Báo cáo tháng ' + monthParam);
    sheet.columns = [
      { header: 'STT', key: 'index', width: 6 },
      { header: 'Tên nhân viên', key: 'name', width: 30 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Sản lượng (Kênh đủ giờ)', key: 'monthly', width: 25 },
      { header: 'KPI Tháng (%)', key: 'progress', width: 15 },
      { header: 'Xếp loại', key: 'efficiency', width: 12 },
    ];

    leaderboard.forEach((staff, idx) => {
      sheet.addRow({
        index: idx + 1,
        name: staff.name,
        username: staff.username,
        monthly: staff.monthlyChannels,
        progress: staff.progress + '%',
        efficiency: staff.efficiency,
      });
    });

    // Set header style
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB8860B' } }; 
      cell.alignment = { horizontal: 'center' };
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { horizontal: 'left' };
        row.getCell('index').alignment = { horizontal: 'center' };
        row.getCell('monthly').alignment = { horizontal: 'center' };
        row.getCell('progress').alignment = { horizontal: 'center' };
        row.getCell('efficiency').alignment = { horizontal: 'center' };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `AQ_MEDIA_REPORT_MONTHLY_${monthParam}.xlsx`;
    await logAuditTrail(userId || "system", "EXPORT_EXCEL_STATS", "stats", { fileName, month: monthParam }, req);
    
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
