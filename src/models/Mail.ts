import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMail extends Document {
  stt?: number;
  email: string;
  password?: string;
  recoveryMail?: string;
  twoFA?: string;
  phone?: string;
  phoneLink?: string;
  status: string;
  type?: string;
  workStatus?: string;
  verificationStatus?: string;
  cccdDate?: string;
  batch?: string;
  batchName?: string;
  batchId?: string;
  assignee?: mongoose.Types.ObjectId | string;
  assigneeId?: mongoose.Types.ObjectId | string;
  assignedTo?: string;
  updatedBy?: string;
  lastUpdated?: string;
  links?: string[];
  eligibleChannels?: boolean[];
  createdAt: Date;
  updatedAt: Date;
}

const MailSchema: Schema = new Schema(
  {
    stt: { type: Number, default: 0 },
    email: { type: String, required: true },
    password: { type: String, default: "" },
    recoveryMail: { type: String, default: "" },
    twoFA: { type: String, default: "" },
    phone: { type: String, default: "" },
    phoneLink: { type: String, default: "" },
    status: { type: String, default: 'LIVE' },
    type: { type: String },
    workStatus: { type: String },
    verificationStatus: { type: String },
    cccdDate: { type: String },
    batch: { type: String },
    batchName: { type: String },
    batchId: { type: String },
    assignee: { type: Schema.Types.ObjectId, ref: 'User' },
    assigneeId: { type: String },
    assignedTo: { type: String },
    updatedBy: { type: String },
    lastUpdated: { type: String },
    links: { type: [String], default: [] },
    eligibleChannels: { type: [Boolean], default: [] },
  },
  { timestamps: true }
);

// Xóa model cũ nếu đã tồn tại để tránh lỗi cache Schema khi dev (Hot Reload)
if (mongoose.models.Mail) {
  delete mongoose.models.Mail;
}

export const Mail: Model<IMail> = mongoose.model<IMail>("Mail", MailSchema, "mails");
