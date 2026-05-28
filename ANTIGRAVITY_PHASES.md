# 🚀 ANTIGRAVITY FIX PHASES
## WEB_AQ Project - Prioritized Fixes for GitHub Issues

---

## 📌 HOW TO USE THIS

Copy each section below and create individual GitHub Issues on your repository.
Tag them with the phase number and priority level for tracking.

---

# PHASE 1: CRITICAL FIXES (THIS WEEK)
## Must fix before production deployment

---

## ❌ ISSUE #1: Login Business Hours - Wrong Timezone (GMT+7)
**Priority**: 🔴 CRITICAL  
**Type**: Bug  
**Labels**: `critical`, `auth`, `timezone`, `business-logic`  
**Estimated Time**: 2 hours

### Problem
The login endpoint uses client-side local time instead of consistent GMT+7 timezone (Vietnam time). This causes:
- Staff can login outside business hours on different timezones
- Inconsistent behavior across different user locations
- Mismatch with middleware timezone checks

### Current Code (WRONG)
```typescript
// src/app/api/auth/login/route.ts Line 79-89
const now = new Date();
const currentMins = now.getHours() * 60 + now.getMinutes();
const isStaff = user.role === "03" || user.role === "04" || user.role === "05";

if (isStaff && currentMins >= 1080) { // 1080 = 18:00
  return NextResponse.json(
    { error: "Đã quá giờ làm việc (18:00). Bạn không thể đăng nhập." },
    { status: 403 }
  );
}
```

### Required Fix
```typescript
// Use GMT+7 consistently like the attendance check does
const utc = now.getTime() + now.getTimezoneOffset() * 60000;
const vnTime = new Date(utc + 3600000 * 7); // Vietnam GMT+7
const currentMins = vnTime.getHours() * 60 + vnTime.getMinutes();

// Get actual business hours from SystemSetting
const settings = await SystemSetting.findOne();
const closeTime = settings?.closeTime || "18:00";
const [closeHour, closeMinute] = closeTime.split(":").map(Number);
const closeMins = closeHour * 60 + closeMinute;

// Only prevent login if well past close time
const isStaff = user.role === "03" || user.role === "04" || user.role === "05";
if (isStaff && currentMins > closeMins + 30) {
  return NextResponse.json(
    { error: "Hệ thống đã đóng cửa. Vui lòng quay lại vào giờ làm việc." },
    { status: 403 }
  );
}
```

### Acceptance Criteria
- [ ] Uses GMT+7 timezone consistently
- [ ] Respects SystemSetting for business hours
- [ ] Provides 30-min grace period after close time
- [ ] Admin (role 01, 02) can always login
- [ ] Unit tests pass

---

## ❌ ISSUE #2: Fine Amount Calculation - Logic Inverted
**Priority**: 🔴 CRITICAL  
**Type**: Bug  
**Labels**: `critical`, `fine`, `business-logic`, `payroll`  
**Estimated Time**: 1 hour

### Problem
The late fine calculation is INVERTED:
- Late 1 minute = 10,000 VND (wrong - should be less)
- Late 10 minutes = 20,000 VND
- Late 30 minutes = 50,000 VND (correct)

Expected: Later = higher fine

### Current Code (WRONG)
```typescript
// src/app/api/auth/login/route.ts Line 164-172
const lateMinutes = currentTotalMins - limitTotalMins;
let fineAmount = 20000; // Default 20k
if (lateMinutes < 5) {
  fineAmount = 10000;  // ❌ WRONG: less time = lower fine
} else if (lateMinutes <= 20) {
  fineAmount = 20000;
} else {
  fineAmount = 50000;
}
```

### Required Fix
```typescript
const lateMinutes = currentTotalMins - limitTotalMins;

// Count previous fines this month for cumulative penalty
const thisMonth = new Date();
const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
const previousFinesCount = await Fine.countDocuments({
  userId: user._id,
  createdAt: { $gte: monthStart },
  status: { $ne: "CANCELLED" }
});

// Correct scale: More late = higher fine
let fineAmount = 10000;
if (lateMinutes > 20) {
  fineAmount = 50000;
} else if (lateMinutes > 5) {
  fineAmount = 20000;
}

// Cumulative multiplier: 2x if already have 3+ fines
if (previousFinesCount >= 3) {
  fineAmount *= 2;
}

const fine = await Fine.create({
  userId: user._id,
  reason: `Đi muộn ${lateMinutes} phút (${timeString}, qui định ${checkInLimitStr})`,
  amount: fineAmount,
  status: "UNPAID",
  lateMinutes,
  canAppeal: true,
  monthYear: monthStart
});
```

