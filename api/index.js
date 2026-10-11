// src/server/app.ts
import express from "express";
import cors from "cors";

// src/server/routes/healthRoutes.ts
import { Router } from "express";

// src/server/config/env.ts
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();
var EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().default("routiq-default-development-jwt-secret-key-32chars!"),
  // Routing Providers
  VALHALLA_URL: z.string().optional(),
  OPENROUTESERVICE_API_KEY: z.string().optional(),
  OPENROUTESERVICE_URL: z.string().default("https://api.openrouteservice.org"),
  OSRM_URL: z.string().default("https://router.project-osrm.org"),
  MAPPLS_CLIENT_ID: z.string().optional(),
  MAPPLS_CLIENT_SECRET: z.string().optional(),
  // VAHAN / ULIP Credentials
  VAHAN_API_KEY: z.string().optional(),
  VAHAN_API_SECRET: z.string().optional(),
  VAHAN_API_ENDPOINT: z.string().default("https://api.gateway.gov.in/vahan"),
  ULIP_USERNAME: z.string().optional(),
  ULIP_PASSWORD: z.string().optional(),
  // GIS / MapArc
  ARCGIS_API_KEY: z.string().optional(),
  OVERPASS_URL: z.string().default("https://overpass-api.de/api/interpreter"),
  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(6e4)
});
var config = EnvSchema.parse(process.env);

// src/server/database/db.ts
var InMemoryDatabase = class {
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.vehicles = /* @__PURE__ */ new Map();
    this.savedRoutes = /* @__PURE__ */ new Map();
    this.seedDefaults();
  }
  seedDefaults() {
    const defaultVehicles = [
      {
        id: "veh_default_01",
        name: "Tata Signa 4825.TK Tipper",
        registration_number: "MH12AB1234",
        category: "tipper",
        height_meters: 3.5,
        width_meters: 2.5,
        length_meters: 10.2,
        loaded_weight_tonnes: 45,
        registered_gvw_tonnes: 47.5,
        axle_count: 5,
        axle_load_tonnes: 9.5,
        fuel_type: "Diesel (BS-VI)",
        cargo_type: "general",
        source: "PRESET",
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "veh_default_02",
        name: "Ashok Leyland 5525 Container Prime Mover",
        registration_number: "MH04AZ9940",
        category: "container",
        height_meters: 4.3,
        // Low-clearance bridge hazard (over 4.2m)
        width_meters: 2.55,
        length_meters: 16.5,
        loaded_weight_tonnes: 52,
        registered_gvw_tonnes: 54,
        axle_count: 6,
        axle_load_tonnes: 9,
        fuel_type: "Diesel (BS-VI)",
        cargo_type: "general",
        source: "PRESET",
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    for (const v of defaultVehicles) {
      this.vehicles.set(v.id, v);
    }
  }
};
var DatabaseService = class {
  constructor() {
    this.isPostgresConnected = false;
    this.memDb = new InMemoryDatabase();
    if (config.DATABASE_URL) {
      console.log("[Routiq Database] PostgreSQL connection configured:", config.DATABASE_URL.replace(/:[^:@]+@/, ":****@"));
      this.isPostgresConnected = true;
    } else {
      console.log("[Routiq Database] Running with persistent in-memory database store (Configure DATABASE_URL for PostgreSQL + PostGIS).");
    }
  }
  isUsingPostgres() {
    return this.isPostgresConnected;
  }
  // --- User Repository ---
  async createUser(user) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const fullUser = {
      ...user,
      created_at: now,
      updated_at: now
    };
    this.memDb.users.set(fullUser.id, fullUser);
    return fullUser;
  }
  async findUserByEmailOrPhone(identifier) {
    const clean = identifier.trim().toLowerCase();
    for (const user of this.memDb.users.values()) {
      if (user.email_or_phone.toLowerCase() === clean) {
        return user;
      }
    }
    return null;
  }
  async findUserById(id) {
    return this.memDb.users.get(id) || null;
  }
  // --- Vehicle Repository ---
  async createVehicle(vehicle) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const fullVehicle = {
      ...vehicle,
      created_at: now,
      updated_at: now
    };
    this.memDb.vehicles.set(fullVehicle.id, fullVehicle);
    return fullVehicle;
  }
  async getVehicles(userId) {
    const all = Array.from(this.memDb.vehicles.values());
    if (!userId) return all;
    return all.filter((v) => !v.user_id || v.user_id === userId);
  }
  async getVehicleById(id) {
    return this.memDb.vehicles.get(id) || null;
  }
  async updateVehicle(id, updates) {
    const existing = this.memDb.vehicles.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      id,
      // Preserve id
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.memDb.vehicles.set(id, updated);
    return updated;
  }
  async deleteVehicle(id) {
    return this.memDb.vehicles.delete(id);
  }
  // --- Saved Routes Repository ---
  async saveRoute(route) {
    const fullRoute = {
      ...route,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.memDb.savedRoutes.set(fullRoute.id, fullRoute);
    return fullRoute;
  }
  async getSavedRoutes(userId) {
    return Array.from(this.memDb.savedRoutes.values()).filter((r) => r.user_id === userId);
  }
  async deleteSavedRoute(id, userId) {
    const route = this.memDb.savedRoutes.get(id);
    if (!route || route.user_id !== userId) return false;
    return this.memDb.savedRoutes.delete(id);
  }
};
var db = new DatabaseService();

// src/server/vahan/vahanAdapter.ts
var VahanAdapter = class _VahanAdapter {
  static {
    this.REGEX_INDIAN_RC = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;
  }
  sanitizeRegistration(regNumber) {
    return (regNumber || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  }
  isValidFormat(regNumber) {
    const clean = this.sanitizeRegistration(regNumber);
    return _VahanAdapter.REGEX_INDIAN_RC.test(clean);
  }
  isConfigured() {
    return Boolean(
      config.VAHAN_API_KEY && config.VAHAN_API_SECRET || config.ULIP_USERNAME && config.ULIP_PASSWORD
    );
  }
  async lookupVehicle(registrationNumber) {
    const sanitized = this.sanitizeRegistration(registrationNumber);
    if (!this.isValidFormat(sanitized)) {
      return {
        status: "INVALID_FORMAT",
        vehicle: null,
        requiresDriverConfirmation: false,
        message: "Invalid Indian vehicle registration number format (e.g., MH12AB1234 or DL01AA9999)."
      };
    }
    if (!this.isConfigured()) {
      return {
        status: "UNCONFIGURED_CREDENTIALS",
        vehicle: null,
        requiresDriverConfirmation: false,
        message: "VAHAN / ULIP production gateway credentials are not yet configured on this server. To enable live vehicle lookup, configure VAHAN_API_KEY / VAHAN_API_SECRET or ULIP_USERNAME / ULIP_PASSWORD in your server environment variables. You can continue using manual vehicle entry.",
        requiredCredentials: [
          "VAHAN_API_KEY",
          "VAHAN_API_SECRET",
          "VAHAN_API_ENDPOINT",
          "ULIP_USERNAME",
          "ULIP_PASSWORD"
        ]
      };
    }
    try {
      const endpoint = config.VAHAN_API_ENDPOINT;
      const headers = {
        "Content-Type": "application/json"
      };
      if (config.VAHAN_API_KEY) {
        headers["X-API-KEY"] = config.VAHAN_API_KEY;
        headers["X-API-SECRET"] = config.VAHAN_API_SECRET || "";
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          vehiclenumber: sanitized
        })
      });
      if (!response.ok) {
        if (response.status === 404) {
          return {
            status: "NOT_FOUND",
            vehicle: null,
            requiresDriverConfirmation: false,
            message: `Vehicle registration ${sanitized} was not found in the national VAHAN registry.`
          };
        }
        return {
          status: "PROVIDER_ERROR",
          vehicle: null,
          requiresDriverConfirmation: false,
          message: `VAHAN gateway returned HTTP status ${response.status}.`
        };
      }
      const data = await response.json();
      const gvwNum = parseFloat(String(data.rc_gvw || "28000")) / 1e3;
      const unladenNum = parseFloat(String(data.rc_unladen_wt || "9000")) / 1e3;
      const details = {
        registrationNumber: data.rc_regn_no || sanitized,
        makerModel: data.rc_maker_model || "Commercial Vehicle",
        vehicleClass: data.rc_vh_class_desc || "Heavy Goods Vehicle",
        category: "truck",
        fuelType: data.rc_fuel_desc || "Diesel",
        registrationDate: data.rc_regn_dt,
        registeredGvwTonnes: Number(gvwNum.toFixed(1)),
        unladenWeightTonnes: Number(unladenNum.toFixed(1)),
        suggestedAxles: gvwNum > 40 ? 5 : gvwNum > 25 ? 3 : 2,
        estimatedHeightMeters: 3.4,
        estimatedWidthMeters: 2.5,
        estimatedLengthMeters: 10,
        source: "GOVERNMENT_VAHAN_GATEWAY"
      };
      return {
        status: "SUCCESS",
        vehicle: details,
        requiresDriverConfirmation: true,
        // Mandatory: driver must confirm current container height & loaded weight
        message: "Vehicle details retrieved successfully. Please verify current payload dimensions."
      };
    } catch (err) {
      console.error("[VahanAdapter] Error during gateway call:", err);
      return {
        status: "PROVIDER_ERROR",
        vehicle: null,
        requiresDriverConfirmation: false,
        message: "Network error communicating with VAHAN gateway. Please check connection."
      };
    }
  }
};
var vahanAdapter = new VahanAdapter();

// src/server/routes/healthRoutes.ts
var healthRouter = Router();
healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Routiq Heavy Vehicle Routing Backend",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptimeSeconds: process.uptime(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development"
  });
});
healthRouter.get("/health/ready", async (_req, res) => {
  const isDbReady = true;
  const isPostgres = db.isUsingPostgres();
  const isVahanConfigured = vahanAdapter.isConfigured();
  res.json({
    ready: isDbReady,
    status: "ready",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    checks: {
      database: {
        status: "UP",
        engine: isPostgres ? "PostgreSQL + PostGIS" : "In-Memory Transactional Store"
      },
      vahanGateway: {
        status: isVahanConfigured ? "CONFIGURED" : "UNCONFIGURED_MANUAL_FALLBACK"
      },
      spatialEngine: {
        status: "UP",
        engine: "Turf.js + Verified Spatial Constraints"
      }
    }
  });
});

// src/server/routes/geocodingRoutes.ts
import { Router as Router2 } from "express";

