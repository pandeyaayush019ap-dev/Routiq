# Routiq — Product Requirements Document (PRD)

**Product Name:** Routiq  
**Tagline:** *Smarter Routes. Safer Journeys.*  
**Document Version:** 1.0.0  
**Status:** In Active Development (Phase 1 Frontend Refactoring; Phase 2 Antigravity Backend Preparation)

---

## 1. Executive Summary & Problem Statement

Commercial road freight in India accounts for over 70% of domestic freight movement. However, heavy commercial vehicles (HCVs, multi-axle trucks, tippers, container carriers, and tankers) face critical routing hurdles that standard consumer navigation apps (designed for passenger cars) ignore:

1. **Physical Obstacles:** Low-clearance railway underpasses, historical arches, flyovers, and overhead pipeline crossings (e.g., Lonavala overbridge < 4.2m).
2. **Structural Limits:** Gross Vehicle Weight (GVW) limits on older bridges, single-lane causeways, and strict axle-load weight restrictions.
3. **Regulatory Bans:** Time-dependent "No-Entry" windows (e.g., municipal entry bans between 07:00–11:00 and 17:00–21:00 in metro corridors like Kasara Ghat, Mumbai, Pune, Delhi).
4. **Dimensional Hazards:** Narrow ghat sections, sharp hairpin turns (ghat sections), and mandatory bypass regulations for hazardous/chemical freight.
5. **Costly Consequences:** Bridge strikes, vehicle damage, severe traffic gridlocks, impoundment penalties, and delayed supply chains.

**Routiq** is an Indian heavy-vehicle-aware smart routing platform engineered specifically for truck drivers, fleet operators, and logistics dispatchers. It prioritizes constraint satisfaction and safety over raw passenger-car shortest distance.

---

## 2. Target Users & Personas

### 2.1 Primary Users
- **Indian Truck Drivers:**
  - Often operate mid-range Android smartphones in portrait orientation.
  - Require simplified, high-contrast UI with Devanagari (Hindi) support.
  - Require fast route assessment with minimal typing (e.g., prefilled city corridors, quick vehicle selection, VAHAN registration auto-lookup).
- **Owner-Operators:**
  - Own 1 to 5 commercial vehicles; need accurate dimension tracking to avoid costly toll penalties and chassis damage.

### 2.2 Secondary Users
- **Fleet Managers & Logistics Dispatchers:**
  - Manage dispatch schedules across inter-state freight corridors (e.g., Mumbai–Pune, Mumbai–Nashik, Delhi–Jaipur).
  - Require transparent constraint violation audits and alternative route comparisons.

---

## 3. Core Functional Requirements

### 3.1 Vehicle Profile Management
- Maintain vehicle profiles with physical and regulatory attributes:
  - **Category:** Rigid Truck, Multi-Axle Container, Tipper, Tanker, Trailer.
  - **Gross Vehicle Weight (GVW):** Registered legal maximum in metric tonnes.
  - **Current Loaded Weight:** Actual payload + tare weight in metric tonnes.
  - **Dimensions:** Total Height (m), Width (m), Length (m).
  - **Axle Configuration:** Number of axles (2, 3, 4, 6+), axle load rating.
  - **Cargo Type:** General Freight, Hazardous Materials (Hazmat/Chemical), Perishable, Over-Dimensional Cargo (ODC).
- Local offline persistence (IndexedDB / localStorage in Phase 1; PostgreSQL database via Antigravity in Phase 2).

### 3.2 VAHAN Vehicle-Data API Integration Workflow
- Indian commercial vehicle registration search (e.g., `MH 12 AB 1234`, `DL 01 AA 9999`).
- Retrieval of certified vehicle details via Routiq backend proxy (`POST /api/vehicles/lookup`):
  - Registration number, Maker & Model, Vehicle Class, Fuel Type, Registered GVW, Unladen Weight.
- **Review & Enrichment Step:** The driver verifies prefilled values and enters route-critical attributes that standard VAHAN records do not guarantee (e.g., current loaded weight, custom container height, cargo hazmat status).
- Fallback to manual entry when VAHAN is unavailable or registration is unlisted.

