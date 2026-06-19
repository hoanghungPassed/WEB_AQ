# Technical API Audit Report: WEB_AQ Platform

This document presents a comprehensive, high-rigidity security and performance audit of the Next.js 16 + React 19 + MongoDB API backend and its matching frontend client calls for the `WEB_AQ` project.

---

## 1. Executive Summary

A full static analysis and manual verification of the codebase has revealed a set of critical security bypasses and performance bottlenecks. The most significant finding is the **complete bypass of all authentication and authorization checks** because the Next.js routing middleware is misnamed as `src/proxy.ts` instead of `src/middleware.ts`. This allows any client to make direct, unauthenticated HTTP requests to sensitive administrator endpoints (such as payroll calculation, DB resetting, and user status modifications).

Additionally, multiple Mongoose performance anti-patterns (missing `.lean()` and `.select()` projections) and pagination issues threaten database stability as collections scale.

---

## 2. API Discovery & Mapping

### 2.1 Discovered Backend API Routes (60 Routes)
The following is the complete list of endpoint handlers discovered under `src/app/api/`:

| Path | File Location |
| :--- | :--- |
| `/api/admin/2fa/login` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/2fa/login/route.ts) |
| `/api/admin/2fa/setup` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/2fa/setup/route.ts) |
| `/api/admin/2fa/verify` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/2fa/verify/route.ts) |
| `/api/admin/attendance` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/attendance/route.ts) |
| `/api/admin/attendance/approve-access/[id]` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/attendance/approve-access/[id]/route.ts) |
| `/api/admin/attendance/auto-checkout` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/attendance/auto-checkout/route.ts) |
| `/api/admin/attendance/request-access` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/attendance/request-access/route.ts) |
| `/api/admin/auto-messages` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/auto-messages/route.ts) |
| `/api/admin/auto-messages/[id]` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/auto-messages/[id]/route.ts) |
| `/api/admin/db-stats` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/db-stats/route.ts) |
| `/api/admin/fines` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/fines/route.ts) |
| `/api/admin/fines/auto` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/fines/auto/route.ts) |
| `/api/admin/kpis` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/kpis/route.ts) |
| `/api/admin/logs` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/logs/route.ts) |
| `/api/admin/mail/satellite-batches` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/mail/satellite-batches/route.ts) |
| `/api/admin/mail/satellite-batches/[id]` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/mail/satellite-batches/[id]/route.ts) |
| `/api/admin/mail/satellite-batches/[id]/assign-range` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/mail/satellite-batches/[id]/assign-range/route.ts) |
| `/api/admin/mails` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/mails/route.ts) |
| `/api/admin/mails/available-ranges` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/mails/available-ranges/route.ts) |
| `/api/admin/mails/batch-update` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/mails/batch-update/route.ts) |
| `/api/admin/mails/import` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/mails/import/route.ts) |
| `/api/admin/mails/[id]` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/mails/[id]/route.ts) |
| `/api/admin/notifications` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/notifications/route.ts) |
| `/api/admin/notifications/[id]` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/notifications/[id]/route.ts) |
| `/api/admin/payroll` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/payroll/route.ts) |
| `/api/admin/payroll/[month]` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/payroll/[month]/route.ts) |
| `/api/admin/phones` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/phones/route.ts) |
| `/api/admin/phones/batches/[id]` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/phones/batches/[id]/route.ts) |
| `/api/admin/phones/import` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/phones/import/route.ts) |
| `/api/admin/reset-db` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/reset-db/route.ts) |
| `/api/admin/settings` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/settings/route.ts) |
| `/api/admin/stats` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/stats/route.ts) |
| `/api/admin/stats/export` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/stats/export/route.ts) |
| `/api/admin/tasks` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/tasks/route.ts) |
| `/api/admin/tasks/reclaim` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/tasks/reclaim/route.ts) |
| `/api/admin/tasks/reminders` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/tasks/reminders/route.ts) |
| `/api/admin/tasks/[id]` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/tasks/[id]/route.ts) |
| `/api/admin/users` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/users/route.ts) |
| `/api/admin/users/activity` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/users/activity/route.ts) |
| `/api/admin/users/cleanup-online` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/users/cleanup-online/route.ts) |
| `/api/admin/users/[id]` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/users/[id]/route.ts) |
| `/api/admin/users/[id]/lock` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/users/[id]/lock/route.ts) |
| `/api/auth/change-password` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/auth/change-password/route.ts) |
| `/api/auth/check-status` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/auth/check-status/route.ts) |
| `/api/auth/check-username` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/auth/check-username/route.ts) |
| `/api/auth/login` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/auth/login/route.ts) |
| `/api/auth/logout` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/auth/logout/route.ts) |
| `/api/auth/me` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/auth/me/route.ts) |
| `/api/auth/offline` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/auth/offline/route.ts) |
| `/api/auth/register` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/auth/register/route.ts) |
| `/api/auth/reset-password` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/auth/reset-password/route.ts) |
| `/api/auth/send-otp` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/auth/send-otp/route.ts) |
| `/api/messages` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/messages/route.ts) |
| `/api/messages/mark-read` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/messages/mark-read/route.ts) |
| `/api/messages/[id]` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/messages/[id]/route.ts) |
| `/api/seed` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/seed/route.ts) |
| `/api/sync` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/sync/route.ts) |
| `/api/test-env` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/test-env/route.ts) |
| `/api/upload` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/upload/route.ts) |
| `/api/youtube` | [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/youtube/route.ts) |

