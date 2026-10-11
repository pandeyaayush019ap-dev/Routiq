# Routiq — Phase 1 & 2 Audit Report

**Date:** 2026-10-11  
**Repository:** https://github.com/pandeyaayush019ap-dev/Routiq  
**Auditor:** Lead Systems Architect & Senior Full-Stack GIS Routing Engineer

---

## 1. Executive Summary

A comprehensive architectural and codebase audit was performed on the `Routiq` repository across its frontend components, types, services, build setup, dependencies, GIS logic, and deployment configurations.

The repository originally contained a clean, modular React 19 + TypeScript frontend with MapLibre GL JS rendering and a decoupled service interface layer (`src/services/*`). However, in its initial state:
- All services (`routingService.ts`, `vahanService.ts`, `authService.ts`) operated on client-side mock/simulated adapters.
- No backend server or serverless API existed; network requests were simulated with `setTimeout`.
- VAHAN lookups returned hardcoded vehicles (`MH12AB1234`, `DL01AA8821`, etc.) or synthetic records.
- Routing was confined to four hardcoded corridor coordinate sets (`CORRIDOR_ROUTES` in `demoData.ts`).
- Geocoding did not query real external geocoders, only matching 5 hardcoded cities.
- Points of Interest (POIs) along corridors were not implemented or connected to legitimate open spatial data.
- The `vercel.json` file merely redirected all paths to `/index.html`, offering no serverless API routing.
- The npm dependency tree failed installation due to a peer-dependency mismatch between `esbuild@^0.25.0` and `vite@8.3.4`.

This audit establishes the baseline and outlines the full production backend implementation, GIS intelligence layer, genuine multi-provider routing engine, POI discovery, and Vercel full-stack deployment.

---

## 2. Component-by-Component Audit

| Subsystem | Baseline State | Issues & Gaps | Target Implementation |
|---|---|---|---|
| **Frontend Framework** | React 19.0.1 + Vite 8.3.0 + Tailwind CSS v4.3.3 | `esbuild` peer dependency conflict resolved. Frontend compiles in <1s. | Preserved entirely. Extended with POI layer controls, dynamic geocoding autocomplete, and API error states. |
| **Map Rendering** | MapLibre GL JS 6.13 with OpenStreetMap raster tiles | Missing interactive POI markers, route alternative styling adjustments, dynamic waypoint markers. | Preserved MapLibre architecture; integrated dynamic POI overlay layers, real route geometry rendering, and waypoint controls. |
| **Routing Engine** | `DemoRoutingService` with 4 static corridors in `demoData.ts` | Cannot route arbitrary Indian coordinates; vehicle dimensions only checked against static array limits. | Multi-provider backend engine (`ValhallaRoutingProvider` with `truck` costing, `OpenRouteServiceProvider` with `driving-hgv`, `OsrmRoutingProvider` with Turf GIS restriction evaluation, and `OfflineCorridorProvider`). |
| **Truck Restriction Intelligence** | Simple arithmetic comparison in client service against demo array | No real GIS spatial queries; no point-in-polygon or route-line intersection with restriction zones; road-width evaluation absent. | Geospatial analysis engine using `@turf/turf` and PostGIS spatial models. Exact line-intersection with hazard zones; road-width evaluation flagging unverified widths honestly. |
| **MapArc Investigation** | Unspecified proprietary reference | No public "MapArc" npm package exists. Clarified as reference to Esri ArcGIS / ArcMap / StreetMap Premium. | Formalized `IGisProvider` interface; implemented primary open GIS engine via Turf/PostGIS, with `MapArcGisAdapter` stub documented with prerequisites. |
| **Geocoding & Place Search** | Client-side matching against 5 static cities (`CITIES` array) | Users cannot search actual Indian addresses, towns, or logistics hubs. | Real geocoding via Photon / Nominatim API with server-side caching, rate limiting, and debouncing. |
| **Points of Interest (POIs)** | Completely absent | No ability to discover diesel pumps, truck rest areas, repair shops, weighbridges, or dhabas. | Overpass / OpenStreetMap POI provider querying legitimate amenities within route bounding box / buffer, with server-side memory caching. |
| **VAHAN Vehicle Lookup** | Hardcoded client dictionary in `vahanService.ts` | Violates Rule 4 (no fake data in production flows); credentials exposed if client-side. | Secure server-side `POST /api/vehicles/lookup` adapter supporting official ULIP / licensed VAHAN specs with schema validation and explicit unconfigured status. |
| **Authentication & Accounts** | `localStorage` mock session with hardcoded `DEMO_USER` | Any password accepted; no database persistence or security. | Full JWT-based auth with password hashing (`bcryptjs`), user isolation, and PostgreSQL schema. |
| **Database & Persistence** | `localStorage` only | No multi-user support or persistent server-side storage. | PostgreSQL with PostGIS schema migrations + structured memory fallback store when `DATABASE_URL` is unconfigured. |
| **Deployment (Vercel)** | Static SPA rewrite (`/(.*) -> /index.html`) | Backend endpoints would return 404 on Vercel. | Full-stack Vercel setup with serverless API functions (`/api/index.ts`), CORS configuration, and Vite build output. |

---

## 3. Technology & Architecture Decisions

1. **Backend Stack:** Node.js + Express + TypeScript with `@vercel/node` handler for Vercel serverless deployment and standalone `tsx` runner for local/Docker runtime.
2. **Geospatial Engine:** `@turf/turf` for spatial buffer calculation, coordinate distance, bounding box calculation, and line-to-polygon intersection testing with restriction hazard polygons.
3. **Routing Provider Pattern:** Decoupled `IRoutingProvider` interface with primary providers:
   - Valhalla (`costing: "truck"` with `height`, `width`, `weight`, `axle_load`, `length`, `axle_count`, `hazmat`).
   - OpenRouteService (`driving-hgv`).
   - OSRM (real road network geometry + GIS restriction layer).
   - High-fidelity offline Indian corridor geometry for resilient operation.
4. **Geocoding Provider:** Photon (OSM-based geocoding) + Nominatim fallback with server-side caching and debouncing.
5. **POI Discovery:** OpenStreetMap Overpass API querying freight-relevant tags (`fuel`, `parking`, `rest_area`, `truck_repair`, `tyres`, `weighbridge`, `restaurant`) along route bounding boxes.
6. **Data Honesty:** Strict enforcement of Rule 1.1: unverified road widths or missing clearance data are surfaced as `"Data Unavailable / Not Verified"`, never as safe.
