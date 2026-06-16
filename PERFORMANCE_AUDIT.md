# Performance Audit Report

## 1. Rendering Bottlenecks
- **Excessive Client Components:** By making every page a Client Component, Next.js cannot stream HTML from the server. The user downloads a massive JavaScript bundle before the application even begins to render the layout shell.
- **Client-Side Waterfalls:** Because data fetching is done via `useEffect` and `useSWR` in Client Components, the browser must: 
  1. Download HTML/JS 
  2. Boot React 
  3. Render the shell 
  4. Fetch data from APIs 
  5. Render the data.
  *This results in severe loading spinners and slow LCP (Largest Contentful Paint).*

## 2. Bundle Size Optimization Opportunities
- **Lucide Icons:** Importing icons globally or heavily can bloat the bundle. Ensure dynamic imports or proper tree-shaking is active.
- **Framer Motion:** Heavy use of `AnimatePresence` and `motion` across large lists (like chat messages or tables) causes CPU spikes and layout thrashing.
- **XLSX & ExcelJS:** These are massive libraries. They should be dynamically imported (`next/dynamic`) only when the user clicks an "Export" or "Import" button, rather than being bundled into the main page load.

## 3. Network & Data Fetching Performance
- **Aggressive Polling:** The custom `useSWR.ts` hook uses `setInterval` to poll data constantly, combined with Pusher websocket events. This redundant architecture drains mobile batteries and causes unnecessary backend API load.
- **Over-fetching:** API calls (like `/api/admin/users?all=true`) fetch entire database collections without pagination, risking Out-Of-Memory (OOM) crashes on the server and freezing the browser thread during JSON parsing.

## 4. Recommendations for Next.js Optimization
1. **Server-Side Rendering (SSR):** Shift `src/app/admin/page.tsx` to a Server Component. Fetch KPI and Dashboard statistics on the server and pass them down as initial props to a smaller interactive client component.
2. **Lazy Loading Libraries:** Use `next/dynamic` for heavy client components (like Modals or Excel parsers).
3. **Optimized Images:** Replace raw `<img>` tags with `next/image` to automatically compress and cache external avatars and chat images.
