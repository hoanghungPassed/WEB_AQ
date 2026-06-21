export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Message } from "@/models/Message";
import User from "@/models/User";
import { pusherServer } from "@/lib/pusher";

export async function GET(req: Request) {
  try {
    const myId = req.headers.get("x-user-id");
    if (!myId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const isCompanyChat = searchParams.get("isCompanyChat") === "true";
    const partnerId = searchParams.get("partnerId");

    let query: any = {};

    if (isCompanyChat) {
      // General group/company chat
      query.isCompanyChat = true;
    } else if (partnerId) {
      // Private direct chat between current user and partnerId
      query = {
        isCompanyChat: false,
        $or: [
          { senderId: myId, receiverId: partnerId },
          { senderId: partnerId, receiverId: myId }
        ]
      };

      // Automatically mark incoming messages from this partner as read when loaded
      await Message.updateMany(
        { senderId: partnerId, receiverId: myId, isRead: false },
        { $set: { isRead: true, isDelivered: true } }
      );
    } else {
      // Direct chat request missing target partner
      return NextResponse.json({ success: false, error: "Thiếu ID đối tác chat" }, { status: 400 });
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(100) // cap to 100 messages for performance
      .lean();

    return NextResponse.json({ success: true, data: messages });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("GET messages API error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const senderId = req.headers.get("x-user-id");
    if (!senderId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { content, isCompanyChat, receiverId } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json({ success: false, error: "Nội dung tin nhắn trống" }, { status: 400 });
    }

    // Lookup sender info safely from DB to prevent spoofing
    const senderUser = await User.findById(senderId);
    if (!senderUser) {
      return NextResponse.json({ success: false, error: "Không tìm thấy người gửi" }, { status: 404 });
    }

    const mongoose = (await import("mongoose")).default;

    let receiverUsername = "";
    const isValidReceiver = !isCompanyChat && receiverId && mongoose.isValidObjectId(receiverId);
    if (isValidReceiver) {
      const receiverUser = await User.findById(receiverId);
      if (receiverUser) {
        receiverUsername = receiverUser.username;
      }
    }

    const newMessage = await Message.create({
      senderId,
      senderName: senderUser.name,
      senderUsername: senderUser.username,
      receiverId: isValidReceiver ? receiverId : undefined,
      receiverUsername: isCompanyChat ? undefined : receiverUsername,
      isCompanyChat: !!isCompanyChat,
      content: content.trim(),
      isSent: true,
      isDelivered: true, // mark delivered automatically
      isRead: false
    });

    // Trigger Real-time update via Pusher
    try {
      if (isCompanyChat) {
        // 1. Trigger general 'chat' channel for company chat
        await pusherServer.trigger("chat", "new-message", newMessage);
        // 2. Legacy channel for company chat
        await pusherServer.trigger("company-chat", "new-message", newMessage);
      } else {
        // Direct message - trigger ONLY to recipient and sender private user channels (Lock 1)
        await pusherServer.trigger(`user-${receiverId}`, "new-message", newMessage);
        await pusherServer.trigger(`user-${senderId}`, "new-message", newMessage);
        
        // Legacy channels for DMs
        await pusherServer.trigger(`private-chat-${receiverId}`, "new-message", newMessage);
        await pusherServer.trigger(`private-chat-${senderId}`, "new-message", newMessage);
      }
    } catch (pushErr) {
      console.error("Pusher trigger error:", pushErr);
    }

    return NextResponse.json({ success: true, data: newMessage }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("POST messages API error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
