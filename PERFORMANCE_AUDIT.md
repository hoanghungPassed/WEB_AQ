# Performance Audit Report

## 1. Executive Summary
The performance audit identified severe bottlenecks in database querying, particularly related to the "Fetch All" feature in the admin dashboard, which poses a significant risk of Out-Of-Memory (OOM) errors and database exhaustion.

## 2. Findings

### [CRITICAL] Massive Over-Fetching (`all=true`)
- **File:** `src/app/api/admin/mails/route.ts`, `src/components/admin/MailManagement.tsx`
- **Description:** When the client requests `?all=true`, the API bypasses pagination and executes:
  ```typescript
  const rootMails = await RootMail.find(query);
  ```
- **Impact:** As the `mails` collections grow to tens of thousands of records, fetching and serializing the entire collection in one request will crash the Next.js API instance (OOM) and cause a massive spike in MongoDB CPU.
- **Remediation:** Strictly enforce server-side pagination. Never allow the client to request the entire dataset. If bulk operations are needed, process them using streams or background jobs.

### [HIGH] N+1 Query Problem during Mail Assignment
- **File:** `src/app/api/admin/tasks/route.ts`
- **Description:** When creating a task, the system iterates and updates assigned mails. Although it attempts to use `updateMany`, it also fetches individual batch documents iteratively or performs deep populations without proper indexing.
- **Impact:** Slower response times during bulk task assignment.
- **Remediation:** Ensure indexes exist on `_id`, `batchName`, and `batchId`.

### [MEDIUM] Synchronous External Calls in Core Flows
- **File:** `src/app/api/auth/login/route.ts`
- **Description:** Upon login, the system runs multiple heavy checks: calculates attendance, handles late fines, checks settings, triggers multiple Pusher events, and sends emails (`sendFineEmail`).
- **Impact:** The login request can take several seconds to resolve, causing a poor user experience.
- **Remediation:** Move non-critical post-login actions (like sending emails and calculating fines) to background queues or decoupled event handlers.

### [MEDIUM] Database Connection Global Cache
- **File:** `src/lib/mongodb.ts`
- **Description:** The system relies on a `global.mongooseCache`.
- **Impact:** During high concurrency cold-starts in Vercel/Serverless, multiple concurrent requests might still attempt simultaneous initializations.
- **Remediation:** Adopt connection pooling explicitly optimized for serverless, or migrate to Edge-compatible databases/drivers.
