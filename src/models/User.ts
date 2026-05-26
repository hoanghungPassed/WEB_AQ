import mongoose, { Schema, Document, Model } from"mongoose";

/**
 * IUser — Mongoose document interface
 * Mirrors the StaffData type in src/types/admin.ts
 */
export interface IUser extends Document {
 name: string;
 username: string;
 email: string;
 password: string;
 role:"01" |"02" |"03" |"04" |"05";
 status:"ACTIVE" |"LOCKED" |"PENDING";
 isOnline: boolean;
 taskCount: number;
 kpiProgress: number;
 avatar?: string;
 lastActive?: Date;
 birthYear?: string;
 phone?: string;
 address?: string;
 checkInTime?: string;
 checkOutTime?: string;
 offWorkTime?: string;
}

const userSchema = new Schema<IUser>(
 {
 name: {
 type: String,
 required: [true,"Tên nhân viên là bắt buộc"],
 trim: true,
 },
 username: {
 type: String,
 required: [true,"Username là bắt buộc"],
 unique: true,
 trim: true,
 lowercase: true,
 },
 email: {
 type: String,
 default:"",
 trim: true,
 },
 password: {
 type: String,
 required: [true,"Mật khẩu là bắt buộc"],
 },
 role: {
 type: String,
 enum: ["01","02","03","04","05"],
 default:"05",
 },
 status: {
 type: String,
 enum: ["ACTIVE","LOCKED","PENDING"],
 default:"PENDING",
 },
 isOnline: {
 type: Boolean,
 default: false,
 },
 taskCount: {
 type: Number,
 default: 0,
 },
 kpiProgress: {
 type: Number,
 default: 0,
 },
 avatar: {
 type: String,
 default:"",
 },
 lastActive: {
 type: Date,
 default: Date.now,
 },
 birthYear: {
 type: String,
 default:"",
 },
 phone: {
 type: String,
 default:"",
 },
 address: {
 type: String,
 default:"",
 },
 checkInTime: {
 type: String,
 default:"",
 },
 checkOutTime: {
 type: String,
 default:"",
 },
 offWorkTime: {
 type: String,
 default:"17:30", // Mặc định là 17:30
 },
 },
 {
 timestamps: true, // Tự động thêm createdAt & updatedAt
 toJSON: {
 virtuals: true,
 transform(_doc: any, ret: any) {
 ret.id = ret._id.toString();
 delete ret.__v;
 },
 },
 toObject: {
 virtuals: true,
 transform(_doc: any, ret: any) {
 ret.id = ret._id.toString();
 delete ret.__v;
 },
 },
 }
);

/**
 * Sử dụng cơ chế check model tồn tại để tránh lỗi
 * OverwriteModelError khi Next.js Hot Reload re-evaluate module.
 */
export const User: Model<IUser> =
 mongoose.models.User || mongoose.model<IUser>("User", userSchema,"users");

export default User;
