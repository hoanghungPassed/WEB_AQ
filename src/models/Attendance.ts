import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId | string;
  username: string;
  name: string;
  date: string; // Format: YYYY-MM-DD
  checkInTime?: Date;
  checkOutTime?: Date;
  status: "Đúng giờ" | "Đi muộn" | "Vắng mặt";
  totalHours?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    name: { type: String, required: true },
    date: { type: String, required: true },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    status: { type: String, enum: ["Đúng giờ", "Đi muộn", "Vắng mặt"], default: "Đúng giờ" },
    totalHours: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Add UNIQUE index to prevent duplicates on concurrent logins
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1 });
AttendanceSchema.index({ userId: 1 });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema, "attendances");

export default Attendance;
