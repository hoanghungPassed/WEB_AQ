import mongoose, { Schema, Document, Model } from"mongoose";

export interface IPhone extends Document {
 number: string;
 otpLink?: string;
 status: string; //"Chưa làm" |"XM lần 1" |"XM lần 2" |"Lỗi"
 assigneeId?: mongoose.Types.ObjectId | string;
 assignedTo?: string;
 assignedAt?: string;
 importedAt?: string;
 importBatch?: string;
 createdAt: Date;
 updatedAt: Date;
}

const PhoneSchema: Schema = new Schema(
 {
 number: { type: String, required: true },
 otpLink: { type: String, default:"" },
 status: { type: String, default: 'Chưa làm' },
 assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
 assignedTo: { type: String },
 assignedAt: { type: String },
 importedAt: { type: String },
 importBatch: { type: String }
 },
 { timestamps: true }
);

if (mongoose.models.Phone) {
 delete mongoose.models.Phone;
}

export const Phone: Model<IPhone> = mongoose.model<IPhone>("Phone", PhoneSchema,"phones");
