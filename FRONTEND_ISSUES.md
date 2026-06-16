# Frontend Issues & Technical Debt

## UI Issues (User Interface)
- **Visual Clutter:** The header and sidebar contain high-density information that may overwhelm users on smaller screens.
- **Inconsistent Modal Sizing:** Modals like `AccessLock` are very large (18KB code) and may not scale well on mobile devices.
- **Hardcoded Colors:** Occasional use of hardcoded hex colors in components instead of theme variables (e.g., `#a07800` in Sidebar).

## UX Issues (User Experience)
- **Local Storage Synchronization:** Reliance on `storage` event listeners for bank/agency config can lead to desync across tabs if not handled perfectly.
- **Large Page Loads:** Due to monolithic layouts, the initial JavaScript bundle for the admin section is likely oversized, leading to slower TTI (Time to Interactive).
- **Chat State Persistence:** Chat messages are stored in local state/SWR; refreshing the page may cause a flash or temporary loss of unsent drafts.

## Accessibility Issues (A11y)
- **Low Contrast:** Certain gray-on-dark-zinc combinations in the sidebar (`text-zinc-500`) may fail WCAG AA contrast requirements.
- **Semantic HTML:** Heavy use of `div` and `span` for interactive elements instead of `button` or `a`, potentially breaking screen reader navigation.
- **Missing Aria Labels:** Large layout icons (Lucide icons) often lack `aria-label` or `title` attributes for assistive technology.
- **Keyboard Navigation:** Complex drag-and-drop components (`dnd-kit`) and nested sidebar menus may not be fully navigable via keyboard.

## Technical Debt
- **Component Bloat:** `AdminLayout.tsx` (2400+ lines) is a critical maintenance risk. It needs to be split into features (e.g., `ChatFeature`, `RealtimeHandler`, `LayoutShell`).
- **File System Bloat:** `Header.tsx` is 46KB; it contains massive amounts of embedded JSX and logic that could be sub-componentized.
- **Lack of Unit Tests:** Only `Badge` and `Loading` components have `.test.tsx` files. The complex logic in `AdminLayout` and `AuthContext` is untested.
- **Duplicate Logic:** Brand name and bank config loading logic is duplicated across `AdminLayout` and `Sidebar`.
- **Missing Types:** Some components still use `any` for complex objects (e.g., `user: any`, `partner: any`).
