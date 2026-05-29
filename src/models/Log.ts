import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILog extends Document {
  user?: mongoose.Types.ObjectId | string;
  userId?: string;
  role?: string;
  action: string;
  type?: string;
  resource?: string;
  timestamp: Date;
  details?: string;
  changes?: any;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LogSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    userId: { type: String },
    role: { type: String },
    action: { type: String, required: true },
    type: { type: String },
    resource: { type: String },
    timestamp: { type: Date, default: Date.now },
    details: { type: String, default: "" },
    changes: { type: Schema.Types.Mixed },
    ipAddress: { type: String }
  },
  { timestamps: true }
);

if (mongoose.models.Log) {
  delete mongoose.models.Log;
}

export const Log: Model<ILog> = mongoose.models.Log || mongoose.model<ILog>("Log", LogSchema, "logs");
