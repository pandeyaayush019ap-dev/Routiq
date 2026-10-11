import { VahanLookupResult, VahanVehicleDetails } from '../../types/vahan';

export interface IVahanLookupService {
  lookupVehicle(registrationNumber: string): Promise<VahanLookupResult>;
  validateRegistrationFormat(registrationNumber: string): boolean;
  normalizeRegistration(registrationNumber: string): string;
}
