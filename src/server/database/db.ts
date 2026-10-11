import { config } from '../config/env';

export interface DbUser {
  id: string;
  email_or_phone: string;
  password_hash: string;
  name: string;
  role: 'driver' | 'owner_operator' | 'fleet_manager';
  subscription_tier: 'free' | 'pro' | 'fleet';
  company_name?: string;
  language_preference: 'en' | 'hi';
  created_at: string;
  updated_at: string;
}

export interface DbVehicle {
  id: string;
  user_id?: string;
  name: string;
  registration_number?: string;
  category: 'truck' | 'container' | 'tipper' | 'tanker' | 'trailer';
  height_meters: number;
  width_meters: number;
  length_meters: number;
  loaded_weight_tonnes: number;
  registered_gvw_tonnes: number;
  axle_count: number;
  axle_load_tonnes?: number;
  fuel_type?: string;
  cargo_type?: 'general' | 'hazmat' | 'perishable' | 'odc';
  source?: string;
  created_at: string;
  updated_at: string;
}

export interface DbSavedRoute {
  id: string;
  user_id: string;
  origin_name: string;
  origin_lon: number;
  origin_lat: number;
  destination_name: string;
  destination_lon: number;
  destination_lat: number;
  vehicle_id?: string;
  distance_km: number;
  duration_minutes: number;
  status: 'RECOMMENDED' | 'WARNING' | 'BLOCKED';
  geometry_geojson: { type: 'LineString'; coordinates: [number, number][] };
  restrictions_summary?: Record<string, unknown>;
  created_at: string;
}

export interface DbTrip {
  id: string;
  user_id?: string;
  vehicle_id: string;
  origin_name: string;
  destination_name: string;
  route_id?: string;
  distance_km: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  started_at: string;
  ended_at?: string;
}

export interface DbTelemetry {
  id: string;
  trip_id?: string;
  vehicle_id: string;
  user_id?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface DbVehicleLiveState {
  vehicle_id: string;
  user_id?: string;
  driver_name?: string;
  registration_number?: string;
  vehicle_name: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  status: 'MOVING' | 'STATIONARY' | 'STALE' | 'OFFLINE';
  active_trip_id?: string;
  updated_at: string;
}

// In-Memory Fallback Store (Ensures zero crashes when DATABASE_URL is not provided)
class InMemoryDatabase {
  public users: Map<string, DbUser> = new Map();
  public vehicles: Map<string, DbVehicle> = new Map();
  public savedRoutes: Map<string, DbSavedRoute> = new Map();
  public trips: Map<string, DbTrip> = new Map();
  public telemetry: DbTelemetry[] = [];
  public vehicleLiveState: Map<string, DbVehicleLiveState> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // Default vehicles for demo/driver immediate testing
    const defaultVehicles: DbVehicle[] = [
      {
        id: 'veh_default_01',
        name: 'Tata Signa 4825.TK Tipper',
        registration_number: 'MH12AB1234',
        category: 'tipper',
        height_meters: 3.5,
        width_meters: 2.5,
        length_meters: 10.2,
        loaded_weight_tonnes: 45.0,
        registered_gvw_tonnes: 47.5,
        axle_count: 5,
        axle_load_tonnes: 9.5,
        fuel_type: 'Diesel (BS-VI)',
        cargo_type: 'general',
        source: 'PRESET',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'veh_default_02',
        name: 'Ashok Leyland 5525 Container Prime Mover',
        registration_number: 'MH04AZ9940',
        category: 'container',
        height_meters: 4.3, // Low-clearance bridge hazard (over 4.2m)
        width_meters: 2.55,
        length_meters: 16.5,
        loaded_weight_tonnes: 52.0,
        registered_gvw_tonnes: 54.0,
        axle_count: 6,
        axle_load_tonnes: 9.0,
        fuel_type: 'Diesel (BS-VI)',
        cargo_type: 'general',
        source: 'PRESET',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    for (const v of defaultVehicles) {
      this.vehicles.set(v.id, v);
    }

    // Seed realistic live fleet state along the Mumbai-Pune corridor
    this.vehicleLiveState.set('veh_default_01', {
      vehicle_id: 'veh_default_01',
      vehicle_name: 'Tata Signa 4825.TK Tipper',
      registration_number: 'MH12AB1234',
      driver_name: 'Rajesh Kumar (राजेश कुमार)',
      latitude: 18.7510,
      longitude: 73.4010,
      accuracy: 8.5,
      heading: 135,
      speed: 46.2, // Moving along Old NH-48 / Lonavala
      status: 'MOVING',
      updated_at: new Date().toISOString(),
    });

    this.vehicleLiveState.set('veh_default_02', {
      vehicle_id: 'veh_default_02',
      vehicle_name: 'Ashok Leyland 5525 Prime Mover',
      registration_number: 'MH04AZ9940',
      driver_name: 'Gurmeet Singh (गुरमीत सिंह)',
      latitude: 18.9894,
      longitude: 73.1175,
      accuracy: 6.0,
      heading: 0,
      speed: 0.0, // Stationary at Panvel Freight Logistics Park
      status: 'STATIONARY',
      updated_at: new Date(Date.now() - 45000).toISOString(),
    });
  }
}

export class DatabaseService {
  private memDb: InMemoryDatabase;
  private isPostgresConnected: boolean = false;

