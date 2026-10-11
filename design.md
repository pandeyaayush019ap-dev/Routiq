# Routiq — Design System & Visual Specification

**Brand:** Routiq  
**Tagline:** *Smarter Routes. Safer Journeys.*  
**Design Philosophy:** Driver-centric, functional clarity, zero decorative clutter ("anti-slop"), high-contrast readability in daylight conditions.

---

## 1. Brand Identity & Semantic Color Palette

| Token Name | Hex Code | Usage & Semantic Purpose |
|---|---|---|
| `--color-navy` | `#142B3B` | Brand identity, primary app header, dark anchor surfaces |
| `--color-blue` | `#2563EB` | Primary actions, selected route polyline, active buttons |
| `--color-teal` | `#0F766E` | Safety indicators, clear road pass, verified safe restrictions |
| `--color-bg` | `#F8FAFC` | App background, warm neutral clean canvas |
| `--color-card` | `#FFFFFF` | Content cards, floating panels, modal dialogs |
| `--color-text` | `#0F172A` | High-contrast body text, primary titles (WCAG AAA) |
| `--color-muted` | `#64748B` | Secondary text, captions, inactive tab text |
| `--color-border` | `#E2E8F0` | Structural dividers, input borders, card boundaries |
| `--color-amber` | `#B45309` | Caution, unverified data advisory, time-restriction warning |
| `--color-red` | `#B91C1C` | Critical restriction violation, bridge strike danger, vehicle blocked |

---

## 2. Typography

- **English Font Family:** `Inter`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif.
- **Hindi / Devanagari Font Family:** `"Noto Sans Devanagari"`, system-ui, sans-serif.
- **Type Scale:**
  - Header Title: `20px` / `bold` (`font-bold text-xl`)
  - Screen Headings: `24px` / `extrabold` (`font-extrabold text-2xl`)
  - Card Titles: `18px` / `semibold` (`font-semibold text-lg`)
  - Body Text: `15px` / `regular` (`font-normal text-sm` to `text-base`)
  - Meta/Caption: `13px` / `medium` (`font-medium text-xs` to `text-sm`)

---

## 3. Responsive Layout Strategy

### 3.1 Mobile Viewport (< 768px)
- **Map First or Split Canvas:**
  - Map view positioned in upper 42% of viewport height with interactive controls.
  - Expandable bottom panel / scrolling card sheet for inputs, candidate routes, and restriction details.
- **Touch-Friendly Controls:**
  - Touch targets $\ge 48\text{px}$ height.
  - Full-width call-to-action buttons (`w-full py-3.5`).
  - Native Devanagari numeric input mode (`inputmode="decimal"`).

### 3.2 Desktop & Tablet Viewport ($\ge 768px$)
- **Two-Column Split Layout:**
  - Left Sidebar (`380px` to `440px` width): Sticky scrollable route planner panel, vehicle selector, turn list, and restriction cards.
  - Right Canvas (flex 1): Full-height interactive MapLibre map viewport with floating legend and zoom controls.

---

## 4. Map Visualization Rules

1. **Origin & Destination:**
   - Origin: Solid Navy circular marker with bold white `A`.
   - Destination: Solid Blue circular marker with bold white `B`.
2. **Route Polylines:**
   - Selected Route: Solid vibrant road blue (`#2563EB`), `width: 6px`, with white casing (`width: 8px`).
   - Alternative Route: Slate dashed line (`#64748B`), `width: 4px`, clickable to switch active route.
3. **Restriction Point Hotspots:**
   - Critical Violation: Circular red badge (`#B91C1C`) with white `✕` glyph (`size: 32px`).
   - Warning Advisory: Circular amber badge (`#B45309`) with white `!` glyph (`size: 28px`).
   - Clicking any restriction hotspot zooms into the location and opens the detailed restriction inspection dialog.

---

## 5. UI State Design

### 5.1 Route Evaluation Status Banners
- **Recommended (Clear):**
  - Green background tint, emerald border, checkmark icon, clear copy: *"No known restriction found"* (साथ में सावधानी नोट: केवल उपलब्ध डेटा जाँचा गया है).
- **Caution / Warning (Advisory):**
  - Amber background tint, amber border, alert triangle icon: *"Check restriction details"* (समय या एक्सल सीमा की जाँच करें).
- **Blocked / Ineligible:**
  - Red background tint, red border, stop octagon icon: *"Not suitable for your vehicle"* (गाड़ी की ऊँचाई या वज़न अधिक है).

### 5.2 Empty & Error States
- **No Route Found:** Friendly explanation with suggestion to check alternative intermediate stops.
- **Missing Vehicle Height:** Prompts driver to add vehicle dimensions with a direct 1-click edit button.
- **Offline / Map Loading Failure:** High-contrast SVG schematic fallback showing route distance and restriction stops without crashing the app.
