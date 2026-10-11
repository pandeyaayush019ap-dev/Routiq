# Routiq — Heavy Vehicle-Aware Smart Routing

> **Smarter Routes. Safer Journeys.**  
> A specialized heavy-vehicle routing platform for Indian truck drivers, fleet operators, and logistics companies.

---

## 🌟 Overview

Standard car navigation engines route heavy commercial vehicles (HCVs, container multi-axles, tankers, tippers) through low railway overbridges, weight-restricted bridges, and time-restricted municipal zones. **Routiq** validates candidate routes against actual physical vehicle specifications (height, width, gross weight, axle loads) and regulatory time-bans.

### Key Capabilities in Phase 1 (Frontend):
- **Genuine Interactive Map:** Powered by **MapLibre GL JS** and **OpenStreetMap** with route polylines, restriction danger hotspots, and attribution.
- **Indian Commercial Freight Corridors:** High-fidelity GeoJSON routes for Mumbai–Pune (Expressway vs. Khandala Ghat), Mumbai–Nashik (Kasara Ghat time bans), Pune–Nashik, and Delhi–Jaipur.
- **VAHAN Registration Lookup Flow:** Enter Indian RC numbers (e.g., `MH12AB1234`) to prefill vehicle profiles with technical verification and manual override.
- **Full Bilingual Support:** Native English and Hindi (हिंदी) with persistent language switching.
- **Driver-Centric UI:** Large $\ge 48\text{px}$ touch targets, high-contrast indicators, "Stop safely before changing route" safety advisories.
- **Authentication & Subscription Interfaces:** Auth modal with password visibility toggle; tiered subscription preview modal.
- **Hexagonal Architecture:** Decoupled service layer ready for Antigravity Phase 2 backend connection.

---

## 🚀 Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production (Vercel compatible)
npm run build

# 4. Run type checker
npm run lint
```

The application will start on `http://localhost:3000`.

---

## 📁 Project Structure

```
├── prd.md                 # Product Requirements Document
├── architecture.md        # Technical Architecture & Antigravity Handoff Spec
├── rules.md               # Enforceable Engineering Rules
├── design.md              # Design System & Visual Specification
├── tasks.md               # Prioritized Implementation Checklist
├── memory.md              # Project Memory & Decisions Ledger
├── vercel.json            # Vercel deployment rewrite rules
└── src/
    ├── types/             # Domain types (Vehicles, Routes, Restrictions, VAHAN, Auth)
    ├── i18n/              # English & Hindi translation dictionaries & context
    ├── services/          # Hexagonal Service Layer (Routing, Vehicles, VAHAN, Auth, Maps, GIS)
    ├── components/
    │   ├── layout/        # Header, Top Navigation, Brand Bar
    │   ├── map/           # MapLibre GL map, Legend, Fallback schematic
    │   ├── routing/       # Route Planner, Turn list, Restriction details modal
    │   ├── vehicles/      # Vehicle Manager, VAHAN lookup section, Edit modal
    │   ├── auth/          # Sign In / Sign Up modal
    │   ├── subscription/  # Tiered plan preview modal
    │   └── settings/      # Help FAQs & driver advisories
    ├── App.tsx            # Main state orchestrator
    └── main.tsx           # React entry point
```

---

## 🛠 Hand-off to Antigravity (Phase 2)

See `architecture.md` and `memory.md` for complete API contracts (`POST /api/vehicles/lookup`, `POST /api/routes/calculate`, `POST /api/auth/*`), database schema (PostgreSQL + PostGIS), and deployment requirements.
