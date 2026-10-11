# Routiq — Project Tasks & Implementation Checklist

**Tracking Status:**
- `[x]` Completed
- `[/]` In Progress
- `[ ]` Pending / Scheduled for Phase 2 (Antigravity)

---

## Phase 1: Frontend Architecture & MapLibre Integration (Google AI Studio)

### 1. Project Initialization & Architecture Setup
- [x] Inspect existing Claude single-file prototype (`Heavy Vehicle-Aware Smart Routing(1).html`).
- [x] Create project documentation suite (`prd.md`, `architecture.md`, `rules.md`, `design.md`, `tasks.md`, `memory.md`).
- [x] Install `maplibre-gl` dependency.
- [x] Configure Tailwind CSS v4 and Google Fonts (`Inter` + `Noto Sans Devanagari`).
- [x] Synchronize `metadata.json` and `index.html` with Routiq branding and OpenGraph tags.
- [x] Configure `vercel.json` for SPA routing fallback.

### 2. Domain Models & Type System
- [x] Define TypeScript interfaces for Vehicles (`VehicleProfile`, `VehicleCategory`, `CargoType`).
- [x] Define GeoJSON and GIS interfaces (`GisCoordinates`, `GeoJsonLineString`, `RestrictionFeature`).
- [x] Define Route planning and restriction interfaces (`RouteCandidate`, `RouteStatus`, `RoadRestriction`).
- [x] Define VAHAN lookup data models (`VahanLookupRequest`, `VahanVehicleDetails`).
- [x] Define Auth state models (`User`, `AuthSession`, `SignInInput`, `SignUpInput`).

### 3. Service Layer (Hexagonal Ports & Adapters)
- [x] Create `IRoutingService` & GeoJSON corridor engine with real Indian freight coordinates (Mumbai–Pune, Mumbai–Nashik, Pune–Nashik, Delhi–Jaipur).
- [x] Create `IVehicleService` with local persistence and strict dimension validation.
- [x] Create `IVahanLookupService` with Indian registration number regex validation and realistic mock adapter.
- [x] Create `IAuthService` client interface for Phase 2 token authentication.
- [x] Create GIS utility functions (`calculateBounds`, `formatDistance`, `formatDuration`).

### 4. Bilingual Localization (English & Hindi)
- [x] Build comprehensive dictionary (`translations.ts`) for all user flows.
- [x] Create `LanguageContext` and `useTranslation` hook with localStorage persistence.
- [x] Verify zero missing translation keys across all modals, banners, forms, and tooltips.

### 5. Genuine MapLibre GL JS Integration
- [x] Build `InteractiveMap.tsx` with MapLibre canvas and OpenStreetMap raster/vector tiles.
- [x] Implement dynamic route polylines (primary selected blue vs alternative dashed).
- [x] Implement interactive restriction markers (Red for blocked clearances, Amber for time/axle warnings).
- [x] Implement origin (`A`) and destination (`B`) pin rendering.
- [x] Implement automated bounding box fitting on route change.
- [x] Implement fallback schematic viewer if WebGL or external tile source fails.
- [x] Add prominent OpenStreetMap copyright attribution.

### 6. Driver-Centric Route Planning UI
- [x] Build `RoutePlanner.tsx` with searchable origin/destination suggestions.
- [x] Implement quick origin/destination swap control.
- [x] Implement departure time picker for time-restricted truck ban evaluation.
- [x] Implement candidate route comparison cards with "Why this route" explanations.
- [x] Implement `RestrictionDetailModal.tsx` for bridge clearance, axle limits, and safety actions.
- [x] Implement "Stop safely before changing route" driver advisory banners.

### 7. Vehicle Management & VAHAN Lookup Workflow
- [x] Build `VehicleManager.tsx` with category badges and specification details.
- [x] Build `VahanLookupSection.tsx` for Indian registration lookup (e.g., `MH12AB1234`).
- [x] Build `VehicleFormModal.tsx` allowing driver review and manual dimension completion.
- [x] Enforce height, width, length, and loaded weight boundaries.

### 8. Authentication & Subscription Interfaces
- [x] Build `AuthModal.tsx` (Sign In / Sign Up, password visibility toggle, phone/email tabs).
- [x] Build `SubscriptionModal.tsx` (Free / Pro / Fleet tier comparison with "Coming Soon" badges).

---

## Phase 2: Backend, Database & Production Routing (Antigravity)

### 9. Antigravity Backend Implementation
- [ ] Initialize Node.js / Express backend server with TypeScript.
- [ ] Provision PostgreSQL database with PostGIS spatial extension.
- [ ] Implement Drizzle ORM schema (`users`, `vehicles`, `restrictions`, `routes_cache`).
- [ ] Connect production VAHAN / ULIP API gateway with server secrets and rate limiting.
- [ ] Connect self-hosted Valhalla or OSRM truck routing engine with heavy-vehicle Lua profile.
- [ ] Implement JWT authentication and session cookies.
- [ ] Implement server-side subscription entitlement checks (Razorpay / Stripe).
