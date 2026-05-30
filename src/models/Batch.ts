import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBatch extends Document {
  name: string;
  type: "ROOT" | "SATELLITE" | "MONETIZED";
  importedAt: string;
  mailCount: number;
  totalMails?: number;
  importedBy: string;
  startIndex?: number;
  endIndex?: number;
  assignedTo?: string; // ID of the employee
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: ["ROOT", "SATELLITE", "MONETIZED"] },
    importedAt: { type: String, required: true },
    mailCount: { type: Number, default: 0 },
    totalMails: { type: Number, default: 0 },
    importedBy: { type: String, required: true },
    startIndex: { type: Number },
    endIndex: { type: Number },
    assignedTo: { type: String }
  },
  { timestamps: true }
);

if (mongoose.models.Batch) {
  delete mongoose.models.Batch;
}

export const Batch: Model<IBatch> = mongoose.models.Batch || mongoose.model<IBatch>("Batch", BatchSchema, "batches");

export default Batch;
