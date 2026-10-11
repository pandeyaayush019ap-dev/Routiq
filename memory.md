# Routiq — Project Memory & Architecture Ledger

**Project Name:** Routiq  
**Tagline:** *Smarter Routes. Safer Journeys.*  
**Created:** 2026-10-11  
**Last Updated:** Phase 1 Completion (Ready for Antigravity Phase 2)

---

## 1. Verified Technical Decisions

1. **Brand & Product Identity:**
   - Name: **Routiq**
   - Domain: Commercial Heavy Vehicle-Aware Routing for Indian Freight Corridors.
   - Default Language: English (`en`) with full native Hindi (`hi` - देवनागरी).
2. **Architecture:**
   - Hexagonal Architecture with decoupled Service Interfaces in `src/services/*`.
   - Frontend is 100% functional standalone in Demo Mode with realistic GeoJSON corridors.
   - Zero hardcoded mock data inside React UI components; everything passes through service contracts.
3. **Map Rendering:**
   - MapLibre GL JS v4+ used for genuine canvas rendering (replaced Claude's static SVG drawing).
   - Tile source: OpenStreetMap standard tiles with explicit OSM copyright attribution.
   - Built-in graceful fallback component in case of offline/WebGL unavailability.
4. **GIS Standards:**
   - GeoJSON standard: `[longitude, latitude]` (EPSG:4326).
   - Real coordinates used for Indian industrial freight corridors: Mumbai, Pune, Nashik, Delhi, Jaipur.
5. **VAHAN Lookup Workflow:**
   - Frontend provides registration regex validation (`^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$`).
   - Mock adapter provides realistic responses for demonstration.
   - The driver is explicitly prompted to review and enrich technical specifications (loaded weight, container height) because standard VAHAN records do not guarantee current payload height.
6. **Unknown Restriction Policy:**
   - "Never treat missing data as clearance." Missing limits trigger an Amber Advisory with "Data Unavailable / Not Verified" labels.

---

## 2. Pending Questions for Antigravity Session

1. **VAHAN API Provider Selection:**
   - Options: Official NIC / ULIP (Unified Logistics Interface Platform) enterprise access, or licensed aggregator (e.g., Signzy, CarInfo, Surepass).
   - Antigravity must configure server-side credentials and rate limits on `POST /api/vehicles/lookup`.
2. **MapArc Identity Clarification:**
   - "MapArc" is not a standard open-source npm package. Antigravity should confirm whether the client intended a specific proprietary spatial SDK or if standard MapLibre GL JS + PostGIS satisfies all mapping requirements.
3. **Heavy Routing Engine:**
   - Recommended engine: Self-hosted Valhalla with `truck` costing model or OSRM with customized `truck.lua` containing height, weight, and axle penalty tags.

---

## 3. Instructions for Antigravity (Phase 2 Hand-off)

1. **Repository Checkout & Review:**
   - Read `prd.md`, `architecture.md`, `rules.md`, `design.md`, `tasks.md`, and `memory.md`.
2. **Implement Backend Endpoints (`/api/*`):**
   - Keep client service interfaces in `src/services/` intact.
   - Switch service implementations to point to the real backend endpoints defined in `architecture.md` (e.g. `POST /api/vehicles/lookup`, `POST /api/routes/calculate`).
3. **Database Setup:**
   - Provision PostgreSQL with PostGIS extension.
   - Create tables for `users`, `vehicles`, `restrictions`, and `routes_cache`.
4. **Authentication:**
   - Connect `src/services/auth/authService.ts` to backend JWT/session endpoints.
5. **Security:**
   - Maintain strict separation: all provider API secrets (VAHAN, Routing Engine) stay on the backend server.
