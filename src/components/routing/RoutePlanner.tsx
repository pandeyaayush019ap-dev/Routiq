import React, { useState } from 'react';
import { VehicleProfile, RouteCalculationResult, RoadRestriction } from '../../types';
import { routingService } from '../../services/routing/routingService';
import { RouteResults } from './RouteResults';
import { useTranslation } from '../../i18n/context';

interface RoutePlannerProps {
  vehicles: VehicleProfile[];
  activeVehicle: VehicleProfile;
  onSelectVehicle: (vehicleId: string) => void;
  onRoutesCalculated: (result: RouteCalculationResult) => void;
  selectedRouteId?: string;
  onSelectRoute: (routeId: string) => void;
  onSelectRestriction: (restriction: RoadRestriction) => void;
  onNavigateToVehicles: () => void;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  vehicles,
  activeVehicle,
  onSelectVehicle,
  onRoutesCalculated,
  selectedRouteId,
  onSelectRoute,
  onSelectRestriction,
  onNavigateToVehicles,
}) => {
  const { t, isHindi } = useTranslation();
  const [origin, setOrigin] = useState<string>('Pune');
  const [destination, setDestination] = useState<string>('Mumbai');
  const [departureTime, setDepartureTime] = useState<string>('08:30');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RouteCalculationResult | null>(null);

  // Dynamic Geocoding Suggestions
  const [originSuggestions, setOriginSuggestions] = useState<Array<{ name: string; address: string }>>([]);
  const [destSuggestions, setDestSuggestions] = useState<Array<{ name: string; address: string }>>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState<boolean>(false);
  const [isSearchingDest, setIsSearchingDest] = useState<boolean>(false);

  const availableCities = routingService.getAvailableCities();

  const handleOriginChange = (val: string) => {
    setOrigin(val);
    if (val.trim().length >= 3) {
      setIsSearchingOrigin(true);
      routingService.searchPlaces(val).then((res) => {
        setOriginSuggestions(res);
        setIsSearchingOrigin(false);
      }).catch(() => setIsSearchingOrigin(false));
    } else {
      setOriginSuggestions([]);
    }
  };

  const handleDestChange = (val: string) => {
    setDestination(val);
    if (val.trim().length >= 3) {
      setIsSearchingDest(true);
      routingService.searchPlaces(val).then((res) => {
        setDestSuggestions(res);
        setIsSearchingDest(false);
      }).catch(() => setIsSearchingDest(false));
    } else {
      setDestSuggestions([]);
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
      const result = await routingService.calculateRoutes({
        originName: origin,
        destinationName: destination,
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

      {/* Demo Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-[11px] text-blue-900 font-medium">
        ℹ️ {t('demoNotice')}
      </div>

      {/* Corridor Quick Buttons */}
      <div>
        <div className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
          {t('quickCorridors')}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickCorridor('Pune', 'Mumbai')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            Pune ⇄ Mumbai
          </button>
          <button
            type="button"
            onClick={() => handleQuickCorridor('Mumbai', 'Nashik')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            Mumbai ⇄ Nashik
          </button>
          <button
            type="button"
            onClick={() => handleQuickCorridor('Pune', 'Nashik')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            Pune ⇄ Nashik
          </button>
          <button
            type="button"
            onClick={() => handleQuickCorridor('Delhi', 'Jaipur')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            Delhi ⇄ Jaipur
          </button>
        </div>
      </div>

      {/* Route Form */}
      <form onSubmit={handleFindRoute} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3.5">
        <datalist id="city-suggestions">
          {availableCities.map((city) => (
            <option
              key={city.id}
              value={isHindi ? city.name.hi : city.name.en}
            />
          ))}
        </datalist>

        {/* Origin */}
        <div className="relative">
          <label htmlFor="origin-input" className="block text-xs font-bold text-slate-700 mb-1">
            📍 {t('startLocation')}
          </label>
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
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-xs font-bold text-slate-800">{sug.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{sug.address}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swap Control */}
        <div className="flex items-center justify-between">
          <div className="h-px bg-slate-200 flex-1 mr-2" />
          <button
            type="button"
            onClick={handleSwap}
            title={t('swapLocations')}
            aria-label={t('swapLocations')}
            className="w-10 h-10 rounded-full border border-slate-300 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-black text-base transition-colors shrink-0"
          >
            ⇅
          </button>
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
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
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
              className="text-[11px] font-bold text-blue-600 hover:underline"
            >
              + {t('addVehicleBtn')}
            </button>
          </div>
          <select
            id="vehicle-select"
            value={activeVehicle.id}
            onChange={(e) => onSelectVehicle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[46px] bg-white"
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
      {lastResult && (
        <RouteResults
          routes={lastResult.routes}
          selectedRouteId={selectedRouteId}
          departureTime={departureTime}
          onSelectRoute={onSelectRoute}
          onSelectRestriction={onSelectRestriction}
        />
      )}
    </div>
  );
};
