import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema({
  id: String,
  staffId: String,
  name: String,
  role: String,
  username: String,
  baseSalary: Number,
  allowance: Number,
  attendanceDays: Number,
  totalReceived: Number,
  timestamp: Date
}, { timestamps: true });

export const Payroll = mongoose.models.Payroll || mongoose.model("Payroll", payrollSchema);
