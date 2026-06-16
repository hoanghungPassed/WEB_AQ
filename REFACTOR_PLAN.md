# Refactoring Roadmap

This plan organizes technical debt remediation and structural improvements into actionable phases.

## 1. Quick Wins (1 - 3 Days)
- **Fix Arbitrary File Upload:** Immediately patch `src/app/api/upload/route.ts`. Validate file types against a whitelist (`image/png`, `image/jpeg`, etc.). Strip all original filenames and use `uuid` or `crypto.randomBytes`.
- **Remove `all=true` Fetching:** Remove the bypass logic in `/api/admin/mails/route.ts` and `MailManagement.tsx`. Enforce strict limit caps (e.g., `limit=1000` maximum) and utilize infinite scrolling or classic pagination.
- **Remove Plaintext Auth Fallback:** Run a script to bcrypt all legacy plaintext passwords in MongoDB. Delete the plaintext fallback block in `login/route.ts`.

## 2. Short Term (1 - 2 Weeks)
- **Implement Rate Limiting:** Replace the nullified `express-rate-limit` with Upstash Redis or Cloudflare KV to protect `/api/auth/login`, `/api/auth/register`, and `/api/upload`.
- **Optimize Login Flow:** Refactor `/api/auth/login/route.ts`. Extract the heavy attendance, fine calculation, and notification logic into a separate asynchronous function or API endpoint that the client calls *after* the initial token is granted.
- **Audit Indexes:** Add missing indexes. Ensure `userId` and `date` in `Attendance` and `createdAt` fields across all collections have proper MongoDB indexes to speed up aggregation queries.

## 3. Medium Term (1 - 2 Months)
- **Replace In-Memory Caches:** Remove `cachedBatches` from Next.js serverless functions. Replace with a proper Redis cache or utilize Next.js App Router's built-in Request Memoization and Data Cache (`unstable_cache`).
- **Standardize Error Handling:** API responses currently return mixed formats (some `error: string`, some `details: array`). Standardize around a `ProblemDetails` JSON schema.
- **Extract Business Logic:** Extract Mongoose operations from Next.js API Routes into dedicated Service classes (e.g., `UserService.ts`, `TaskService.ts`) to make testing and mocking feasible.

## 4. Long Term (3+ Months)
- **Migrate to Edge-Compatible ORM:** Consider migrating from Mongoose to Prisma or Drizzle ORM to leverage Edge capabilities, better TypeScript integration, and more predictable connection pooling in serverless environments.
- **Event-Driven Architecture:** Move Heavy tasks (Bulk imports, exporting reports) to an event-driven architecture using message queues (e.g., AWS SQS, Upstash QStash, or BullMQ) to avoid Vercel timeouts (10s/60s).