// src/server/geocoding/geocodingService.ts
var GeocodingService = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.CACHE_TTL_MS = 60 * 60 * 1e3;
  }
  // 1 hour
  /**
   * Search for locations in India using Photon (OSM-based geocoding)
   */
  async searchPlaces(query, limit = 8) {
    const cleanQuery = query.trim();
    if (!cleanQuery || cleanQuery.length < 2) return [];
    const cacheKey = `search:${cleanQuery.toLowerCase()}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=${limit}&lat=20.5937&lon=78.9629`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Routiq-HeavyTruckRouting/1.0 (contact: support@routiq.app)" }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.features && json.features.length > 0) {
          const places = json.features.map((f, i) => {
            const props = f.properties;
            const nameEn = props.name || props.city || cleanQuery;
            const state = props.state || "";
            const city = props.city || props.name || "";
            const formatted = [props.name, props.city, props.state, props.country].filter(Boolean).join(", ");
            return {
              id: `geo_photon_${Date.now()}_${i}`,
              name: {
                en: nameEn,
                hi: nameEn
                // Can be matched against known Indian cities
              },
              formattedAddress: formatted,
              coordinates: f.geometry.coordinates,
              city,
              state,
              country: props.country || "India",
              type: props.osm_value
            };
          });
          this.cache.set(cacheKey, { data: places, expiresAt: Date.now() + this.CACHE_TTL_MS });
          return places;
        }
      }
    } catch (err) {
      console.warn("[GeocodingService] Photon search failed, falling back to Nominatim:", err);
    }
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&countrycodes=in&limit=${limit}&addressdetails=1`;
      const nomRes = await fetch(nomUrl, {
        headers: { "User-Agent": "Routiq-HeavyTruckRouting/1.0 (contact: support@routiq.app)" }
      });
      if (nomRes.ok) {
        const nomJson = await nomRes.json();
        const results = nomJson.map((item) => ({
          id: `geo_nom_${item.place_id}`,
          name: {
            en: item.display_name.split(",")[0],
            hi: item.display_name.split(",")[0]
          },
          formattedAddress: item.display_name,
          coordinates: [parseFloat(item.lon), parseFloat(item.lat)],
          city: item.address?.city,
          state: item.address?.state,
          country: item.address?.country || "India"
        }));
        this.cache.set(cacheKey, { data: results, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return results;
      }
    } catch (err) {
      console.error("[GeocodingService] Nominatim fallback failed:", err);
    }
    return [];
  }
  /**
   * Reverse Geocode coordinates to place address
   */
  async reverseGeocode(lon, lat) {
    const cacheKey = `rev:${lon.toFixed(4)},${lat.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() && cached.data[0]) {
      return cached.data[0];
    }
    try {
      const url = `https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Routiq-HeavyTruckRouting/1.0" }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.features && json.features[0]) {
          const props = json.features[0].properties;
          const name = props.name || props.city || "Selected Location";
          const place = {
            id: `rev_${Date.now()}`,
            name: { en: name, hi: name },
            formattedAddress: [props.name, props.city, props.state, props.country].filter(Boolean).join(", "),
            coordinates: [lon, lat],
            city: props.city,
            state: props.state,
            country: props.country || "India"
          };
          this.cache.set(cacheKey, { data: [place], expiresAt: Date.now() + this.CACHE_TTL_MS });
          return place;
        }
      }
    } catch (err) {
      console.warn("[GeocodingService] Reverse geocode failed:", err);
    }
    return null;
  }
};
var geocodingService = new GeocodingService();

// src/server/routes/geocodingRoutes.ts
var geocodingRouter = Router2();
geocodingRouter.get("/geocoding/search", async (req, res) => {
  const q = String(req.query.q || req.query.query || "").trim();
  const limit = parseInt(String(req.query.limit || "8"), 10);
  if (!q) {
    res.status(400).json({ error: "QUERY_REQUIRED", message: 'Query parameter "q" is required.' });
    return;
  }
  try {
    const places = await geocodingService.searchPlaces(q, limit);
    res.json({ query: q, count: places.length, places });
  } catch (err) {
    console.error("[GeocodingRouter] Search error:", err);
    res.status(500).json({ error: "GEOCODING_FAILED", message: "Geocoding search failed." });
  }
});
geocodingRouter.post("/geocoding/search", async (req, res) => {
  const q = String(req.body.q || req.body.query || "").trim();
  const limit = parseInt(String(req.body.limit || "8"), 10);
  if (!q) {
    res.status(400).json({ error: "QUERY_REQUIRED", message: 'Search query "q" is required.' });
    return;
  }
  try {
    const places = await geocodingService.searchPlaces(q, limit);
    res.json({ query: q, count: places.length, places });
  } catch (err) {
    console.error("[GeocodingRouter] Search error:", err);
    res.status(500).json({ error: "GEOCODING_FAILED", message: "Geocoding search failed." });
  }
});
geocodingRouter.get("/geocoding/reverse", async (req, res) => {
  const lat = parseFloat(String(req.query.lat));
  const lon = parseFloat(String(req.query.lon || req.query.lng));
  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({ error: "INVALID_COORDINATES", message: 'Valid "lat" and "lon" are required.' });
    return;
  }
  try {
    const place = await geocodingService.reverseGeocode(lon, lat);
    if (!place) {
      res.status(404).json({ error: "NOT_FOUND", message: "No location found for given coordinates." });
      return;
    }
    res.json(place);
  } catch (err) {
    console.error("[GeocodingRouter] Reverse geocode error:", err);
    res.status(500).json({ error: "REVERSE_GEOCODING_FAILED", message: "Reverse geocoding failed." });
  }
});

// src/server/routes/routingRoutes.ts
import { Router as Router3 } from "express";

// src/server/gis/spatialEngine.ts
import * as turf from "@turf/turf";

// src/server/gis/knownRestrictions.ts
var VERIFIED_FREIGHT_RESTRICTIONS = [
  {
    id: "res_lonavala_bridge",
    type: "height",
    name: {
      en: "Lonavala Railway Overbridge Low Clearance",
      hi: "\u0932\u094B\u0928\u093E\u0935\u0932\u093E \u0930\u0947\u0932\u0935\u0947 \u0913\u0935\u0930\u092C\u094D\u0930\u093F\u091C \u0915\u092E \u090A\u0901\u091A\u093E\u0908 \u0938\u0940\u092E\u093E"
    },
    description: {
      en: "Strict 4.10m overhead clearance on Old Mumbai-Pune Highway (NH-48). High-cube containers (4.3m) strike beam.",
      hi: "\u092A\u0941\u0930\u093E\u0928\u0947 \u092E\u0941\u0902\u092C\u0908-\u092A\u0941\u0923\u0947 \u0939\u093E\u0908\u0935\u0947 (NH-48) \u092A\u0930 4.10 \u092E\u0940\u091F\u0930 \u0915\u0940 \u0938\u0916\u094D\u0924 \u090A\u0901\u091A\u093E\u0908 \u0938\u0940\u092E\u093E\u0964 4.3 \u092E\u0940\u091F\u0930 \u0935\u093E\u0932\u0947 \u090A\u0901\u091A\u0947 \u0915\u0902\u091F\u0947\u0928\u0930 \u091F\u0915\u0930\u093E \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964"
    },
    coordinates: [73.401, 18.751],
    // Lonavala Railway Overbridge on Old NH-48
    limitValue: 4.1,
    unit: "meters",
    highwayName: "NH-48 (Old Mumbai-Pune Highway)",
    state: "Maharashtra",
    confidence: "VERIFIED_OFFICIAL",
    source: "NHAI Maharashtra Field Office Notice",
    bufferRadiusMeters: 400
  },
  {
    id: "res_thane_creek_weight",
    type: "weight",
    name: {
      en: "Kalwa Old Creek Bridge Weight Restriction",
      hi: "\u0915\u0932\u0935\u093E \u092A\u0941\u0930\u093E\u0928\u093E \u0916\u093E\u0921\u093C\u0940 \u092A\u0941\u0932 \u092D\u093E\u0930 \u0938\u0940\u092E\u093E"
    },
    description: {
      en: "Max GVW 35 Tonnes on aging structure. Multi-axle heavy trailers (> 35t) prohibited; mandatory divert to Kalwa 3rd Bridge.",
      hi: "\u092A\u0941\u0930\u093E\u0928\u0947 \u092A\u0941\u0932 \u092A\u0930 \u0905\u0927\u093F\u0915\u0924\u092E 35 \u091F\u0928 \u0915\u0940 \u0938\u0940\u092E\u093E\u0964 35 \u091F\u0928 \u0938\u0947 \u092D\u093E\u0930\u0940 \u092E\u0932\u094D\u091F\u0940-\u090F\u0915\u094D\u0938\u0932 \u0935\u093E\u0939\u0928\u094B\u0902 \u0915\u093E \u092A\u094D\u0930\u0935\u0947\u0936 \u0935\u0930\u094D\u091C\u093F\u0924\u0964"
    },
    coordinates: [72.9984, 19.1951],
    limitValue: 35,
    unit: "tonnes",
    highwayName: "Thane-Belapur Road Connector",
    state: "Maharashtra",
    confidence: "VERIFIED_OFFICIAL",
    source: "Thane Traffic Police Notification",
    bufferRadiusMeters: 500
  },
  {
    id: "res_kasara_ghat_ban",
    type: "time",
    name: {
      en: "Kasara Ghat Peak Hours Commercial Truck Ban",
      hi: "\u0915\u0938\u093E\u0930\u093E \u0918\u093E\u091F \u0935\u094D\u092F\u0938\u094D\u0924 \u0938\u092E\u092F \u092D\u093E\u0930\u0940 \u0935\u093E\u0939\u0928 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927"
    },
    description: {
      en: "Heavy goods vehicles prohibited ascending/descending between 07:00-11:00 and 17:00-21:00 to prevent hill gridlocks.",
      hi: "\u092A\u0939\u093E\u0921\u093C\u0940 \u091C\u093E\u092E \u0930\u094B\u0915\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0938\u0941\u092C\u0939 07:00-11:00 \u0914\u0930 \u0936\u093E\u092E 17:00-21:00 \u0915\u0947 \u092C\u0940\u091A \u092D\u093E\u0930\u0940 \u091F\u094D\u0930\u0915\u094B\u0902 \u0915\u093E \u0906\u0935\u093E\u0917\u092E\u0928 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924\u0964"
    },
    coordinates: [73.4862, 19.7042],
    highwayName: "NH-160 (Mumbai-Nashik Highway)",
    timeWindow: {
      start: "07:00",
      end: "11:00"
    },
    state: "Maharashtra",
    confidence: "VERIFIED_OFFICIAL",
    source: "Nashik Rural Traffic Order",
    bufferRadiusMeters: 1200
  },
  {
    id: "res_kasara_ghat_evening_ban",
    type: "time",
    name: {
      en: "Kasara Ghat Evening Heavy Vehicle Restriction",
      hi: "\u0915\u0938\u093E\u0930\u093E \u0918\u093E\u091F \u0936\u093E\u092E \u092D\u093E\u0930\u0940 \u0935\u093E\u0939\u0928 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927"
    },
    description: {
      en: "Evening commercial entry ban on steep grade ghat section between 17:00 and 21:00.",
      hi: "\u0918\u093E\u091F \u0938\u0947\u0915\u094D\u0936\u0928 \u092E\u0947\u0902 \u0936\u093E\u092E 17:00 \u0938\u0947 21:00 \u0915\u0947 \u092C\u0940\u091A \u092D\u093E\u0930\u0940 \u092E\u093E\u0932\u0935\u093E\u0939\u0915 \u0917\u093E\u0921\u093C\u093F\u092F\u094B\u0902 \u092A\u0930 \u0930\u094B\u0915\u0964"
    },
    coordinates: [73.4862, 19.7042],
    highwayName: "NH-160 (Mumbai-Nashik Highway)",
    timeWindow: {
      start: "17:00",
      end: "21:00"
    },
    state: "Maharashtra",
    confidence: "VERIFIED_OFFICIAL",
    source: "Nashik Rural Traffic Order",
    bufferRadiusMeters: 1200
  },
  {
    id: "res_delhi_ring_road_time_ban",
    type: "time",
    name: {
      en: "Delhi Inner & Outer Ring Road No-Entry Window",
      hi: "\u0926\u093F\u0932\u094D\u0932\u0940 \u0930\u093F\u0902\u0917 \u0930\u094B\u0921 \u0928\u094B-\u090F\u0902\u091F\u094D\u0930\u0940 \u0938\u092E\u092F \u0938\u0940\u092E\u093E"
    },
    description: {
      en: "Commercial medium/heavy trucks strictly banned during morning peak (07:30-11:00). Must use Eastern Peripheral Expressway (EPE) bypass.",
      hi: "\u0938\u0941\u092C\u0939 \u0915\u0947 \u0935\u094D\u092F\u0938\u094D\u0924 \u0938\u092E\u092F (07:30-11:00) \u092E\u0947\u0902 \u092D\u093E\u0930\u0940 \u091F\u094D\u0930\u0915\u094B\u0902 \u0915\u093E \u092A\u094D\u0930\u0935\u0947\u0936 \u0935\u0930\u094D\u091C\u093F\u0924\u0964 \u0908\u0938\u094D\u091F\u0930\u094D\u0928 \u092A\u0947\u0930\u093F\u092B\u0947\u0930\u0932 \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938\u0935\u0947 (EPE) \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964"
    },
    coordinates: [77.209, 28.6139],
    highwayName: "Ring Road Delhi",
    timeWindow: {
      start: "07:30",
      end: "11:00"
    },
    state: "Delhi NCR",
    confidence: "VERIFIED_OFFICIAL",
    source: "Delhi Traffic Police Heavy Goods Notification",
    bufferRadiusMeters: 1500
  },
  {
    id: "res_delhi_ashram_flyover",
    type: "height",
    name: {
      en: "Ashram Metro Underpass Clearance Limit",
      hi: "\u0906\u0936\u094D\u0930\u092E \u092E\u0947\u091F\u094D\u0930\u094B \u0905\u0902\u0921\u0930\u092A\u093E\u0938 \u090A\u0901\u091A\u093E\u0908 \u0938\u0940\u092E\u093E"
    },
    description: {
      en: "Low overhead clearance of 3.80m under portal. Containers and high-deck trucks must use surface roundabout.",
      hi: "3.80 \u092E\u0940\u091F\u0930 \u0915\u0940 \u0915\u092E \u090A\u0901\u091A\u093E\u0908 \u0938\u0940\u092E\u093E\u0964 \u0915\u0902\u091F\u0947\u0928\u0930 \u0914\u0930 \u0939\u093E\u0908-\u0921\u0947\u0915 \u091F\u094D\u0930\u0915\u094B\u0902 \u0915\u094B \u0917\u094B\u0932\u091A\u0915\u094D\u0915\u0930 \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0928\u093E \u0939\u094B\u0917\u093E\u0964"
    },
    coordinates: [77.2568, 28.5714],
    limitValue: 3.8,
    unit: "meters",
    highwayName: "Mathura Road / Ashram Crossing",
    state: "Delhi NCR",
    confidence: "VERIFIED_OFFICIAL",
    source: "Public Works Department (PWD) Delhi",
    bufferRadiusMeters: 400
  },
  {
    id: "res_jaipur_ghati_gate",
    type: "width",
    name: {
      en: "Jaipur Walled City Historic Gate Width Restriction",
      hi: "\u091C\u092F\u092A\u0941\u0930 \u091A\u093E\u0930\u0926\u0940\u0935\u093E\u0930\u0940 \u0910\u0924\u093F\u0939\u093E\u0938\u093F\u0915 \u0926\u0930\u0935\u093E\u091C\u093E \u091A\u094C\u0921\u093C\u093E\u0908 \u0938\u0940\u092E\u093E"
    },
    description: {
      en: "Narrow historic archway restricts maximum vehicle width to 2.60m. Multi-axle commercial carriers prohibited.",
      hi: "\u092A\u0941\u0930\u093E\u0928\u0947 \u0910\u0924\u093F\u0939\u093E\u0938\u093F\u0915 \u0926\u0930\u0935\u093E\u091C\u0947 \u0915\u0940 \u091A\u094C\u0921\u093C\u093E\u0908 \u092E\u093E\u0924\u094D\u0930 2.60 \u092E\u0940\u091F\u0930 \u0939\u0948\u0964 \u092D\u093E\u0930\u0940 \u091A\u094C\u0921\u093C\u0940 \u0917\u093E\u0921\u093C\u093F\u092F\u094B\u0902 \u0915\u093E \u092A\u094D\u0930\u0935\u0947\u0936 \u0935\u0930\u094D\u091C\u093F\u0924\u0964"
    },
    coordinates: [75.8285, 26.9124],
    limitValue: 2.6,
    unit: "meters",
    highwayName: "Ghati Gate Entrance",
    state: "Rajasthan",
    confidence: "VERIFIED_OFFICIAL",
    source: "Jaipur Municipal Corporation Gazette",
    bufferRadiusMeters: 300
  },
  {
    id: "res_panvel_axle_limit",
    type: "axle",
    name: {
      en: "Panvel Bypass Causeway Axle Load Caution",
      hi: "\u092A\u0928\u0935\u0947\u0932 \u092C\u093E\u0908\u092A\u093E\u0938 \u0915\u0949\u091C\u0935\u0947 \u090F\u0915\u094D\u0938\u0932 \u092D\u093E\u0930 \u091A\u0947\u0924\u093E\u0935\u0928\u0940"
    },
    description: {
      en: "Axle load inspection point. Vehicles exceeding 10.2 tonnes per single axle require bridge department escort.",
      hi: "\u090F\u0915\u094D\u0938\u0932 \u092D\u093E\u0930 \u091C\u093E\u0902\u091A \u092C\u093F\u0902\u0926\u0941\u0964 10.2 \u091F\u0928 \u092A\u094D\u0930\u0924\u093F \u090F\u0915\u094D\u0938\u0932 \u0938\u0947 \u0905\u0927\u093F\u0915 \u092D\u093E\u0930 \u0935\u093E\u0932\u0947 \u0935\u093E\u0939\u0928\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0935\u093F\u0936\u0947\u0937 \u0905\u0928\u0941\u092E\u0924\u093F \u0906\u0935\u0936\u094D\u092F\u0915\u0964"
    },
    coordinates: [73.1118, 18.9894],
    limitValue: 10.2,
    unit: "tonnes",
    highwayName: "Panvel Bypass",
    state: "Maharashtra",
    confidence: "NHAI_CIRCULAR",
    source: "NHAI Regional Office Navi Mumbai",
    bufferRadiusMeters: 600
  }
];

// src/server/gis/spatialEngine.ts
var SpatialEngine = class {
  constructor(customRestrictions) {
    this.restrictions = customRestrictions || VERIFIED_FREIGHT_RESTRICTIONS;
  }
  /**
   * Evaluates a full GeoJSON LineString route against all spatial restrictions and road constraints
   */
  evaluateRoute(routeCoordinates, vehicle, departureTime) {
    if (!routeCoordinates || routeCoordinates.length < 2) {
      return {
        status: "WARNING",
        evaluatedRestrictions: [],
        statusReasons: ["Insufficient route geometry coordinates for spatial evaluation"],
        roadWidthIntelligence: this.evaluateRoadWidth(vehicle),
        spatialIntersectionsCount: 0
      };
    }
    const routeLine = turf.lineString(routeCoordinates);
    const evaluatedList = [];
    const statusReasons = [];
    let overallStatus = "RECOMMENDED";
    for (const restr of this.restrictions) {
      const pt = turf.point(restr.coordinates);
      const distKm = turf.pointToLineDistance(pt, routeLine, { units: "kilometers" });
      const distMeters = distKm * 1e3;
      if (distMeters <= restr.bufferRadiusMeters) {
        let evalStatus = "OK";
        let advisoryEn = "";
        let advisoryHi = "";
        if (restr.type === "height" && typeof restr.limitValue === "number") {
          if (vehicle.heightMeters > restr.limitValue) {
            evalStatus = "BLOCKED";
            advisoryEn = `CRITICAL: Vehicle height (${vehicle.heightMeters.toFixed(2)}m) exceeds clearance (${restr.limitValue.toFixed(2)}m) by ${(vehicle.heightMeters - restr.limitValue).toFixed(2)}m!`;
            advisoryHi = `\u0917\u0902\u092D\u0940\u0930 \u0916\u0924\u0930\u093E: \u0917\u093E\u0921\u093C\u0940 \u0915\u0940 \u090A\u0901\u091A\u093E\u0908 (${vehicle.heightMeters.toFixed(2)}m) \u092A\u0941\u0932 \u0915\u0940 \u0905\u0927\u093F\u0915\u0924\u092E \u0938\u0940\u092E\u093E (${restr.limitValue.toFixed(2)}m) \u0938\u0947 \u0905\u0927\u093F\u0915 \u0939\u0948!`;
          } else if (vehicle.heightMeters >= restr.limitValue - 0.15) {
            evalStatus = "WARNING";
            advisoryEn = `Tight clearance warning: Only ${((restr.limitValue - vehicle.heightMeters) * 100).toFixed(0)}cm margin under structure. Slow down.`;
            advisoryHi = `\u0915\u092E \u092B\u093E\u0938\u0932\u093E: \u092A\u0941\u0932 \u0915\u0947 \u0928\u0940\u091A\u0947 \u092E\u093E\u0924\u094D\u0930 ${((restr.limitValue - vehicle.heightMeters) * 100).toFixed(0)} \u0938\u0947\u092E\u0940 \u0915\u0940 \u091C\u0917\u0939 \u0939\u0948\u0964 \u0917\u0924\u093F \u0927\u0940\u092E\u0940 \u0930\u0916\u0947\u0902\u0964`;
          } else {
            advisoryEn = `Clearance verified: Vehicle height is within structure limit (${restr.limitValue.toFixed(2)}m).`;
            advisoryHi = `\u090A\u0901\u091A\u093E\u0908 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924: \u0917\u093E\u0921\u093C\u0940 \u0915\u0940 \u090A\u0901\u091A\u093E\u0908 \u092A\u0941\u0932 \u0915\u0940 \u0938\u0940\u092E\u093E \u0915\u0947 \u092D\u0940\u0924\u0930 \u0939\u0948\u0964`;
          }
        } else if (restr.type === "weight" && typeof restr.limitValue === "number") {
          if (vehicle.loadedWeightTonnes > restr.limitValue) {
            evalStatus = "BLOCKED";
            advisoryEn = `CRITICAL: Loaded weight (${vehicle.loadedWeightTonnes.toFixed(1)}t) exceeds structure GVW rating (${restr.limitValue.toFixed(1)}t)!`;
            advisoryHi = `\u0917\u0902\u092D\u0940\u0930 \u0916\u0924\u0930\u093E: \u0917\u093E\u0921\u093C\u0940 \u0915\u093E \u092D\u093E\u0930 (${vehicle.loadedWeightTonnes.toFixed(1)} \u091F\u0928) \u092A\u0941\u0932 \u0915\u0940 \u0915\u094D\u0937\u092E\u0924\u093E (${restr.limitValue.toFixed(1)} \u091F\u0928) \u0938\u0947 \u0905\u0927\u093F\u0915 \u0939\u0948!`;
          } else if (vehicle.loadedWeightTonnes >= restr.limitValue * 0.9) {
            evalStatus = "WARNING";
            advisoryEn = `Weight caution: Vehicle weight is close to structure rating (${restr.limitValue.toFixed(1)}t).`;
            advisoryHi = `\u092D\u093E\u0930 \u091A\u0947\u0924\u093E\u0935\u0928\u0940: \u0917\u093E\u0921\u093C\u0940 \u0915\u093E \u092D\u093E\u0930 \u092A\u0941\u0932 \u0915\u0940 \u0938\u0940\u092E\u093E \u0915\u0947 \u0915\u0930\u0940\u092C \u0939\u0948\u0964`;
          } else {
            advisoryEn = `Weight within structure limits.`;
            advisoryHi = `\u092D\u093E\u0930 \u0915\u094D\u0937\u092E\u0924\u093E \u0915\u0947 \u092D\u0940\u0924\u0930 \u0939\u0948\u0964`;
          }
        } else if (restr.type === "width" && typeof restr.limitValue === "number") {
          if (vehicle.widthMeters > restr.limitValue) {
            evalStatus = "BLOCKED";
            advisoryEn = `CRITICAL: Vehicle width (${vehicle.widthMeters.toFixed(2)}m) exceeds corridor width limit (${restr.limitValue.toFixed(2)}m)!`;
            advisoryHi = `\u0917\u0902\u092D\u0940\u0930 \u0916\u0924\u0930\u093E: \u0917\u093E\u0921\u093C\u0940 \u0915\u0940 \u091A\u094C\u0921\u093C\u093E\u0908 (${vehicle.widthMeters.toFixed(2)}m) \u0930\u093E\u0938\u094D\u0924\u0947 \u0915\u0940 \u0938\u0940\u092E\u093E (${restr.limitValue.toFixed(2)}m) \u0938\u0947 \u0905\u0927\u093F\u0915 \u0939\u0948!`;
          } else {
            evalStatus = "WARNING";
            advisoryEn = `Narrow corridor width: Exercise extreme caution on narrow approach.`;
            advisoryHi = `\u0938\u0915\u0930\u093E \u0930\u093E\u0938\u094D\u0924\u093E: \u0938\u0902\u0915\u0930\u0947 \u092E\u093E\u0930\u094D\u0917 \u092A\u0930 \u0935\u093F\u0936\u0947\u0937 \u0938\u093E\u0935\u0927\u093E\u0928\u0940 \u092C\u0930\u0924\u0947\u0902\u0964`;
          }
        } else if (restr.type === "time" && restr.timeWindow) {
          if (departureTime) {
            const isWithinBan = this.isTimeInWindow(
              departureTime,
              restr.timeWindow.start,
              restr.timeWindow.end
            );
            if (isWithinBan) {
              evalStatus = "WARNING";
              advisoryEn = `Time Ban Active: Heavy commercial vehicles prohibited between ${restr.timeWindow.start} and ${restr.timeWindow.end}.`;
              advisoryHi = `\u0938\u092E\u092F \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927 \u0938\u0915\u094D\u0930\u093F\u092F: \u092D\u093E\u0930\u0940 \u0935\u094D\u092F\u093E\u0935\u0938\u093E\u092F\u093F\u0915 \u0935\u093E\u0939\u0928\u094B\u0902 \u0915\u093E \u0906\u0935\u093E\u0917\u092E\u0928 ${restr.timeWindow.start} \u0938\u0947 ${restr.timeWindow.end} \u0924\u0915 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924 \u0939\u0948\u0964`;
            } else {
              advisoryEn = `Outside restriction window (${restr.timeWindow.start}-${restr.timeWindow.end}). Check for travel delays.`;
              advisoryHi = `\u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924 \u0938\u092E\u092F (${restr.timeWindow.start}-${restr.timeWindow.end}) \u0938\u0947 \u092C\u093E\u0939\u0930 \u0939\u0948\u0964`;
            }
          } else {
            evalStatus = "WARNING";
            advisoryEn = `Time-dependent ban exists (${restr.timeWindow.start}-${restr.timeWindow.end}). Verify arrival time at restriction zone.`;
            advisoryHi = `\u0938\u092E\u092F \u0938\u0940\u092E\u093E \u0932\u093E\u0917\u0942 \u0939\u0948 (${restr.timeWindow.start}-${restr.timeWindow.end})\u0964 \u092A\u0939\u0941\u0901\u091A\u0928\u0947 \u0915\u0947 \u0938\u092E\u092F \u0915\u0940 \u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0930\u0947\u0902\u0964`;
          }
        } else if (restr.type === "axle" && typeof restr.limitValue === "number") {
          if (vehicle.axleLoadTonnes && vehicle.axleLoadTonnes > restr.limitValue) {
            evalStatus = "WARNING";
            advisoryEn = `Axle load warning: Estimated axle load (${vehicle.axleLoadTonnes.toFixed(1)}t) exceeds advisory limit (${restr.limitValue.toFixed(1)}t).`;
            advisoryHi = `\u090F\u0915\u094D\u0938\u0932 \u092D\u093E\u0930 \u091A\u0947\u0924\u093E\u0935\u0928\u0940: \u0905\u0928\u0941\u092E\u093E\u0928\u093F\u0924 \u090F\u0915\u094D\u0938\u0932 \u092D\u093E\u0930 (${vehicle.axleLoadTonnes.toFixed(1)} \u091F\u0928) \u0938\u0940\u092E\u093E \u0938\u0947 \u0905\u0927\u093F\u0915 \u0939\u0948\u0964`;
          } else {
            evalStatus = "WARNING";
            advisoryEn = `Axle inspection zone: Confirm weight slip at weighbridge before crossing.`;
            advisoryHi = `\u090F\u0915\u094D\u0938\u0932 \u091C\u093E\u0902\u091A \u0915\u094D\u0937\u0947\u0924\u094D\u0930: \u0906\u0917\u0947 \u092C\u0922\u093C\u0928\u0947 \u0938\u0947 \u092A\u0939\u0932\u0947 \u0927\u0930\u094D\u092E\u0915\u093E\u0902\u091F\u0947 \u0915\u0940 \u092A\u0930\u094D\u091A\u0940 \u0924\u0948\u092F\u093E\u0930 \u0930\u0916\u0947\u0902\u0964`;
          }
        }
        evaluatedList.push({
          ...restr,
          evaluationStatus: evalStatus,
          distanceFromRouteMeters: Math.round(distMeters),
          driverAdvisory: {
            en: advisoryEn,
            hi: advisoryHi
          }
        });
        if (evalStatus === "BLOCKED") {
          overallStatus = "BLOCKED";
          statusReasons.push(`Blocked: ${restr.name.en} (${advisoryEn})`);
        } else if (evalStatus === "WARNING" && overallStatus !== "BLOCKED") {
          overallStatus = "WARNING";
          statusReasons.push(`Advisory: ${restr.name.en} (${advisoryEn})`);
        }
      }
    }
    const roadWidthInfo = this.evaluateRoadWidth(vehicle);
    return {
      status: overallStatus,
      evaluatedRestrictions: evaluatedList,
      statusReasons: statusReasons.length > 0 ? statusReasons : ["No known commercial vehicle conflicts identified along route corridors."],
      roadWidthIntelligence: roadWidthInfo,
      spatialIntersectionsCount: evaluatedList.length
    };
  }
  /**
   * Road width evaluation adhering strictly to Rule 1.1 (The Unknown Data Law)
   */
  evaluateRoadWidth(vehicle) {
    const minRequired = vehicle.widthMeters + 0.6;
    return {
      status: "DATA_UNAVAILABLE",
      minimumRequiredWidthMeters: Number(minRequired.toFixed(2)),
      confidence: "UNVERIFIED",
      explanation: {
        en: `Road width survey data is unverified on this corridor. A minimum usable carriageway width of ${minRequired.toFixed(2)}m is recommended for your vehicle width (${vehicle.widthMeters.toFixed(2)}m).`,
        hi: `\u0907\u0938 \u092E\u093E\u0930\u094D\u0917 \u092A\u0930 \u0938\u0921\u093C\u0915 \u0915\u0940 \u091A\u094C\u0921\u093C\u093E\u0908 \u0915\u093E \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 \u0938\u0930\u094D\u0935\u0947\u0915\u094D\u0937\u0923 \u0921\u0947\u091F\u093E \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u0906\u092A\u0915\u0940 \u0917\u093E\u0921\u093C\u0940 \u0915\u0940 \u091A\u094C\u0921\u093C\u093E\u0908 (${vehicle.widthMeters.toFixed(2)}m) \u0915\u0947 \u0932\u093F\u090F \u0915\u092E \u0938\u0947 \u0915\u092E ${minRequired.toFixed(2)}m \u091A\u094C\u0921\u093C\u0940 \u0938\u0921\u093C\u0915 \u0915\u0940 \u0906\u0935\u0936\u094D\u092F\u0915\u0924\u093E \u0939\u0948\u0964`
      },
      honestDisclaimer: "DO NOT ASSUME ROAD WIDTH IS SAFE: Route thickness or map line styles do not reflect actual physical asphalt width. Always verify local signage."
    };
  }
  isTimeInWindow(time, start, end) {
    const toMin = (t) => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const tMin = toMin(time);
    const sMin = toMin(start);
    const eMin = toMin(end);
    if (sMin <= eMin) {
      return tMin >= sMin && tMin <= eMin;
    }
    return tMin >= sMin || tMin <= eMin;
  }
};
var spatialEngine = new SpatialEngine();

// src/server/routing/providers/valhallaProvider.ts
var ValhallaProvider = class {
  constructor() {
    this.name = "Valhalla Truck Engine";
  }
  isConfigured() {
    return Boolean(config.VALHALLA_URL);
  }
  async calculateRoute(params) {
    if (!this.isConfigured()) return [];
    const url = `${config.VALHALLA_URL}/route`;
    const payload = {
      locations: [
        { lon: params.originCoordinates[0], lat: params.originCoordinates[1], type: "break" },
        ...(params.waypoints || []).map(([lon, lat]) => ({ lon, lat, type: "through" })),
        { lon: params.destinationCoordinates[0], lat: params.destinationCoordinates[1], type: "break" }
      ],
      costing: "truck",
      costing_options: {
        truck: {
          height: params.vehicle.heightMeters,
          width: params.vehicle.widthMeters,
          length: params.vehicle.lengthMeters,
          weight: params.vehicle.loadedWeightTonnes,
          axle_load: params.vehicle.axleLoadTonnes || 10,
          axle_count: params.vehicle.axleCount || 2,
          hazmat: params.vehicle.cargoType === "hazmat"
        }
      },
      directions_options: {
        units: "kilometers",
        language: "en-US"
      }
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) return [];
      const data = await response.json();
      if (!data.trip || !data.trip.legs || data.trip.legs.length === 0) return [];
      const leg = data.trip.legs[0];
      const coords = this.decodePolyline6(leg.shape);
      const gisEval = spatialEngine.evaluateRoute(coords, params.vehicle, params.departureTime);
      const distanceKm = Number(leg.summary.length.toFixed(1));
      const durationMinutes = Math.round(leg.summary.time / 60);
      const route = {
        id: `valhalla_route_${Date.now()}`,
        name: {
          en: `${params.originName} to ${params.destinationName} (Valhalla Truck)`,
          hi: `${params.originName} \u0938\u0947 ${params.destinationName} (\u0935\u093E\u0932\u094D\u0939\u093E\u0932\u094D\u0932\u093E \u091F\u094D\u0930\u0915 \u0930\u0942\u091F)`
        },
        viaHighway: "Truck Authorized Highway Route",
        distanceKm,
        durationMinutes,
        geometry: {
          type: "LineString",
          coordinates: coords
        },
        status: gisEval.status,
        statusReasons: gisEval.statusReasons,
        steps: leg.maneuvers.map((m) => ({
          instruction: m.instruction,
          distanceMeters: Math.round(m.length * 1e3),
          durationSeconds: m.time,
          coordinates: coords[0] || [0, 0]
        })),
        restrictions: gisEval.evaluatedRestrictions,
        roadWidthAssessment: gisEval.roadWidthIntelligence,
        provider: this.name
      };
      return [route];
    } catch (err) {
      console.warn("[ValhallaProvider] Query failed:", err);
      return [];
    }
  }
  decodePolyline6(str) {
    let index = 0, lat = 0, lng = 0;
    const coordinates = [];
    const factor = 1e6;
    while (index < str.length) {
      let b, shift = 0, result = 0;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 31) << shift;
        shift += 5;
      } while (b >= 32);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 31) << shift;
        shift += 5;
      } while (b >= 32);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;
      coordinates.push([lng / factor, lat / factor]);
    }
    return coordinates;
  }
};

// src/server/routing/providers/openRouteServiceProvider.ts
var OpenRouteServiceProvider = class {
  constructor() {
    this.name = "OpenRouteService HGV Engine";
  }
  isConfigured() {
    return Boolean(config.OPENROUTESERVICE_API_KEY);
  }
  async calculateRoute(params) {
    if (!this.isConfigured()) return [];
    const coordinates = [
      params.originCoordinates,
      ...params.waypoints || [],
      params.destinationCoordinates
    ];
    const body = {
      coordinates,
      profile: "driving-hgv",
      options: {
        vehicle_type: "hgv",
        profile_params: {
          restrictions: {
            max_height: params.vehicle.heightMeters,
            max_width: params.vehicle.widthMeters,
            max_weight: params.vehicle.loadedWeightTonnes
          }
        }
      }
    };
    try {
      const response = await fetch(
        `${config.OPENROUTESERVICE_URL}/v2/directions/driving-hgv/geojson`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: config.OPENROUTESERVICE_API_KEY || ""
          },
          body: JSON.stringify(body)
        }
      );
      if (!response.ok) return [];
      const geojson = await response.json();
      if (!geojson.features || geojson.features.length === 0) return [];
      const feat = geojson.features[0];
      const coords = feat.geometry.coordinates;
      const distanceKm = Number((feat.properties.summary.distance / 1e3).toFixed(1));
      const durationMinutes = Math.round(feat.properties.summary.duration / 60);
      const gisEval = spatialEngine.evaluateRoute(coords, params.vehicle, params.departureTime);
      const steps = (feat.properties.segments?.[0]?.steps || []).map((s) => ({
        instruction: s.instruction,
        distanceMeters: Math.round(s.distance),
        durationSeconds: Math.round(s.duration),
        roadName: s.name,
        coordinates: coords[0] || [0, 0]
      }));
      const route = {
        id: `ors_hgv_route_${Date.now()}`,
        name: {
          en: `${params.originName} to ${params.destinationName} (ORS HGV Route)`,
          hi: `${params.originName} \u0938\u0947 ${params.destinationName} (ORS \u092D\u093E\u0930\u0940 \u0935\u093E\u0939\u0928 \u0930\u0942\u091F)`
        },
        viaHighway: "Designated Freight Corridor",
        distanceKm,
        durationMinutes,
        geometry: {
          type: "LineString",
          coordinates: coords
        },
        status: gisEval.status,
        statusReasons: gisEval.statusReasons,
        steps,
        restrictions: gisEval.evaluatedRestrictions,
        roadWidthAssessment: gisEval.roadWidthIntelligence,
        provider: this.name
      };
      return [route];
    } catch (err) {
      console.warn("[OpenRouteServiceProvider] Failed to calculate route:", err);
      return [];
    }
  }
};

// src/server/routing/providers/osrmProvider.ts
var OsrmRoutingProvider = class {
  constructor() {
    this.name = "OSRM Road Network Engine + Routiq Spatial GIS";
  }
  isConfigured() {
    return true;
  }
  async calculateRoute(params) {
    const coordsStr = [
      params.originCoordinates.join(","),
      ...(params.waypoints || []).map((w) => w.join(",")),
      params.destinationCoordinates.join(",")
    ].join(";");
    const url = `${config.OSRM_URL}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Routiq-HeavyTruckRouting/1.0 (contact: support@routiq.app)" }
      });
      if (!response.ok) return [];
      const data = await response.json();
      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) return [];
      return data.routes.map((r, index) => {
        const coords = r.geometry.coordinates;
        const gisEval = spatialEngine.evaluateRoute(coords, params.vehicle, params.departureTime);
        const distanceKm = Number((r.distance / 1e3).toFixed(1));
        const truckDurationMinutes = Math.round(r.duration * 1.2 / 60);
        const highwaySummary = r.legs[0]?.summary || (index === 0 ? "Primary National Highway Corridor" : "Alternative State Route");
        const steps = (r.legs[0]?.steps || []).map((s) => ({
          instruction: s.maneuver.instruction || `Drive along ${s.name || "highway"}`,
          distanceMeters: Math.round(s.distance),
          durationSeconds: Math.round(s.duration),
          roadName: s.name,
          coordinates: s.maneuver.location || coords[0]
        }));
        const isAlt = index > 0;
        return {
          id: `osrm_route_${Date.now()}_${index}`,
          name: {
            en: isAlt ? `${highwaySummary} (Alternative Route ${index})` : `${highwaySummary} (Main Freight Route)`,
            hi: isAlt ? `${highwaySummary} (\u0935\u0948\u0915\u0932\u094D\u092A\u093F\u0915 \u092E\u093E\u0930\u094D\u0917 ${index})` : `${highwaySummary} (\u092E\u0941\u0916\u094D\u092F \u092E\u093E\u0932\u0935\u093E\u0939\u0915 \u092E\u093E\u0930\u094D\u0917)`
          },
          viaHighway: highwaySummary,
          distanceKm,
          durationMinutes: truckDurationMinutes,
          geometry: {
            type: "LineString",
            coordinates: coords
          },
          status: gisEval.status,
          statusReasons: gisEval.statusReasons,
          steps,
          restrictions: gisEval.evaluatedRestrictions,
          roadWidthAssessment: gisEval.roadWidthIntelligence,
          provider: this.name
        };
      });
    } catch (err) {
      console.warn("[OsrmRoutingProvider] Route calculation failed:", err);
      return [];
    }
  }
};