---

## 3. Issues Category Matrix

| Severity | Count | Primary Impact Areas |
| :--- | :--- | :--- |
| **Critical** | 3 | Authentication Bypass, Strict RBAC leaks, JWT Token Tampering |
| **High** | 6 | Broken Real-time events, Memory exhaustion, Missing limits |
| **Medium** | 4 | Input validation, Silent fail logic, Environment variable misuse |
| **Low** | 2 | SWR Double Fetching, MongoDB local fallback |

---

## 4. Prioritized Audit Findings

### 4.1. Critical Issues

#### 1. Authentication & Authorization Bypass: Misnamed Middleware File
* **File**: `src/proxy.ts`
* **Line**: N/A (Naming Convention Issue)
* **Root Cause**: Next.js (both Pages and App router) automatically triggers routing middleware if and only if the file is named `middleware.ts` (or `.js`) in the `src/` directory or root workspace. Because the file is named `proxy.ts`, Next.js completely ignores it during compilation and execution. Consequently, all authentication, 2FA enforcement, administrative blacklist checks, and request header injections (e.g., `x-user-role`, `x-user-id`) are bypassed. Any client can access raw API endpoints directly without passing a valid JSON Web Token.
* **Fix Example**:
  Rename `src/proxy.ts` to `src/middleware.ts`.

---

#### 2. Strict RBAC Leak: Missing Authorization Check in Access Approval Route
* **File**: [approve-access/[id]/route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/attendance/approve-access/[id]/route.ts)
* **Line**: 13
* **Root Cause**: The POST request handler accepts parameters in the body (e.g. `status`, `userId`, `type`) and proceeds to lock/unlock users, approve excuses, and write to Mongoose collections without checking the role of the caller. Even if the middleware was running, it only injects `x-user-role` into the headers without enforcing blocks on this specific route. A non-admin/staff member can easily craft a request to lock administrators, approve their own late excuses, or set their account as "ACTIVE" from a locked state.
* **Fix Example**:
  Ensure user roles are checked using `checkPermission`.
  ```typescript
  import { checkPermission, logAuditTrail } from "@/lib/permissions";
  
  export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userRole = req.headers.get("x-user-role");
    const userId = req.headers.get("x-user-id");
    
    // Validate Manager or Admin access (level 4+)
    const hasPermission = await checkPermission(userRole || "", 4, ["all", "attendance"]);
    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden: Administrator privileges required." }, { status: 403 });
    }
    // Proceed with logic...
  }
  ```

---

#### 3. JWT Vulnerability: Hardcoded Key Fallback Bypass
* **File**: [proxy.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/proxy.ts)
* **Line**: 51
* **Root Cause**: In the token verification block, the verification secret has a fallback string:
  ```typescript
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "aq_media_jwt_secret_2026_xKp9mNvQ3rT8wZ"
  );
  ```
  If `process.env.JWT_SECRET` is not initialized or fails to load, the system falls back to a static string. An attacker aware of this fallback can sign custom JWT tokens locally with the signature `"aq_media_jwt_secret_2026_xKp9mNvQ3rT8wZ"` and achieve full administrative access.
* **Fix Example**:
  ```typescript
  const jwtSecretEnv = process.env.JWT_SECRET;
  if (!jwtSecretEnv) {
    throw new Error("JWT_SECRET environment variable is missing.");
  }
  const secret = new TextEncoder().encode(jwtSecretEnv);
  ```

---

### 4.2. High Issues

#### 1. Broken Real-Time Channels: Pusher Event/Channel Mismatch
* **Files**:
  - [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/users/[id]/route.ts) (L126, L221, L317)
  - [RealtimeProvider.tsx](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/components/admin/RealtimeProvider.tsx) (L294)
