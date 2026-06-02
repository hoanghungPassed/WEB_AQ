export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { SatelliteMail } from "@/models/SatelliteMail";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Truy vấn tất cả SatelliteMail rảnh (isAssigned: false), sắp xếp theo thời gian tạo cũ nhất trước.
    const availableMails = await SatelliteMail.find({
      isAssigned: false,
      type: 'SATELLITE'
    }).sort({ createdAt: 1 });

    const chunkSize = 17;
    const chunks = [];

    for (let i = 0; i < availableMails.length; i += chunkSize) {
      const chunkMails = availableMails.slice(i, i + chunkSize);
      const rangeIndex = Math.floor(i / chunkSize) + 1;
      
      chunks.push({
        rangeIndex,
        count: chunkMails.length,
        startIndex: i + 1,
        endIndex: i + chunkMails.length,
        mailIds: chunkMails.map(m => m._id.toString())
      });
    }

    return NextResponse.json(chunks);
  } catch (error: any) {
    console.error("GET available ranges error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
