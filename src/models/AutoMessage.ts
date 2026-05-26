import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAutoMessage extends Document {
  title: string;
  content: string;
  triggerEvent: string;
  isActive: boolean;
}

const autoMessageSchema = new Schema<IAutoMessage>(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề là bắt buộc"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Nội dung tin nhắn là bắt buộc"],
      trim: true,
    },
    triggerEvent: {
      type: String,
      default: "MANUAL", // Mặc định là MANUAL (Gửi thủ công)
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc: any, ret: any) {
        ret.id = ret._id.toString();
        delete ret.__v;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc: any, ret: any) {
        ret.id = ret._id.toString();
        delete ret.__v;
      },
    },
  }
);

export const AutoMessage: Model<IAutoMessage> =
  mongoose.models.AutoMessage || mongoose.model<IAutoMessage>("AutoMessage", autoMessageSchema, "automessages");

export default AutoMessage;