* **Root Cause**:
  The backend triggers the `status-update` event on the channel:
  `user-${updatedUser.username.toLowerCase()}`
  But the frontend client code subscribes to the channel:
  `user-${user.id || user._id}`
  This mismatch between the user ID and lowercase username means that all account lock status changes, block triggers, and profile updates are never broadcasted to the correct channels. Additionally:
  - Backend triggers `new-fine` on the `system` channel, but the frontend lacks any subscription binding for `new-fine`, causing a complete failure to update fine alerts in real time.
  - Backend triggers `task-list-updated` on channel `system`, but frontend doesn't bind to it.
* **Fix Example**:
  Align both endpoints to use the standard Mongoose user ID (`_id`):
  **Backend ([route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/users/[id]/route.ts))**:
  ```typescript
  await pusherServer.trigger(`user-${updatedUser._id.toString()}`, "status-update", {
    status: updatedUser.status
  });
  ```

---

#### 2. Performance Anti-Pattern: Unbounded Query In Mails Available Ranges
* **File**: [available-ranges/route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/mails/available-ranges/route.ts)
* **Line**: 35
* **Root Cause**: The query retrieves all documents where `isAssigned: false` and `type: 'SATELLITE'` without pagination or limits:
  ```typescript
  const availableMails = await SatelliteMail.find({ isAssigned: false, type: 'SATELLITE' }).sort({ createdAt: 1 });
  ```
  If the collection grows to tens of thousands of available satellite mails, this will trigger huge memory load on Mongoose. Furthermore, since only `_id` is used:
  `mailIds: chunkMails.map(m => m._id.toString())`
  the route is wasting database bandwidth by not using a `.select('_id')` projection and missing `.lean()`.
* **Fix Example**:
  ```typescript
  const availableMails = await SatelliteMail.find({
    isAssigned: false,
    type: 'SATELLITE'
  })
  .select('_id')
  .sort({ createdAt: 1 })
  .lean();
  ```

---

#### 3. Performance Anti-Pattern: Memory-Heavy `.find().length` Checks
* **Files**:
  - [auto/route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/fines/auto/route.ts) (L43-48)
  - [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/tasks/[id]/route.ts) (L92-99)
* **Root Cause**: In `/api/admin/fines/auto`, the endpoint queries all incomplete tasks of a staff member to see if any exist:
  ```typescript
  const incompleteTasks = await Task.find({ assigneeId: staff._id, status: { $ne: 'COMPLETED' } });
  if (incompleteTasks.length > 0) { ... }
  ```
  This instantiates all task objects into memory. Mongoose `.exists()` or `.countDocuments()` should be used instead.
* **Fix Example**:
  ```typescript
  const hasIncompleteTasks = await Task.exists({
    assigneeId: staff._id,
    status: { $ne: 'COMPLETED' }
  });
  if (hasIncompleteTasks) { ... }
  ```

---

#### 4. Missing Pagination: Unbounded Legacy Queries on Fines GET Endpoint
* **File**: [fines/route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/fines/route.ts)
* **Line**: 38-44
* **Root Cause**: If the client doesn't explicitly send `page` and `limit` in the URL params, the endpoint drops back to a legacy query returning the entire collection:
  ```typescript
  if (!searchParams.has("page") && !searchParams.has("limit") && searchParams.get("all") !== "true") {
    const fines = await Fine.find(filter)
      .populate("userId", "name username role email")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .lean();
    return NextResponse.json(fines || []);
  }
  ```
  As fines history builds over months, this will retrieve thousands of documents, populating references which will block the node main thread.
* **Fix Example**:
  Enforce a fallback default limit of `50` records even on legacy lookups.
  ```typescript
  const limit = 50;
  const fines = await Fine.find(filter)
    .populate("userId", "name username role email")
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
    .limit(limit)
    .lean();
  ```

---

#### 5. Missing Rate Limiting on Authentication & 2FA Validation
* **File**: `src/middleware/rateLimiter.ts` (and related authentication login routes)
* **Line**: 5
* **Root Cause**: Rate limiting on core auth endpoints is empty:
  `export const twoFARateLimiter = null as any;`
  This makes the application completely vulnerable to login and 2FA OTP brute-forcing. A malicious client can generate thousands of requests per second trying to brute force passwords or speakeasy 2FA tokens.
* **Fix Example**:
  Implement an edge-compatible in-memory or Redis-based sliding-window rate limiter inside Next.js middleware, checking client IPs.

---