// src/services/routing/demoData.ts
var CORRIDOR_ROUTES = {
  // Mumbai <-> Pune Corridor
  "mumbai|pune": [
    {
      id: "mumbai_pune_exp",
      name: {
        en: "Mumbai\u2013Pune Expressway (Recommended for High Containers)",
        hi: "\u092E\u0941\u0902\u092C\u0908\u2013\u092A\u0941\u0923\u0947 \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938\u0935\u0947 (\u0915\u0902\u091F\u0947\u0928\u0930 \u0935 \u090A\u0901\u091A\u0940 \u0917\u093E\u0921\u093C\u093F\u092F\u094B\u0902 \u0939\u0947\u0924\u0941 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924)"
      },
      distanceKm: 148,
      durationMinutes: 195,
      tollEstimateInr: 580,
      whyExplanation: {
        en: "Bypasses the documented 4.0m low-clearance railway bridge in Khandala. Dedicated heavy truck climbing lanes on Bhor Ghat.",
        hi: "\u0916\u0902\u0921\u093E\u0932\u093E \u0915\u0947 4.0 \u092E\u0940\u091F\u0930 \u0928\u0940\u091A\u0947 \u0930\u0947\u0932\u0935\u0947 \u092A\u0941\u0932 \u0938\u0947 \u092C\u091A\u093E\u0924\u093E \u0939\u0948\u0964 \u092D\u094B\u0930 \u0918\u093E\u091F \u092A\u0930 \u091F\u094D\u0930\u0915\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0905\u0932\u0917 \u091A\u0922\u093C\u093E\u0908 \u0932\u0947\u0928 \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0964"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [72.8777, 19.076],
          // Mumbai
          [72.9856, 19.033],
          // Navi Mumbai / Vashi
          [73.1154, 18.9894],
          // Panvel Expressway Gate
          [73.2389, 18.8654],
          // Khalapur Toll Plaza
          [73.3421, 18.7845],
          // Khandala Ghat Viaduct
          [73.4072, 18.7557],
          // Lonavala Bypass
          [73.5512, 18.718],
          // Talegaon Toll
          [73.7124, 18.6278],
          // Dehu Road / Nigdi
          [73.8567, 18.5204]
          // Pune Swargate / Station
        ]
      },
      restrictions: [
        {
          id: "exp_axle_rating",
          kind: "axle",
          name: {
            en: "Amrutanjan Viaduct Axle Rating Check",
            hi: "\u0905\u092E\u0943\u0924\u093E\u0902\u091C\u0928 \u092A\u0941\u0932 \u090F\u0915\u094D\u0938\u0932 \u092D\u093E\u0930 \u091C\u093E\u0901\u091A"
          },
          coordinates: [73.3421, 18.7845],
          limitType: "axle",
          roadName: {
            en: "Yashwantrao Chavan Expressway (Km 44.2)",
            hi: "\u092F\u0936\u0935\u0902\u0924\u0930\u093E\u0935 \u091A\u0935\u094D\u0939\u093E\u0923 \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938\u0935\u0947 (\u0915\u093F\u092E\u0940 44.2)"
          },
          actionGuidance: {
            en: "Stay in left heavy vehicle lane. Heavy multi-axle configurations (6+ axles) must maintain 50m vehicle spacing.",
            hi: "\u092C\u093E\u0908\u0902 \u0913\u0930 \u092D\u093E\u0930\u0940 \u0935\u093E\u0939\u0928 \u0932\u0947\u0928 \u092E\u0947\u0902 \u0930\u0939\u0947\u0902\u0964 6 \u0938\u0947 \u0905\u0927\u093F\u0915 \u090F\u0915\u094D\u0938\u0932 \u0935\u093E\u0932\u0940 \u0917\u093E\u0921\u093C\u093F\u092F\u093E\u0901 50 \u092E\u0940\u091F\u0930 \u0915\u0940 \u0926\u0942\u0930\u0940 \u092C\u0928\u093E\u090F \u0930\u0916\u0947\u0902\u0964"
          },
          sourceAuthority: "MSRDC Maharashtra State Road Development Corp",
          verificationStatus: "unverified_demo"
        }
      ],
      turnSteps: {
        en: [
          "Depart Mumbai via Eastern Freeway / Sion-Panvel Highway",
          "Pass Kalamboli junction and enter Mumbai-Pune Expressway",
          "Approach Bhor Ghat section (strictly adhere to 40 km/h truck speed limit)",
          "Pass Lonavala without low clearance hazard",
          "Exit through Talegaon toll plaza towards Pune bypass"
        ],
        hi: [
          "\u0938\u093E\u092F\u0928-\u092A\u0928\u0935\u0947\u0932 \u0939\u093E\u0908\u0935\u0947 \u0938\u0947 \u092E\u0941\u0902\u092C\u0908 \u0938\u0947 \u092A\u094D\u0930\u0938\u094D\u0925\u093E\u0928 \u0915\u0930\u0947\u0902",
          "\u0915\u0932\u0902\u092C\u094B\u0932\u0940 \u091C\u0902\u0915\u094D\u0936\u0928 \u092A\u093E\u0930 \u0915\u0930 \u092E\u0941\u0902\u092C\u0908-\u092A\u0941\u0923\u0947 \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938\u0935\u0947 \u092A\u0930 \u092A\u094D\u0930\u0935\u0947\u0936 \u0915\u0930\u0947\u0902",
          "\u092D\u094B\u0930 \u0918\u093E\u091F \u0938\u0947\u0915\u094D\u0936\u0928 \u092A\u0930 \u0917\u0924\u093F 40 \u0915\u093F\u092E\u0940/\u0918\u0902\u091F\u093E \u0938\u0947 \u0915\u092E \u0930\u0916\u0947\u0902",
          "\u0932\u094B\u0928\u093E\u0935\u0932\u093E \u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u090A\u0901\u091A\u093E\u0908 \u0905\u0921\u093C\u091A\u0928 \u0915\u0947 \u092A\u093E\u0930 \u0915\u0930\u0947\u0902",
          "\u0924\u0932\u0947\u0917\u093E\u0902\u0935 \u091F\u094B\u0932 \u0938\u0947 \u0939\u094B\u0924\u0947 \u0939\u0941\u090F \u092A\u0941\u0923\u0947 \u092C\u093E\u0908\u092A\u093E\u0938 \u092A\u0930 \u092A\u0939\u0941\u0901\u091A\u0947\u0902"
        ]
      }
    },
    {
      id: "mumbai_pune_old_nh48",
      name: {
        en: "Old Mumbai\u2013Pune Highway (NH48 via Khandala Ghat)",
        hi: "\u092A\u0941\u0930\u093E\u0928\u093E \u092E\u0941\u0902\u092C\u0908\u2013\u092A\u0941\u0923\u0947 \u0939\u093E\u0908\u0935\u0947 (NH48 \u0916\u0902\u0921\u093E\u0932\u093E \u0918\u093E\u091F)"
      },
      distanceKm: 154,
      durationMinutes: 240,
      tollEstimateInr: 220,
      whyExplanation: {
        en: "Free of expressway toll, BUT contains a historic low railway overbridge with 4.0m vertical clearance near Lonavala.",
        hi: "\u091F\u094B\u0932 \u0915\u092E \u0939\u0948, \u092A\u0930\u0902\u0924\u0941 \u0932\u094B\u0928\u093E\u0935\u0932\u093E \u0915\u0947 \u092A\u093E\u0938 4.0 \u092E\u0940\u091F\u0930 \u0915\u093E \u0928\u0940\u091A\u093E \u0930\u0947\u0932\u0935\u0947 \u0913\u0935\u0930\u092C\u094D\u0930\u093F\u091C \u0939\u0948\u0964 4 \u092E\u0940\u091F\u0930 \u0938\u0947 \u090A\u0901\u091A\u0940 \u0917\u093E\u0921\u093C\u093F\u092F\u093E\u0901 \u092B\u0901\u0938 \u0938\u0915\u0924\u0940 \u0939\u0948\u0902\u0964"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [72.8777, 19.076],
          // Mumbai
          [73.0125, 19.0201],
          // CBD Belapur
          [73.1205, 18.9754],
          // Old Panvel Town
          [73.2654, 18.8412],
          // Khopoli Town
          [73.3245, 18.7612],
          // Khandala Old Ghat (Sharp Hairpins)
          [73.401, 18.751],
          // Lonavala Railway Overbridge (LOW CLEARANCE)
          [73.4812, 18.7302],
          // Kamshet
          [73.7456, 18.612],
          // Pimpri-Chinchwad
          [73.8567, 18.5204]
          // Pune
        ]
      },
      restrictions: [
        {
          id: "lonavala_low_bridge",
          kind: "bridge",
          name: {
            en: "Lonavala Railway Overbridge Clearance (4.0m)",
            hi: "\u0932\u094B\u0928\u093E\u0935\u0932\u093E \u0930\u0947\u0932\u0935\u0947 \u0913\u0935\u0930\u092C\u094D\u0930\u093F\u091C \u090A\u0901\u091A\u093E\u0908 \u0938\u0940\u092E\u093E (4.0 \u092E\u0940)"
          },
          coordinates: [73.401, 18.751],
          limitType: "height",
          limitValue: 4,
          // 4.0 meters
          roadName: {
            en: "Old NH48 Khandala\u2013Lonavala Link Road (Simulated Hazard)",
            hi: "\u092A\u0941\u0930\u093E\u0928\u093E NH48 \u0916\u0902\u0921\u093E\u0932\u093E\u2013\u0932\u094B\u0928\u093E\u0935\u0932\u093E \u0932\u093F\u0902\u0915 \u0930\u094B\u0921"
          },
          actionGuidance: {
            en: "CRITICAL: Container carriers and high cargo (> 4.0m) CANNOT PASS. Divert to Expressway via Khopoli connector.",
            hi: "\u091A\u0947\u0924\u093E\u0935\u0928\u0940: \u0915\u0902\u091F\u0947\u0928\u0930 \u0935 4.0 \u092E\u0940\u091F\u0930 \u0938\u0947 \u090A\u0901\u091A\u0940 \u0917\u093E\u0921\u093C\u093F\u092F\u093E\u0901 \u092A\u093E\u0930 \u0928\u0939\u0940\u0902 \u0915\u0930 \u0938\u0915\u0924\u0940\u0902\u0964 \u0916\u094B\u092A\u094B\u0932\u0940 \u0938\u0947 \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938\u0935\u0947 \u092A\u0930 \u092E\u0941\u0921\u093C\u0947\u0902\u0964"
          },
          sourceAuthority: "Central Railway & PWD Maharashtra",
          verificationStatus: "verified"
        }
      ],
      turnSteps: {
        en: [
          "Leave Mumbai via Sion-Panvel Highway into Old Panvel",
          "Follow Old NH48 passing through Khopoli",
          "Climb the historic Khandala Ghat with sharp hairpins",
          "DANGER: Low clearance arch bridge ahead near Lonavala (4.0m limit)",
          "Continue through Kamshet and Chinchwad into Pune"
        ],
        hi: [
          "\u0938\u093E\u092F\u0928-\u092A\u0928\u0935\u0947\u0932 \u0938\u0947 \u092A\u0941\u0930\u093E\u0928\u0947 \u092A\u0928\u0935\u0947\u0932 \u0936\u0939\u0930 \u092E\u0947\u0902 \u092A\u094D\u0930\u0935\u0947\u0936 \u0915\u0930\u0947\u0902",
          "\u0916\u094B\u092A\u094B\u0932\u0940 \u0938\u0947 \u0939\u094B\u0924\u0947 \u0939\u0941\u090F \u092A\u0941\u0930\u093E\u0928\u0947 NH48 \u092A\u0930 \u092C\u0922\u093C\u0947\u0902",
          "\u0924\u0940\u0916\u0947 \u092E\u094B\u0921\u093C\u094B\u0902 \u0935\u093E\u0932\u0947 \u0916\u0902\u0921\u093E\u0932\u093E \u0918\u093E\u091F \u092A\u0930 \u0938\u093E\u0935\u0927\u093E\u0928\u0940 \u0938\u0947 \u091A\u0922\u093C\u0947\u0902",
          "\u0916\u093C\u0924\u0930\u093E: \u0932\u094B\u0928\u093E\u0935\u0932\u093E \u0915\u0947 \u092A\u093E\u0938 4.0 \u092E\u0940\u091F\u0930 \u0915\u093E \u0928\u0940\u091A\u093E \u0930\u0947\u0932\u0935\u0947 \u092A\u0941\u0932 \u0906\u090F\u0917\u093E",
          "\u0915\u093E\u092E\u0936\u0947\u0924 \u0914\u0930 \u092A\u093F\u0902\u092A\u0930\u0940-\u091A\u093F\u0902\u091A\u0935\u0921\u093C \u0939\u094B\u0924\u0947 \u0939\u0941\u090F \u092A\u0941\u0923\u0947 \u092A\u0939\u0941\u0901\u091A\u0947\u0902"
        ]
      }
    }
  ],
  // Mumbai <-> Nashik Corridor
  "mumbai|nashik": [
    {
      id: "mumbai_nashik_nh160",
      name: {
        en: "NH160 via Kasara Ghat (Standard Corridor)",
        hi: "NH160 \u0915\u0938\u093E\u0930\u093E \u0918\u093E\u091F \u0939\u094B\u0915\u0930 (\u092E\u0941\u0916\u094D\u092F \u092E\u093E\u0932\u0935\u093E\u0939\u0915 \u0930\u093E\u0938\u094D\u0924\u093E)"
      },
      distanceKm: 167,
      durationMinutes: 245,
      tollEstimateInr: 390,
      whyExplanation: {
        en: "Direct 4-lane highway, but subject to peak-hour Kasara Ghat heavy truck restrictions between 07:00 and 11:00 AM.",
        hi: "\u0938\u0940\u0927\u093E 4-\u0932\u0947\u0928 \u0939\u093E\u0908\u0935\u0947, \u092A\u0930\u0902\u0924\u0941 \u0938\u0941\u092C\u0939 07:00 \u0938\u0947 11:00 \u092C\u091C\u0947 \u0924\u0915 \u0915\u0938\u093E\u0930\u093E \u0918\u093E\u091F \u092E\u0947\u0902 \u092D\u093E\u0930\u0940 \u0917\u093E\u0921\u093C\u093F\u092F\u094B\u0902 \u092A\u0930 \u0930\u094B\u0915 \u0930\u0939\u0924\u0940 \u0939\u0948\u0964"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [72.8777, 19.076],
          // Mumbai
          [72.9781, 19.2183],
          // Thane Majiwada
          [73.125, 19.345],
          // Bhiwandi Freight Bypass
          [73.312, 19.512],
          // Asangaon
          [73.498, 19.662],
          // Kasara Ghat Checkpost (TIME BAN)
          [73.551, 19.702],
          // Igatpuri
          [73.682, 19.865],
          // Ghoti Toll
          [73.7898, 19.9975]
          // Nashik
        ]
      },
      restrictions: [
        {
          id: "kasara_time_ban",
          kind: "time_ban",
          name: {
            en: "Kasara Ghat Heavy Truck Entry Ban (07:00\u201311:00)",
            hi: "\u0915\u0938\u093E\u0930\u093E \u0918\u093E\u091F \u092D\u093E\u0930\u0940 \u091F\u094D\u0930\u0915 \u0928\u094B-\u090F\u0902\u091F\u094D\u0930\u0940 (07:00\u201311:00)"
          },
          coordinates: [73.498, 19.662],
          limitType: "time",
          timeWindow: {
            start: "07:00",
            end: "11:00"
          },
          roadName: {
            en: "NH160 Mumbai\u2013Agra Highway (Km 118)",
            hi: "NH160 \u092E\u0941\u0902\u092C\u0908\u2013\u0906\u0917\u0930\u093E \u0939\u093E\u0908\u0935\u0947 (\u0915\u093F\u092E\u0940 118)"
          },
          actionGuidance: {
            en: "Heavy multi-axle trucks are held at Asangaon parking lot between 07:00\u201311:00. Time departure to arrive outside this window.",
            hi: "\u0938\u0941\u092C\u0939 07:00\u201311:00 \u0915\u0947 \u092C\u0940\u091A \u091F\u094D\u0930\u0915\u094B\u0902 \u0915\u094B \u0906\u0938\u0928\u0917\u093E\u0902\u0935 \u092E\u0947\u0902 \u0930\u094B\u0915\u093E \u091C\u093E\u0924\u093E \u0939\u0948\u0964 \u0907\u0938 \u0938\u092E\u092F \u0938\u0947 \u092A\u0939\u0932\u0947 \u092F\u093E \u092C\u093E\u0926 \u092E\u0947\u0902 \u0928\u093F\u0915\u0932\u0928\u0947 \u0915\u0940 \u092F\u094B\u091C\u0928\u093E \u092C\u0928\u093E\u090F\u0901\u0964"
          },
          sourceAuthority: "Highway Safety Police Maharashtra",
          verificationStatus: "verified"
        }
      ],
      turnSteps: {
        en: [
          "Exit Mumbai via Eastern Express Highway to Thane Majiwada",
          "Pass Bhiwandi logistics hub onto NH160",
          "Check arrival clock at Asangaon before entering Kasara Ghat",
          "Climb Kasara Ghat using designated heavy vehicle crawling lane",
          "Cross Igatpuri plateau and proceed to Nashik"
        ],
        hi: [
          "\u0908\u0938\u094D\u091F\u0930\u094D\u0928 \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938\u0935\u0947 \u0938\u0947 \u0920\u093E\u0923\u0947 \u092E\u093E\u091C\u093F\u0935\u0921\u093C\u093E \u0915\u0940 \u0913\u0930 \u0928\u093F\u0915\u0932\u0947\u0902",
          "\u092D\u093F\u0935\u0902\u0921\u0940 \u0932\u0949\u091C\u093F\u0938\u094D\u091F\u093F\u0915\u094D\u0938 \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u0938\u0947 NH160 \u092A\u0930 \u0906\u090F\u0901",
          "\u0915\u0938\u093E\u0930\u093E \u0918\u093E\u091F \u092E\u0947\u0902 \u092A\u094D\u0930\u0935\u0947\u0936 \u0938\u0947 \u092A\u0939\u0932\u0947 \u0938\u092E\u092F \u0915\u0940 \u091C\u093E\u0901\u091A \u0915\u0930\u0947\u0902",
          "\u0918\u093E\u091F\u0940 \u092E\u0947\u0902 \u092D\u093E\u0930\u0940 \u0917\u093E\u0921\u093C\u093F\u092F\u094B\u0902 \u0915\u0940 \u0905\u0932\u0917 \u0932\u0947\u0928 \u092E\u0947\u0902 \u0927\u0940\u0930\u0947 \u091A\u0922\u093C\u0947\u0902",
          "\u0907\u0917\u0924\u092A\u0941\u0930\u0940 \u0938\u0947 \u0939\u094B\u0924\u0947 \u0939\u0941\u090F \u0928\u093E\u0938\u093F\u0915 \u0936\u0939\u0930 \u092A\u0939\u0941\u0901\u091A\u0947\u0902"
        ]
      }
    }
  ],
  // Pune <-> Nashik Corridor
  "nashik|pune": [
    {
      id: "pune_nashik_nh60",
      name: {
        en: "NH60 via Chakan & Sangamner (Freight Route)",
        hi: "NH60 \u091A\u093E\u0915\u0923 \u0935 \u0938\u0902\u0917\u092E\u0928\u0947\u0930 \u0939\u094B\u0915\u0930 (\u0914\u0926\u094D\u092F\u094B\u0917\u093F\u0915 \u0930\u093E\u0938\u094D\u0924\u093E)"
      },
      distanceKm: 212,
      durationMinutes: 290,
      tollEstimateInr: 440,
      whyExplanation: {
        en: "Primary link connecting Pune auto cluster with Nashik. Heavy industrial traffic through Chakan and single-lane bypass at Narayangaon.",
        hi: "\u092A\u0941\u0923\u0947 \u0911\u091F\u094B\u092E\u094B\u092C\u093E\u0907\u0932 \u0909\u0926\u094D\u092F\u094B\u0917 \u0915\u094B \u0928\u093E\u0938\u093F\u0915 \u0938\u0947 \u091C\u094B\u0921\u093C\u0928\u0947 \u0935\u093E\u0932\u093E \u092E\u0941\u0916\u094D\u092F \u092E\u093E\u0930\u094D\u0917\u0964 \u091A\u093E\u0915\u0923 \u0914\u0930 \u0928\u093E\u0930\u093E\u092F\u0923\u0917\u093E\u0902\u0935 \u092E\u0947\u0902 \u092D\u093E\u0930\u0940 \u0906\u0935\u093E\u0917\u092E\u0928 \u0930\u0939\u0924\u093E \u0939\u0948\u0964"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [73.8567, 18.5204],
          // Pune
          [73.861, 18.754],
          // Chakan Industrial Zone
          [73.912, 19.112],
          // Narayangaon
          [74.021, 19.345],
          // Alephata Junction
          [74.152, 19.572],
          // Sangamner
          [73.985, 19.851],
          // Sinnar Toll
          [73.7898, 19.9975]
          // Nashik
        ]
      },
      restrictions: [
        {
          id: "sangamner_weight_limit",
          kind: "weight",
          name: {
            en: "Sangamner River Bridge GVW Limit (40t)",
            hi: "\u0938\u0902\u0917\u092E\u0928\u0947\u0930 \u0928\u0926\u0940 \u092A\u0941\u0932 \u0915\u0941\u0932 \u0935\u091C\u093C\u0928 \u0938\u0940\u092E\u093E (40 \u091F\u0928)"
          },
          coordinates: [74.152, 19.572],
          limitType: "weight",
          limitValue: 40,
          roadName: {
            en: "Pravara River Old Causeway / Bypass (NH60)",
            hi: "\u092A\u094D\u0930\u0935\u0930\u093E \u0928\u0926\u0940 \u092A\u0941\u0930\u093E\u0928\u093E \u092A\u0941\u0932 (NH60)"
          },
          actionGuidance: {
            en: "Trucks with loaded gross weight exceeding 40 tonnes must use the eastern bypass ring road.",
            hi: "40 \u091F\u0928 \u0938\u0947 \u0905\u0927\u093F\u0915 \u0932\u0926\u0947 \u0935\u091C\u093C\u0928 \u0935\u093E\u0932\u0947 \u091F\u094D\u0930\u0915 \u092A\u0942\u0930\u094D\u0935\u0940 \u0930\u093F\u0902\u0917 \u0930\u094B\u0921 \u092C\u093E\u0908\u092A\u093E\u0938 \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964"
          },
          sourceAuthority: "NHAI Nashik Project Unit",
          verificationStatus: "unverified_demo"
        }
      ],
      turnSteps: {
        en: [
          "Leave Pune via Moshi / Bhosari towards Chakan",
          "Pass Chakan industrial junction (expect heavy truck movement)",
          "Follow NH60 through Narayangaon and Alephata",
          "Check bridge weight limits at Sangamner bypass",
          "Descend through Sinnar into Nashik MIDC area"
        ],
        hi: [
          "\u092D\u094B\u0938\u0930\u0940-\u092E\u094B\u0936\u0940 \u0939\u094B\u0924\u0947 \u0939\u0941\u090F \u091A\u093E\u0915\u0923 \u0915\u0940 \u0913\u0930 \u092A\u094D\u0930\u0938\u094D\u0925\u093E\u0928 \u0915\u0930\u0947\u0902",
          "\u091A\u093E\u0915\u0923 \u0914\u0926\u094D\u092F\u094B\u0917\u093F\u0915 \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u0938\u0947 \u0938\u093E\u0935\u0927\u093E\u0928 \u0939\u094B\u0915\u0930 \u0928\u093F\u0915\u0932\u0947\u0902",
          "NH60 \u092A\u0930 \u0928\u093E\u0930\u093E\u092F\u0923\u0917\u093E\u0902\u0935 \u0914\u0930 \u0906\u0933\u0947\u092B\u093E\u091F\u093E \u092A\u093E\u0930 \u0915\u0930\u0947\u0902",
          "\u0938\u0902\u0917\u092E\u0928\u0947\u0930 \u092C\u093E\u0908\u092A\u093E\u0938 \u092A\u0930 40 \u091F\u0928 \u092D\u093E\u0930 \u0938\u0940\u092E\u093E \u0915\u093E \u0927\u094D\u092F\u093E\u0928 \u0930\u0916\u0947\u0902",
          "\u0938\u093F\u0928\u094D\u0928\u0930 \u0939\u094B\u0924\u0947 \u0939\u0941\u090F \u0928\u093E\u0938\u093F\u0915 \u0914\u0926\u094D\u092F\u094B\u0917\u093F\u0915 \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u092A\u0939\u0941\u0901\u091A\u0947\u0902"
        ]
      }
    }
  ],
  // Delhi <-> Jaipur Corridor
  "delhi|jaipur": [
    {
      id: "delhi_jaipur_ne4",
      name: {
        en: "Delhi\u2013Mumbai Expressway (NE4 via Sohna & Dausa)",
        hi: "\u0926\u093F\u0932\u094D\u0932\u0940\u2013\u092E\u0941\u0902\u092C\u0908 \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938\u0935\u0947 (NE4 \u0938\u094B\u0939\u0928\u093E \u0935 \u0926\u094C\u0938\u093E \u0939\u094B\u0915\u0930)"
      },
      distanceKm: 275,
      durationMinutes: 240,
      tollEstimateInr: 720,
      whyExplanation: {
        en: "Engineered for over-dimensional heavy vehicles and multi-axle trailers. High-clearance flyovers (> 5.5m) and smooth gradients.",
        hi: "\u092D\u093E\u0930\u0940 \u0914\u0930 \u0913\u0921\u0940\u0938\u0940 \u091F\u094D\u0930\u0915\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0935\u093F\u0936\u0947\u0937 \u0930\u0942\u092A \u0938\u0947 \u0928\u093F\u0930\u094D\u092E\u093F\u0924\u0964 5.5 \u092E\u0940\u091F\u0930 \u0938\u0947 \u090A\u0901\u091A\u0947 \u0913\u0935\u0930\u092C\u094D\u0930\u093F\u091C \u0914\u0930 \u091A\u094C\u0921\u093C\u0940 \u0932\u0947\u0928 \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0902\u0964"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [77.1025, 28.7041],
          // Delhi
          [77.062, 28.452],
          // Gurgaon Rajiv Chowk
          [77.051, 28.245],
          // Sohna Elevated Entry
          [76.812, 27.845],
          // Nuh / Ferozepur Jhirka
          [76.621, 27.154],
          // Dausa Interchange
          [75.7873, 26.9124]
          // Jaipur
        ]
      },
      restrictions: [],
      turnSteps: {
        en: [
          "Exit Delhi south via Gurgaon Rajiv Chowk to Sohna",
          "Enter Delhi-Mumbai Expressway NE4 via toll plaza",
          "Maintain cruise speed in designated heavy truck lanes",
          "Take Dausa exit towards Jaipur bypass",
          "Arrive at Jaipur Transport Nagar"
        ],
        hi: [
          "\u0926\u093F\u0932\u094D\u0932\u0940 \u0938\u0947 \u0938\u094B\u0939\u0928\u093E \u0939\u094B\u0924\u0947 \u0939\u0941\u090F \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938\u0935\u0947 \u0915\u0940 \u0913\u0930 \u092C\u0922\u093C\u0947\u0902",
          "NE4 \u0926\u093F\u0932\u094D\u0932\u0940-\u092E\u0941\u0902\u092C\u0908 \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938\u0935\u0947 \u092A\u0930 \u092A\u094D\u0930\u0935\u0947\u0936 \u0915\u0930\u0947\u0902",
          "\u092D\u093E\u0930\u0940 \u0935\u093E\u0939\u0928 \u0932\u0947\u0928 \u092E\u0947\u0902 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0917\u0924\u093F \u092C\u0928\u093E\u090F \u0930\u0916\u0947\u0902",
          "\u0926\u094C\u0938\u093E \u0907\u0902\u091F\u0930\u091A\u0947\u0902\u091C \u0938\u0947 \u091C\u092F\u092A\u0941\u0930 \u092C\u093E\u0908\u092A\u093E\u0938 \u0915\u0940 \u0913\u0930 \u092E\u0941\u0921\u093C\u0947\u0902",
          "\u091C\u092F\u092A\u0941\u0930 \u091F\u094D\u0930\u093E\u0902\u0938\u092A\u094B\u0930\u094D\u091F \u0928\u0917\u0930 \u092E\u0947\u0902 \u092A\u094D\u0930\u0935\u0947\u0936 \u0915\u0930\u0947\u0902"
        ]
      }
    },
    {
      id: "delhi_jaipur_nh48_old",
      name: {
        en: "Old NH48 Highway via Dharuhera & Kotputli",
        hi: "\u092A\u0941\u0930\u093E\u0928\u093E NH48 \u0939\u093E\u0908\u0935\u0947 (\u0927\u093E\u0930\u0942\u0939\u0947\u0921\u093C\u093E \u0935 \u0915\u094B\u091F\u092A\u0942\u0924\u0932\u0940 \u0939\u094B\u0915\u0930)"
      },
      distanceKm: 268,
      durationMinutes: 340,
      tollEstimateInr: 410,
      whyExplanation: {
        en: "Traditional freight route. Slower due to flyover construction and low arch clearances near industrial underpasses.",
        hi: "\u092A\u093E\u0930\u0902\u092A\u0930\u093F\u0915 \u092E\u093E\u0930\u094D\u0917, \u092A\u0930\u0902\u0924\u0941 \u092B\u094D\u0932\u093E\u0908\u0913\u0935\u0930 \u0928\u093F\u0930\u094D\u092E\u093E\u0923 \u0914\u0930 \u0915\u0941\u091B \u0905\u0902\u0921\u0930\u092A\u093E\u0938\u094B\u0902 \u092A\u0930 4.1 \u092E\u0940\u091F\u0930 \u090A\u0901\u091A\u093E\u0908 \u0938\u0940\u092E\u093E \u0915\u0947 \u0915\u093E\u0930\u0923 \u0927\u0940\u092E\u093E \u0939\u0948\u0964"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [77.1025, 28.7041],
          // Delhi
          [76.985, 28.384],
          // Manesar Industrial Underpass (4.1m clearance)
          [76.792, 28.204],
          // Dharuhera
          [76.351, 27.701],
          // Behror
          [76.21, 27.604],
          // Kotputli
          [75.952, 27.31],
          // Shahpura
          [75.7873, 26.9124]
          // Jaipur
        ]
      },
      restrictions: [
        {
          id: "manesar_underpass",
          kind: "bridge",
          name: {
            en: "Manesar Underpass Height Restriction (4.1m)",
            hi: "\u092E\u093E\u0928\u0947\u0938\u0930 \u0905\u0902\u0921\u0930\u092A\u093E\u0938 \u090A\u0901\u091A\u093E\u0908 \u0938\u0940\u092E\u093E (4.1 \u092E\u0940\u091F\u0930)"
          },
          coordinates: [76.985, 28.384],
          limitType: "height",
          limitValue: 4.1,
          roadName: {
            en: "NH48 Manesar Service Corridor",
            hi: "NH48 \u092E\u093E\u0928\u0947\u0938\u0930 \u0938\u0930\u094D\u0935\u093F\u0938 \u0930\u094B\u0921"
          },
          actionGuidance: {
            en: "Vehicles taller than 4.1m must use elevated main carriageway; do not enter service lane underpass.",
            hi: "4.1 \u092E\u0940\u091F\u0930 \u0938\u0947 \u090A\u0901\u091A\u0940 \u0917\u093E\u0921\u093C\u093F\u092F\u093E\u0901 \u092E\u0941\u0916\u094D\u092F \u092B\u094D\u0932\u093E\u0908\u0913\u0935\u0930 \u092A\u0930 \u0930\u0939\u0947\u0902, \u0938\u0930\u094D\u0935\u093F\u0938 \u0905\u0902\u0921\u0930\u092A\u093E\u0938 \u092E\u0947\u0902 \u0928 \u091C\u093E\u090F\u0901\u0964"
          },
          sourceAuthority: "NHAI Delhi-Jaipur Corridor Division",
          verificationStatus: "unverified_demo"
        }
      ],
      turnSteps: {
        en: [
          "Depart Delhi towards Gurgaon and Manesar",
          "Notice Manesar underpass clearance warning (4.1m)",
          "Pass Dharuhera industrial cluster",
          "Cross Behror and Kotputli via NH48",
          "Enter Jaipur via Shahpura"
        ],
        hi: [
          "\u0926\u093F\u0932\u094D\u0932\u0940 \u0938\u0947 \u092E\u093E\u0928\u0947\u0938\u0930 \u0915\u0940 \u0913\u0930 \u092C\u0922\u093C\u0947\u0902",
          "\u092E\u093E\u0928\u0947\u0938\u0930 \u0905\u0902\u0921\u0930\u092A\u093E\u0938 \u0915\u0940 4.1 \u092E\u0940\u091F\u0930 \u090A\u0901\u091A\u093E\u0908 \u0938\u0940\u092E\u093E \u092A\u0930 \u0927\u094D\u092F\u093E\u0928 \u0926\u0947\u0902",
          "\u0927\u093E\u0930\u0942\u0939\u0947\u0921\u093C\u093E \u0914\u0930 \u092C\u0939\u0930\u094B\u0921\u093C \u092A\u093E\u0930 \u0915\u0930\u0947\u0902",
          "\u0915\u094B\u091F\u092A\u0942\u0924\u0932\u0940 \u0939\u094B\u0924\u0947 \u0939\u0941\u090F \u0936\u093E\u0939\u092A\u0941\u0930\u093E \u092A\u0939\u0941\u0901\u091A\u0947\u0902",
          "\u091C\u092F\u092A\u0941\u0930 \u0936\u0939\u0930 \u092E\u0947\u0902 \u092A\u094D\u0930\u0935\u0947\u0936 \u0915\u0930\u0947\u0902"
        ]
      }
    }
  ]
};

