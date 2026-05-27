import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Message } from "@/models/Message";
import User from "@/models/User";

export const dynamic = "force-dynamic";

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
      .limit(100); // cap to 100 messages for performance

    return NextResponse.json({ success: true, data: messages });
  } catch (error: any) {
    console.error("GET messages API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

    let receiverUsername = "";
    if (!isCompanyChat && receiverId) {
      const receiverUser = await User.findById(receiverId);
      if (receiverUser) {
        receiverUsername = receiverUser.username;
      }
    }

    const newMessage = await Message.create({
      senderId,
      senderName: senderUser.name,
      senderUsername: senderUser.username,
      receiverId: isCompanyChat ? undefined : receiverId,
      receiverUsername: isCompanyChat ? undefined : receiverUsername,
      isCompanyChat: !!isCompanyChat,
      content: content.trim(),
      isSent: true,
      isDelivered: true, // mark delivered automatically
      isRead: false
    });

    return NextResponse.json({ success: true, data: newMessage }, { status: 201 });
  } catch (error: any) {
    console.error("POST messages API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
