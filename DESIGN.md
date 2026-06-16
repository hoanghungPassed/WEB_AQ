---
name: AQ Media Design System
description: Visual specifications for the real-time cyberpunk control cockpit.
colors:
  primary: "#fbbf24"
  primary-dark: "#d97706"
  primary-light: "#fcd34d"
  neutral-bg: "#09090b"
  neutral-bg-secondary: "#18181b"
  neutral-bg-tertiary: "#27272a"
  neutral-fg: "#fafafa"
  neutral-fg-secondary: "#a1a1aa"
  neutral-border: "#27272a"
  neutral-border-light: "#3f3f46"
  success: "#10b981"
  warning: "#f59e0b"
  danger: "#ef4444"
typography:
  display:
    fontFamily: "Geist, Geist Fallback, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, Geist Fallback, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, Geist Mono Fallback, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  card:
    backgroundColor: "{colors.neutral-bg-secondary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.neutral-bg-secondary}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
---

# Design System: AQ Media

## 1. Overview

**Creative North Star: "The Cyberpunk Control Center"**

AQ Media’s interface is designed as a high-density, real-time administrative control center. It leverages a modern dark dashboard paradigm to present high volumes of channels data, timekeeping logs, and transaction approvals clearly. By contrasting deep neutral surfaces (Zinc 900/950) with active status lights (Amber/Gold), the interface guides user attention to critical events immediately.

This system rejects low-contrast labels, over-rounded card layouts (24px+), heavy glassmorphism, and side-stripe card borders. It focuses strictly on data density and clear layouts to minimize cognitive fatigue during rapid operational shifts.

**Key Characteristics:**
- High information density with compact spacing
- High-contrast, accessibility-first typography
- Functional status colors (Gold, Emerald, Red) acting as status lights

## 2. Colors

AQ Media's color strategy utilizes a restrained dark base (Zinc values) paired with a high-contrast Cyberpunk Gold accent system.

### Primary
- **Cyberpunk Gold** (#fbbf24): Used strictly for primary status lights, active tab states, focus outlines, and key CTA highlights.
- **Gold Dark** (#d97706): Used for hover interactions on primary CTAs and active outline highlights.
- **Gold Light** (#fcd34d): Used for fine highlights and warnings.

### Neutral
- **Deep Background** (#09090b): The primary canvas bg (Zinc 950) representing the void context.
- **Surface Secondary** (#18181b): Card containers and list backgrounds (Zinc 900).
- **Surface Tertiary** (#27272a): Tooltips, headers, and active state highlights (Zinc 800).
- **Primary Text** (#fafafa): High contrast ink (Zinc 50) for body text and headers.
- **Secondary Text** (#a1a1aa): Descriptive text and secondary labels (Zinc 400).
- **Border Default** (#27272a): Thin structural dividers.

### Named Rules
**The 10% Accent Rule.** The primary gold accent must never cover more than 10% of any screen. It is an indicator, not a fill.
**The No-Glass Rule.** Do not use frosted glass backgrounds for primary content containers; content surfaces must remain solid and opaque.

## 3. Typography

**Display Font:** Geist (with Geist Fallback, sans-serif)
**Body Font:** Geist (with Geist Fallback, sans-serif)
**Label/Mono Font:** Geist Mono (with monospace)

Typography is modern, geometric, and high-density, prioritizing uppercase monospace labels for data grids.

### Hierarchy
- **Display** (ExtraBold (900), 3rem, 1): Used for large dashboard statistics and title screens.
- **Headline** (Bold (700), 2rem, 1.2): Used for primary headers and modals titles.
- **Title** (Bold (700), 1.25rem, 1.25): Used for card titles.
- **Body** (Medium (500), 0.875rem, 1.5): Used for general data rows and descriptions.
- **Label** (Bold (700), 0.75rem, tracking-widest): All-caps monospace text used for table headers and statuses.

### Named Rules
**The Balance Rule.** Always apply `text-wrap: balance` to displays and headlines to avoid uneven orphans.

## 4. Elevation

The system is flat at rest. Depth is built on flat tonal layering (shifting from Zinc 950 to Zinc 900) and thin borders. Shadow vocabulary is kept minimal, reserved exclusively as interactive responses to focus/hover states.

### Shadow Vocabulary
- **Interactive Glow** (`box-shadow: 0 0 15px rgba(251, 191, 36, 0.15)`): Used on hover/focus states for Gold elements.
- **Premium Drop** (`box-shadow: 0 0 20px rgba(0, 0, 0, 0.5)`): Structural shadow for floating chat components and popup modals.

### Named Rules
**The Hover Glow Rule.** Shadows must not be baked into static elements. Elements are flat at rest; shadows appear as responsive glows only when hovered or focused.

## 5. Components

All components adhere to modular, high-contrast layouts.

### Buttons
- **Shape:** Rounded-xl (8px radius)
- **Primary:** Full fill Gold (#fbbf24) with black text, padding of `10px 16px`.
- **Hover / Focus:** Border shifts to Gold Dark (#d97706) and scales scale-97 on active click.
- **Secondary / Ghost:** Transparent background with thin border (#27272a) and white text.

### Cards / Containers
- **Corner Style:** Rounded-lg (16px radius)
- **Background:** Opaque Surface Secondary (#18181b)
- **Border:** Thin solid border (#27272a)
- **Internal Padding:** Spacing-lg (24px)

### Inputs / Fields
- **Style:** Background secondary, rounded-md (12px), border #27272a.
- **Focus:** Outline rings transition to Gold (#fbbf24) with 1px border glow.
- **Disabled:** Opacity 50% with `not-allowed` mouse pointer.

## 6. Do's and Don'ts

### Do:
- **Do** use strict solid backgrounds for all modals and dialog popups to ensure legible text.
- **Do** keep spacing compact using the 8px layout grid.
- **Do** ensure all data table cells are vertical-aligned center.
- **Do** use uppercase monospace text for all table headers and numeric IDs.

### Don't:
- **Don't** use border-left/border-right greater than 1px as an accent stripe.
- **Don't** use gradient text under any circumstances.
- **Don't** use card radii larger than 16px.
- **Don't** place low-contrast gray text on near-black backgrounds (ensure contrast >= 4.5:1).
