# UI Refactor & Architecture Roadmap

This plan outlines the steps required to transition the WEB_AQ frontend into a modern, highly performant SaaS application leveraging the true power of Next.js 16 and React 19.

## Phase 1: Bundle & State Stabilization (Quick Wins)
- **Remove Custom SWR:** Delete `src/lib/useSWR.ts`. Standardize data fetching across the app using the official `swr` library or `@tanstack/react-query`.
- **Dynamic Imports for Heavy Libs:** Wrap Excel/XLSX imports inside `import('xlsx')` functions so they only load upon button click. Use `next/dynamic` for Modals.
- **Typing Strictness:** Replace `any` types in `types/admin.ts` with strict Zod schemas or TypeScript interfaces.

## Phase 2: Unlocking React Server Components (RSC)
- **Refactor Layouts:** Remove `"use client"` from `src/app/admin/layout.tsx`. 
  - Move the Sidebar, Header wrapper, and generic HTML into the Server Component.
  - Extract the interactivity (Pusher connections, state toggles) into small, targeted `<ClientShell>` wrappers.
- **Refactor Pages:** Remove `"use client"` from `src/app/admin/page.tsx`.
  - Fetch dashboard statistics (`/api/admin/stats`) directly inside the Server Component via Mongoose or isolated server actions.
  - Pass the raw data to `<DashboardGrid initialData={...} />` (which can be a Client Component if real-time updates are needed).

## Phase 3: Decoupling Monolithic UI
- **Sub-component Architecture:** Break down massive files (like `MailManagement.tsx` and `AdminChat.tsx`).
  - Create `/components/admin/chat/ChatWindow.tsx`, `ChatMessage.tsx`, and `ChatInput.tsx`.
  - Create `/components/admin/tables/DataTable.tsx` as a reusable, paginated table primitive.
- **Standardize Modals:** Create a unified `<Dialog>` primitive using Radix UI or a headless UI library to ensure accessibility (Focus trapping, Esc to close) and consistent Framer Motion animations.

## Phase 4: SaaS-Grade Accessibility & Responsiveness
- **CSS Breakpoints:** Remove all `windowWidth` React states. Implement pure Tailwind CSS media queries (`md:`, `lg:`, `xl:`).
- **Mobile First Tables:** For screens `< 768px`, transform `<table>` rows into stacked `<div className="card-style">` elements for better readability.
- **A11y Audit:** Introduce `aria-label` attributes to all icon-only buttons. Increase contrast ratios to pass WCAG AA guidelines by mapping semantic colors in Tailwind v4's `@theme` configuration.
