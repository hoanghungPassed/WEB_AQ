import mongoose, { Schema, Document, Model } from"mongoose";

export interface IFine extends Document {
 userId: mongoose.Types.ObjectId | string;
 reason: string;
 amount: number;
 status:"UNPAID" |"PAID";
 createdAt: Date;
}

const FineSchema: Schema = new Schema(
 {
 userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
 reason: { type: String, required: true },
 amount: { type: Number, required: true },
 status: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },
 createdAt: { type: Date, default: Date.now }
 },
 { timestamps: true }
);

if (mongoose.models.Fine) {
 delete mongoose.models.Fine;
}

export const Fine: Model<IFine> = mongoose.models.Fine || mongoose.model<IFine>("Fine", FineSchema);
