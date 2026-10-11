/**
 * VAHAN Vehicle-Data API Request, Response & Normalized Specifications
 */

export interface VahanVehicleDetails {
  registrationNumber: string;
  makerModel: string;
  vehicleClass: string;
  category: 'truck' | 'tipper' | 'container' | 'tanker' | 'trailer';
  fuelType: string;
  registrationDate: string;
  registeredGvwTonnes: number;
  unladenWeightTonnes: number;
  suggestedAxles: number;
  // Specifications that standard VAHAN typically requires driver verification for:
  estimatedHeightMeters?: number;
  estimatedWidthMeters?: number;
  estimatedLengthMeters?: number;
  source: 'GOVERNMENT_VAHAN_GATEWAY' | 'ULIP_GATEWAY' | 'VAHAN_SIMULATED_GATEWAY' | 'MANUAL_ENTRY';
}

export type VahanLookupStatus = 
  | 'IDLE'
  | 'LOADING'
  | 'SUCCESS'
  | 'NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'UNCONFIGURED_CREDENTIALS'
  | 'API_UNAVAILABLE'
  | 'RATE_LIMITED';

export interface VahanLookupResult {
  status: VahanLookupStatus;
  vehicle?: VahanVehicleDetails;
  errorMessage?: string;
  requiresDriverConfirmation: boolean;
}
