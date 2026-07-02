import { z } from "zod";

/**
 * XSS Helper to sanitize input string by escaping HTML characters
 * to prevent XSS injection attacks.
 */
export function sanitizeXSS(str: string): string {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Escapes regex special characters to prevent ReDoS attacks.
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==========================================
// USER VALIDATION SCHEMAS
// ==========================================

export const CreateUserSchema = z.object({
  username: z.string()
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
    .max(50, "Tên đăng nhập tối đa 50 ký tự")
    .regex(/^[a-zA-Z0-9_-]+$/, "Tên đăng nhập chỉ có thể chứa chữ cái, số, dấu gạch dưới, gạch ngang"),
  
  password: z.string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(100, "Mật khẩu tối đa 100 ký tự"),
  
  email: z.string()
    .email("Định dạng email không hợp lệ")
    .or(z.literal(""))
    .optional(),
  
  name: z.string()
    .min(1, "Tên không được để trống")
    .max(100, "Tên tối đa 100 ký tự"),
  
  role: z.enum(["01", "02", "03", "04", "05"]),
  
  status: z.enum(["ACTIVE", "LOCKED", "PENDING"]).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  avatar: z.string().max(300).optional(),
  birthYear: z.string().max(4).optional(),
  checkInTime: z.string().max(20).optional(),
  checkOutTime: z.string().max(20).optional(),
  offWorkTime: z.string().max(20).optional(),
  isLateLocked: z.boolean().optional(),
  finePaymentStatus: z.enum(["PENDING_APPROVAL", "APPROVED", "DENIED"]).or(z.null()).optional(),
  lateExcuseStatus: z.enum(["PENDING_APPROVAL", "APPROVED", "DENIED"]).or(z.null()).optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  // Password is not strictly required when editing a profile
  password: z.string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(100, "Mật khẩu tối đa 100 ký tự")
    .optional(),
});

// ==========================================
// TASK VALIDATION SCHEMAS
// ==========================================

// Supports YYYY-MM-DD or standard ISO 8601 Date
const TaskDateSchema = z.string().refine((val) => {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(val);
  const isValidISO = !isNaN(Date.parse(val));
  return isDateOnly || isValidISO;
}, {
  message: "Định dạng ngày không hợp lệ. Yêu cầu YYYY-MM-DD hoặc chuỗi ISO 8601."
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống").max(200, "Tiêu đề quá dài (tối đa 200 ký tự)"),
  type: z.enum(["MAIL_GOC", "MAIL_VE_TINH", "MAIL_MONETIZED"]),
  assigneeId: z.string().regex(/^[0-9a-f]{24}$/, "ID người nhận việc không hợp lệ"),
  deadline: TaskDateSchema,
  note: z.string().optional(),
  mailRange: z.string().optional(),
  batch: z.string().optional(),
  range: z.string().optional(),
  mailType: z.string().optional(),
  selectedMailIds: z.array(z.number()).optional(),
  mailIds: z.array(z.string()).optional(),
  assigneeName: z.string().optional(),
  mailCount: z.number().optional(),
  createdBy: z.string().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE", "CANCELLED"]).optional(),
  progress: z.number().min(0).max(100).optional(),
});

// ==========================================
// FINE VALIDATION SCHEMAS
// ==========================================

export const CreateFineSchema = z.object({
  userId: z.string().regex(/^[0-9a-f]{24}$/, "ID người dùng không hợp lệ"),
  reason: z.string().min(1, "Lý do không được để trống").max(500, "Lý do quá dài (tối đa 500 ký tự)"),
  amount: z.number().min(0, "Số tiền phải là số dương"),
  status: z.enum(["UNPAID", "PAID", "CANCELLED"]).optional(),
  lateMinutes: z.number().min(0).optional(),
  canAppeal: z.boolean().optional(),
  monthYear: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Chuỗi ngày tháng không hợp lệ cho monthYear"
  }).optional(),
});

export const UpdateFineSchema = z.object({
  status: z.enum(["UNPAID", "PAID", "CANCELLED"]),
  amount: z.number().min(0, "Số tiền phải là số dương").optional(),
});

// ==========================================
// NOTIFICATION VALIDATION SCHEMAS
// ==========================================

export const CreateNotificationSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống").max(200, "Tiêu đề tối đa 200 ký tự"),
  message: z.string().min(1, "Nội dung không được để trống").max(2000, "Nội dung tối đa 2000 ký tự"),
  type: z.string().max(50).optional().default("INFO"),
  link: z.string().max(500).optional(),
  recipientId: z.string().regex(/^[0-9a-f]{24}$/, "ID người nhận không hợp lệ").or(z.literal("")).optional(),
  imageUrl: z.string().max(500).optional(),
  targetRole: z.string().max(50).optional(),
  isPinned: z.boolean().optional(),
  isRead: z.boolean().optional(),
});

