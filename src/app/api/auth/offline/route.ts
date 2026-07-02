import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();

    if (authUser) {
      await dbConnect();
      const now = new Date();
      
      await User.findByIdAndUpdate(authUser.userId, { 
        isOnline: false, 
        lastActive: now 
      });

      // Trigger Pusher for real-time removal
      await pusherServer.trigger("private-system", "user-status-changed", {
        userId: authUser.userId,
        isOnline: false,
        lastActive: now
      });

      // Sync legacy channel
      await pusherServer.trigger("system-users", "status-changed", {
        userId: authUser.userId,
        isOnline: false,
        lastActive: now
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Offline API Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
