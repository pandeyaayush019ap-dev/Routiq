import { IVahanLookupService } from './types';
import { VahanLookupResult, VahanVehicleDetails } from '../../types/vahan';
import { isValidIndianRegistration, sanitizeRegistrationNumber } from '../gis/geoUtils';

export class ProductionVahanLookupService implements IVahanLookupService {
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

    try {
      const response = await fetch('/api/vehicles/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: sanitized }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          const errData = await response.json().catch(() => ({}));
          return {
            status: 'INVALID_FORMAT',
            requiresDriverConfirmation: false,
            errorMessage: errData.message || 'Invalid registration format.',
          };
        }
      }

      const data = await response.json();

      if (data.status === 'UNCONFIGURED_CREDENTIALS') {
        return {
          status: 'UNCONFIGURED_CREDENTIALS',
          requiresDriverConfirmation: false,
          errorMessage: data.message,
        };
      }

      if (data.status === 'SUCCESS' && data.vehicle) {
        const v: VahanVehicleDetails = {
          registrationNumber: data.vehicle.registrationNumber,
          makerModel: data.vehicle.makerModel,
          vehicleClass: data.vehicle.vehicleClass,
          category: data.vehicle.category || 'truck',
          fuelType: data.vehicle.fuelType || 'Diesel',
          registrationDate: data.vehicle.registrationDate || '',
          registeredGvwTonnes: data.vehicle.registeredGvwTonnes,
          unladenWeightTonnes: data.vehicle.unladenWeightTonnes,
          suggestedAxles: data.vehicle.suggestedAxles,
          estimatedHeightMeters: data.vehicle.estimatedHeightMeters,
          estimatedWidthMeters: data.vehicle.estimatedWidthMeters,
          estimatedLengthMeters: data.vehicle.estimatedLengthMeters,
          source: data.vehicle.source || 'GOVERNMENT_VAHAN_GATEWAY',
        };

        return {
          status: 'SUCCESS',
          vehicle: v,
          requiresDriverConfirmation: true,
        };
      }

      if (data.status === 'NOT_FOUND') {
        return {
          status: 'NOT_FOUND',
          requiresDriverConfirmation: false,
          errorMessage: data.message || `Registration ${sanitized} not found in VAHAN records.`,
        };
      }

      return {
        status: 'API_UNAVAILABLE',
        requiresDriverConfirmation: false,
        errorMessage: data.message || 'VAHAN gateway service unavailable.',
      };
    } catch (err) {
      console.warn('[VahanService] Backend lookup failed, checking offline status:', err);
      return {
        status: 'API_UNAVAILABLE',
        requiresDriverConfirmation: false,
        errorMessage: 'Unable to reach backend VAHAN lookup service. Please check your network connection.',
      };
    }
  }
}

export const vahanService = new ProductionVahanLookupService();