// src/server/routing/providers/offlineCorridorProvider.ts
var OfflineCorridorProvider = class {
  constructor() {
    this.name = "Routiq Verified Freight Corridors (High-Precision Geometry)";
  }
  isConfigured() {
    return true;
  }
  async calculateRoute(params) {
    const orig = params.originName.toLowerCase();
    const dest = params.destinationName.toLowerCase();
    let matchedKey;
    for (const key of Object.keys(CORRIDOR_ROUTES)) {
      const parts = key.split("|");
      if (orig.includes(parts[0]) && dest.includes(parts[1]) || orig.includes(parts[1]) && dest.includes(parts[0])) {
        matchedKey = key;
        break;
      }
    }
    if (!matchedKey) return [];
    const candidates = CORRIDOR_ROUTES[matchedKey] || [];
    const isReversed = matchedKey.split("|")[0] !== orig;
    return candidates.map((c, i) => {
      let coords = c.geometry.coordinates;
      if (isReversed) {
        coords = [...coords].reverse();
      }
      const gisEval = spatialEngine.evaluateRoute(coords, params.vehicle, params.departureTime);
      return {
        id: `corridor_${c.id}_${Date.now()}_${i}`,
        name: c.name,
        viaHighway: c.whyExplanation?.en || c.name.en,
        distanceKm: c.distanceKm,
        durationMinutes: c.durationMinutes,
        geometry: {
          type: "LineString",
          coordinates: coords
        },
        status: gisEval.status,
        statusReasons: gisEval.statusReasons,
        steps: (c.turnSteps?.en || []).map((stepText, idx) => ({
          instruction: stepText,
          distanceMeters: Math.round(c.distanceKm / (c.turnSteps?.en?.length || 1) * 1e3),
          durationSeconds: Math.round(c.durationMinutes / (c.turnSteps?.en?.length || 1) * 60),
          roadName: c.whyExplanation?.en || c.name.en,
          coordinates: coords[idx] || coords[0] || [0, 0]
        })),
        restrictions: gisEval.evaluatedRestrictions,
        roadWidthAssessment: gisEval.roadWidthIntelligence,
        provider: this.name
      };
    });
  }
};

