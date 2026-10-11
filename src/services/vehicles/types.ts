import { VehicleProfile } from '../../types';

export interface VehicleValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface IVehicleService {
  getVehicles(): VehicleProfile[];
  getVehicleById(id: string): VehicleProfile | undefined;
  saveVehicle(vehicle: VehicleProfile): Promise<VehicleProfile>;
  deleteVehicle(id: string): Promise<boolean>;
  validateVehicle(vehicle: Partial<VehicleProfile>): VehicleValidationResult;
  getActiveVehicle(): VehicleProfile;
  setActiveVehicleId(id: string): void;
}
