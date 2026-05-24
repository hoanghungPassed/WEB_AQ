import mongoose, { Schema, Document, Model } from"mongoose";

export interface IMonetizedMail extends Document {
 stt?: number;
 email: string;
 password?: string;
 recoveryMail?: string;
 twoFA?: string;
 phone?: string;
 phoneLink?: string;
 status: string;
 type: string; //"MONETIZED"
 workStatus?: string;
 batch?: string;
 batchName?: string;
 batchId?: string;
 assignee?: mongoose.Types.ObjectId | string;
 assigneeId?: string;
 assignedTo?: string;
 updatedBy?: string;
 lastUpdated?: string;
 reClickDate?: string;
 step2PendingDate?: string;
 channelStatusDetail?: string;
 createdAt: Date;
 updatedAt: Date;
}

const MonetizedMailSchema: Schema = new Schema(
 {
 stt: { type: Number, default: 0 },
 email: { type: String, required: true },
 password: { type: String, default:"" },
 recoveryMail: { type: String, default:"" },
 twoFA: { type: String, default:"" },
 phone: { type: String, default:"" },
 phoneLink: { type: String, default:"" },
 status: { type: String, default: 'LIVE' },
 type: { type: String, default: 'MONETIZED' },
 workStatus: { type: String },
 batch: { type: String },
 batchName: { type: String },
 batchId: { type: String },
 assignee: { type: Schema.Types.ObjectId, ref: 'User' },
 assigneeId: { type: String },
 assignedTo: { type: String },
 updatedBy: { type: String },
 lastUpdated: { type: String },
 reClickDate: { type: String },
 step2PendingDate: { type: String },
 channelStatusDetail: { type: String }
 },
 { timestamps: true }
);

if (mongoose.models.MonetizedMail) {
 delete mongoose.models.MonetizedMail;
}

export const MonetizedMail: Model<IMonetizedMail> = mongoose.model<IMonetizedMail>("MonetizedMail", MonetizedMailSchema,"monetized_mails");
