import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { RootMail } from "@/models/RootMail";
import { SatelliteMail } from "@/models/SatelliteMail";
import { MonetizedMail } from "@/models/MonetizedMail";
import { getAuthUser } from "@/lib/auth";

export async function PUT(req: Request) {
  try {
    let userId = req.headers.get("x-user-id");
    if (!userId) {
      const authUser = await getAuthUser();
      if (authUser) {
        userId = authUser.userId;
      }
    }
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { ids, updateData } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: "Missing ids array" }, { status: 400 });
    }

    const resRoot = await RootMail.updateMany({ _id: { $in: ids } }, { $set: updateData });
    const resSat = await SatelliteMail.updateMany({ _id: { $in: ids } }, { $set: updateData });
    const resMon = await MonetizedMail.updateMany({ _id: { $in: ids } }, { $set: updateData });

    const totalModified = resRoot.modifiedCount + resSat.modifiedCount + resMon.modifiedCount;

    return NextResponse.json({ success: true, modifiedCount: totalModified });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
