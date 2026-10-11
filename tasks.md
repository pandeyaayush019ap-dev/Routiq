# Routiq — Project Tasks & Implementation Checklist

**Tracking Status:**
- `[x]` Completed
- `[/]` In Progress
- `[ ]` Pending

---

## Phase 1: Frontend Architecture & MapLibre Integration
- [x] Inspect existing prototype and frontend architecture.
- [x] Create project documentation suite (`prd.md`, `architecture.md`, `rules.md`, `design.md`, `tasks.md`, `memory.md`).
- [x] Configure Tailwind CSS v4 and Google Fonts (`Inter` + `Noto Sans Devanagari`).
- [x] Build `InteractiveMap.tsx` with MapLibre GL JS and OpenStreetMap tile layers.
- [x] Implement bilingual support (English and Hindi) with zero missing keys.
- [x] Implement driver safety banner ("Stop safely before changing route").

---

## Phase 2: Full Production Backend, GIS & Integrations (Completed)

### 1. Backend Architecture & Runtime
- [x] Resolve `esbuild` vs `vite` npm peer dependency conflict in `package.json`.
- [x] Initialize Express + Node.js backend (`src/server/app.ts`, `src/server/index.ts`).
- [x] Build Vercel serverless request handler (`api/index.ts`).
- [x] Configure `vercel.json` and Vite API proxy for full-stack routing.
- [x] Implement CORS, Request ID tracking, and sensitive-data log redaction.

### 2. Multi-Provider Truck Routing Engine
- [x] Create `IRoutingProvider` decoupled interface (`src/server/routing/types.ts`).
- [x] Build `ValhallaProvider` with heavy truck costing (height, width, weight, axle load, hazmat).
- [x] Build `OpenRouteServiceProvider` (`driving-hgv` profile).
- [x] Build `OsrmRoutingProvider` querying real road geometries with automated GIS truck evaluation.
- [x] Build `OfflineCorridorProvider` for high-precision Indian freight gateways.
- [x] Master `RoutingService` orchestrator prioritizing verified compliant routes.

### 3. Geospatial & Truck Restriction Analysis
- [x] Build `@turf/turf` spatial analysis engine (`src/server/gis/spatialEngine.ts`).
- [x] Build verified commercial freight restrictions knowledge base (`knownRestrictions.ts`).
- [x] Implement point-to-line buffer collision detection for physical overhead clearances and gross weight limits.
- [x] Implement road-width intelligence adhering strictly to Rule 1.1 (transparent unverified data disclaimer).
- [x] Conduct MapArc investigation (clarified as Esri ArcMap / ArcGIS StreetMap Premium) and implement `MapArcGisProvider` adapter.

### 4. Real Geocoding & Commercial POI Discovery
- [x] Implement `GeocodingService` with Photon (OSM search) and Nominatim fallback with caching.
- [x] Implement reverse-geocoding endpoint.
- [x] Add dynamic autocomplete dropdown to `RoutePlanner.tsx` for real Indian locations.
- [x] Implement `PlacesService` querying OpenStreetMap Overpass API along route LineStrings.
- [x] Integrate freight POI layer (fuel ⛽, rest stops 🅿️, workshops 🔧, weighbridges ⚖️) into `InteractiveMap.tsx`.

### 5. VAHAN / ULIP Vehicle Registration Gateway
- [x] Implement server-side `POST /api/vehicles/lookup` adapter.
- [x] Implement Indian registration format sanitization and regex validation.
- [x] Check server credentials securely; return structured unconfigured status when keys are absent.
- [x] Eliminate hardcoded fake vehicles from production flows.

### 6. Database Persistence & User Accounts
- [x] Write PostgreSQL + PostGIS schema (`src/server/database/schema.sql`).
- [x] Build database repository layer (`src/server/database/db.ts`) with PostgreSQL support and resilient transactional fallback.
- [x] Implement JWT authentication service with `bcryptjs` password hashing and user isolation.
- [x] Connect frontend `authService` to backend endpoints (`/api/auth/*`).
- [x] Connect frontend `vehicleService` to backend endpoints (`/api/vehicles`).

### 7. Automated Testing & Verification
- [x] Build automated test suite in `tests/` with 27 unit and integration tests using Vitest.
- [x] Verify health and readiness endpoints (`tests/health.test.ts`).
- [x] Verify authentication and JWT access control (`tests/auth.test.ts`).
- [x] Verify geocoding and reverse geocoding (`tests/geocoding.test.ts`).
- [x] Verify truck routing and low bridge clearance violations (`tests/routing.test.ts`).
- [x] Verify GIS spatial analysis and buffer intersections (`tests/gis.test.ts`).
- [x] Verify VAHAN lookup format validation and credentials checks (`tests/vahan.test.ts`).
- [x] Verify commercial POI discovery (`tests/places.test.ts`).
- [x] Verify vehicle profile CRUD persistence (`tests/vehicles.test.ts`).
- [x] Verify clean TypeScript compilation (`tsc --noEmit`) and Vite production bundle (`vite build`).
