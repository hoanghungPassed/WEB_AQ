import mongoose, { Schema, Document, Model } from"mongoose";

export interface IRootMail extends Document {
 stt?: number;
 email: string;
 password?: string;
 recoveryMail?: string;
 twoFA?: string;
 phone?: string;
 phoneLink?: string;
 status: string;
 type: string; //"ROOT"
 workStatus?: string;
 verificationStatus?: string;
 cccdDate?: string;
 batch?: string;
 batchName?: string;
 batchId?: string;
 assignee?: mongoose.Types.ObjectId | string;
 assigneeId?: string;
 assignedTo?: string;
 updatedBy?: string;
 lastUpdated?: string;
 createdAt: Date;
 updatedAt: Date;
}

const RootMailSchema: Schema = new Schema(
 {
 stt: { type: Number, default: 0 },
 email: { type: String, required: true },
 password: { type: String, default:"" },
 recoveryMail: { type: String, default:"" },
 twoFA: { type: String, default:"" },
 phone: { type: String, default:"" },
 phoneLink: { type: String, default:"" },
 status: { type: String, default: 'LIVE' },
 type: { type: String, default: 'ROOT' },
 workStatus: { type: String },
 verificationStatus: { type: String, enum: ["Xanh dòng 3", "chưa xanh dòng 3", "lỗi", "đang hoạt động", "chưa mời", "đã mời"], default: "chưa mời" },
 cccdDate: { type: String },
 batch: { type: String },
 batchName: { type: String },
 batchId: { type: String },
 assignee: { type: Schema.Types.ObjectId, ref: 'User' },
 assigneeId: { type: String },
 assignedTo: { type: String },
 updatedBy: { type: String },
 lastUpdated: { type: String }
 },
 { timestamps: true }
);

RootMailSchema.index({ email: 1 });
RootMailSchema.index({ batchId: 1, batchName: 1 });
RootMailSchema.index({ assigneeId: 1 });
RootMailSchema.index({ status: 1 });
RootMailSchema.index({ workStatus: 1 });

if (mongoose.models.RootMail) {
 delete mongoose.models.RootMail;
}

export const RootMail: Model<IRootMail> = mongoose.model<IRootMail>("RootMail", RootMailSchema,"root_mails");
