# Architecture Report: WEB_AQ

## Executive Summary
The WEB_AQ system is a comprehensive Management System built to handle both domain-specific business logic (Mail Management, Phone Management, Batch operations) and internal HR/Employee operations (Attendance, Fines, Tasks, KPIs, Payroll). Built on the modern Next.js App Router paradigm, it leverages MongoDB as its primary datastore and Pusher for real-time interactivity.

## Technology Stack
- **Framework:** Next.js (App Router, v16.2.6)
- **Language:** TypeScript
- **Database:** MongoDB (via Mongoose v9.6.2)
- **Realtime:** Pusher Server / Pusher JS
- **Authentication:** Custom JWT-based Auth using `jose` and `jsonwebtoken`, alongside `bcryptjs`
- **UI & Styling:** React 19, TailwindCSS v4, Framer Motion, dnd-kit, Lucide React
- **Data Export/Import:** ExcelJS, xlsx
- **Build/Tools:** Vitest (Testing), ESLint, pnpm

## Repository Overview
The repository follows standard Next.js conventions with a structured monolithic architecture:
- `/src/app/api`: Serverless API routes acting as backend controllers.
- `/src/app/(UI)`: React Server Components and Client Components for the frontend.
- `/src/components`: Reusable UI elements (`admin` dashboard parts, `ui` primitives, `modals`).
- `/src/models`: Mongoose schemas defining the domain entities.
- `/src/lib`: Shared utilities (auth, MongoDB connection, pagination, permissions).

## Domain Entities (Models)
1. **Mail & Resource Models:** `RootMail`, `SatelliteMail`, `MonetizedMail`, `Batch`, `Phone` - Manage the core business assets.
2. **HR Models:** `User`, `Attendance`, `Fine`, `Payroll`, `Task`, `Kpi` - Manage employee workflows.
3. **System Models:** `Log`, `SystemSetting`, `SyncStore`, `Notification`, `Message`, `AutoMessage`.

## High-Level Request Lifecycle
1. **Client Request:** User accesses a UI component (e.g., `MailManagement.tsx`).
2. **Data Fetching:** Component uses `useSWR` to fetch data from API routes (`/api/admin/mails`).
3. **Middleware/Auth:** Requests are verified using `getAuthUser` inside API controllers (validating cookies/JWT).
4. **Business Logic:** The API route performs necessary validations, role checks, and processes data using Mongoose models.
5. **Real-time Trigger:** If a state changes (e.g., a Task is assigned or a Fine is issued), an event is dispatched to `pusherServer`.
6. **Response:** Data is returned as JSON to the client.

## Scaling Architecture
- Currently, the architecture operates as a monolithic Next.js app connected to a shared MongoDB cluster.
- **State Management:** Relies heavily on MongoDB for state (e.g., `SyncStore` for global variables).
- **Caching:** Limited caching exists. In-memory caching (`cachedBatches`) is used but is an anti-pattern for serverless deployments.