### 3.3 Heavy Vehicle Route Planning
- Origin and Destination selection with suggestion matching and quick-swap button.
- Departure time input to evaluate time-dependent truck bans (e.g., Kasara Ghat 07:00–11:00 ban).
- Constraint Validation Engine:
  - Evaluation of each route segment against selected vehicle height, width, length, GVW, and axle load.
  - Explicit classification of routes into:
    - **Recommended (Viable):** Free of known vehicle violations.
    - **Advisory (Warning):** Operational conditions require caution (e.g., unverified axle load rating, tight curve, weather caution).
    - **Blocked / Ineligible (Critical Violation):** Definite restriction violation (e.g., vehicle height 4.3m exceeds bridge clearance 4.0m).
- Comparison view displaying travel distance (km), estimated heavy-vehicle driving duration (hours/mins), violation status, and route justification ("Why this route").

### 3.4 GIS & Interactive Map Visualization
- Genuine MapLibre GL JS integration with OpenStreetMap-compatible raster/vector tiles.
- Vector polylines for candidate routes with distinct styling:
  - Primary selected route (vibrant road blue polyline).
  - Alternative route (subtle slate dashed polyline).
  - Critical restriction hotspots (high-visibility red restriction markers with danger glyphs).
  - Warning/advisory points (amber caution markers).
- Origin (`A`) and Destination (`B`) markers with bounds auto-fit.
- Dynamic restriction detail inspection drawer/dialog.
- Visible, compliant OpenStreetMap copyright attribution.
- Offline/error fallback notice with route schematic.

### 3.5 Bilingual Support (English & Hindi)
- First-class English and Hindi (हिंदी) translations across all user interfaces, alerts, modals, vehicle forms, and route explanations.
- Persistent user preference across browser sessions.
- Simple, respectful phrasing tailored for Indian transportation terminology (e.g., "गाड़ी की ऊँचाई", "एक्सल भार", "सड़क पर पाबंदी").

### 3.6 Authentication & Account Interface
- Authentication screens for Sign In and Sign Up (email/phone number + password).
- Form validation with error states and password visibility toggle.
- Typed authentication service interface (`IAuthService`) ready for Phase 2 backend session & token exchange.
- Driver Profile view with quick sign-out.

### 3.7 Tiered Subscription Preview Modal
- Presentation of tiered plans:
  - **Free (चालक / Driver):** Basic route check, single vehicle profile, demo corridors.
  - **Pro (मालिक / Owner-Operator):** Unlimited vehicle profiles, VAHAN fast lookup, real-time restriction alerts, offline cache.
  - **Fleet (ट्रांसपोर्टर / Fleet Operator):** Multi-vehicle telematics, custom low-bridge hazards, priority support, API integration.
- Transparent "Coming Soon" badges (no deceptive payment collection or mock claims of active billing).

---

## 4. Non-Functional Requirements

1. **Performance:** Sub-second UI responsiveness; lightweight asset footprint for 3G/4G connectivity on mobile devices.
2. **Mobile First:** Optimized for viewport sizes from 360px width upwards; touch targets $\ge 48\text{px}$.
3. **Accessibility:** WCAG AA contrast compliance; semantic HTML; screen-reader labels for iconography; keyboard-navigable dialogs.
4. **Data Integrity:** Honest data labeling—missing restriction data is never reported as "safe/cleared", but as "unverified/data unavailable".
5. **Security:** No secrets or private API keys bundled into client code.

---

## 5. Scope Boundary: Phase 1 (Frontend Refactor) vs Phase 2 (Antigravity Backend)

| Feature Area | Phase 1 (Google AI Studio - Current) | Phase 2 (Antigravity - Next) |
|---|---|---|
| **Map Rendering** | Real MapLibre GL JS + OSM tiles | Production vector tile server / MapLibre styles |
| **Routing** | Provider-independent `IRoutingService` + GeoJSON deterministic engine | OSRM / Valhalla / GraphHopper with custom truck profile Lua rules |
| **VAHAN Lookup** | `IVahanLookupService` + Mock adapter + Verification UI | Secure Government/ULIP/CarInfo backend proxy with private API secrets |
| **Vehicle Profiles** | Browser storage + typed `IVehicleService` | PostgreSQL database with Cloud SQL / Drizzle ORM |
| **Auth** | UI screens + `IAuthService` client contract | Secure JWT/Session cookies, Firebase/OAuth, DB users table |
| **Billing** | Informational bilingual modal | Stripe / Razorpay Webhooks & server-side entitlement checks |