#### 6. Pusher Omission: Missing Lock Toggle Event Emit
* **File**: [lock/route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/users/[id]/lock/route.ts)
* **Line**: 44
* **Root Cause**: The user's status is toggled inside the database (`ACTIVE` <-> `LOCKED`), but no Pusher trigger event is emitted. The locked-out employee's browser will remain active and in-memory until a manual refresh occurs, allowing them to continue viewing cached real-time screens.
* **Fix Example**:
  ```typescript
  // Trigger pusher alert to the locked/unlocked user channel
  await pusherServer.trigger(`user-${user._id.toString()}`, "status-update", {
    status: newStatus
  });
  ```

---

### 4.3. Medium Issues

#### 1. Missing Input Schema Validation on Core Endpoints
* **Files**: Multiple routes, including [fines/route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/fines/route.ts), `/api/admin/settings`, `/api/admin/mails/batch-update`.
* **Root Cause**: While Zod schemas are defined in `src/lib/validation.ts`, many write endpoints parse `req.json()` directly and run queries without verifying fields, lengths, or data types. This allows malformed payloads or parameter pollution to disrupt DB states.
* **Fix Example**:
  Parse requests using the appropriate Zod schema:
  ```typescript
  const parsed = UpdateFineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }
  ```

---

#### 2. Potential Memory Leaks: Missing `.lean()` projections
* **Files**:
  - [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/payroll/route.ts) (L29, L95)
  - [auto-checkout/route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/attendance/auto-checkout/route.ts) (L89)
* **Root Cause**: Heavy database queries that populate user data (such as querying all payroll entries or bulk sweep operations) omit `.lean()`. This forces Node to create heavy Mongoose wrapper objects that hog garbage collector memory.
* **Fix Example**:
  Append `.lean()` to all read-only database lookups:
  ```typescript
  const records = await Payroll.find(filter)
    .populate("userId", "name username role")
    .sort({ createdAt: -1 })
    .lean();
  ```

---

#### 3. Session User ID Impersonation in 2FA Verification
* **File**: [verify/route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/2fa/verify/route.ts)
* **Line**: 17
* **Root Cause**: The session verification falls back to client-injected headers:
  `const sessionUserId = request.headers.get('x-user-id') || request.headers.get('x-session-user-id') || '';`
  If the Next.js middleware is bypassed (which it is since it's misnamed), `x-user-id` is empty, and a user can inject any `x-session-user-id` in the raw client request headers to act on behalf of other users, enabling 2FA configuration takeovers.
* **Fix Example**:
  Only read from secure, encrypted cookie values decrypted server-side:
  ```typescript
  const authUser = await getAuthUser();
  if (!authUser || authUser.userId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  ```

---

#### 4. Raw Database Error Leaks
* **Files**:
  - [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/attendance/route.ts) (L61, L216)
  - [route.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/app/api/admin/fines/route.ts) (L204)
* **Root Cause**: Database errors in catch-blocks are returned directly to the user client via `error.message`. This exposes raw database queries, schema configurations, or connection information.
* **Fix Example**:
  Log the internal stack trace to standard error, and return a sanitized warning response to the client.
  ```typescript
  } catch (error: any) {
    console.error("GET attendance failed:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error occurred." }, { status: 500 });
  }
  ```

---

### 4.4. Low Issues

#### 1. SWR Config Violations: Double Triggering / Double Loading
* **Files**:
  - [AdminDashboardClient.tsx](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/components/admin/AdminDashboardClient.tsx) (L132)
  - [StaffDashboardClient.tsx](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/components/staff/StaffDashboardClient.tsx) (L68, L74)
* **Root Cause**: Several client-side `useSWR` calls omit the `dedupingInterval` parameter. If sub-components are re-rendered frequently, the default 2-second deduping limit leads to excessive requests, spamming backend API endpoints.
* **Fix Example**:
  Configure a minimum of `5000ms` for `dedupingInterval` on static/infrequent requests:
  ```typescript
  useSWR('admin-dashboard-data', refreshStats, {
    revalidateOnFocus: false,
    dedupingInterval: 5000
  });
  ```

---

#### 2. Database Connection Local Fallback Config
* **File**: [mongodb.ts](file:///c:/Users/HoangHung/Documents/GitHub/WEB_AQ/src/lib/mongodb.ts)
* **Line**: 24
* **Root Cause**: The `.env` parser helper in Mongoose connection utility looks exclusively for `.env.local`:
  `const ENV_PATH = path.join(process.cwd(), ".env.local");`
  Since the local configuration is actually stored in `.env`, manual scripts or migration tools executing raw Node tasks without the Next.js shell context will fail to parse database connection URLs.
* **Fix Example**:
  ```typescript
  const ENV_PATH = fs.existsSync(path.join(process.cwd(), ".env.local"))
    ? path.join(process.cwd(), ".env.local")
    : path.join(process.cwd(), ".env");
  ```