### Acceptance Criteria
- [ ] 1-5 mins late = 10,000 VND
- [ ] 5-20 mins late = 20,000 VND
- [ ] 20+ mins late = 50,000 VND
- [ ] Cumulative: 3+ fines in month = 2x multiplier
- [ ] Store lateMinutes field in database
- [ ] Unit tests verify all scenarios

---

## ❌ ISSUE #3: Attendance Duplicate Check-in - Race Condition
**Priority**: 🔴 CRITICAL  
**Type**: Bug  
**Labels**: `critical`, `database`, `attendance`, `concurrency`  
**Estimated Time**: 3 hours

### Problem
Multiple simultaneous login attempts create duplicate attendance records:
1. Two identical login requests hit server at same time
2. Both check: "attendance exists?" → No
3. Both create new attendance record
4. Result: 2 records for same user/date

Also: Inconsistent date format (Date object vs string)

### Current Code (WRONG)
```typescript
// src/app/api/auth/login/route.ts Line 114-146
let attendance = await Attendance.findOne({
  userId: user._id,
  $or: [
    { date: { $gte: startOfDay, $lte: endOfDay } as any },
    { date: todayStr }
  ]
} as any);

if (!attendance) {
  // ❌ No atomicity - race condition!
  attendance = await Attendance.create({
    userId: user._id,
    username: user.username,
    name: user.name,
    date: todayStr,
    checkInTime: now,
    status,
  });
}
```

### Required Fix
**Step 1**: Update Attendance model
```typescript
// src/models/Attendance.ts
const AttendanceSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  name: { type: String, required: true },
  date: { type: String, required: true },  // YYYY-MM-DD format
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  status: { type: String, enum: ["Đúng giờ", "Đi muộn", "Vắng mặt"], default: "Đúng giờ" },
  totalHours: { type: Number, default: 0 }
}, { timestamps: true });

// Add UNIQUE index to prevent duplicates
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
```

**Step 2**: Update login API with atomic operation
```typescript
// src/app/api/auth/login/route.ts
const todayStr = `${yyyy}-${mm}-${dd}`;

let attendance = await Attendance.findOne({
  userId: user._id,
  date: todayStr
});

if (!attendance) {
  try {
    // Atomic create with unique constraint
    attendance = await Attendance.create({
      userId: user._id,
      username: user.username,
      name: user.name,
      date: todayStr,
      checkInTime: now,
      status: isLate ? "Đi muộn" : "Đúng giờ",
    });
  } catch (e: any) {
    // Handle duplicate key error from race condition
    if (e.code === 11000) {
      attendance = await Attendance.findOne({
        userId: user._id,
        date: todayStr
      });
    } else {
      throw e;
    }
  }
}
```

### Acceptance Criteria
- [ ] Add unique index: {userId, date}
- [ ] Use atomic create-or-find pattern
- [ ] Handle duplicate key error (E11000)
- [ ] Date format consistent (string YYYY-MM-DD)
- [ ] No duplicate records on concurrent logins
- [ ] Integration tests verify race condition fixed

---

## ❌ ISSUE #4: Role-Based Permission - Only Enforced at UI
**Priority**: 🔴 CRITICAL  
**Type**: Security  
**Labels**: `critical`, `security`, `authorization`, `permission`  
**Estimated Time**: 4 hours

### Problem
Permission checks only exist in middleware and frontend UI.
An attacker can:
1. Call API endpoint directly with curl
2. Frontend permissions don't apply
3. No API-level authorization check
4. Example: Staff can POST to `/api/admin/reset-db`

