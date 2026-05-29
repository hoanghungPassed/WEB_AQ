import { NextRequest, NextResponse } from 'next/server';
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
    
    // Fetch all required collections in parallel
    const [roots, sats, mons, staff, payrollRecords, syncKpi] = await Promise.all([
      RootMail.find({}).sort({ createdAt: -1 }),
      SatelliteMail.find({}).sort({ createdAt: -1 }),
      MonetizedMail.find({}).sort({ createdAt: -1 }),
      User.find({}).select("-password"),
      Payroll.find({}).sort({ createdAt: -1 }),
      SyncStore.findOne({ key: 'global_kpi_data' })
    ]);

    const mails = [...roots, ...sats, ...mons];
    const kpiData = syncKpi ? JSON.parse(syncKpi.value) : null;

    const mappedStaff = staff.map(u => {
      const obj = u.toObject() as any;
      delete obj.password;
      return obj;
    });

    return NextResponse.json({
      mails: mails || [],
      staff: mappedStaff || [],
      payrollRecords: payrollRecords || [],
      kpi: kpiData
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

