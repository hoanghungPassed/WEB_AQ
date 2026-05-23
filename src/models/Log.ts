import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILog extends Document {
  user: mongoose.Types.ObjectId | string;
  role: string;
  action: string;
  type: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LogSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

if (mongoose.models.Log) {
  delete mongoose.models.Log;
}

export const Log: Model<ILog> = mongoose.model<ILog>("Log", LogSchema, "logs");
