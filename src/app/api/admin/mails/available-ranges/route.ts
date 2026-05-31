export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { SatelliteMail } from "@/models/SatelliteMail";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Lấy tất cả mail vệ tinh đang rảnh (isAssigned: false, status: 'ACTIVE' hoặc 'LIVE')
    // Chú ý: model SatelliteMail default status là 'LIVE' hoặc 'ACTIVE' tùy project, ở đây check status: 'LIVE' hoặc 'ACTIVE'
    const availableMails = await SatelliteMail.find({
      isAssigned: { $ne: true },
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
        mailIds: chunkMails.map(m => m._id)
      });
    }

    return NextResponse.json({ success: true, data: chunks, chunks });
  } catch (error: any) {
    console.error("GET available ranges error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
