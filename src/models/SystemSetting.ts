import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemSetting extends Document {
  brandName: string;
  openTime: string;
  closeTime: string;
  checkInTime: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema: Schema = new Schema(
  {
    brandName: { type: String, default: "AQ MEDIA" },
    openTime: { type: String, default: "08:00" },
    closeTime: { type: String, default: "18:00" },
    checkInTime: { type: String, default: "17:30" }
  },
  { timestamps: true }
);

if (mongoose.models.SystemSetting) {
  delete mongoose.models.SystemSetting;
}

export const SystemSetting: Model<ISystemSetting> =
  mongoose.models.SystemSetting ||
  mongoose.model<ISystemSetting>("SystemSetting", SystemSettingSchema, "system_settings");
