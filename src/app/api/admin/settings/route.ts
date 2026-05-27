import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { SystemSetting } from "@/models/SystemSetting";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({
        brandName: "AQ MEDIA",
        openTime: "08:00",
        closeTime: "18:00",
        checkInTime: "17:30"
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error("GET settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    // Only Admin (01) or work manager (02) or HR manager (03) can modify system configurations
    if (!userId || (userRole !== "01" && userRole !== "02" && userRole !== "03")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const data = await req.json();
    
    const updateData: any = {};
    if (data.brandName !== undefined) updateData.brandName = data.brandName;
    if (data.openTime !== undefined) updateData.openTime = data.openTime;
    if (data.closeTime !== undefined) updateData.closeTime = data.closeTime;
    if (data.checkInTime !== undefined) updateData.checkInTime = data.checkInTime;

    const settings = await SystemSetting.findOneAndUpdate(
      {},
      { $set: updateData },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error("PUT settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
