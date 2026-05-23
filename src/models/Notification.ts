import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  type: string;
  author?: mongoose.Types.ObjectId | string;
  imageUrl?: string;
  likes?: mongoose.Types.ObjectId[] | string[];
  comments?: {
    userId: mongoose.Types.ObjectId | string;
    content: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'INFO' },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    imageUrl: { type: String },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        content: { type: String },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

if (mongoose.models.Notification) {
  delete mongoose.models.Notification;
}

export const Notification: Model<INotification> = mongoose.model<INotification>("Notification", NotificationSchema, "notifications");
