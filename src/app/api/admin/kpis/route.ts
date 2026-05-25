import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { RootMail } from '@/models/RootMail';
import { SatelliteMail } from '@/models/SatelliteMail';
import { MonetizedMail } from '@/models/MonetizedMail';
import { User } from '@/models/User';
import { Payroll } from '@/models/Payroll';
import { SyncStore } from '@/models/SyncStore';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    if (!userId || (userRole !== "01" && userRole !== "02" && userRole !== "03")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    // Fetch all required collections in parallel
    const [roots, sats, mons, staff, payrollRecords, syncKpi] = await Promise.all([
      RootMail.find({}).sort({ createdAt: -1 }),
      SatelliteMail.find({}).sort({ createdAt: -1 }),
      MonetizedMail.find({}).sort({ createdAt: -1 }),
      User.find({}),
      Payroll.find({}).sort({ createdAt: -1 }),
      SyncStore.findOne({ key: 'global_kpi_data' })
    ]);

    const mails = [...roots, ...sats, ...mons];
    const kpiData = syncKpi ? JSON.parse(syncKpi.value) : null;

    return NextResponse.json({
      mails: mails || [],
      staff: staff || [],
      payrollRecords: payrollRecords || [],
      kpi: kpiData
    });
  } catch (error: any) {
    console.error("Error fetching KPI data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    if (!userId || (userRole !== "01" && userRole !== "02")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    
    // Save to SyncStore under 'global_kpi_data'
    const syncStore = await SyncStore.findOneAndUpdate(
      { key: 'global_kpi_data' },
      { value: JSON.stringify(body) },
      { new: true, upsert: true }
    );
    
    return NextResponse.json({ success: true, data: syncStore });
  } catch (error: any) {
    console.error("Error updating KPI configuration:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

