import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayroll extends Document {
  userId: mongoose.Types.ObjectId | string;
  staffId: string;
  name: string;
  username: string;
  role: string;
  month: string; // Format: "YYYY-MM"

  // Gross Pay components
  baseSalary: number;
  allowance: number;
  overtimePay: number;
  bonus: number;

  // Attendance
  attendanceDays: number;
  workingDays: number; // Total working days in the month (default 26)

  // Deduction components
  fines: number;
  tax: number;
  insurance: number;

  // Computed totals
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  totalReceived: number; // Backward compatibility alias for netPay

  // Status & Metadata
  status: "DRAFT" | "PENDING" | "APPROVED" | "PAID";
  approvedBy?: mongoose.Types.ObjectId | string;
  approvedAt?: Date;
  notes?: string;

  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    staffId: { type: String },
    name: { type: String, required: true },
    username: { type: String },
    role: { type: String },
    month: { type: String, required: true }, // "YYYY-MM"

    // Gross Pay components
    baseSalary: { type: Number, default: 0 },
    allowance: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },

    // Attendance
    attendanceDays: { type: Number, default: 0 },
    workingDays: { type: Number, default: 26 },

    // Deduction components
    fines: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },

    // Computed totals
    grossPay: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    totalReceived: { type: Number, default: 0 },

    // Status
    status: { type: String, enum: ["DRAFT", "PENDING", "APPROVED", "PAID"], default: "DRAFT" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    notes: { type: String },

    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

PayrollSchema.index({ userId: 1, month: 1 }, { unique: true });
PayrollSchema.index({ month: 1 });
PayrollSchema.index({ status: 1 });

if (mongoose.models.Payroll) {
  delete mongoose.models.Payroll;
}

export const Payroll: Model<IPayroll> =
  mongoose.models.Payroll || mongoose.model<IPayroll>("Payroll", PayrollSchema, "payrolls");
