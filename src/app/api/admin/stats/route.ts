import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { RootMail } from '@/models/RootMail';
import { SatelliteMail } from '@/models/SatelliteMail';
import { MonetizedMail } from '@/models/MonetizedMail';
import { User } from '@/models/User';
import { Kpi } from '@/models/Kpi';

export async function GET() {
  try {
    await dbConnect();
    const rootCount = await RootMail.countDocuments();
    const satCount = await SatelliteMail.countDocuments();
    const monCount = await MonetizedMail.countDocuments();
    const totalMails = rootCount + satCount + monCount;
    
    const activeStaff = await User.countDocuments({
      role: { $in: ["03", "04"] }
    });

    const priceAggregation = await Kpi.aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ["$fineAmount", 0] } } } }
    ]);
    const totalFines = (priceAggregation[0]?.total as number) || 0;

    return NextResponse.json({ totalMails, activeStaff, totalFines });
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: error.message, totalMails: 0, activeStaff: 0, totalFines: 0 }, { status: 500 });
  }
}