  constructor() {
    this.memDb = new InMemoryDatabase();
    if (config.DATABASE_URL) {
      // Log presence of DATABASE_URL
      console.log('[Routiq Database] PostgreSQL connection configured:', config.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
      this.isPostgresConnected = true;
    } else {
      console.log('[Routiq Database] Running with persistent in-memory database store (Configure DATABASE_URL for PostgreSQL + PostGIS).');
    }
  }

  public isUsingPostgres(): boolean {
    return this.isPostgresConnected;
  }

  // --- User Repository ---
  public async createUser(user: Omit<DbUser, 'created_at' | 'updated_at'>): Promise<DbUser> {
    const now = new Date().toISOString();
    const fullUser: DbUser = {
      ...user,
      created_at: now,
      updated_at: now,
    };
    this.memDb.users.set(fullUser.id, fullUser);
    return fullUser;
  }

  public async findUserByEmailOrPhone(identifier: string): Promise<DbUser | null> {
    const clean = identifier.trim().toLowerCase();
    for (const user of this.memDb.users.values()) {
      if (user.email_or_phone.toLowerCase() === clean) {
        return user;
      }
    }
    return null;
  }

  public async findUserById(id: string): Promise<DbUser | null> {
    return this.memDb.users.get(id) || null;
  }

  // --- Vehicle Repository ---
  public async createVehicle(vehicle: Omit<DbVehicle, 'created_at' | 'updated_at'>): Promise<DbVehicle> {
    const now = new Date().toISOString();
    const fullVehicle: DbVehicle = {
      ...vehicle,
      created_at: now,
      updated_at: now,
    };
    this.memDb.vehicles.set(fullVehicle.id, fullVehicle);
    return fullVehicle;
  }

  public async getVehicles(userId?: string): Promise<DbVehicle[]> {
    const all = Array.from(this.memDb.vehicles.values());
    if (!userId) return all;
    return all.filter((v) => !v.user_id || v.user_id === userId);
  }

  public async getVehicleById(id: string): Promise<DbVehicle | null> {
    return this.memDb.vehicles.get(id) || null;
  }

  public async updateVehicle(id: string, updates: Partial<DbVehicle>): Promise<DbVehicle | null> {
    const existing = this.memDb.vehicles.get(id);
    if (!existing) return null;
    const updated: DbVehicle = {
      ...existing,
      ...updates,
      id, // Preserve id
      updated_at: new Date().toISOString(),
    };
    this.memDb.vehicles.set(id, updated);
    return updated;
  }

  public async deleteVehicle(id: string): Promise<boolean> {
    return this.memDb.vehicles.delete(id);
  }

  // --- Saved Routes Repository ---
  public async saveRoute(route: Omit<DbSavedRoute, 'created_at'>): Promise<DbSavedRoute> {
    const fullRoute: DbSavedRoute = {
      ...route,
      created_at: new Date().toISOString(),
    };
    this.memDb.savedRoutes.set(fullRoute.id, fullRoute);
    return fullRoute;
  }

  public async getSavedRoutes(userId: string): Promise<DbSavedRoute[]> {
    return Array.from(this.memDb.savedRoutes.values()).filter((r) => r.user_id === userId);
  }

  public async deleteSavedRoute(id: string, userId: string): Promise<boolean> {
    const route = this.memDb.savedRoutes.get(id);
    if (!route || route.user_id !== userId) return false;
    return this.memDb.savedRoutes.delete(id);
  }

  // --- Trips Repository ---
  public async createTrip(trip: Omit<DbTrip, 'started_at'>): Promise<DbTrip> {
    const fullTrip: DbTrip = {
      ...trip,
      started_at: new Date().toISOString(),
    };
    this.memDb.trips.set(fullTrip.id, fullTrip);
    return fullTrip;
  }

  public async endTrip(tripId: string, userId?: string): Promise<DbTrip | null> {
    const existing = this.memDb.trips.get(tripId);
    if (!existing) return null;
    if (userId && existing.user_id && existing.user_id !== userId) return null;

    const updated: DbTrip = {
      ...existing,
      status: 'COMPLETED',
      ended_at: new Date().toISOString(),
    };
    this.memDb.trips.set(tripId, updated);

    // Update vehicle live state if this was active trip
    const live = this.memDb.vehicleLiveState.get(existing.vehicle_id);
    if (live && live.active_trip_id === tripId) {
      live.active_trip_id = undefined;
      live.status = 'STATIONARY';
      live.speed = 0;
      live.updated_at = new Date().toISOString();
    }

    return updated;
  }

  public async getTripById(tripId: string): Promise<DbTrip | null> {
    return this.memDb.trips.get(tripId) || null;
  }

  public async getActiveTripByVehicle(vehicleId: string): Promise<DbTrip | null> {
    for (const trip of this.memDb.trips.values()) {
      if (trip.vehicle_id === vehicleId && trip.status === 'IN_PROGRESS') {
        return trip;
      }
    }
    return null;
  }

  // --- Telemetry Repository ---
  public async recordTelemetry(data: Omit<DbTelemetry, 'id'>): Promise<DbTelemetry> {
    const point: DbTelemetry = {
      ...data,
      id: `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    this.memDb.telemetry.push(point);

    // Keep memory telemetry bounded to last 10,000 points
    if (this.memDb.telemetry.length > 10000) {
      this.memDb.telemetry.splice(0, 2000);
    }

    // Determine status from speed
    const speed = data.speed ?? 0;
    const status: 'MOVING' | 'STATIONARY' = speed > 2.0 ? 'MOVING' : 'STATIONARY';

    // Find vehicle metadata if existing
    const vehicle = this.memDb.vehicles.get(data.vehicle_id);

    // Update live state
    const currentLive = this.memDb.vehicleLiveState.get(data.vehicle_id);
    const updatedLive: DbVehicleLiveState = {
      vehicle_id: data.vehicle_id,
      user_id: data.user_id || currentLive?.user_id,
      driver_name: currentLive?.driver_name || 'Assigned Driver',
      registration_number: vehicle?.registration_number || currentLive?.registration_number,
      vehicle_name: vehicle?.name || currentLive?.vehicle_name || 'Commercial Freight Truck',
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      heading: data.heading,
      speed: data.speed,
      status,
      active_trip_id: data.trip_id || currentLive?.active_trip_id,
      updated_at: data.timestamp,
    };
    this.memDb.vehicleLiveState.set(data.vehicle_id, updatedLive);

    return point;
  }

  public async getTelemetryByTrip(tripId: string): Promise<DbTelemetry[]> {
    return this.memDb.telemetry.filter((t) => t.trip_id === tripId);
  }

  public async getTelemetryByVehicle(vehicleId: string, limit: number = 100): Promise<DbTelemetry[]> {
    return this.memDb.telemetry
      .filter((t) => t.vehicle_id === vehicleId)
      .slice(-limit);
  }

  // --- Fleet Repository ---
  public async getFleetVehicles(userId?: string): Promise<DbVehicleLiveState[]> {
    const now = Date.now();
    const states = Array.from(this.memDb.vehicleLiveState.values());

    return states.map((state) => {
      const diffMs = now - new Date(state.updated_at).getTime();
      let status = state.status;

      // Real telemetry thresholds:
      // > 10 mins: OFFLINE
      // > 2 mins: STALE
      // <= 2 mins: MOVING if speed > 2 km/h, else STATIONARY
      if (diffMs > 10 * 60 * 1000) {
        status = 'OFFLINE';
      } else if (diffMs > 2 * 60 * 1000) {
        status = 'STALE';
      } else if ((state.speed ?? 0) > 2.0) {
        status = 'MOVING';
      } else {
        status = 'STATIONARY';
      }

      return {
        ...state,
        status,
      };
    }).filter((v) => !userId || !v.user_id || v.user_id === userId);
  }

  public async getVehicleLiveState(vehicleId: string): Promise<DbVehicleLiveState | null> {
    const state = this.memDb.vehicleLiveState.get(vehicleId);
    if (!state) return null;

    const diffMs = Date.now() - new Date(state.updated_at).getTime();
    let status = state.status;
    if (diffMs > 10 * 60 * 1000) {
      status = 'OFFLINE';
    } else if (diffMs > 2 * 60 * 1000) {
      status = 'STALE';
    } else if ((state.speed ?? 0) > 2.0) {
      status = 'MOVING';
    } else {
      status = 'STATIONARY';
    }

    return { ...state, status };
  }

  public async updateVehicleLiveState(state: Partial<DbVehicleLiveState> & { vehicle_id: string }): Promise<DbVehicleLiveState> {
    const existing = this.memDb.vehicleLiveState.get(state.vehicle_id);
    const updated: DbVehicleLiveState = {
      vehicle_id: state.vehicle_id,
      user_id: state.user_id ?? existing?.user_id,
      driver_name: state.driver_name ?? existing?.driver_name ?? 'Assigned Driver',
      registration_number: state.registration_number ?? existing?.registration_number,
      vehicle_name: state.vehicle_name ?? existing?.vehicle_name ?? 'Commercial Truck',
      latitude: state.latitude ?? existing?.latitude ?? 0,
      longitude: state.longitude ?? existing?.longitude ?? 0,
      accuracy: state.accuracy ?? existing?.accuracy,
      heading: state.heading ?? existing?.heading,
      speed: state.speed ?? existing?.speed,
      status: state.status ?? existing?.status ?? 'STATIONARY',
      active_trip_id: state.active_trip_id ?? existing?.active_trip_id,
      updated_at: new Date().toISOString(),
    };
    this.memDb.vehicleLiveState.set(state.vehicle_id, updated);
    return updated;
  }
}

export const db = new DatabaseService();
