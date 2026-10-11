import { VehicleProfile } from '../../types';
import { IVehicleService, VehicleValidationResult } from './types';

export const INITIAL_VEHICLES: VehicleProfile[] = [
  {
    id: 'v1_tata407',
    name: 'Tata 407 LPT (City Freight)',
    category: 'truck',
    registrationNumber: 'MH12AB4071',
    gvwTonnes: 7.5,
    loadedWeightTonnes: 4.5,
    heightMeters: 3.0,
    widthMeters: 2.1,
    lengthMeters: 6.2,
    axles: 2,
    cargoType: 'general',
    isVahanVerified: true,
  },
  {
    id: 'v2_container40',
    name: '40ft High-Cube Multi-Axle Container',
    category: 'container',
    registrationNumber: 'MH04AZ9940',
    gvwTonnes: 35.0,
    loadedWeightTonnes: 31.5,
    heightMeters: 4.3, // Notice this height triggers the 4.0m Lonavala railway bridge violation!
    widthMeters: 2.5,
    lengthMeters: 14.5,
    axles: 3,
    cargoType: 'general',
    isVahanVerified: true,
  },
  {
    id: 'v3_tipper28',
    name: 'BharatBenz 2823 Heavy Tipper',
    category: 'tipper',
    registrationNumber: 'MH14DA2823',
    gvwTonnes: 28.0,
    loadedWeightTonnes: 26.0,
    heightMeters: 3.4,
    widthMeters: 2.5,
    lengthMeters: 8.8,
    axles: 3,
    cargoType: 'heavy_machinery',
    isVahanVerified: false,
  },
  {
    id: 'v4_tanker',
    name: 'Bharat Petroleum 4-Axle Fuel Tanker',
    category: 'tanker',
    registrationNumber: 'DL01AA8821',
    gvwTonnes: 38.0,
    loadedWeightTonnes: 35.0,
    heightMeters: 3.7,
    widthMeters: 2.5,
    lengthMeters: 12.0,
    axles: 4,
    cargoType: 'hazardous',
    isVahanVerified: true,
  },
];

const STORAGE_KEY = 'routiq_vehicle_profiles';
const ACTIVE_VEHICLE_KEY = 'routiq_active_vehicle_id';

export class LocalVehicleService implements IVehicleService {
  private vehicles: VehicleProfile[];
  private activeId: string;

  constructor() {
    this.vehicles = this.loadFromStorage();
    this.activeId = this.loadActiveId();
  }

  private loadFromStorage(): VehicleProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // storage unavailable
    }
    return INITIAL_VEHICLES;
  }

  private loadActiveId(): string {
    try {
      const saved = localStorage.getItem(ACTIVE_VEHICLE_KEY);
      if (saved && this.vehicles.some((v) => v.id === saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return this.vehicles[0]?.id || 'v1_tata407';
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.vehicles));
      localStorage.setItem(ACTIVE_VEHICLE_KEY, this.activeId);
    } catch {
      // storage unavailable
    }
  }

  public getVehicles(): VehicleProfile[] {
    return [...this.vehicles];
  }

  public getVehicleById(id: string): VehicleProfile | undefined {
    return this.vehicles.find((v) => v.id === id);
  }

  public getActiveVehicle(): VehicleProfile {
    const found = this.vehicles.find((v) => v.id === this.activeId);
    return found || this.vehicles[0] || INITIAL_VEHICLES[0];
  }

  public setActiveVehicleId(id: string): void {
    if (this.vehicles.some((v) => v.id === id)) {
      this.activeId = id;
      this.saveToStorage();
    }
  }

  public async saveVehicle(vehicle: VehicleProfile): Promise<VehicleProfile> {
    const existingIndex = this.vehicles.findIndex((v) => v.id === vehicle.id);
    if (existingIndex >= 0) {
      this.vehicles[existingIndex] = vehicle;
    } else {
      this.vehicles.push(vehicle);
    }
    this.saveToStorage();
    return vehicle;
  }

  public async deleteVehicle(id: string): Promise<boolean> {
    if (this.vehicles.length <= 1) {
      // Keep at least one profile
      return false;
    }
    this.vehicles = this.vehicles.filter((v) => v.id !== id);
    if (this.activeId === id) {
      this.activeId = this.vehicles[0].id;
    }
    this.saveToStorage();
    return true;
  }

  public validateVehicle(vehicle: Partial<VehicleProfile>): VehicleValidationResult {
    const errors: Record<string, string> = {};

    if (!vehicle.name || !vehicle.name.trim()) {
      errors.name = 'Vehicle nickname is required';
    }

    const checkRange = (key: string, val: number | undefined, min: number, max: number, label: string) => {
      if (val === undefined || val === null || isNaN(val)) {
        errors[key] = `${label} is required`;
      } else if (val < min || val > max) {
        errors[key] = `${label} must be between ${min} and ${max}`;
      }
    };

    checkRange('gvwTonnes', vehicle.gvwTonnes, 1.0, 65.0, 'Gross vehicle weight');
    checkRange('loadedWeightTonnes', vehicle.loadedWeightTonnes, 0.5, 65.0, 'Loaded weight');
    checkRange('heightMeters', vehicle.heightMeters, 1.0, 5.5, 'Height');
    checkRange('widthMeters', vehicle.widthMeters, 1.0, 3.5, 'Width');
    checkRange('lengthMeters', vehicle.lengthMeters, 2.0, 26.0, 'Length');
    checkRange('axles', vehicle.axles, 2, 12, 'Axle count');

    if (
      vehicle.loadedWeightTonnes !== undefined &&
      vehicle.gvwTonnes !== undefined &&
      vehicle.loadedWeightTonnes > vehicle.gvwTonnes
    ) {
      errors.loadedWeightTonnes = 'Current loaded weight cannot exceed legal registered GVW';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

export const vehicleService = new LocalVehicleService();