### Current Code (WRONG)
```typescript
// src/proxy.ts - Only middleware check exists
if (!isAdmin && path.includes("/api/admin/reset-db")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ❌ But API route doesn't check!
// src/app/api/admin/reset-db/route.ts
export async function POST(req: NextRequest) {
  // No permission check - attacker can reach here
  const result = await resetDatabase();
  return NextResponse.json(result);
}
```

### Required Fix
**Step 1**: Create permission utility
```typescript
// src/lib/permissions.ts
export const ROLE_HIERARCHY = {
  "01": { name: "Admin", level: 5, canAccess: ["all"] },
  "02": { name: "Manager", level: 4, canAccess: ["tasks", "attendance", "staff", "reports"] },
  "03": { name: "Team Lead", level: 3, canAccess: ["tasks", "attendance", "team_tasks"] },
  "04": { name: "Senior Staff", level: 2, canAccess: ["tasks", "attendance"] },
  "05": { name: "Junior Staff", level: 1, canAccess: ["tasks"] },
};

export async function checkPermission(
  userRole: string,
  requiredLevel: number,
  requiredAccess: string[]
): Promise<boolean> {
  const roleInfo = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY];
  
  if (!roleInfo) return false;
  if (roleInfo.level < requiredLevel) return false;
  
  return requiredAccess.some(access => 
    roleInfo.canAccess.includes("all") || 
    roleInfo.canAccess.includes(access)
  );
}

export async function logAuditTrail(
  userId: string,
  action: string,
  resource: string,
  changes: object,
  request: NextRequest
) {
  const Log = (await import("@/models/Log")).Log;
  await Log.create({
    userId,
    action,
    resource,
    changes,
    timestamp: new Date(),
    ipAddress: request.headers.get("x-forwarded-for") || "unknown"
  });
}
```

**Step 2**: Add permission check to each API
```typescript
// Example: src/app/api/admin/reset-db/route.ts
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const userRole = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id");

  // Check: Admin role (level 5) required for "admin:reset"
  const hasPermission = await checkPermission(userRole || "", 5, ["all"]);

  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_RESET_DB", "database", {}, req);
    return NextResponse.json(
      { error: "Không có quyền thực hiện thao tác này" },
      { status: 403 }
    );
  }

  try {
    // Perform reset
    const result = await resetDatabase();
    
    // Log successful operation
    await logAuditTrail(userId || "system", "RESET_DB_SUCCESS", "database", result, req);
    
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    await logAuditTrail(userId || "system", "RESET_DB_ERROR", "database", 
      { error: error.message }, req);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 3**: Apply to all sensitive endpoints
```typescript
// Template for all admin APIs
export async function POST(req: NextRequest) {
  const userRole = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id");

  // Adjust level and access based on endpoint
  if (!await checkPermission(userRole || "", 4, ["users", "admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Process request...
}
```

### Acceptance Criteria
- [ ] Role hierarchy defined in permissions.ts
- [ ] Every admin API checks permission
- [ ] All operations logged to audit trail
- [ ] Cannot bypass with direct API calls
- [ ] 403 returned for unauthorized access
- [ ] Integration tests verify enforcement

---

## ❌ ISSUE #5: Password in Frontend Responses
**Priority**: 🔴 CRITICAL  
**Type**: Security  
**Labels**: `critical`, `security`, `password`  
**Estimated Time**: 1 hour

### Problem
`src/types/admin.ts` defines StaffData with `password?: string`
This means:
- Passwords might be sent to frontend
- Type suggests password is expected in responses
- Potential information leak

### Current Code (WRONG)
```typescript
// src/types/admin.ts Line 16
export interface StaffData {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;  // ❌ Should NEVER be here!
  role?: "01" | "02" | "03" | "04" | "05";
  status: "ACTIVE" | "LOCKED" | "PENDING";
  isOnline: boolean;
  // ... other fields
}
```

### Required Fix
**Step 1**: Remove from type definition
```typescript
// src/types/admin.ts
export interface StaffData {
  id: string;
  name: string;
  username: string;
  email: string;
  // ✓ No password field
  role?: "01" | "02" | "03" | "04" | "05";
  status: "ACTIVE" | "LOCKED" | "PENDING";
  isOnline: boolean;
  taskCount: number;
  kpiProgress: number;
  avatar?: string;
  lastActive?: string;
  birthYear?: string;
  phone?: string;
  address?: string;
  checkInTime?: string;
  createdAt?: string;
}
```

**Step 2**: Verify all API responses strip password
```typescript
// src/app/api/auth/login/route.ts
const userObj = user.toObject() as any;
delete userObj.password;  // ✓ Already done in login
userObj.id = userObj._id.toString();

const response = NextResponse.json({
  message: "Đăng nhập thành công",
  user: userObj,
});
```

**Step 3**: Verify all user-list APIs strip password
```typescript
// src/app/api/admin/users/route.ts
export async function GET(req: NextRequest) {
  const users = await User.find({ status: "ACTIVE" })
    .select("-password");  // ✓ Exclude password from query
  
  return NextResponse.json({
    success: true,
    data: users.map(u => {
      const obj = u.toObject();
      delete obj.password;  // Double-check
      return obj;
    })
  });
}
```

### Acceptance Criteria
- [ ] Remove password from StaffData interface
- [ ] All API responses use .select("-password")
- [ ] Login response doesn't include password
- [ ] User list endpoint doesn't include password
- [ ] Verify with network tab in browser DevTools

---

## ❌ ISSUE #6: No Database Indexes - Performance Issue
**Priority**: 🔴 CRITICAL  
**Type**: Performance  
**Labels**: `critical`, `database`, `performance`, `indexes`  
**Estimated Time**: 2 hours

### Problem
Database queries are SLOW because missing indexes:
- Finding attendance by userId → Full table scan
- Finding user by username → Full table scan
- Listing tasks by assignee → Full table scan
- As data grows, system becomes unusable

### Current Models (MISSING INDEXES)
```typescript
// src/models/User.ts - No username index!
const userSchema = new Schema({ username: String });

// src/models/Attendance.ts - No query index!
const attendanceSchema = new Schema({ 
  userId: Schema.Types.ObjectId,
  date: String 
});

// src/models/Task.ts - No performance indexes!
const taskSchema = new Schema({ 
  assigneeId: Schema.Types.ObjectId,
  status: String 
});
```

### Required Fix
Add indexes to all models:

```typescript
// src/models/User.ts
const userSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, sparse: true },
  role: String,
  // ... other fields
}, { timestamps: true });

