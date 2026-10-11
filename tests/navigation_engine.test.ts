import { describe, it, expect } from 'vitest';
import { navigationEngine } from '../src/services/navigation/navigationEngine';
import { RouteCandidate } from '../src/types';
import { GpsPosition } from '../src/services/navigation/geolocationService';

describe('NavigationEngine Adaptive Off-Route & Corridor Tracking', () => {
  const sampleRoute: RouteCandidate = {
    id: 'test_mumbai_kalyan',
    name: { en: 'Mumbai to Kalyan Freight Corridor', hi: 'मुंबई से कल्याण मालवाहक मार्ग' },
    distanceKm: 30,
    durationMinutes: 40,
    whyExplanation: { en: 'Fastest corridor', hi: 'सबसे तेज़ मार्ग' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [72.8600, 19.2500], // Start: Dahisar
        [72.9500, 19.2500], // Middle point 1
        [73.0500, 19.2450], // Middle point 2
        [73.1300, 19.2400], // End: Kalyan
      ],
    },
    restrictions: [],
    turnSteps: {
      en: ['Depart Dahisar', 'Continue on Highway', 'Turn onto Kalyan Link', 'Arrive in Kalyan'],
      hi: ['दहिसर से प्रस्थान करें', 'हाईवे पर आगे बढ़ें', 'कल्याण लिंक पर मुड़ें', 'कल्याण पहुंचें'],
    },
  };

  it('keeps isOffRoute false when driver is within GPS accuracy tolerance on the route', () => {
    // Driver is 50m from route with 30m accuracy
    const pos: GpsPosition = {
      latitude: 19.2503,
      longitude: 72.8700,
      accuracy: 30,
      heading: 90,
      speed: 12,
      speedKmh: 43.2,
      timestamp: Date.now(),
    };

    const state = navigationEngine.evaluateState(pos, sampleRoute);
    expect(state.isOffRoute).toBe(false);
    expect(state.isApproachingOrigin).toBe(false);
  });

  it('identifies approaching route start instead of false off-route panic for warehouse start (~1km from origin)', () => {
    // Driver is at Dahisar depot, 1014m from origin with ±115m GPS noise (exact user screenshot scenario)
    const pos: GpsPosition = {
      latitude: 19.2408,
      longitude: 72.8599,
      accuracy: 115,
      heading: 45,
      speed: 0,
      speedKmh: 0,
      timestamp: Date.now(),
    };

    const state = navigationEngine.evaluateState(pos, sampleRoute);
    expect(state.isOffRoute).toBe(false);
    expect(state.isApproachingOrigin).toBe(true);
    expect(state.offRouteDistanceMeters).toBeGreaterThan(500);
    expect(state.currentManeuver.instructionEn).toContain('route start');
  });

  it('correctly triggers isOffRoute when driver deviates on the highway beyond start corridor', () => {
    // Driver is 15km into the trip (near 73.00, 19.25), but is 600m south in an unauthorized alley
    const pos: GpsPosition = {
      latitude: 19.2440,
      longitude: 73.0000,
      accuracy: 25,
      heading: 180,
      speed: 8,
      speedKmh: 28.8,
      timestamp: Date.now(),
    };

    const state = navigationEngine.evaluateState(pos, sampleRoute);
    expect(state.isOffRoute).toBe(true);
    expect(state.isApproachingOrigin).toBe(false);
  });

  it('gracefully handles degraded route with single coordinate without throwing runtime errors', () => {
    const degradedRoute: RouteCandidate = {
      ...sampleRoute,
      geometry: {
        type: 'LineString',
        coordinates: [[72.86, 19.25]],
      },
    };

    const pos: GpsPosition = {
      latitude: 19.25,
      longitude: 72.86,
      accuracy: 30,
      heading: 0,
      speed: 0,
      speedKmh: 0,
      timestamp: Date.now(),
    };

    const state = navigationEngine.evaluateState(pos, degradedRoute);
    expect(state).toBeDefined();
    expect(state.isOffRoute).toBe(false);
  });
});
