import { config } from '../config/env';

export interface VahanVehicleDetails {
  registrationNumber: string;
  makerModel: string;
  vehicleClass: string;
  category: 'truck' | 'container' | 'tipper' | 'tanker' | 'trailer';
  fuelType: string;
  registrationDate?: string;
  registeredGvwTonnes: number;
  unladenWeightTonnes: number;
  suggestedAxles: number;
  estimatedHeightMeters: number;
  estimatedWidthMeters: number;
  estimatedLengthMeters: number;
  source: string;
}

export interface VahanLookupResponse {
  status: 'SUCCESS' | 'INVALID_FORMAT' | 'NOT_FOUND' | 'UNCONFIGURED_CREDENTIALS' | 'PROVIDER_ERROR';
  vehicle: VahanVehicleDetails | null;
  requiresDriverConfirmation: boolean;
  message?: string;
  requiredCredentials?: string[];
}

export class VahanAdapter {
  private static readonly REGEX_INDIAN_RC = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

  public sanitizeRegistration(regNumber: string): string {
    return (regNumber || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  public isValidFormat(regNumber: string): boolean {
    const clean = this.sanitizeRegistration(regNumber);
    return VahanAdapter.REGEX_INDIAN_RC.test(clean);
  }

  public isConfigured(): boolean {
    return Boolean(
      (config.VAHAN_API_KEY && config.VAHAN_API_SECRET) ||
      (config.ULIP_USERNAME && config.ULIP_PASSWORD)
    );
  }

  public async lookupVehicle(registrationNumber: string): Promise<VahanLookupResponse> {
    const sanitized = this.sanitizeRegistration(registrationNumber);

    if (!this.isValidFormat(sanitized)) {
      return {
        status: 'INVALID_FORMAT',
        vehicle: null,
        requiresDriverConfirmation: false,
        message: 'Invalid Indian vehicle registration number format (e.g., MH12AB1234 or DL01AA9999).',
      };
    }

    // Check if real government VAHAN / ULIP credentials are provided on the server
    if (!this.isConfigured()) {
      return {
        status: 'UNCONFIGURED_CREDENTIALS',
        vehicle: null,
        requiresDriverConfirmation: false,
        message:
          'VAHAN / ULIP production gateway credentials are not yet configured on this server. To enable live vehicle lookup, configure VAHAN_API_KEY / VAHAN_API_SECRET or ULIP_USERNAME / ULIP_PASSWORD in your server environment variables. You can continue using manual vehicle entry.',
        requiredCredentials: [
          'VAHAN_API_KEY',
          'VAHAN_API_SECRET',
          'VAHAN_API_ENDPOINT',
          'ULIP_USERNAME',
          'ULIP_PASSWORD',
        ],
      };
    }

    try {
      // Live authenticated lookup to ULIP or VAHAN Gateway
      const endpoint = config.VAHAN_API_ENDPOINT;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.VAHAN_API_KEY) {
        headers['X-API-KEY'] = config.VAHAN_API_KEY;
        headers['X-API-SECRET'] = config.VAHAN_API_SECRET || '';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vehiclenumber: sanitized,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            status: 'NOT_FOUND',
            vehicle: null,
            requiresDriverConfirmation: false,
            message: `Vehicle registration ${sanitized} was not found in the national VAHAN registry.`,
          };
        }
        return {
          status: 'PROVIDER_ERROR',
          vehicle: null,
          requiresDriverConfirmation: false,
          message: `VAHAN gateway returned HTTP status ${response.status}.`,
        };
      }

      const data = (await response.json()) as {
        rc_regn_no?: string;
        rc_maker_model?: string;
        rc_vh_class_desc?: string;
        rc_fuel_desc?: string;
        rc_regn_dt?: string;
        rc_gvw?: number | string;
        rc_unladen_wt?: number | string;
        rc_no_cyl?: number;
      };

      const gvwNum = parseFloat(String(data.rc_gvw || '28000')) / 1000;
      const unladenNum = parseFloat(String(data.rc_unladen_wt || '9000')) / 1000;

      const details: VahanVehicleDetails = {
        registrationNumber: data.rc_regn_no || sanitized,
        makerModel: data.rc_maker_model || 'Commercial Vehicle',
        vehicleClass: data.rc_vh_class_desc || 'Heavy Goods Vehicle',
        category: 'truck',
        fuelType: data.rc_fuel_desc || 'Diesel',
        registrationDate: data.rc_regn_dt,
        registeredGvwTonnes: Number(gvwNum.toFixed(1)),
        unladenWeightTonnes: Number(unladenNum.toFixed(1)),
        suggestedAxles: gvwNum > 40 ? 5 : gvwNum > 25 ? 3 : 2,
        estimatedHeightMeters: 3.4,
        estimatedWidthMeters: 2.5,
        estimatedLengthMeters: 10.0,
        source: 'GOVERNMENT_VAHAN_GATEWAY',
      };

      return {
        status: 'SUCCESS',
        vehicle: details,
        requiresDriverConfirmation: true, // Mandatory: driver must confirm current container height & loaded weight
        message: 'Vehicle details retrieved successfully. Please verify current payload dimensions.',
      };
    } catch (err) {
      console.error('[VahanAdapter] Error during gateway call:', err);
      return {
        status: 'PROVIDER_ERROR',
        vehicle: null,
        requiresDriverConfirmation: false,
        message: 'Network error communicating with VAHAN gateway. Please check connection.',
      };
    }
  }
}

export const vahanAdapter = new VahanAdapter();
