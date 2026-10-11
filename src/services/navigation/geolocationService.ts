import { authService } from '../auth/authService';

export interface GpsPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null; // speed in m/s from browser Geolocation
  speedKmh: number; // speed in km/h
  timestamp: number;
}

export type GeolocationErrorCode =
  | 'NOT_SUPPORTED'
  | 'INSECURE_CONTEXT'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface GeolocationError {
  code: GeolocationErrorCode;
  message: string;
}

export interface StartTrackingOptions {
  vehicleId: string;
  tripId?: string;
  onPosition: (pos: GpsPosition) => void;
  onError: (err: GeolocationError) => void;
  throttleIntervalMs?: number; // default 5000ms
}

class GeolocationService {
  private activeWatchId: number | null = null;
  private lastTelemetryTime: number = 0;
  private isReporting: boolean = false;

  /**
   * Checks if browser supports Geolocation API
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Prompts driver for location access and gets immediate position
   */
  public async requestPosition(): Promise<GpsPosition> {
    if (!this.isSupported()) {
      throw {
        code: 'NOT_SUPPORTED',
        message: 'Browser Geolocation is not supported on this device.',
      } as GeolocationError;
    }

    return new Promise<GpsPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const speedKmh = pos.coords.speed ? Math.max(0, pos.coords.speed * 3.6) : 0;
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            speedKmh,
            timestamp: pos.timestamp,
          });
        },
        (err) => {
          reject(this.mapError(err));
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 1000,
        }
      );
    });
  }

  /**
   * Starts continuous GPS tracking with watchPosition and automatic telemetry upload
   */
  public startTracking(options: StartTrackingOptions): () => void {
    if (!this.isSupported()) {
      options.onError({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation API is not available on this device.',
      });
      return () => {};
    }

    // Clear any previous active watcher to avoid duplicates
    this.stopTracking();

    const throttleInterval = options.throttleIntervalMs || 5000;

    this.activeWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const speedKmh = pos.coords.speed ? Math.max(0, pos.coords.speed * 3.6) : 0;
        const currentPos: GpsPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          speedKmh,
          timestamp: pos.timestamp,
        };

        // Notify UI immediately for responsive map puck rendering
        options.onPosition(currentPos);

        // Throttled server telemetry upload (send every 5s while moving, 15s if stationary)
        const now = Date.now();
        const minInterval = speedKmh > 2.0 ? throttleInterval : throttleInterval * 3;

        if (now - this.lastTelemetryTime >= minInterval && !this.isReporting) {
          this.lastTelemetryTime = now;
          this.sendTelemetry({
            tripId: options.tripId,
            vehicleId: options.vehicleId,
            latitude: currentPos.latitude,
            longitude: currentPos.longitude,
            accuracy: currentPos.accuracy,
            heading: currentPos.heading,
            speed: currentPos.speedKmh,
            timestamp: new Date(currentPos.timestamp).toISOString(),
          });
        }
      },
      (err) => {
        options.onError(this.mapError(err));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      }
    );

    return () => this.stopTracking();
  }

  /**
   * Stops active GPS watcher
   */
  public stopTracking() {
    if (this.activeWatchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.activeWatchId);
      this.activeWatchId = null;
    }
  }

  /**
   * Sends background telemetry point to backend API
   */
  private async sendTelemetry(payload: {
    tripId?: string;
    vehicleId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number | null;
    speed?: number;
    timestamp: string;
  }) {
    this.isReporting = true;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = authService.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch('/api/trips/track', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Non-blocking catch to ensure temporary network blips don't crash driver navigation
      console.warn('[Telemetry] Update upload deferred:', err);
    } finally {
      this.isReporting = false;
    }
  }

  private mapError(err: GeolocationPositionError): GeolocationError {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return {
          code: 'PERMISSION_DENIED',
          message: 'Location permission was denied. Please allow GPS access in your browser settings to navigate.',
        };
      case err.POSITION_UNAVAILABLE:
        return {
          code: 'POSITION_UNAVAILABLE',
          message: 'GPS signal is currently unavailable. Ensure device GPS/Location services are enabled.',
        };
      case err.TIMEOUT:
        return {
          code: 'TIMEOUT',
          message: 'GPS location request timed out. Retrying signal acquisition…',
        };
      default:
        return {
          code: 'UNKNOWN',
          message: err.message || 'An unknown geolocation error occurred.',
        };
    }
  }
}

export const geolocationService = new GeolocationService();
