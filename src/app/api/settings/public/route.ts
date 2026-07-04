import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { SystemSetting } from "@/models/SystemSetting";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const settings = await SystemSetting.findOne().select("brandName rulesUrl adminPhone");
    const data = {
      brandName: settings?.brandName || "AQ MEDIA",
      rulesUrl: settings?.rulesUrl || "",
      adminPhone: settings?.adminPhone || "0987654321"
    };
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("GET public settings error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