// Add these indexes
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { sparse: true, unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isOnline: 1 });

export const User = mongoose.model("User", userSchema);
```

```typescript
// src/models/Attendance.ts
const attendanceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true },
  checkInTime: Date,
  // ... other fields
}, { timestamps: true });

// Add these indexes
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ userId: 1 });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
```

```typescript
// src/models/Task.ts
const taskSchema = new Schema({
  assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
  status: String,
  deadline: String,
  // ... other fields
}, { timestamps: true });

// Add these indexes
taskSchema.index({ assigneeId: 1, status: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ assigneeId: 1 });

export const Task = mongoose.model("Task", taskSchema);
```

```typescript
// src/models/Fine.ts
const fineSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: String,
  createdAt: Date,
  // ... other fields
}, { timestamps: true });

// Add indexes
fineSchema.index({ userId: 1, createdAt: -1 });
fineSchema.index({ status: 1 });
fineSchema.index({ userId: 1 });
fineSchema.index({ createdAt: -1 });

export const Fine = mongoose.model("Fine", fineSchema);
```

### Database Migration
```bash
# Run this after code changes
npm run db:migrate

# Or manually in MongoDB shell:
use web_aq
db.users.createIndex({ "username": 1 }, { unique: true })
db.users.createIndex({ "email": 1 }, { unique: true, sparse: true })
db.attendances.createIndex({ "userId": 1, "date": 1 }, { unique: true })
db.tasks.createIndex({ "assigneeId": 1, "status": 1 })
db.fines.createIndex({ "userId": 1, "createdAt": -1 })
```

### Acceptance Criteria
- [ ] All indexes created in database
- [ ] Query performance improved (test with large dataset)
- [ ] No duplicate usernames possible (unique index)
- [ ] No duplicate attendance per day (unique index)
- [ ] Pagination queries respond in <100ms

---

# PHASE 2: HIGH PRIORITY FIXES (NEXT SPRINT)
## Important for functionality, implement after Phase 1

---

## ❌ ISSUE #7: Missing Pagination & Filtering on List APIs
**Priority**: 🟠 HIGH  
**Type**: Feature  
**Labels**: `high`, `api`, `pagination`, `ux`  
**Estimated Time**: 4 hours

### Problem
List endpoints return ALL records at once:
```typescript
// ❌ Bad
GET /api/admin/tasks → returns 10,000 records at once
GET /api/admin/mails → returns 100,000 records
GET /api/admin/users → returns 5,000 records
```

Results in:
- Slow network response
- Memory leak on frontend
- UI freezes when rendering
- Bad UX

### Required Implementation

**Step 1**: Create pagination utility
```typescript
// src/lib/pagination.ts
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filter?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function paginate<T>(
  query: any,
  page: number = 1,
  limit: number = 10,
  sortBy: string = "createdAt",
  sortOrder: "asc" | "desc" = "desc"
): Promise<PaginatedResponse<T>> {
  const skip = (page - 1) * limit;
  
  const [data, total] = await Promise.all([
    query.skip(skip).limit(limit).sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).lean(),
    query.model.countDocuments(query.getFilter())
  ]);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}
