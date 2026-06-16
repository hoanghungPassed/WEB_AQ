# Frontend Architecture & Guidelines - WEB_AQ

This document outlines the strict architectural patterns and style rules for WEB_AQ's frontend. All agents and developers must strictly adhere to these practices.

---

## 1. React Server Components (RSC) Strategy

- **Root Pages & Layouts:** All top-level layout files (`layout.tsx`) and page entry files (`page.tsx`) must remain **React Server Components (RSC)**. Do NOT add the `"use client"` directive at the top of these files.
- **Server-Side Authentication & Access Control:**
  - Layouts and page routes must verify user sessions server-side using `getAuthUser()` from `@/lib/auth`.
  - Perform immediate server-side redirects via Next.js `redirect()` to `/login` if authorization fails, preventing layout flashes of unauthorized access.
- **Decoupled Client Functionality:**
  - Dynamic client features (e.g., Pusher subscription listeners, state toggles, modal dialogs, API hooks) must be decoupled into dedicated child client components (e.g., `AdminLayoutClient.tsx`, `AdminDashboardClient.tsx`, `LoginFormClient.tsx`).
  - Pass the authenticated user data down to client components as properties (props).

---

## 2. Server State & API Caching (SWR) Regulations

- **Official Package Usage:** Only import SWR using the official package:
  ```typescript
  import useSWR from 'swr';
  ```
- **Spam Protection:** All SWR request hooks must define safe parameters to avoid overloading the MongoDB database:
  - Bắt buộc use parameter configs: `{ revalidateOnFocus: false, dedupingInterval: 5000 }`.
- **Backend Count Efficiency:**
  - Database count operations must utilize Mongoose/MongoDB's native `.countDocuments(query)` directly on the model.
  - **PROHIBITED:** Never use `.find().lean()` to measure sizes (`.length`), which wastes memory and degrades query performance.

---

## 3. Design System & Style Tokens (Impeccable Compliance)

All components must use standard CSS theme tokens defined in `globals.css` (Tailwind CSS v4 `@theme` variables) to ensure visual coherence.

- **Borders & Radii:**
  - **Modals & Cards:** Radius is strictly capped at `rounded-lg` (16px / 1rem).
  - **Inputs & Fields:** Radius is set to `rounded-md` (12px / 0.75rem).
  - **Buttons & Badges:** Radius is set to `rounded-sm` (8px / 0.5rem) for clean alignment.
- **Elevation & Shadows:**
  - Use `.shadow-premium` for floating overlay components (modals, chats, dropdowns).
  - Shadows must not be baked onto resting buttons/cards; display interactive shadows (`hover:shadow-premium` or `box-shadow`) only on focus or hover states.
- **Text & High Contrast Contrast (WCAG AA):**
  - Muted secondary details and labels must use `text-foreground-secondary` to guarantee accessible contrast ratios (>= 4.5:1). Do not use low-contrast hardcoded grays (e.g., `text-zinc-500` or `text-gray-500`).
- **Visual Design Bans:**
  - **Absolutely NO Gradient Text:** Use single, solid colors like `text-gold` or `text-foreground`.
  - **Absolutely NO Glassmorphism:** Primary panels and content containers must remain solid and opaque (`bg-background` or `bg-background-secondary`).
  - **No Side-Stripe Card Borders:** Avoid borders greater than 1px on the left/right of cards as decorative indicators.

---

## 4. Bundle Optimization & Lazy Loading (Dynamic Imports)

- **Heavy Libraries Optimization:** Heavy libraries (specifically `xlsx` and similar sheet parsers) must NOT be imported statically at the top of file hierarchies.
- **Event-Driven Dynamic Import:**
  - Load heavy dependencies dynamically inside the event handlers that need them:
    ```typescript
    const XLSX = await import('xlsx');
    // Perform operations with XLSX...
    ```
  - This keeps initial bundle size minimal and increases page loading performance.
