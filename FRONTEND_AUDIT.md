# Frontend Audit Report

## 1. UI Architecture & Components
The frontend utilizes React 19 and a modern "Premium Dark" UI strategy styled with Tailwind CSS v4.

### Component Structure
- **Monolithic Components:** The `AdminLayout` and `Header` components are oversized and handle too many responsibilities (layout, authentication locking, chat websockets, real-time audio chimes). 
- **Duplication:** There are overlapping responsibilities between Modals (e.g., `MailDetailModal` vs `BatchNameModal`) and repetitive table structures across the admin pages.

### Server Components Misuse
- **Finding:** Files like `page.tsx` and `layout.tsx` should remain server-side for SEO, initial load speed, and security. Currently, they are all marked `"use client"`. 
- **Impact:** Client-side only rendering increases the Time to Interactive (TTI) and causes heavy JavaScript bundle downloads.

## 2. Responsive Design Issues
- **Fixed Widths & JS Media Queries:** Responsiveness occasionally relies on JavaScript (`windowWidth` state) rather than pure CSS media queries, leading to UI jitter during resizing.
- **Mobile Experience:** The Sidebar and complex tables (like Mail Management) overflow on mobile devices. There is no dedicated mobile "card" view for tabular data.

## 3. Accessibility (A11y)
- **Color Contrast:** Deep gray text on black backgrounds (e.g., `text-gray-500` on `bg-zinc-900`) frequently fails WCAG AA standards.
- **Semantic HTML:** Excessive use of `<div>` tags for interactive elements. Buttons lack `aria-label` attributes (e.g., Lucide icon-only buttons).
- **Keyboard Navigation:** Modals and dropdown menus lack focus trapping and `Esc` key event handlers, trapping keyboard users.

## 4. Tailwind CSS v4 Architecture
- The codebase correctly utilizes the `@theme` directive in `globals.css` (eliminating `tailwind.config.ts`), but previously relied on hardcoded hex values in inline classes. 
- **Opportunity:** Fully migrate all hardcoded colors and spacing into CSS custom properties mapped through the Tailwind theme.

## 5. Technical Debt
- **Re-invented Wheels:** The custom `src/lib/useSWR.ts` hook implements brittle polling and custom caching that overlaps with the official `swr` package already installed.
- **Type Safety:** Heavy reliance on `any` types throughout components (e.g., `user: any`, `msg: any`), weakening the benefits of TypeScript.