```

**Step 2**: Update GET /api/admin/tasks
```typescript
// src/app/api/admin/tasks/route.ts
export async function GET(req: NextRequest) {
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
  const status = req.nextUrl.searchParams.get("status");
  const assigneeId = req.nextUrl.searchParams.get("assigneeId");
  const sortBy = req.nextUrl.searchParams.get("sortBy") || "createdAt";
  const sortOrder = (req.nextUrl.searchParams.get("sortOrder") || "desc") as "asc" | "desc";

  const filter: any = {};
  if (status) filter.status = status;
  if (assigneeId) filter.assigneeId = assigneeId;

  const query = Task.find(filter);
  const result = await paginate(query, page, limit, sortBy, sortOrder);

  return NextResponse.json(result);
}
```

Usage:
```bash
GET /api/admin/tasks?page=1&limit=20
GET /api/admin/tasks?status=COMPLETED&page=1
GET /api/admin/tasks?assigneeId=123&sortBy=deadline&sortOrder=asc
```

### Acceptance Criteria
- [ ] All list endpoints support pagination
- [ ] page & limit parameters work
- [ ] sortBy & sortOrder parameters work
- [ ] Filter parameters work (status, assignee, etc)
- [ ] Response includes pagination metadata
- [ ] Frontend uses pagination in UI

---

## ❌ ISSUE #8: No Input Validation
**Priority**: 🟠 HIGH  
**Type**: Security  
**Labels**: `high`, `security`, `validation`  
**Estimated Time**: 5 hours

### Problem
APIs accept any input without validation:
```typescript
// ❌ Bad
const { username, password } = body;
if (!username || !password) return 400;  // Only checks empty!
// No validation of format, length, special chars, SQL injection, etc
```

### Required Implementation
Install Zod:
```bash
npm install zod
```

Create validation schemas:
```typescript
// src/lib/validation.ts
import { z } from "zod";

// User validation
export const CreateUserSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscore, hyphen"),
  
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
  
  email: z.string().email("Invalid email format"),
  
  name: z.string().min(1).max(100),
  
  role: z.enum(["01", "02", "03", "04", "05"]),
});

// Task validation
export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["MAIL_GOC", "MAIL_VE_TINH", "MAIL_MONETIZED"]),
  assigneeId: z.string().regex(/^[0-9a-f]{24}$/, "Invalid user ID"),
  deadline: z.string().datetime(),
  note: z.string().optional(),
});

