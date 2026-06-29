import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role");

    if (!userId || !role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body as JSON or Form URL Encoded
    let socketId = "";
    let channelName = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      socketId = formData.get("socket_id") as string;
      channelName = formData.get("channel_name") as string;
    } else {
      const body = await req.json();
      socketId = body.socket_id;
      channelName = body.channel_name;
    }

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    // Unified authorization check for all private channels starting with "private-"
    if (channelName.startsWith("private-")) {
      if (channelName === "private-system") {
        const isManager = ["01", "02", "03"].includes(role);
        if (!isManager) {
          return NextResponse.json({ error: "Forbidden: Only managers can subscribe to system channel" }, { status: 403 });
        }
      } else if (channelName.startsWith("private-direct-chat-")) {
        const channelUserId = channelName.replace("private-direct-chat-", "");
        if (channelUserId !== userId) {
          return NextResponse.json({ error: "Forbidden: You cannot subscribe to other users' direct chat" }, { status: 403 });
        }
      } else {
        // private-${userId}
        const channelUserId = channelName.replace("private-", "");
        if (channelUserId !== userId) {
          return NextResponse.json({ error: "Forbidden: Subscription not allowed" }, { status: 403 });
        }
      }
    }

    // Generate Pusher authorization
    const authResponse = pusherServer.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