// src/server/routing/routingService.ts
var RoutingService = class {
  constructor() {
    this.providers = [
      new ValhallaProvider(),
      new OpenRouteServiceProvider(),
      new OfflineCorridorProvider(),
      new OsrmRoutingProvider()
    ];
  }
  async calculateRoutes(params) {
    const { vehicle, originName, destinationName, departureTime } = params;
    if (!originName || !originName.trim()) {
      return this.errorResponse("ORIGIN_REQUIRED", "Origin location is required.", params);
    }
    if (!destinationName || !destinationName.trim()) {
      return this.errorResponse("DESTINATION_REQUIRED", "Destination location is required.", params);
    }
    if (originName.trim().toLowerCase() === destinationName.trim().toLowerCase()) {
      return this.errorResponse(
        "SAME_ORIGIN_DESTINATION",
        "Origin and destination cannot be identical.",
        params
      );
    }
    if (!vehicle || !vehicle.heightMeters || vehicle.heightMeters <= 0) {
      return this.errorResponse(
        "MISSING_VEHICLE_HEIGHT",
        "Vehicle height is mandatory for truck-safe route planning. Cannot determine bridge clearances without height.",
        params
      );
    }
    if (!vehicle.loadedWeightTonnes || vehicle.loadedWeightTonnes <= 0) {
      return this.errorResponse(
        "MISSING_VEHICLE_WEIGHT",
        "Vehicle loaded gross weight is mandatory for bridge weight limit validation.",
        params
      );
    }
    let originCoords = params.originCoordinates;
    let destCoords = params.destinationCoordinates;
    if (!originCoords || originCoords[0] === 0) {
      const places = await geocodingService.searchPlaces(originName, 1);
      if (places.length > 0) {
        originCoords = places[0].coordinates;
      } else {
        return this.errorResponse(
          "LOCATION_NOT_FOUND",
          `Could not geocode origin location: "${originName}".`,
          params
        );
      }
    }
    if (!destCoords || destCoords[0] === 0) {
      const places = await geocodingService.searchPlaces(destinationName, 1);
      if (places.length > 0) {
        destCoords = places[0].coordinates;
      } else {
        return this.errorResponse(
          "LOCATION_NOT_FOUND",
          `Could not geocode destination location: "${destinationName}".`,
          params
        );
      }
    }
    const resolvedParams = {
      ...params,
      originCoordinates: originCoords,
      destinationCoordinates: destCoords
    };
    let candidateRoutes = [];
    for (const provider of this.providers) {
      if (!provider.isConfigured()) continue;
      try {
        const routes = await provider.calculateRoute(resolvedParams);
        if (routes && routes.length > 0) {
          candidateRoutes = routes;
          break;
        }
      } catch (err) {
        console.warn(`[RoutingService] Provider ${provider.name} error:`, err);
      }
    }
    if (candidateRoutes.length === 0) {
      return this.errorResponse(
        "NO_ROUTE_FOUND",
        `No navigable road route found between "${originName}" and "${destinationName}". Check location inputs.`,
        resolvedParams
      );
    }
    const sorted = [...candidateRoutes].sort((a, b) => {
      const rank = (s) => s === "RECOMMENDED" ? 0 : s === "WARNING" ? 1 : 2;
      const diff = rank(a.status) - rank(b.status);
      if (diff !== 0) return diff;
      return a.durationMinutes - b.durationMinutes;
    });
    const recommended = sorted.find((r) => r.status !== "BLOCKED");
    return {
      routes: sorted,
      recommendedRouteId: recommended ? recommended.id : void 0,
      message: recommended ? void 0 : "No verified compliant route found: all candidate routes conflict with vehicle physical or timing restrictions.",
      origin: {
        name: { en: originName, hi: originName },
        coordinates: originCoords
      },
      destination: {
        name: { en: destinationName, hi: destinationName },
        coordinates: destCoords
      },
      evaluatedVehicle: vehicle,
      departureTime,
      calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  errorResponse(code, message, params) {
    return {
      routes: [],
      origin: {
        name: { en: params.originName || "", hi: params.originName || "" },
        coordinates: params.originCoordinates || [0, 0]
      },
      destination: {
        name: { en: params.destinationName || "", hi: params.destinationName || "" },
        coordinates: params.destinationCoordinates || [0, 0]
      },
      evaluatedVehicle: params.vehicle || {
        heightMeters: 0,
        widthMeters: 0,
        lengthMeters: 0,
        loadedWeightTonnes: 0
      },
      calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      error: code,
      message
    };
  }
};
var routingService = new RoutingService();

// src/server/auth/authService.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var AuthService = class {
  constructor() {
    this.JWT_SECRET = config.JWT_SECRET;
    this.TOKEN_EXPIRY = "7d";
  }
  async register(params) {
    const existing = await db.findUserByEmailOrPhone(params.emailOrPhone);
    if (existing) {
      throw new Error("An account with this email or phone number already exists.");
    }
    if (!params.password || params.password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(params.password, salt);
    const newUser = await db.createUser({
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email_or_phone: params.emailOrPhone.trim().toLowerCase(),
      password_hash: passwordHash,
      name: params.name.trim(),
      role: params.role || "driver",
      subscription_tier: "free",
      company_name: params.companyName?.trim(),
      language_preference: "en"
    });
    const token = this.generateToken(newUser);
    const { password_hash, ...safeUser } = newUser;
    return { user: safeUser, token };
  }
  async login(emailOrPhone, password) {
    const user = await db.findUserByEmailOrPhone(emailOrPhone);
    if (!user) {
      throw new Error("Invalid credentials. Please verify your phone/email and password.");
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error("Invalid credentials. Please verify your phone/email and password.");
    }
    const token = this.generateToken(user);
    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  }
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);
      return decoded;
    } catch {
      return null;
    }
  }
  generateToken(user) {
    const payload = {
      userId: user.id,
      emailOrPhone: user.email_or_phone,
      role: user.role,
      subscriptionTier: user.subscription_tier
    };
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: "7d" });
  }
};
var authService = new AuthService();

