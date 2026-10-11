# Routiq — Enforceable Engineering Rules & Governance

**Scope:** All developers, AI agents (Google AI Studio, Antigravity), and automated CI pipelines contributing to Routiq.  
**Version:** 1.0.0

---

## 1. Safety & Data Honesty (CRITICAL)

### Rule 1.1: The Unknown Data Law
> **"Never treat missing restriction data as proof that a road is unrestricted or safe."**
- If clearance, bridge weight rating, or municipal timing data is absent or unverified for a route, the system must label it as **"Data Unavailable / Not Verified" (जानकारी उपलब्ध नहीं है)** with an Amber Advisory flag.
- Never display an unconditional "Safe / 100% Cleared" badge on corridors with unverified data.

### Rule 1.2: Driver Stop & Safety Advisory
- Display a prominent advisory on route-planning screens: *"Stop safely before changing the route"* / *"रास्ता बदलने से पहले गाड़ी सुरक्षित रोकें"*.
- Commercial truck operators must never be prompted to interact with the screen while in motion.

### Rule 1.3: Honest Capability Labeling
- Phase 1 demo corridors and simulated restriction fixtures must be visibly labeled as **"DEMO DATA / SIMULATED"**.
- Never pretend simulated routes are live turn-by-turn GPS navigation.
- Never pretend subscription checkout or real billing exists when it is in Phase 1 informational preview mode.

---

## 2. TypeScript & Code Quality Standards

### Rule 2.1: Strict Typing
- No `any` types in domain models, service interfaces, or API contracts.
- Use discriminated unions for route statuses (`'RECOMMENDED' | 'WARNING' | 'BLOCKED'`) and restriction types (`'bridge' | 'axle' | 'weight' | 'time_ban'`).
- All numeric dimensions must specify units in variable names or typed documentation (e.g., `heightMeters`, `gvwTonnes`, `distanceKm`).

### Rule 2.2: Component & Service Separation
- React presentation components (`src/components/*`) must NEVER contain direct data fetching, raw fetch calls, or hardcoded mock fixtures.
- All domain interactions must route through the typed Service Layer (`src/services/*`).
- This allows Phase 2 Antigravity backend replacement with zero component refactoring.

---

## 3. GIS & Mapping Rules

### Rule 3.1: Genuine Interactive Maps Only
- Do not simulate maps with static SVGs or fake CSS lines. MapLibre GL JS must be initialized with an interactive canvas, genuine coordinates, zoom/pan controls, and GeoJSON layers.

### Rule 3.2: Coordinate Convention
- Standard GeoJSON coordinate order is **`[longitude, latitude]`**.
- Reverse conversions (e.g., Leaflet-style `[lat, lng]`) must be handled explicitly with named helper functions (`toGeoJsonCoord`, `fromGeoJsonCoord`).

### Rule 3.3: Attribution Compliance
- OpenStreetMap attribution (`&copy; OpenStreetMap contributors`) must be rendered visibly on the map canvas at all times.

---

## 4. VAHAN Vehicle-Data API Rules

### Rule 4.1: Client-Side Credential Isolation
- Browser code must NEVER call a privileged VAHAN endpoint directly or store VAHAN API keys in frontend environment variables.
- All lookups must pass through the application's backend proxy (`POST /api/vehicles/lookup`).

### Rule 4.2: Registration Number Sanitization
- Input strings must be sanitized by removing spaces, dashes, and converting to uppercase before format evaluation.
- Invalid registration formats must trigger a clear validation message before any network call.

### Rule 4.3: Manual Override Right
- Users must always have the freedom to edit prefilled VAHAN data or choose manual entry if the lookup service is slow, failing, or returns incomplete specifications.

---

## 5. Accessibility & Responsive UI

### Rule 5.1: Touch Targets & Readability
- All clickable elements (buttons, inputs, select triggers, tab items) must have a minimum touch target size of **$48\text{px} \times 48\text{px}$** for driver usability.
- Text contrast must satisfy WCAG AA (minimum 4.5:1 ratio against background).

### Rule 5.2: No Color-Only Indicators
- Route status indicators must combine color with distinctive icons and text:
  - Viable: Green + Checkmark glyph `✔` + Text "Recommended".
  - Warning: Amber + Warning glyph `⚠` + Text "Caution / Check Restrictions".
  - Blocked: Red + Stop glyph `⛔` + Text "Not Suitable for Vehicle".

---

## 6. Internationalization (i18n) Rules

### Rule 6.1: Zero Hardcoded UI Strings
- All user-facing strings (labels, buttons, tooltips, dialogs, error messages, route explanations) must be keyed in `src/i18n/translations.ts`.
- English is default (`en`); Hindi (`hi`) must be complete with zero missing key fallbacks showing raw translation keys.

### Rule 6.2: Persistent Language Preference
- User's selected language must persist in browser storage and immediately apply to all view trees without full page reload.

---

## 7. Definition of Done (DoD)

A pull request or phase milestone is considered Done only if:
1. `npm run build` succeeds with zero errors.
2. `npm run lint` / TypeScript check passes with zero errors.
3. Both English and Hindi rendering are verified across all screens.
4. Real MapLibre map renders with route polylines and interactive restriction markers.
5. Vehicle management works with both VAHAN registration lookup and manual entry.
6. The 6 project documents (`prd.md`, `architecture.md`, `rules.md`, `design.md`, `tasks.md`, `memory.md`) are kept synchronized.
