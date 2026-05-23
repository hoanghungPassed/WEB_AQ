import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  type: string;
  author?: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'INFO' },
    author: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

if (mongoose.models.Notification) {
  delete mongoose.models.Notification;
}

export const Notification: Model<INotification> = mongoose.model<INotification>("Notification", NotificationSchema, "notifications");