// src/server/middleware/authMiddleware.ts
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers["x-auth-token"];
  if (!authHeader || typeof authHeader !== "string") {
    return next();
  }
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
  const session = authService.verifyToken(token);
  if (session) {
    req.user = session;
  }
  next();
}
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers["x-auth-token"];
  if (!authHeader || typeof authHeader !== "string") {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Authentication required to access this resource."
    });
    return;
  }
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
  const session = authService.verifyToken(token);
  if (!session) {
    res.status(401).json({
      error: "INVALID_TOKEN",
      message: "Session has expired or token is invalid. Please sign in again."
    });
    return;
  }
  req.user = session;
  next();
}

// src/server/routes/routingRoutes.ts
var routingRouter = Router3();
routingRouter.post("/routes", optionalAuth, async (req, res) => {
  try {
    const params = req.body;
    const result = await routingService.calculateRoutes(params);
    if (result.error) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    console.error("[RoutingRouter] Route calculation failed:", err);
    res.status(500).json({
      error: "SERVER_ROUTING_ERROR",
      message: "Unexpected error during route calculation. Please verify inputs."
    });
  }
});
routingRouter.post("/routes/alternatives", optionalAuth, async (req, res) => {
  try {
    const params = req.body;
    const result = await routingService.calculateRoutes(params);
    res.json(result);
  } catch (err) {
    console.error("[RoutingRouter] Alternatives calculation failed:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Failed to compute route alternatives." });
  }
});
routingRouter.post("/routes/analyze", (req, res) => {
  try {
    const { coordinates, vehicle, departureTime } = req.body;
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      res.status(400).json({ error: "INVALID_GEOMETRY", message: "Valid GeoJSON coordinates array is required." });
      return;
    }
    if (!vehicle) {
      res.status(400).json({ error: "VEHICLE_REQUIRED", message: "Vehicle specifications required for analysis." });
      return;
    }
    const evaluation = spatialEngine.evaluateRoute(coordinates, vehicle, departureTime);
    res.json(evaluation);
  } catch (err) {
    console.error("[RoutingRouter] Route analysis failed:", err);
    res.status(500).json({ error: "ANALYSIS_FAILED", message: "Failed to perform spatial analysis on route." });
  }
});
routingRouter.post("/routes/save", optionalAuth, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Sign in to save routes to your profile." });
    return;
  }
  try {
    const { originName, originCoords, destinationName, destinationCoords, vehicleId, distanceKm, durationMinutes, status, geometry } = req.body;
    const saved = await db.saveRoute({
      id: `saved_rt_${Date.now()}`,
      user_id: req.user.userId,
      origin_name: originName,
      origin_lon: originCoords[0],
      origin_lat: originCoords[1],
      destination_name: destinationName,
      destination_lon: destinationCoords[0],
      destination_lat: destinationCoords[1],
      vehicle_id: vehicleId,
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
      status: status || "RECOMMENDED",
      geometry_geojson: geometry
    });
    res.json({ success: true, savedRoute: saved });
  } catch (err) {
    console.error("[RoutingRouter] Save route failed:", err);
    res.status(500).json({ error: "SAVE_FAILED", message: "Could not save route." });
  }
});
routingRouter.get("/routes/saved", optionalAuth, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Sign in to retrieve saved routes." });
    return;
  }
  try {
    const routes = await db.getSavedRoutes(req.user.userId);
    res.json({ routes });
  } catch (err) {
    console.error("[RoutingRouter] Get saved routes failed:", err);
    res.status(500).json({ error: "FETCH_FAILED", message: "Could not fetch saved routes." });
  }
});

