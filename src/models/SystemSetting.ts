import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemSetting extends Document {
  brandName: string;
  openTime: string;
  closeTime: string;
  checkInTime: string;
  breakStartTime: string;
  breakEndTime: string;
  rulesUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema: Schema = new Schema(
  {
    brandName: { type: String, default: "AQ MEDIA" },
    openTime: { type: String, default: "08:00" },
    closeTime: { type: String, default: "17:30" }, // Automatically calculated in API
    checkInTime: { type: String, default: "17:30" }, // System close time
    breakStartTime: { type: String, default: "12:00" },
    breakEndTime: { type: String, default: "13:30" },
    rulesUrl: { type: String, default: "" }
  },
  { timestamps: true }
);

if (mongoose.models.SystemSetting) {
  delete mongoose.models.SystemSetting;
}

export const SystemSetting: Model<ISystemSetting> =
  mongoose.models.SystemSetting ||
  mongoose.model<ISystemSetting>("SystemSetting", SystemSettingSchema, "system_settings");
