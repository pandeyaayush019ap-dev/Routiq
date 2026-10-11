import { IVahanLookupService } from './types';
import { VahanLookupResult, VahanVehicleDetails } from '../../types/vahan';
import { isValidIndianRegistration, sanitizeRegistrationNumber } from '../gis/geoUtils';

const KNOWN_VAHAN_DATABASE: Record<string, VahanVehicleDetails> = {
  MH12AB1234: {
    registrationNumber: 'MH12AB1234',
    makerModel: 'Tata Signa 4825.TK Heavy Hauler',
    vehicleClass: 'Heavy Goods Vehicle (HGV)',
    category: 'tipper',
    fuelType: 'Diesel (BS-VI)',
    registrationDate: '2022-04-14',
    registeredGvwTonnes: 47.5,
    unladenWeightTonnes: 14.2,
    suggestedAxles: 5,
    estimatedHeightMeters: 3.5,
    estimatedWidthMeters: 2.5,
    estimatedLengthMeters: 10.2,
    source: 'VAHAN_SIMULATED_GATEWAY',
  },
  MH04AZ9940: {
    registrationNumber: 'MH04AZ9940',
    makerModel: 'Ashok Leyland 5525 TT Prime Mover Container',
    vehicleClass: 'Multi-Axle Articulated Trailer',
    category: 'container',
    fuelType: 'Diesel (BS-VI)',
    registrationDate: '2023-01-20',
    registeredGvwTonnes: 54.0,
    unladenWeightTonnes: 12.5,
    suggestedAxles: 6,
    estimatedHeightMeters: 4.3, // High container
    estimatedWidthMeters: 2.5,
    estimatedLengthMeters: 16.5,
    source: 'VAHAN_SIMULATED_GATEWAY',
  },
  DL01AA8821: {
    registrationNumber: 'DL01AA8821',
    makerModel: 'BharatBenz 3528C Petroleum Tanker',
    vehicleClass: 'Hazardous Goods Tanker',
    category: 'tanker',
    fuelType: 'Diesel (BS-VI)',
    registrationDate: '2021-11-05',
    registeredGvwTonnes: 35.0,
    unladenWeightTonnes: 11.8,
    suggestedAxles: 4,
    estimatedHeightMeters: 3.65,
    estimatedWidthMeters: 2.5,
    estimatedLengthMeters: 11.8,
    source: 'VAHAN_SIMULATED_GATEWAY',
  },
  MH12AB4071: {
    registrationNumber: 'MH12AB4071',
    makerModel: 'Tata 407 Gold SFC High-Deck',
    vehicleClass: 'Light Commercial Vehicle (LCV)',
    category: 'truck',
    fuelType: 'Diesel',
    registrationDate: '2020-08-12',
    registeredGvwTonnes: 7.5,
    unladenWeightTonnes: 2.9,
    suggestedAxles: 2,
    estimatedHeightMeters: 3.0,
    estimatedWidthMeters: 2.1,
    estimatedLengthMeters: 6.0,
    source: 'VAHAN_SIMULATED_GATEWAY',
  },
};

export class MockVahanLookupService implements IVahanLookupService {
  public validateRegistrationFormat(registrationNumber: string): boolean {
    return isValidIndianRegistration(registrationNumber);
  }

  public normalizeRegistration(registrationNumber: string): string {
    return sanitizeRegistrationNumber(registrationNumber);
  }

  public async lookupVehicle(registrationNumber: string): Promise<VahanLookupResult> {
    const sanitized = this.normalizeRegistration(registrationNumber);

    if (!this.validateRegistrationFormat(sanitized)) {
      return {
        status: 'INVALID_FORMAT',
        requiresDriverConfirmation: false,
        errorMessage: 'Invalid Indian registration format. Example: MH12AB1234 or DL01AA9999',
      };
    }

    // Simulate realistic network roundtrip to VAHAN gateway
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Check pre-configured database
    const exactMatch = KNOWN_VAHAN_DATABASE[sanitized];
    if (exactMatch) {
      return {
        status: 'SUCCESS',
        vehicle: exactMatch,
        requiresDriverConfirmation: true, // As required by PRD and rules
      };
    }

    // Generate realistic response for any other valid Indian registration
    const stateCode = sanitized.substring(0, 2);
    const mockGenerated: VahanVehicleDetails = {
      registrationNumber: sanitized,
      makerModel: `Eicher Pro 6028 Commercial Hauler (${stateCode} RTO)`,
      vehicleClass: 'Heavy Commercial Vehicle (HCV)',
      category: 'truck',
      fuelType: 'Diesel (BS-VI)',
      registrationDate: '2022-09-18',
      registeredGvwTonnes: 28.0,
      unladenWeightTonnes: 8.8,
      suggestedAxles: 3,
      estimatedHeightMeters: 3.4,
      estimatedWidthMeters: 2.45,
      estimatedLengthMeters: 9.2,
      source: 'VAHAN_SIMULATED_GATEWAY',
    };

    return {
      status: 'SUCCESS',
      vehicle: mockGenerated,
      requiresDriverConfirmation: true,
    };
  }
}

export const vahanService = new MockVahanLookupService();
