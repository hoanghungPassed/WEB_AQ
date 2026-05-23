import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKpi extends Document {
  userId?: mongoose.Types.ObjectId | string;
  date?: Date;
  completedChannels?: number;
  target?: number;
  createdAt: Date;
  updatedAt: Date;
}

const KpiSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date },
    completedChannels: { type: Number, default: 0 },
    target: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Kpi: Model<IKpi> = mongoose.models.Kpi || mongoose.model<IKpi>("Kpi", KpiSchema);
