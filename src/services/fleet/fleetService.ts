import { authService } from '../auth/authService';

export interface FleetVehicle {
  vehicle_id: string;
  vehicle_name: string;
  registration_number?: string;
  driver_name?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  status: 'MOVING' | 'STATIONARY' | 'STALE' | 'OFFLINE';
  active_trip_id?: string;
  updated_at: string;
}

export interface FleetSummary {
  total: number;
  moving: number;
  stationary: number;
  stale: number;
  offline: number;
}

export interface FleetResponse {
  success: boolean;
  summary: FleetSummary;
  vehicles: FleetVehicle[];
  timestamp: string;
}

export interface VehicleTelemetryHistoryItem {
  id: string;
  trip_id?: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

class FleetService {
  /**
   * Fetches live fleet vehicles and status summary
   */
  public async getFleetVehicles(): Promise<FleetResponse> {
    const headers: Record<string, string> = {};
    const token = authService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/fleet/vehicles', { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch fleet state (HTTP ${res.status})`);
    }
    return res.json();
  }

  /**
   * Fetches breadcrumb telemetry history for selected vehicle
   */
  public async getVehicleHistory(vehicleId: string, limit: number = 60): Promise<VehicleTelemetryHistoryItem[]> {
    const headers: Record<string, string> = {};
    const token = authService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/fleet/vehicles/${vehicleId}/history?limit=${limit}`, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch vehicle history (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.history || [];
  }
}

export const fleetService = new FleetService();
