import React, { useState, useEffect, useCallback } from 'react';
import { fleetService, FleetVehicle, FleetSummary, VehicleTelemetryHistoryItem } from '../../services/fleet/fleetService';
import { InteractiveMap } from '../map/InteractiveMap';
import { useTranslation } from '../../i18n/context';

interface FleetDashboardProps {
  onPlanRouteForVehicle?: (vehicleId: string) => void;
}

export const FleetDashboard: React.FC<FleetDashboardProps> = () => {
  const { isHindi } = useTranslation();
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [summary, setSummary] = useState<FleetSummary>({
    total: 0,
    moving: 0,
    stationary: 0,
    stale: 0,
    offline: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [historyCoords, setHistoryCoords] = useState<[number, number][]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchFleet = useCallback(async () => {
    try {
      const res = await fleetService.getFleetVehicles();
      setVehicles(res.vehicles);
      setSummary(res.summary);
      setError(null);
    } catch (err: any) {
      console.warn('[Fleet] Poll error:', err);
      setError(err.message || 'Failed to connect to fleet telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and 6s auto-refresh polling
  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 6000);
    return () => clearInterval(interval);
  }, [fetchFleet]);

  // Fetch telemetry history when a vehicle is selected
  useEffect(() => {
    if (!selectedVehicle) {
      setHistoryCoords([]);
      return;
    }

    fleetService
      .getVehicleHistory(selectedVehicle.vehicle_id, 80)
      .then((history: VehicleTelemetryHistoryItem[]) => {
        const coords = history.map((h) => [h.longitude, h.latitude] as [number, number]);
        setHistoryCoords(coords);
      })
      .catch((err) => {
        console.warn('[Fleet] History error:', err);
        setHistoryCoords([]);
      });
  }, [selectedVehicle]);

  const filteredVehicles = vehicles.filter((v) => {
    if (filterStatus !== 'ALL' && v.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = v.vehicle_name.toLowerCase().includes(q);
      const matchReg = (v.registration_number || '').toLowerCase().includes(q);
      const matchDriver = (v.driver_name || '').toLowerCase().includes(q);
      return matchName || matchReg || matchDriver;
    }
    return true;
  });

  const getStatusBadge = (status: FleetVehicle['status']) => {
    switch (status) {
      case 'MOVING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{isHindi ? 'गतिशील (Moving)' : 'Moving'}</span>
          </span>
        );
      case 'STATIONARY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{isHindi ? 'स्थिर (Stationary)' : 'Stationary'}</span>
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
            <span>⚠️</span>
            <span>{isHindi ? 'विलंबित (Stale)' : 'Stale GPS'}</span>
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
            <span>⚪</span>
            <span>{isHindi ? 'ऑफ़लाइन (Offline)' : 'Offline'}</span>
          </span>
        );
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diffSec = Math.round((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec < 15) return isHindi ? 'अभी-अभी' : 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            {isHindi ? 'लाइव फ्लीट डैशबोर्ड' : 'Live Fleet Telemetry Dashboard'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {isHindi
              ? 'भारतीय माल गलियारों पर वास्तविक समय में ट्रकों की गति और स्थिति की निगरानी।'
              : 'Real-time GPS tracking and vehicle status across Indian freight corridors.'}
          </p>
        </div>

        {/* Polling Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-semibold">{isHindi ? 'लाइव सिंक' : 'Live Sync Active'}</span>
        </div>
      </div>

      {/* Fleet KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setFilterStatus('ALL')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'ALL'
              ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase">
            {isHindi ? 'कुल वाहन' : 'Total Vehicles'}
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{summary.total}</div>
        </div>

        <div
          onClick={() => setFilterStatus('MOVING')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'MOVING'
              ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-emerald-700 uppercase">
            {isHindi ? 'गतिशील' : 'Moving'}
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{summary.moving}</div>
        </div>

        <div
          onClick={() => setFilterStatus('STATIONARY')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'STATIONARY'
              ? 'bg-amber-50 border-amber-600 ring-2 ring-amber-600/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-amber-700 uppercase">
            {isHindi ? 'स्थिर / पार्क' : 'Stationary'}
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">{summary.stationary}</div>
        </div>

        <div
          onClick={() => setFilterStatus('STALE')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'STALE'
              ? 'bg-orange-50 border-orange-600 ring-2 ring-orange-600/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-orange-700 uppercase">
            {isHindi ? 'विलंबित' : 'Stale (>2m)'}
          </div>
          <div className="text-2xl font-black text-orange-700 mt-1">{summary.stale}</div>
        </div>

        <div
          onClick={() => setFilterStatus('OFFLINE')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'OFFLINE'
              ? 'bg-slate-100 border-slate-600 ring-2 ring-slate-600/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase">
            {isHindi ? 'ऑफ़लाइन' : 'Offline'}
          </div>
          <div className="text-2xl font-black text-slate-700 mt-1">{summary.offline}</div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Main Split Layout: Vehicle List + Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Vehicle List */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isHindi ? 'गाड़ी नंबर या ड्राइवर खोजें...' : 'Search registration, driver, name...'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* List Cards */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                ⏳ Loading fleet telematics...
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No fleet vehicles matching current filter.
              </div>
            ) : (
              filteredVehicles.map((veh) => {
                const isSelected = selectedVehicle?.vehicle_id === veh.vehicle_id;
                return (
                  <div
                    key={veh.vehicle_id}
                    onClick={() => setSelectedVehicle(veh)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-600 shadow-md ring-2 ring-blue-600/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-sm text-slate-900 leading-tight">
                          {veh.vehicle_name}
                        </div>
                        <div className="text-xs font-mono font-bold text-blue-600 mt-0.5">
                          {veh.registration_number || 'RC NOT ATTACHED'}
                        </div>
                      </div>
                      <div>{getStatusBadge(veh.status)}</div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div>
                        👤 <span className="font-semibold text-slate-700">{veh.driver_name || 'Driver'}</span>
                      </div>
                      <div>
                        ⚡{' '}
                        <span className="font-black text-slate-900">
                          {veh.speed ? `${Math.round(veh.speed)} km/h` : '0 km/h'}
                        </span>
                      </div>
                      <div>🕒 {formatRelativeTime(veh.updated_at)}</div>
                    </div>

                    {/* Coordinates & Accuracy */}
                    <div className="mt-1 text-[10px] text-slate-400 font-mono">
                      GPS: {veh.latitude.toFixed(4)}°N, {veh.longitude.toFixed(4)}°E (±{Math.round(veh.accuracy || 10)}m)
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Fleet Interactive Map */}
        <div className="lg:col-span-7 xl:col-span-8 h-[460px] sm:h-[540px] lg:h-[640px] lg:sticky lg:top-24">
          <InteractiveMap
            fleetVehicles={filteredVehicles}
            onSelectFleetVehicle={(v) => setSelectedVehicle(v)}
            fleetHistoryCoordinates={historyCoords}
          />
        </div>
      </div>
    </div>
  );
};
