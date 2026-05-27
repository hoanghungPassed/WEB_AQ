import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId | string;
  senderName: string;
  senderUsername: string;
  receiverId?: mongoose.Types.ObjectId | string;
  receiverUsername?: string;
  isCompanyChat: boolean;
  content: string;
  isSent: boolean;
  isDelivered: boolean;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, required: true },
    senderUsername: { type: String, required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User" },
    receiverUsername: { type: String },
    isCompanyChat: { type: Boolean, default: false },
    content: { type: String, required: true },
    isSent: { type: Boolean, default: true },
    isDelivered: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

if (mongoose.models.Message) {
  delete mongoose.models.Message;
}

export const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>("Message", MessageSchema, "messages");
