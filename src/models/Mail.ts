import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMail extends Document {
  email: string;
  password?: string;
  status: string;
  type?: string;
  batch?: string;
  assignee?: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const MailSchema: Schema = new Schema(
  {
    email: { type: String, required: true },
    password: { type: String },
    status: { type: String, default: 'LIVE' },
    type: { type: String },
    batch: { type: String },
    assignee: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Mail: Model<IMail> = mongoose.models.Mail || mongoose.model<IMail>("Mail", MailSchema, "mails");
