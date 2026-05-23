import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMail extends Document {
  id?: number;
  email: string;
  pass?: string;
  password?: string;
  recovery?: string;
  twoFA?: string;
  phone?: string;
  otpLink?: string;
  status: string;
  type?: string;
  workStatus?: string;
  batch?: string;
  batchName?: string;
  batchId?: string;
  assignee?: mongoose.Types.ObjectId | string;
  assigneeId?: mongoose.Types.ObjectId | string;
  links?: string[];
  eligibleChannels?: boolean[];
  createdAt: Date;
  updatedAt: Date;
}

const MailSchema: Schema = new Schema(
  {
    id: { type: Number },
    email: { type: String, required: true },
    pass: { type: String },
    password: { type: String },
    recovery: { type: String },
    twoFA: { type: String },
    phone: { type: String },
    otpLink: { type: String },
    status: { type: String, default: 'LIVE' },
    type: { type: String },
    workStatus: { type: String },
    batch: { type: String },
    batchName: { type: String },
    batchId: { type: String },
    assignee: { type: Schema.Types.ObjectId, ref: 'User' },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    links: { type: [String], default: [] },
    eligibleChannels: { type: [Boolean], default: [] },
  },
  { timestamps: true }
);

export const Mail: Model<IMail> = mongoose.models.Mail || mongoose.model<IMail>("Mail", MailSchema, "mails");