// Fine validation
export const UpdateFineSchema = z.object({
  status: z.enum(["UNPAID", "PAID", "CANCELLED", "APPEALED"]),
  paidOn: z.string().datetime().optional(),
  paidVia: z.enum(["TRANSFER", "CASH", "DEDUCTION"]).optional(),
});
```

Use in API:
```typescript
// src/app/api/admin/users/route.ts
import { CreateUserSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // Validate input
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { 
        error: "Validation failed",
        details: parsed.error.errors.map(e => ({
          field: e.path.join("."),
          message: e.message
        }))
      },
      { status: 400 }
    );
  }

  // Use validated data
  const { username, password, email, name, role } = parsed.data;
  
  // Check username not taken
  const existing = await User.findOne({ username });
  if (existing) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 }
    );
  }

  // Create user...
}
```

### Acceptance Criteria
- [ ] All endpoints validate input with Zod
- [ ] Invalid input returns 400 with clear error
- [ ] Error details show which field failed
- [ ] SQL injection prevention works
- [ ] XSS prevention works
- [ ] Type-safe validated data used in code

---

## ❌ ISSUE #9: Create CRUD API for Users
**Priority**: 🟠 HIGH  
**Type**: Feature  
**Labels**: `high`, `api`, `users`  
**Estimated Time**: 4 hours

### Missing Endpoints
```
POST   /api/admin/users          → Create user
GET    /api/admin/users/:id      → Get single user
PATCH  /api/admin/users/:id      → Update user
DELETE /api/admin/users/:id      → Delete (archive) user
POST   /api/admin/users/:id/lock → Lock/unlock user
GET    /api/admin/users/activity → User activity history
```

### Implementation
Create file: `src/app/api/admin/users/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { UpdateUserSchema } from "@/lib/validation";

// GET single user
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  
  const user = await User.findById(params.id).select("-password");
  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: user });
}

// PATCH update user
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  
  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.errors },
      { status: 400 }
    );
  }

  const user = await User.findByIdAndUpdate(
    params.id,
    parsed.data,
    { new: true }
  ).select("-password");

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: user });
}

