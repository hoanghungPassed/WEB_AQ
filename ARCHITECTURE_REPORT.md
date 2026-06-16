# Architecture Report

## 1. Overview
The **WEB_AQ** platform is built on Next.js 16 (App Router) and React 19. It utilizes Tailwind CSS v4 for styling, MongoDB (via Mongoose) as the database, and Vitest for testing. The application is designed as an administrative dashboard with real-time features powered by Pusher.

## 2. Framework Utilization & App Router Paradigm
Despite using the Next.js App Router (`src/app`), the application's architecture heavily mirrors a traditional Single Page Application (SPA). 

### Server Components vs. Client Components
- **Anti-Pattern Detected:** Virtually every route and layout under `src/app/admin` starts with `"use client"`. 
- React Server Components (RSC) are entirely bypassed for the core application. Data fetching happens exclusively on the client side via REST APIs, resulting in "waterfall" network requests and missing the performance benefits of Next.js 16.

### Route Hierarchy
- `/login`: Public route for authentication.
- `/admin/*`: Protected routes for the dashboard.
- `/api/*`: Backend API routes handling CRUD operations and business logic. They run in standard Node.js environments (no `edge` runtime configurations found).

## 3. Data Fetching & State Management
- **Custom SWR Implementation:** The project contains a custom `useSWR` hook (`src/lib/useSWR.ts`) that relies on a global `Map`, `setInterval`, and `localStorage` to mock SWR behavior. However, it also imports the official `swr` package in some components (e.g., `MailManagement.tsx`). This split strategy causes state desynchronization and unpredictable caching behaviors.
- **Global State:** Handled primarily via `AuthContext` and pervasive reading/writing of `localStorage` / `sessionStorage` inside `useEffect` blocks.

## 4. Database Layer
- Mongoose is used within API routes to interact with MongoDB.
- **Connection Management:** Connection strings are cached globally to prevent exhaustion in Serverless environments. However, direct heavy aggregations and unbounded `find()` queries pose a risk to MongoDB CPU and Next.js instance memory.

## 5. Proposed Target Architecture
To properly leverage Next.js 16:
1. **Server-First Fetching:** Layouts and Pages should be Server Components (`async function Page()`) that fetch initial data via Mongoose directly or internal API wrappers, passing data down as props.
2. **Interactive Islands:** Only small, interactive "islands" (like buttons, forms, or chat widgets) should use `"use client"`.
3. **Unified Caching:** Replace the custom `useSWR` polling with Next.js Server Actions, Next.js `unstable_cache`, or standard SWR with WebSocket invalidation.
