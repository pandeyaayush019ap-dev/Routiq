import React, { useState, useEffect, useRef } from 'react';
import { VehicleProfile, RouteCalculationResult, RoadRestriction, RouteCandidate } from '../../types';
import { routingService } from '../../services/routing/routingService';
import { geolocationService } from '../../services/navigation/geolocationService';
import { RouteResults } from './RouteResults';
import { useTranslation } from '../../i18n/context';

interface WaypointItem {
  id: string;
  name: string;
  coordinates?: [number, number];
}

interface RoutePlannerProps {
  vehicles: VehicleProfile[];
  activeVehicle: VehicleProfile;
  onSelectVehicle: (vehicleId: string) => void;
  onRoutesCalculated: (result: RouteCalculationResult) => void;
  routeResult?: RouteCalculationResult | null;
  selectedRouteId?: string;
  onSelectRoute: (routeId: string) => void;
  onSelectRestriction: (restriction: RoadRestriction) => void;
  onNavigateToVehicles: () => void;
  onStartNavigation?: (route: RouteCandidate) => void;
  isNavigating?: boolean;
  isStartingNavigation?: boolean;
  destinationOverride?: string | null;
  onClearDestinationOverride?: () => void;
  newStopOverride?: { name: string; coordinates: [number, number] } | null;
  onClearStopOverride?: () => void;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  vehicles,
  activeVehicle,
  onSelectVehicle,
  onRoutesCalculated,
  routeResult,
  selectedRouteId,
  onSelectRoute,
  onSelectRestriction,
  onNavigateToVehicles,
  onStartNavigation,
  isNavigating = false,
  isStartingNavigation = false,
  destinationOverride,
  onClearDestinationOverride,
  newStopOverride,
  onClearStopOverride,
}) => {
  const { t, isHindi } = useTranslation();
  const [origin, setOrigin] = useState<string>('Pune');
  const [destination, setDestination] = useState<string>('Mumbai');
  const [waypoints, setWaypoints] = useState<WaypointItem[]>([]);
  const [departureTime, setDepartureTime] = useState<string>('08:30');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAcquiringGps, setIsAcquiringGps] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RouteCalculationResult | null>(null);

  // Dynamic Geocoding Suggestions & AbortControllers
  const [originSuggestions, setOriginSuggestions] = useState<Array<{ name: string; address: string }>>([]);
  const [destSuggestions, setDestSuggestions] = useState<Array<{ name: string; address: string }>>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState<boolean>(false);
  const [isSearchingDest, setIsSearchingDest] = useState<boolean>(false);
  const originAbortRef = useRef<AbortController | null>(null);
  const destAbortRef = useRef<AbortController | null>(null);

  // Recent Searches
  const [recentSearches, setRecentSearches] = useState<Array<{ origin: string; destination: string }>>(() => {
    try {
      const saved = localStorage.getItem('routiq_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Handle external destination override (e.g. from POI "Navigate Here" action)
  useEffect(() => {
    if (destinationOverride) {
      setDestination(destinationOverride);
      onClearDestinationOverride?.();
    }
  }, [destinationOverride, onClearDestinationOverride]);

  // Handle external stop override (e.g. from POI "Add as Stop" action)
  useEffect(() => {
    if (newStopOverride) {
      setWaypoints((prev) => [
        ...prev,
        {
          id: `wp_${Date.now()}`,
          name: newStopOverride.name,
          coordinates: newStopOverride.coordinates,
        },
      ]);
      onClearStopOverride?.();
    }
  }, [newStopOverride, onClearStopOverride]);

  const availableCities = routingService.getAvailableCities();

  const handleOriginChange = (val: string) => {
    setOrigin(val);
    if (originAbortRef.current) originAbortRef.current.abort();

    if (val.trim().length >= 3) {
      const controller = new AbortController();
      originAbortRef.current = controller;
      setIsSearchingOrigin(true);

      routingService
        .searchPlaces(val)
        .then((res) => {
          if (!controller.signal.aborted) {
            setOriginSuggestions(res);
            setIsSearchingOrigin(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setIsSearchingOrigin(false);
        });
    } else {
      setOriginSuggestions([]);
    }
  };

  const handleDestChange = (val: string) => {
    setDestination(val);
    if (destAbortRef.current) destAbortRef.current.abort();

    if (val.trim().length >= 3) {
      const controller = new AbortController();
      destAbortRef.current = controller;
      setIsSearchingDest(true);

      routingService
        .searchPlaces(val)
        .then((res) => {
          if (!controller.signal.aborted) {
            setDestSuggestions(res);
            setIsSearchingDest(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setIsSearchingDest(false);
        });
    } else {
      setDestSuggestions([]);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsAcquiringGps(true);
    try {
      const pos = await geolocationService.requestPosition();
      // Reverse geocode
      try {
        const res = await fetch(`/api/geocoding/reverse?lat=${pos.latitude}&lon=${pos.longitude}`);
        if (res.ok) {
          const data = await res.json();
          if (data.place?.name?.en) {
            setOrigin(data.place.name.en);
            setIsAcquiringGps(false);
            return;
          }
        }
      } catch {
        // fallback
      }
      setOrigin(`${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}`);
    } catch {
      alert(isHindi ? 'जीपीएस स्थान प्राप्त करने में असमर्थ।' : 'Unable to acquire GPS location.');
    } finally {
      setIsAcquiringGps(false);
    }
  };

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setOriginSuggestions([]);
    setDestSuggestions([]);
  };

  const handleQuickCorridor = (orig: string, dest: string) => {
    setOrigin(orig);
    setDestination(dest);
    setOriginSuggestions([]);
    setDestSuggestions([]);
  };

  const handleAddStop = () => {
    if (waypoints.length >= 3) {
      alert(isHindi ? 'अधिकतम 3 स्टॉप जोड़े जा सकते हैं।' : 'Maximum 3 intermediate stops supported.');
      return;
    }
    setWaypoints((prev) => [
      ...prev,
      { id: `wp_${Date.now()}`, name: '' },
    ]);
  };

  const handleUpdateStop = (id: string, name: string) => {
    setWaypoints((prev) =>
      prev.map((w) => (w.id === id ? { ...w, name } : w))
    );
  };

  const handleRemoveStop = (id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  };

  const saveRecentSearch = (orig: string, dest: string) => {
    try {
      const filtered = recentSearches.filter(
        (s) => !(s.origin.toLowerCase() === orig.toLowerCase() && s.destination.toLowerCase() === dest.toLowerCase())
      );
      const updated = [{ origin: orig, destination: dest }, ...filtered].slice(0, 4);
      setRecentSearches(updated);
      localStorage.setItem('routiq_recent_searches', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleFindRoute = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!origin.trim()) {
      setErrorMessage(t('errOriginRequired'));
      return;
    }
    if (!destination.trim()) {
      setErrorMessage(t('errDestRequired'));
      return;
    }

    setIsLoading(true);

    try {
      const validWaypoints = waypoints
        .filter((w) => w.name.trim().length > 0)
        .map((w) => ({
          name: w.name,
          coordinates: w.coordinates || ([0, 0] as [number, number]),
        }));

      const result = await routingService.calculateRoutes({
        originName: origin,
        destinationName: destination,
        waypoints: validWaypoints.length > 0 ? validWaypoints : undefined,
        vehicle: activeVehicle,
        departureTime: departureTime || undefined,
      });

      if (result.error) {
        if (result.error === 'SAME_ORIGIN_DESTINATION') {
          setErrorMessage(t('errSameLocation'));
        } else if (result.error === 'LOCATION_NOT_FOUND') {
          setErrorMessage(t('errLocationNotFound'));
        } else if (result.error === 'NO_ROUTE_FOUND') {
          setErrorMessage(t('errNoRouteFound'));
        } else if (result.error === 'MISSING_VEHICLE_SPECS') {
          setErrorMessage(t('errMissingHeight'));
        }
      } else {
        setLastResult(result);
        onRoutesCalculated(result);
        saveRecentSearch(origin, destination);
      }
    } catch (err) {
      console.error('Route calculation error:', err);
      setErrorMessage('Calculation failed. Please verify vehicle specifications.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Driver Stop & Safety Notice */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex items-start gap-3 text-amber-900 text-xs">
        <span className="text-lg shrink-0">🛑</span>
        <div>
          <strong className="block font-bold mb-0.5">
            {isHindi ? 'सुरक्षा नियम' : 'Driver Safety Rule'}
          </strong>
          <span>{t('driverSafetyNotice')}</span>
        </div>
      </div>

      {/* Corridor Quick Buttons & Recent Searches */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {recentSearches.length > 0 ? (isHindi ? 'हालिया व मुख्य मार्ग' : 'Recent & Corridors') : t('quickCorridors')}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {recentSearches.map((rec, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickCorridor(rec.origin, rec.destination)}
              className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>🕒</span>
              <span>{rec.origin} ⇄ {rec.destination}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleQuickCorridor('Pune', 'Mumbai')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Pune ⇄ Mumbai
          </button>
          <button
            type="button"
            onClick={() => handleQuickCorridor('Mumbai', 'Nashik')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Mumbai ⇄ Nashik
          </button>
          <button
            type="button"
            onClick={() => handleQuickCorridor('Pune', 'Nashik')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Pune ⇄ Nashik
          </button>
          <button
            type="button"
            onClick={() => handleQuickCorridor('Delhi', 'Jaipur')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Delhi ⇄ Jaipur
          </button>
        </div>
      </div>

      {/* Directions Form */}
      <form onSubmit={handleFindRoute} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3.5">
        <datalist id="city-suggestions">
          {availableCities.map((city) => (
            <option key={city.id} value={isHindi ? city.name.hi : city.name.en} />
          ))}
        </datalist>

        {/* Origin */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="origin-input" className="text-xs font-bold text-slate-700">
              📍 {t('startLocation')}
            </label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isAcquiringGps}
              className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{isAcquiringGps ? '⏳' : '🎯'}</span>
              <span>{isHindi ? 'मेरा स्थान' : 'My Location'}</span>
            </button>
          </div>
          <input
            id="origin-input"
            list="city-suggestions"
            type="text"
            value={origin}
            onChange={(e) => handleOriginChange(e.target.value)}
            placeholder="Pune / मुंबई"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[46px]"
          />
          {isSearchingOrigin && (
            <div className="text-[10px] text-slate-400 mt-0.5">Searching places...</div>
          )}
          {originSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
              {originSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setOrigin(sug.name);
                    setOriginSuggestions([]);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-800">{sug.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{sug.address}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Intermediate Waypoints (Stops) */}
        {waypoints.map((wp, idx) => (
          <div key={wp.id} className="relative flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
              {idx + 1}
            </div>
            <input
              type="text"
              value={wp.name}
              onChange={(e) => handleUpdateStop(wp.id, e.target.value)}
              placeholder={`Stop ${idx + 1} (e.g. Lonavala / Panvel)`}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[42px]"
            />
            <button
              type="button"
              onClick={() => handleRemoveStop(wp.id)}
              className="text-slate-400 hover:text-red-600 font-bold px-2 py-1 text-sm cursor-pointer"
              title="Remove Stop"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Swap Control & Add Stop */}
        <div className="flex items-center justify-between">
          <div className="h-px bg-slate-200 flex-1 mr-2" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSwap}
              title={t('swapLocations')}
              aria-label={t('swapLocations')}
              className="w-9 h-9 rounded-full border border-slate-300 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-black text-sm transition-colors cursor-pointer shrink-0"
            >
              ⇅
            </button>
            <button
              type="button"
              onClick={handleAddStop}
              className="px-2.5 py-1 rounded-full border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>➕</span>
              <span>{isHindi ? 'स्टॉप जोड़ें' : 'Add Stop'}</span>
            </button>
          </div>
          <div className="h-px bg-slate-200 flex-1 ml-2" />
        </div>

        {/* Destination */}
        <div className="relative">
          <label htmlFor="destination-input" className="block text-xs font-bold text-slate-700 mb-1">
            🏁 {t('destination')}
          </label>
          <input
            id="destination-input"
            list="city-suggestions"
            type="text"
            value={destination}
            onChange={(e) => handleDestChange(e.target.value)}
            placeholder="Mumbai / नासिक"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[46px]"
          />
          {isSearchingDest && (
            <div className="text-[10px] text-slate-400 mt-0.5">Searching places...</div>
          )}
          {destSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
              {destSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setDestination(sug.name);
                    setDestSuggestions([]);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-800">{sug.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{sug.address}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Vehicle Selection */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="vehicle-select" className="text-xs font-bold text-slate-700">
              🚛 {t('selectVehicle')}
            </label>
            <button
              type="button"
              onClick={onNavigateToVehicles}
              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
            >
              + {t('addVehicleBtn')}
            </button>
          </div>
          <select
            id="vehicle-select"
            value={activeVehicle.id}
            onChange={(e) => onSelectVehicle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[46px] bg-white cursor-pointer"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} (H: {v.heightMeters}m · W: {v.loadedWeightTonnes}t)
              </option>
            ))}
          </select>
          {/* Active vehicle quick limits info */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
            <span>{t('heightLabel')}: <strong className="text-slate-800">{activeVehicle.heightMeters}m</strong></span>
            <span>·</span>
            <span>{t('loadedWeightLabel')}: <strong className="text-slate-800">{activeVehicle.loadedWeightTonnes}t</strong></span>
            <span>·</span>
            <span>{t('axlesLabel')}: <strong className="text-slate-800">{activeVehicle.axles}</strong></span>
          </div>
        </div>

        {/* Departure Time */}
        <div>
          <label htmlFor="departure-time" className="block text-xs font-bold text-slate-700 mb-1">
            🕒 {t('departureTime')}
          </label>
          <input
            id="departure-time"
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            {t('departureHint')}
          </p>
        </div>

        {/* Error Callout */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold" role="alert">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <>
              <span className="animate-spin text-lg">⏳</span>
              <span>{t('calculating')}</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>{t('findRouteBtn')}</span>
            </>
          )}
        </button>
      </form>

      {/* Results View */}
      {(routeResult || lastResult) && (
        <RouteResults
          routes={(routeResult || lastResult)!.routes}
          selectedRouteId={selectedRouteId}
          departureTime={departureTime}
          onSelectRoute={onSelectRoute}
          onSelectRestriction={onSelectRestriction}
          onStartNavigation={onStartNavigation}
          isNavigating={isNavigating}
          isStartingNavigation={isStartingNavigation}
        />
      )}
    </div>
  );
};