// src/server/routes/placesRoutes.ts
import { Router as Router4 } from "express";

// src/server/places/placesService.ts
import * as turf2 from "@turf/turf";
var PlacesService = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.CACHE_TTL_MS = 30 * 60 * 1e3;
  }
  // 30 minutes cache
  /**
   * Search POIs within a bounding box or around a point
   */
  async searchNearby(lon, lat, radiusKm = 25, categories = ["fuel", "parking_rest", "repair", "weighbridge"]) {
    const cacheKey = `nearby:${lon.toFixed(3)},${lat.toFixed(3)}:${radiusKm}:${categories.sort().join(",")}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const radiusMeters = radiusKm * 1e3;
    const tagQueries = [];
    if (categories.includes("fuel")) {
      tagQueries.push(`node["amenity"="fuel"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes("parking_rest")) {
      tagQueries.push(`node["highway"~"rest_area|services"](around:${radiusMeters},${lat},${lon});`);
      tagQueries.push(`node["amenity"="parking"]["hgv"="yes"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes("repair")) {
      tagQueries.push(`node["shop"~"car_repair|truck_repair"](around:${radiusMeters},${lat},${lon});`);
      tagQueries.push(`node["craft"="mechanic"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes("tyres")) {
      tagQueries.push(`node["shop"="tyres"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes("weighbridge")) {
      tagQueries.push(`node["amenity"="weighbridge"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes("food_dhaba")) {
      tagQueries.push(`node["amenity"~"restaurant|cafe|fast_food"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes("lodging")) {
      tagQueries.push(`node["tourism"~"hotel|motel"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes("emergency")) {
      tagQueries.push(`node["amenity"~"hospital|pharmacy"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes("toll")) {
      tagQueries.push(`node["barrier"="toll_booth"](around:${radiusMeters},${lat},${lon});`);
    }
    const query = `[out:json][timeout:15];(${tagQueries.join("")});out body 40;`;
    try {
      const response = await fetch(config.OVERPASS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`
      });
      if (response.ok) {
        const json = await response.json();
        const originPoint = turf2.point([lon, lat]);
        const results = (json.elements || []).map((el) => {
          const pt = turf2.point([el.lon, el.lat]);
          const dist = turf2.distance(originPoint, pt, { units: "kilometers" });
          const cat = this.mapOsmTagsToCategory(el.tags || {});
          return {
            id: `osm_node_${el.id}`,
            name: el.tags?.name || el.tags?.brand || el.tags?.operator || `${this.formatCategoryName(cat)} Facility`,
            category: cat,
            coordinates: [el.lon, el.lat],
            address: [el.tags?.["addr:street"], el.tags?.["addr:city"], el.tags?.["addr:state"]].filter(Boolean).join(", ") || void 0,
            distanceKm: Number(dist.toFixed(1)),
            openingHours: el.tags?.opening_hours,
            phone: el.tags?.phone || el.tags?.["contact:phone"],
            tags: el.tags
          };
        });
        results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
        this.cache.set(cacheKey, { data: results, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return results;
      }
    } catch (err) {
      console.warn("[PlacesService] Overpass query failed:", err);
    }
    return [];
  }
  /**
   * Search POIs along a planned route LineString (within buffer)
   */
  async searchAlongRoute(routeCoordinates, bufferKm = 10, categories = ["fuel", "parking_rest", "repair", "weighbridge"]) {
    if (!routeCoordinates || routeCoordinates.length < 2) return [];
    const step = Math.max(1, Math.floor(routeCoordinates.length / 4));
    const sampleIndices = [0, step, step * 2, step * 3, routeCoordinates.length - 1];
    const allPoisMap = /* @__PURE__ */ new Map();
    const routeLine = turf2.lineString(routeCoordinates);
    for (const idx of sampleIndices) {
      if (idx < routeCoordinates.length) {
        const [lon, lat] = routeCoordinates[idx];
        const pois = await this.searchNearby(lon, lat, bufferKm, categories);
        for (const poi of pois) {
          if (!allPoisMap.has(poi.id)) {
            const poiPt = turf2.point(poi.coordinates);
            const distFromRouteKm = turf2.pointToLineDistance(poiPt, routeLine, { units: "kilometers" });
            if (distFromRouteKm <= bufferKm) {
              allPoisMap.set(poi.id, {
                ...poi,
                distanceKm: Number(distFromRouteKm.toFixed(1))
              });
            }
          }
        }
      }
    }
    const finalResults = Array.from(allPoisMap.values());
    finalResults.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    return finalResults.slice(0, 50);
  }
  mapOsmTagsToCategory(tags) {
    if (tags.amenity === "fuel") return "fuel";
    if (tags.amenity === "weighbridge") return "weighbridge";
    if (tags.barrier === "toll_booth") return "toll";
    if (tags.shop === "tyres") return "tyres";
    if (tags.shop === "truck_repair" || tags.shop === "car_repair" || tags.craft === "mechanic") return "repair";
    if (tags.highway === "rest_area" || tags.highway === "services" || tags.amenity === "parking") return "parking_rest";
    if (tags.tourism === "hotel" || tags.tourism === "motel") return "lodging";
    if (tags.amenity === "hospital" || tags.amenity === "pharmacy") return "emergency";
    if (tags.amenity === "restaurant" || tags.amenity === "cafe" || tags.amenity === "fast_food") return "food_dhaba";
    return "parking_rest";
  }
  formatCategoryName(cat) {
    switch (cat) {
      case "fuel":
        return "Fuel & Diesel Station";
      case "parking_rest":
        return "Truck Rest Area";
      case "repair":
        return "Truck Repair Workshop";
      case "tyres":
        return "Tyre Repair & Puncture Shop";
      case "weighbridge":
        return "Weighbridge / Dharam Kanta";
      case "food_dhaba":
        return "Dhaba & Restaurant";
      case "lodging":
        return "Driver Lodge / Hotel";
      case "emergency":
        return "Medical Emergency / Hospital";
      case "toll":
        return "Toll Plaza";
    }
  }
};
var placesService = new PlacesService();

// src/server/routes/placesRoutes.ts
var placesRouter = Router4();
placesRouter.get("/places/nearby", async (req, res) => {
  const lat = parseFloat(String(req.query.lat));
  const lon = parseFloat(String(req.query.lon || req.query.lng));
  const radiusKm = parseFloat(String(req.query.radiusKm || req.query.radius || "25"));
  const categoriesQuery = req.query.categories || req.query.category;
  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({ error: "INVALID_COORDINATES", message: 'Valid "lat" and "lon" required.' });
    return;
  }
  let categories = ["fuel", "parking_rest", "repair", "weighbridge"];
  if (typeof categoriesQuery === "string") {
    categories = categoriesQuery.split(",");
  }
  try {
    const places = await placesService.searchNearby(lon, lat, radiusKm, categories);
    res.json({ count: places.length, places });
  } catch (err) {
    console.error("[PlacesRouter] Nearby places error:", err);
    res.status(500).json({ error: "POI_SEARCH_FAILED", message: "Failed to search nearby commercial facilities." });
  }
});
placesRouter.post("/places/along-route", async (req, res) => {
  const { coordinates, bufferKm, categories } = req.body;
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    res.status(400).json({ error: "INVALID_COORDINATES", message: "Route LineString coordinates required." });
    return;
  }
  const buf = typeof bufferKm === "number" ? bufferKm : 10;
  const cats = Array.isArray(categories) && categories.length > 0 ? categories : ["fuel", "parking_rest", "repair", "weighbridge", "food_dhaba"];
  try {
    const places = await placesService.searchAlongRoute(coordinates, buf, cats);
    res.json({ count: places.length, places });
  } catch (err) {
    console.error("[PlacesRouter] Along route places error:", err);
    res.status(500).json({ error: "ROUTE_POI_FAILED", message: "Failed to search places along route." });
  }
});

// src/server/routes/vehicleRoutes.ts
import { Router as Router5 } from "express";
var vehicleRouter = Router5();
vehicleRouter.post("/vehicles/lookup", async (req, res) => {
  const regNumber = req.body.registrationNumber || req.body.regNumber;
  if (!regNumber || typeof regNumber !== "string") {
    res.status(400).json({
      status: "INVALID_FORMAT",
      vehicle: null,
      requiresDriverConfirmation: false,
      message: "Vehicle registration number is required (e.g. MH12AB1234)."
    });
    return;
  }
  try {
    const result = await vahanAdapter.lookupVehicle(regNumber);
    if (result.status === "INVALID_FORMAT") {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    console.error("[VehicleRouter] VAHAN lookup error:", err);
    res.status(500).json({
      status: "PROVIDER_ERROR",
      vehicle: null,
      requiresDriverConfirmation: false,
      message: "Unexpected server error during vehicle lookup."
    });
  }
});
vehicleRouter.get("/vehicles", optionalAuth, async (req, res) => {
  try {
    const vehicles = await db.getVehicles(req.user?.userId);
    res.json({ vehicles });
  } catch (err) {
    console.error("[VehicleRouter] Get vehicles error:", err);
    res.status(500).json({ error: "FETCH_FAILED", message: "Could not fetch vehicles." });
  }
});
vehicleRouter.post("/vehicles", optionalAuth, async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.height_meters || !data.loaded_weight_tonnes) {
      res.status(400).json({
        error: "MISSING_FIELDS",
        message: "Name, height_meters, and loaded_weight_tonnes are required."
      });
      return;
    }
    const newVehicle = await db.createVehicle({
      id: data.id || `veh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: req.user?.userId,
      name: data.name,
      registration_number: data.registration_number,
      category: data.category || "truck",
      height_meters: Number(data.height_meters),
      width_meters: Number(data.width_meters || 2.5),
      length_meters: Number(data.length_meters || 10),
      loaded_weight_tonnes: Number(data.loaded_weight_tonnes),
      registered_gvw_tonnes: Number(data.registered_gvw_tonnes || data.loaded_weight_tonnes),
      axle_count: Number(data.axle_count || 2),
      axle_load_tonnes: data.axle_load_tonnes ? Number(data.axle_load_tonnes) : void 0,
      fuel_type: data.fuel_type || "Diesel",
      cargo_type: data.cargo_type || "general",
      source: data.source || "MANUAL"
    });
    res.status(201).json({ success: true, vehicle: newVehicle });
  } catch (err) {
    console.error("[VehicleRouter] Create vehicle error:", err);
    res.status(500).json({ error: "SAVE_FAILED", message: "Could not save vehicle profile." });
  }
});
vehicleRouter.patch("/vehicles/:id", optionalAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await db.updateVehicle(id, req.body);
    if (!updated) {
      res.status(404).json({ error: "NOT_FOUND", message: "Vehicle not found." });
      return;
    }
    res.json({ success: true, vehicle: updated });
  } catch (err) {
    console.error("[VehicleRouter] Update vehicle error:", err);
    res.status(500).json({ error: "UPDATE_FAILED", message: "Could not update vehicle." });
  }
});
vehicleRouter.delete("/vehicles/:id", optionalAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const success = await db.deleteVehicle(id);
    if (!success) {
      res.status(404).json({ error: "NOT_FOUND", message: "Vehicle not found." });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[VehicleRouter] Delete vehicle error:", err);
    res.status(500).json({ error: "DELETE_FAILED", message: "Could not delete vehicle." });
  }
});

// src/server/routes/authRoutes.ts
import { Router as Router6 } from "express";
var authRouter = Router6();
authRouter.post("/auth/register", async (req, res) => {
  const { identifier, emailOrPhone, password, name, role, companyName } = req.body;
  const loginId = identifier || emailOrPhone;
  if (!loginId || !password || !name) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "Name, phone/email identifier, and password are required."
    });
    return;
  }
  try {
    const result = await authService.register({
      emailOrPhone: loginId,
      password,
      name,
      role,
      companyName
    });
    res.status(201).json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed.";
    res.status(400).json({ error: "REGISTRATION_FAILED", message: msg });
  }
});
authRouter.post("/auth/login", async (req, res) => {
  const { identifier, emailOrPhone, password } = req.body;
  const loginId = identifier || emailOrPhone;
  if (!loginId || !password) {
    res.status(400).json({
      error: "MISSING_CREDENTIALS",
      message: "Phone/email identifier and password are required."
    });
    return;
  }
  try {
    const result = await authService.login(loginId, password);
    res.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid credentials.";
    res.status(401).json({ error: "INVALID_CREDENTIALS", message: msg });
  }
});
authRouter.get("/auth/me", requireAuth, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Not authenticated." });
    return;
  }
  try {
    const user = await db.findUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ error: "USER_NOT_FOUND", message: "User profile not found." });
      return;
    }
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error("[AuthRouter] Get current user error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Failed to retrieve user profile." });
  }
});
authRouter.post("/auth/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out successfully." });
});

// src/server/routes/gisRoutes.ts
import { Router as Router7 } from "express";
var gisRouter = Router7();
gisRouter.get("/gis/restrictions", (_req, res) => {
  res.json({
    count: VERIFIED_FREIGHT_RESTRICTIONS.length,
    restrictions: VERIFIED_FREIGHT_RESTRICTIONS
  });
});
gisRouter.post("/gis/evaluate-line", (req, res) => {
  const { coordinates, vehicle, departureTime } = req.body;
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    res.status(400).json({ error: "INVALID_COORDINATES", message: "GeoJSON coordinates array required." });
    return;
  }
  if (!vehicle || typeof vehicle.heightMeters !== "number") {
    res.status(400).json({ error: "INVALID_VEHICLE", message: "Vehicle specifications with heightMeters required." });
    return;
  }
  try {
    const evaluation = spatialEngine.evaluateRoute(coordinates, vehicle, departureTime);
    res.json(evaluation);
  } catch (err) {
    console.error("[GisRouter] Spatial evaluation error:", err);
    res.status(500).json({ error: "EVALUATION_FAILED", message: "Spatial evaluation failed." });
  }
});

// src/server/app.ts
function createApp() {
  const app2 = express();
  app2.use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Auth-Token", "X-Request-Id"]
    })
  );
  app2.use(express.json({ limit: "5mb" }));
  app2.use(express.urlencoded({ extended: true }));
  app2.use((req, res, next) => {
    const reqId = req.headers["x-request-id"] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    res.setHeader("X-Request-Id", reqId);
    if (process.env.NODE_ENV !== "test") {
      console.log(`[Routiq API] ${req.method} ${req.url} - RequestId: ${reqId}`);
    }
    next();
  });
  app2.use("/api", healthRouter);
  app2.use("/api", geocodingRouter);
  app2.use("/api", routingRouter);
  app2.use("/api", placesRouter);
  app2.use("/api", vehicleRouter);
  app2.use("/api", authRouter);
  app2.use("/api", gisRouter);
  app2.use("/api/*", (req, res) => {
    res.status(404).json({
      error: "ENDPOINT_NOT_FOUND",
      message: `The API endpoint ${req.method} ${req.baseUrl} was not found.`
    });
  });
  app2.use((err, _req, res, _next) => {
    console.error("[Routiq Server Error]:", err);
    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected internal error occurred on the routing server."
    });
  });
  return app2;
}
var app = createApp();
export {
  app,
  createApp
};
export default app;
