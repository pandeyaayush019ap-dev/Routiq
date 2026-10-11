# Routiq — Project Memory & Architecture Ledger

**Project Name:** Routiq  
**Tagline:** *Smarter Routes. Safer Journeys.*  
**Last Updated:** Phase 2 Full Backend & Integrations Completed (Verified & Production Ready)

---

## 1. Verified Technical Decisions

1. **Brand & Product Identity:**
   - Name: **Routiq**
   - Domain: Commercial Heavy Vehicle-Aware Routing for Indian Freight Corridors.
   - Default Language: English (`en`) with full native Hindi (`hi` - देवनागरी).
2. **Architecture:**
   - Full-stack Vercel-compatible architecture.
   - Node.js / Express backend with modular API subsystems (`src/server/*`).
   - Serverless entrypoint in `api/index.ts` and standalone entrypoint in `src/server/index.ts`.
   - Frontend React 19 + TypeScript services in `src/services/*` calling `/api/*` endpoints.
3. **Map & GIS Mapping:**
   - MapLibre GL JS v6 canvas with OpenStreetMap tiles and proper attribution.
   - Dynamic commercial POI layer displaying freight facilities along route geometries.
   - Proximity-based buffer collision evaluation using `@turf/turf`.
4. **Heavy Vehicle Routing:**
   - Decoupled `IRoutingProvider` architecture.
   - Primary: Valhalla Truck Engine (`costing: "truck"`), OpenRouteService HGV, OSRM Road Network + Routiq Spatial GIS, and High-Precision Offline Corridor provider.
   - Transparent handling when no compliant route exists without hiding warnings.
5. **Road Width Intelligence (Rule 1.1):**
   - Honest reporting of unverified road width data. Never claims roads are safe based on visual line thickness.
6. **MapArc Investigation Outcome:**
   - Comprehensive investigation concluded that "MapArc" refers to Esri's ArcMap / ArcGIS Network Analyst with StreetMap Premium commercial routing.
   - Implemented `IGisProvider` with default `OpenSpatialGisProvider` (Turf.js) and `MapArcGisProvider` adapter stub requiring `ARCGIS_API_KEY`.
7. **VAHAN Vehicle Lookup:**
   - Implemented server-side `POST /api/vehicles/lookup` with registration regex validation (`^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$`).
   - Server returns explicit `UNCONFIGURED_CREDENTIALS` status when credentials are not configured, prompting driver for manual entry without fabricated fake data.
8. **Authentication & Persistence:**
   - JWT tokens with `bcryptjs` password hashing and user isolation.
   - PostgreSQL + PostGIS schema (`src/server/database/schema.sql`) with in-memory transactional store fallback.
9. **Verification & Quality:**
   - 27 automated tests passing across 8 test suites in Vitest.
   - Zero TypeScript compile errors (`tsc --noEmit`).
   - Clean Vite production build (`dist`).
