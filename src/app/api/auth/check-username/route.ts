export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ exists: false });
    }

    const lowercaseUsername = username.toLowerCase().trim();
    const user = await User.findOne({ username: lowercaseUsername });

    return NextResponse.json({ exists: !!user });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Lỗi API check-username:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
