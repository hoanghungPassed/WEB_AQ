import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { RootMail } from '@/models/RootMail';
import { SatelliteMail } from '@/models/SatelliteMail';
import { MonetizedMail } from '@/models/MonetizedMail';
import { User } from '@/models/User';
import { Fine } from '@/models/Fine';

export async function GET(req: Request) {
 try {
 const userId = req.headers.get("x-user-id");
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 await dbConnect();
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

 return NextResponse.json({ totalMails, activeStaff, totalFines });
 } catch (error: any) {
 console.error("Error fetching admin stats:", error);
 return NextResponse.json({ error: error.message, totalMails: 0, activeStaff: 0, totalFines: 0 }, { status: 500 });
 }
}
