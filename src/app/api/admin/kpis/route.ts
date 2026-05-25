import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { RootMail } from '@/models/RootMail';
import { SatelliteMail } from '@/models/SatelliteMail';
import { MonetizedMail } from '@/models/MonetizedMail';
import { User } from '@/models/User';
import { Payroll } from '@/models/Payroll';

export async function GET() {
  try {
    await dbConnect();
    
    // Fetch all required collections in parallel
    const [roots, sats, mons, staff, payrollRecords] = await Promise.all([
      RootMail.find({}).sort({ createdAt: -1 }),
      SatelliteMail.find({}).sort({ createdAt: -1 }),
      MonetizedMail.find({}).sort({ createdAt: -1 }),
      User.find({}),
      Payroll.find({}).sort({ createdAt: -1 })
    ]);

    const mails = [...roots, ...sats, ...mons];

    return NextResponse.json({
      mails: mails || [],
      staff: staff || [],
      payrollRecords: payrollRecords || []
    });
  } catch (error: any) {
    console.error("Error fetching KPI data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
