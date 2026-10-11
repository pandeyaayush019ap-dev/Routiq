/**
 * GIS and Geospatial Utility Functions
 */

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/**
 * Calculates a bounding box encompassing a list of [lng, lat] coordinates
 */
export function calculateBounds(coordinates: [number, number][]): BoundingBox {
  if (!coordinates.length) {
    // Default to central Maharashtra / Western India
    return { minLng: 72.8, minLat: 18.5, maxLng: 73.9, maxLat: 20.0 };
  }

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coordinates) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Formats driving duration into hours and minutes
 */
export function formatDuration(totalMinutes: number, labels?: { h?: string; m?: string }): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hLabel = labels?.h || 'h';
  const mLabel = labels?.m || 'min';

  if (h === 0) {
    return `${m} ${mLabel}`;
  }
  if (m === 0) {
    return `${h} ${hLabel}`;
  }
  return `${h} ${hLabel} ${m} ${mLabel}`;
}

/**
 * Estimates arrival time from departure string ("HH:MM") and trip duration in minutes
 */
export function calculateArrivalTime(departureTime: string, durationMinutes: number): string {
  if (!departureTime || !departureTime.includes(':')) return '';
  const [hStr, mStr] = departureTime.split(':');
  const depH = parseInt(hStr, 10);
  const depM = parseInt(mStr, 10);

  if (isNaN(depH) || isNaN(depM)) return '';

  const totalMin = (depH * 60 + depM + durationMinutes) % 1440;
  const arrH = Math.floor(totalMin / 60);
  const arrM = totalMin % 60;

  return `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;
}

/**
 * Sanitizes and normalizes Indian vehicle registration format
 * e.g. "mh-12 ab 1234" -> "MH12AB1234"
 */
export function sanitizeRegistrationNumber(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Validates Indian vehicle registration standard format
 */
export function isValidIndianRegistration(input: string): boolean {
  const sanitized = sanitizeRegistrationNumber(input);
  // Standard format: 2 Letters (State) + 1-2 Digits (RTO) + 0-3 Letters (Series) + 4 Digits (Number)
  const regex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;
  return regex.test(sanitized);
}
