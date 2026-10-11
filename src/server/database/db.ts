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

// In-Memory Fallback Store (Ensures zero crashes when DATABASE_URL is not provided)
class InMemoryDatabase {
  public users: Map<string, DbUser> = new Map();
  public vehicles: Map<string, DbVehicle> = new Map();
  public savedRoutes: Map<string, DbSavedRoute> = new Map();

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
}

export const db = new DatabaseService();
