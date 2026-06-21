import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFine extends Document {
  userId: mongoose.Types.ObjectId | string;
  reason: string;
  amount: number;
  status: "UNPAID" | "PAID" | "CANCELLED";
  lateMinutes?: number;
  canAppeal?: boolean;
  monthYear?: Date;
  createdAt: Date;
}

const FineSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['UNPAID', 'PAID', 'CANCELLED'], default: 'UNPAID' },
    lateMinutes: { type: Number },
    canAppeal: { type: Boolean, default: true },
    monthYear: { type: Date },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

FineSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const Fine: Model<IFine> =
  mongoose.models.Fine || mongoose.model<IFine>("Fine", FineSchema, "fines");
