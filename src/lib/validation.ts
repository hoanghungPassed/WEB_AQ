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

// ==========================================
// USER VALIDATION SCHEMAS
// ==========================================

export const CreateUserSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscore, hyphen"),
  
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
  
  email: z.string()
    .email("Invalid email format")
    .or(z.literal(""))
    .optional(),
  
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  
  role: z.enum(["01", "02", "03", "04", "05"]),
  
  status: z.enum(["ACTIVE", "LOCKED", "PENDING"]).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  avatar: z.string().max(300).optional(),
  birthYear: z.string().max(4).optional(),
  checkInTime: z.string().max(20).optional(),
  checkOutTime: z.string().max(20).optional(),
  offWorkTime: z.string().max(20).optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  // Password is not strictly required when editing a profile
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters")
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
  message: "Invalid date format. Expected YYYY-MM-DD or valid ISO 8601 string."
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  type: z.enum(["MAIL_GOC", "MAIL_VE_TINH", "MAIL_MONETIZED"]),
  assigneeId: z.string().regex(/^[0-9a-f]{24}$/, "Invalid assignee user ID"),
  deadline: TaskDateSchema,
  note: z.string().optional(),
  mailRange: z.string().optional(),
  batch: z.string().optional(),
  range: z.string().optional(),
  mailType: z.string().optional(),
  selectedMailIds: z.array(z.number()).optional(),
  assigneeName: z.string().optional(),
  mailCount: z.number().optional(),
  createdBy: z.string().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"]).optional(),
  progress: z.number().min(0).max(100).optional(),
});

// ==========================================
// FINE VALIDATION SCHEMAS
// ==========================================

export const CreateFineSchema = z.object({
  userId: z.string().regex(/^[0-9a-f]{24}$/, "Invalid user ID"),
  reason: z.string().min(1, "Reason is required").max(500, "Reason is too long"),
  amount: z.number().min(0, "Amount must be a positive number"),
  status: z.enum(["UNPAID", "PAID", "CANCELLED"]).optional(),
  lateMinutes: z.number().min(0).optional(),
  canAppeal: z.boolean().optional(),
  monthYear: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date string for monthYear"
  }).optional(),
});

export const UpdateFineSchema = z.object({
  status: z.enum(["UNPAID", "PAID", "CANCELLED"]),
  amount: z.number().min(0, "Amount must be positive").optional(),
});
