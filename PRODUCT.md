# Product

## Register

product

## Users
Internal operations managers, system administrators, and staff members of AQ Media. Their context is rapid, daily administrative check-ins, timekeeping verification, late-fine payments, real-time coordination via chat, and task dispatch monitoring.

## Product Purpose
To serve as a high-density, real-time administrative operations cockpit that enables clean tracking of YouTube/mail channels progress, automated fine calculation and locking, chat logs, and quick action approvals without visual distractions.

## Brand Personality
- Tech-forward & Sleek
- Cyberpunk-tinged Premium Dark (Gold & Amber accents against dark zinc surfaces)
- Calibrated, stable, and highly legible

## Anti-references
- Low contrast small text (e.g. gray on near-black)
- Heavy glassmorphic blurs as default background containers
- Overly-rounded card layouts (24px+)
- Side-stripe borders greater than 1px
- Generic SaaS placeholders or "hero-metric" dashboards

## Design Principles
1. **Utility & Information Density Over Flair:** Admin interfaces require scanning high volumes of data. Use compact layouts, high-contrast labels, and clean tabular rows.
2. **Strict Contrast & Legibility:** Minimum text-contrast ratios must meet WCAG AA (>= 4.5:1). Placeholders and labels must be clearly readable.
3. **Calibrated Spacing Scale:** Standardize radii on sm (8px), md (12px), lg (16px) and stick to a strict 4px/8px grid system.
4. **Responsive Fluidity:** Layout shifts and sidebars must scale fluidly via CSS breakpoints, avoiding state-based layout switches that flash or break.

## Accessibility & Inclusion
- WCAG AA contrast standard compliance.
- Reduced motion alternatives for interactive elements (Framer Motion transitions).
- Explicit `:focus-visible` outline rings (gold) for keyboard navigation.
- Disabled button state indicators (`disabled:opacity-50 disabled:cursor-not-allowed`).
