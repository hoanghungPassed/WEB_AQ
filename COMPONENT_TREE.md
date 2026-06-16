# Component Tree Overview

## 1. App Root
- `RootLayout` (`src/app/layout.tsx`)
  - `AuthProvider` (`src/contexts/AuthContext.tsx`)
  - `Toaster` (`react-hot-toast`)
  - `children` (Pages)

## 2. Admin Segment
- `AdminLayout` (`src/app/admin/layout.tsx`)
  - `RealtimeProvider` (`src/components/admin/RealtimeProvider.tsx`)
  - `Sidebar` (`src/components/admin/Sidebar.tsx`)
  - `Header` (`src/components/admin/Header.tsx`)
    - `ProfileModal` (`src/components/admin/ProfileModal.tsx`)
  - `AccessLock` (`src/components/admin/modals/AccessLock.tsx`)
  - `Chat Interface` (Embedded in `AdminLayout`)
    - `TypingBubble`
    - `Lightbox`
  - `Main Content` (Nested Pages)

## 3. Core Admin Pages
- `Dashboard` (`/admin/page.tsx`)
- `MailManagement` (`/admin/mail/[type]/page.tsx`)
  - `MailDetailModal`
  - `MailSelectorModal`
  - `ImportHistoryModal`
- `TaskManagement` (`/admin/tasks/page.tsx`)
- `StaffManagement` (`/admin/staff/page.tsx`)

## 4. UI Primitives (`src/components/ui`)
- `Badge`: Status and role labels.
- `Loading`: Spinner and skeleton states.
- `Modal`: Base layout for all dialogs.
