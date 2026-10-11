# Routiq — Heavy Vehicle-Aware Smart Routing

> **Smarter Routes. Safer Journeys.**  
> A production-oriented heavy-vehicle routing platform for Indian truck drivers, fleet operators, and logistics dispatchers.

[![Build & Test Status](https://img.shields.io/badge/tests-27%20passed-brightgreen.svg)]()
[![Frontend](https://img.shields.io/badge/frontend-React%2019%20%7C%20MapLibre%20GL-blue.svg)]()
[![Backend](https://img.shields.io/badge/backend-Express%20%7C%20Node.js%20%7C%20GIS-indigo.svg)]()
[![Deployment](https://img.shields.io/badge/deployment-Vercel%20Full--Stack-black.svg)]()

---

## 🌟 Overview

Standard car navigation systems route heavy commercial vehicles (HCVs, multi-axle trailers, tippers, petroleum tankers) through low railway overbridges, weight-restricted bridges, and restricted municipal peak hours. **Routiq** calculates routes and validates them against physical truck dimensions (height, width, gross weight, axle loads) and time-based entry bans.

### Core Capabilities:
- **Genuine Interactive Map:** Powered by **MapLibre GL JS** and **OpenStreetMap** with continuous route geometry, bounding auto-fit, alternative route comparison, and danger markers.
- **Heavy-Vehicle GIS Intelligence:** Built with `@turf/turf` spatial analysis. Detects route intersections with physical hazard zones (e.g., Lonavala 4.1m railway arch, Kalwa Bridge 35t limit, Kasara Ghat time bans).
- **Road-Width Intelligence:** Transparent evaluation of roadway widths. Adheres strictly to **Rule 1.1** (The Unknown Data Law)—never manufactures fake width data, labeling unverified segments as `"Width data unavailable / Not verified"`.
- **Multi-Provider Routing Engine:** Modular adapter architecture supporting:
  - **Valhalla Engine** (`costing: "truck"` with height, width, weight, axle load, length, hazmat).
  - **OpenRouteService** (`driving-hgv`).
  - **OSRM Network Router** with automated spatial truck restriction evaluation.
  - **High-Precision Offline Corridor Fallback** for major Indian freight gateways (Mumbai–Pune, Mumbai–Nashik, Pune–Nashik, Delhi–Jaipur).
- **Live Commercial POI Discovery:** Queries OpenStreetMap Overpass API for freight facilities along the planned route (Diesel pumps ⛽, truck rest areas 🅿️, workshops 🔧, tyre repair 🚗, weighbridges ⚖️, dhabas 🍲).
- **Geocoding & Place Search:** Real address autocomplete across India via Photon and Nominatim with server-side caching and debouncing.
- **VAHAN Registration Gateway:** Server-side `POST /api/vehicles/lookup` adapter supporting official ULIP / licensed VAHAN specs with format sanitization, credential checking, and manual fallback.
- **Database Persistence & User Accounts:** PostgreSQL with PostGIS schema (`users`, `vehicles`, `saved_routes`, `road_restrictions`), secure JWT sessions, `bcryptjs` password hashing, and user isolation.
- **Full Bilingual Support:** Native English and Hindi (हिंदी - देवनागरी) across all modals, banners, forms, and route explanations.
- **Vercel Full-Stack Deployment:** Zero-configuration serverless API functions (`/api/*`) and optimized Vite client bundle.

---

## 🚀 Quick Start (Development & Local Run)

### Prerequisites
- Node.js $\ge 20$ (Node 24 tested)
- npm $\ge 10$

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(When external API keys are omitted, Routiq operates out-of-the-box using the OSRM road network, OpenStreetMap Overpass POIs, and an in-memory transactional database store).*

### 3. Run Development Servers
In terminal 1 (start backend API on port 3001):
```bash
npm run server
```

In terminal 2 (start Vite client on port 3000):
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🧪 Automated Testing & Verification

Run the complete 27-test verification suite (unit tests, integration tests, and GIS checks):
```bash
npm run test
```

Run TypeScript compilation and production build check:
```bash
npm run lint
npm run build
```

---

## 📡 Backend API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Server health, uptime, and version status |
| `/api/health/ready` | `GET` | Readiness check for database, GIS, and routing subsystems |
| `/api/geocoding/search` | `GET / POST` | Real Indian address and place search with coordinates |
| `/api/geocoding/reverse` | `GET` | Reverse geocode coordinates to structured address |
| `/api/routes` | `POST` | Calculate truck-safe route candidates with restriction evaluation |
| `/api/routes/alternatives` | `POST` | Retrieve alternative route corridors |
| `/api/routes/analyze` | `POST` | Perform spatial GIS restriction analysis on arbitrary GeoJSON LineString |
| `/api/routes/save` | `POST` | Save planned route to user account (JWT required) |
| `/api/routes/saved` | `GET` | Retrieve saved routes for authenticated user |
| `/api/places/nearby` | `GET` | Find commercial freight POIs near coordinates |
| `/api/places/along-route` | `POST` | Discover fuel stations, rest stops, and weighbridges along route |
| `/api/vehicles/lookup` | `POST` | Server-side VAHAN / ULIP commercial registration lookup |
| `/api/vehicles` | `GET / POST` | List or create vehicle profiles |
| `/api/vehicles/:id` | `PATCH / DELETE` | Update or remove vehicle profile |
| `/api/auth/register` | `POST` | Create new user account with bcrypt password hashing |
| `/api/auth/login` | `POST` | Sign in and receive JWT token |
| `/api/auth/me` | `GET` | Get authenticated user profile |
| `/api/gis/restrictions` | `GET` | List verified commercial freight restriction hotspots |

---

## 🌐 Vercel Production Deployment

Routiq is engineered for seamless deployment on Vercel:

1. Connect the GitHub repository `pandeyaayush019ap-dev/Routiq` in the Vercel dashboard.
2. Build Settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Environment Variables:
   - Configure variables documented in `.env.example` (`JWT_SECRET`, `DATABASE_URL`, `VAHAN_API_KEY`, etc.).
4. Deployment:
   - Vercel automatically deploys the frontend static assets and routes all `/api/*` requests to the serverless function handler in `api/index.ts`.

---

## 📄 License & Attribution

- **License:** Apache 2.0
- **Map Data:** &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