// DELETE user (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  
  const user = await User.findByIdAndUpdate(
    params.id,
    { status: "LOCKED", deletedAt: new Date() },
    { new: true }
  );

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ 
    success: true,
    message: "User archived successfully" 
  });
}
```

---

## ❌ ISSUE #10: Task Model - Remove Duplicate Fields
**Priority**: 🟠 HIGH  
**Type**: Database  
**Labels**: `high`, `database`, `schema`  
**Estimated Time**: 2 hours

### Problem
Task model has duplicate fields (id vs _id, title vs taskName, etc)

### Current (WRONG)
```typescript
interface ITask {
  id?: string;           // Duplicate
  title?: string;
  taskName?: string;     // Duplicate of title
  assigneeName?: string; // Should populate from User
  assignee?: string;     // Duplicate
  batch?: string;        // Duplicate
  range?: string;        // Duplicate of mailRange
}
```

### Required Fix
```typescript
// src/models/Task.ts
interface ITask extends Document {
  title: string;
  type: "MAIL_GOC" | "MAIL_VE_TINH" | "MAIL_MONETIZED";
  assigneeId: mongoose.Types.ObjectId;
  progress: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  deadline: Date;
  mailCount: number;
  note: string;
  batchName: string;
  mailRange: string;
  mailIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

# PHASE 3: MEDIUM PRIORITY (FOLLOWING SPRINTS)

---

## ❌ ISSUE #11: Payroll Calculation API
**Priority**: 🟡 MEDIUM  
**Type**: Feature  
**Labels**: `medium`, `api`, `payroll`, `calculation`  
**Estimated Time**: 5 hours

### Missing API
```
POST /api/admin/payroll/calculate → Calculate monthly payroll
GET  /api/admin/payroll/:month    → Get payroll for month
PUT  /api/admin/payroll/:id       → Approve payroll
```

### Calculation Logic
```typescript
Gross Pay = BaseSalary + Allowance + OvertimePay + Bonus
Deductions = Fines + Tax + Insurance
Net Pay = Gross - Deductions
```

---

## ❌ ISSUE #12: Auto Checkout Job
**Priority**: 🟡 MEDIUM  
**Type**: Feature  
**Labels**: `medium`, `job`, `attendance`  
**Estimated Time**: 3 hours

### Problem
Staff forgets to checkout → No working hours recorded

### Solution
Scheduled job runs daily at 18:30:
```typescript
// Automatically checkout staff who are still online
async function autoCheckOut() {
  const staffOnline = await User.find({
    isOnline: true,
    role: { $in: ["03", "04", "05"] }
  });

  for (const staff of staffOnline) {
    const attendance = await Attendance.findOne({
      userId: staff._id,
      date: todayStr,
      checkOutTime: null
    });

    if (attendance) {
      attendance.checkOutTime = new Date();
      attendance.totalHours = calculateHours(
        attendance.checkInTime,
        attendance.checkOutTime
      );
      await attendance.save();

      // Notify staff
      await Notification.create({
        userId: staff._id,
        message: "Bạn đã được tự động checkout",
      });
    }
  }
}
```

---

## ❌ ISSUE #13: Mail Bulk Import API
**Priority**: 🟡 MEDIUM  
**Type**: Feature  
**Labels**: `medium`, `api`, `import`, `csv`  
**Estimated Time**: 4 hours

### Missing API
```
POST /api/admin/mails/import → Import mails from CSV
```

### Features
- Upload CSV file
- Validate each row
- Detect duplicates
- Batch insert
- Return import report

---

## ❌ ISSUE #14: Email Notifications
**Priority**: 🟡 MEDIUM  
**Type**: Feature  
**Labels**: `medium`, `email`, `notification`  
**Estimated Time**: 4 hours

### Install
```bash
npm install nodemailer dotenv
```

### Send emails when:
- Fine created
- Task assigned
- Mail assigned
- Password reset requested
- Report generated

---

## ❌ ISSUE #15: Audit Logging
**Priority**: 🟡 MEDIUM  
**Type**: Feature  
**Labels**: `medium`, `logging`, `security`  
**Estimated Time**: 3 hours

### Log all sensitive operations:
- User login/logout
- Password change
- User created/deleted
- Fine created/updated
- Mail assigned
- Task completed

---

# PHASE 4: NICE TO HAVE (FUTURE)

---

## ❌ ISSUE #16: Report Generation (PDF/Excel)
**Priority**: 🟢 LOW  
**Labels**: `low`, `reports`, `export`  
**Estimated Time**: 6 hours

---

## ❌ ISSUE #17: Staff Online Status Cleanup
**Priority**: 🟢 LOW  
**Labels**: `low`, `job`, `cleanup`  
**Estimated Time**: 2 hours

---

## ❌ ISSUE #18: 2FA Backend Implementation
**Priority**: 🟢 LOW  
**Labels**: `low`, `2fa`, `security`  
**Estimated Time**: 4 hours

---

---

# 📊 SUMMARY TABLE

| Phase | Priority | Issues | Estimated Hours | Total |
|-------|----------|--------|-----------------|-------|
| **1** | 🔴 Critical | 6 | 2+1+3+4+1+2 | **13 hours** |
| **2** | 🟠 High | 5 | 4+5+4+2+? | **15+ hours** |
| **3** | 🟡 Medium | 5 | 5+3+4+4+3 | **19 hours** |
| **4** | 🟢 Low | 3 | 6+2+4 | **12 hours** |
| **TOTAL** | - | **19** | - | **59+ hours** |

---

# ⏱️ RECOMMENDED TIMELINE

```
Week 1-2: Phase 1 (Critical) - 13 hours
  - Mon-Tue: Issues #1-3 (Timezone, Fine calc, Attendance)
  - Wed-Thu: Issues #4-5 (Permissions, Password)
  - Fri: Issue #6 (Indexes) + Testing

Week 3-4: Phase 2 (High) - 15+ hours
  - Mon-Tue: Issue #7 (Pagination)
  - Wed: Issue #8 (Validation)
  - Thu-Fri: Issue #9 (User CRUD)

Week 5-6: Phase 3 (Medium) - 19 hours
  - Payroll, Auto-checkout, Bulk import, Email, Logging

Week 7+: Phase 4 (Nice to have) - As time permits
```

---

# 🎯 HOW TO USE

1. Create GitHub Issues with these descriptions
2. Assign to team members
3. Link to pull requests as they're fixed
4. Move through phases sequentially
5. Update issue status as you progress

Example issue creation in GitHub:
```
Title: Login Business Hours - Wrong Timezone (GMT+7)
Description: [Copy ISSUE #1 section]
Labels: critical, auth, timezone, business-logic
Milestone: Phase 1
Assignee: [Team member]
```

