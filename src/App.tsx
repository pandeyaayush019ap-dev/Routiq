/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LanguageProvider } from './i18n/context';
import { Header } from './components/layout/Header';
import { Navigation, ActiveTab } from './components/layout/Navigation';
import { InteractiveMap, CommercialPoiItem } from './components/map/InteractiveMap';
import { RoutePlanner } from './components/routing/RoutePlanner';
import { FloatingSearchBar } from './components/layout/FloatingSearchBar';
import { BottomSheet, SnapPoint } from './components/layout/BottomSheet';
import { RestrictionDetailModal } from './components/routing/RestrictionDetailModal';
import { VehicleManager } from './components/vehicles/VehicleManager';
import { VehicleFormModal } from './components/vehicles/VehicleFormModal';
import { AuthModal } from './components/auth/AuthModal';
import { SubscriptionModal } from './components/subscription/SubscriptionModal';
import { SettingsHelp } from './components/settings/SettingsHelp';
import { NavigationHud } from './components/navigation/NavigationHud';
import { FleetDashboard } from './components/fleet/FleetDashboard';
import { vehicleService } from './services/vehicles/vehicleService';
import { routingService } from './services/routing/routingService';
import { authService } from './services/auth/authService';
import { geolocationService, GpsPosition } from './services/navigation/geolocationService';
import { navigationEngine, ManeuverInfo } from './services/navigation/navigationEngine';
import { voiceGuidance } from './services/navigation/voiceGuidanceService';
import { useTranslation } from './i18n/context';
import { VehicleProfile, RouteCalculationResult, RouteCandidate, RoadRestriction } from './types';
import { User } from './types/auth';

const AppContent: React.FC = () => {
  const { isHindi } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('plan');
  const [vehicles, setVehicles] = useState<VehicleProfile[]>(() => vehicleService.getVehicles());
  const [activeVehicle, setActiveVehicle] = useState<VehicleProfile>(() => vehicleService.getActiveVehicle());
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());

  // Routing State
  const [routeResult, setRouteResult] = useState<RouteCalculationResult | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(undefined);
  const [activeRestriction, setActiveRestriction] = useState<RoadRestriction | null>(null);
  const [destinationOverride, setDestinationOverride] = useState<string | null>(null);
  const [newStopOverride, setNewStopOverride] = useState<{ name: string; coordinates: [number, number] } | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SnapPoint>('half');
  const [activeCategory, setActiveCategory] = useState<string>('fuel');

  // Live GPS Navigation State
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [isStartingNavigation, setIsStartingNavigation] = useState<boolean>(false);
  const [isRerouting, setIsRerouting] = useState<boolean>(false);
  const [driverPosition, setDriverPosition] = useState<GpsPosition | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [currentManeuver, setCurrentManeuver] = useState<ManeuverInfo | null>(null);
  const [remainingDistanceKm, setRemainingDistanceKm] = useState<number>(0);
  const [remainingDurationMinutes, setRemainingDurationMinutes] = useState<number>(0);
  const [isOffRoute, setIsOffRoute] = useState<boolean>(false);
  const [isApproachingOrigin, setIsApproachingOrigin] = useState<boolean>(false);
  const [offRouteDistanceMeters, setOffRouteDistanceMeters] = useState<number>(0);
  const [navError, setNavError] = useState<string | null>(null);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  const activeRouteRef = useRef<RouteCandidate | null>(null);
  const lastRerouteTimeRef = useRef<number>(0);
  const hasAnnouncedArrivalRef = useRef<boolean>(false);

  // Network & PWA Install State
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleProfile | null>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState<boolean>(false);

  // Online / Offline and PWA Install listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Load initial demo corridor on startup so the MapLibre map renders immediately
  const loadInitialRoute = useCallback(async (currentVeh: VehicleProfile) => {
    try {
      const result = await routingService.calculateRoutes({
        originName: 'Pune',
        destinationName: 'Mumbai',
        vehicle: currentVeh,
        departureTime: '08:30',
      });
      if (result.routes.length > 0) {
        setRouteResult(result);
        setSelectedRouteId(result.recommendedRouteId || result.routes[0].id);
      }
    } catch (err) {
      console.warn('Initial route calculation skipped:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialRoute(activeVehicle);
  }, [loadInitialRoute, activeVehicle]);

  // Handle vehicle change
  const handleSelectVehicle = (vehicleId: string) => {
    vehicleService.setActiveVehicleId(vehicleId);
    const updated = vehicleService.getActiveVehicle();
    setActiveVehicle(updated);
    // Recalculate current route with new vehicle specs
    if (routeResult?.origin && routeResult?.destination) {
      routingService
        .calculateRoutes({
          originName: routeResult.origin.name.en,
          destinationName: routeResult.destination.name.en,
          vehicle: updated,
          departureTime: routeResult.departureTime,
        })
        .then((newRes) => {
          setRouteResult(newRes);
          if (newRes.routes.length > 0) {
            setSelectedRouteId(newRes.recommendedRouteId || newRes.routes[0].id);
          }
        });
    }
  };

  const handleSaveVehicle = async (vehicle: VehicleProfile) => {
    await vehicleService.saveVehicle(vehicle);
    setVehicles(vehicleService.getVehicles());
    if (vehicle.id === activeVehicle.id || vehicles.length === 1) {
      setActiveVehicle(vehicle);
    }
    setIsVehicleModalOpen(false);
    setEditingVehicle(null);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    await vehicleService.deleteVehicle(vehicleId);
    setVehicles(vehicleService.getVehicles());
    setActiveVehicle(vehicleService.getActiveVehicle());
  };

  // --- Dynamic Auto-Rerouting on Off-Route ---
  const handleAutoReroute = useCallback(
    async (currentPos: GpsPosition) => {
      const now = Date.now();
      if (now - lastRerouteTimeRef.current < 20000 || isRerouting) {
        return;
      }
      if (!routeResult?.destination) return;

      lastRerouteTimeRef.current = now;
      setIsRerouting(true);

      try {
        voiceGuidance.announceRerouting(isHindi);

        const result = await routingService.calculateRoutes({
          originName: isHindi ? 'वर्तमान स्थान' : 'Current Location',
          originCoordinates: [currentPos.longitude, currentPos.latitude],
          destinationName: routeResult.destination.name.en,
          destinationCoordinates: routeResult.destination.coordinates,
          vehicle: activeVehicle,
        });

        if (result.routes && result.routes.length > 0) {
          const newRoute =
            result.routes.find((r) => r.id === result.recommendedRouteId) || result.routes[0];
          setRouteResult(result);
          setSelectedRouteId(newRoute.id);
          activeRouteRef.current = newRoute;
          navigationEngine.reset();

          const newState = navigationEngine.evaluateState(currentPos, newRoute, isHindi);
          setCurrentManeuver(newState.currentManeuver);
          setRemainingDistanceKm(newState.remainingDistanceKm);
          setRemainingDurationMinutes(newState.remainingDurationMinutes);
          setIsOffRoute(newState.isOffRoute);
          setIsApproachingOrigin(newState.isApproachingOrigin);
          setOffRouteDistanceMeters(newState.offRouteDistanceMeters);
        }
      } catch (err) {
        console.warn('[Navigation] Auto-reroute failed:', err);
      } finally {
        setIsRerouting(false);
      }
    },
    [routeResult, isRerouting, isHindi, activeVehicle]
  );

  // --- Real Driver GPS Navigation Flow ---
  const handleStartNavigation = async (route: RouteCandidate) => {
    setIsStartingNavigation(true);
    setNavError(null);
    setGpsNotice(null);
    activeRouteRef.current = route;
    hasAnnouncedArrivalRef.current = false;

    // 1. Validate route and destination
    if (!route || !routeResult?.destination) {
      setIsStartingNavigation(false);
      alert(isHindi ? 'कृपया पहले एक वैध मार्ग खोजें और चुनें।' : 'Please find and select a valid route first.');
      return;
    }

    try {
      // 2. Request Geolocation Permission & Initial Position
      let initialPos: GpsPosition;
      let isGpsLocked = false;

      try {
        initialPos = await geolocationService.requestPosition();
        isGpsLocked = true;
      } catch (geoErr: any) {
        console.warn('[Navigation] Real GPS unavailable, using route origin fallback:', geoErr);
        // Fallback to route origin coordinates:
        const firstCoord = route.geometry.coordinates[0];
        initialPos = {
          latitude: firstCoord[1],
          longitude: firstCoord[0],
          accuracy: 50,
          heading: 0,
          speed: 0,
          speedKmh: 0,
          timestamp: Date.now(),
        };
        setGpsNotice(
          isHindi
            ? '⚠️ जीपीएस सिग्नल प्रतीक्षारत (आरंभिक बिंदु से नेविगेशन सक्रिय)'
            : '⚠️ GPS signal pending lock (Navigating from route origin)'
        );
      }

      setDriverPosition(initialPos);

      // 3. Initialize trip session on server
      let tripId: string | undefined;
      try {
        tripId = await navigationEngine.startTrip({
          vehicleId: activeVehicle.id,
          originName: routeResult.origin?.name.en || 'Origin',
          destinationName: routeResult.destination.name.en || 'Destination',
          routeId: route.id,
          distanceKm: route.distanceKm,
        });
        setActiveTripId(tripId);
      } catch (err) {
        console.warn('[Trip] Offline fallback for server trip:', err);
      }

      // 4. Initial evaluation of maneuver, progress & off-route status
      const evalState = navigationEngine.evaluateState(initialPos, route, isHindi);
      setCurrentManeuver(evalState.currentManeuver);
      setRemainingDistanceKm(evalState.remainingDistanceKm);
      setRemainingDurationMinutes(evalState.remainingDurationMinutes);
      setIsOffRoute(evalState.isOffRoute);
      setIsApproachingOrigin(evalState.isApproachingOrigin);
      setOffRouteDistanceMeters(evalState.offRouteDistanceMeters);

      // 5. Start continuous watchPosition tracking
      geolocationService.startTracking({
        vehicleId: activeVehicle.id,
        tripId,
        onPosition: (pos) => {
          setGpsNotice(null);
          setDriverPosition(pos);
          const currentActiveRoute = activeRouteRef.current || route;
          const nextState = navigationEngine.evaluateState(pos, currentActiveRoute, isHindi);
          setCurrentManeuver(nextState.currentManeuver);
          setRemainingDistanceKm(nextState.remainingDistanceKm);
          setRemainingDurationMinutes(nextState.remainingDurationMinutes);
          setIsOffRoute(nextState.isOffRoute);
          setIsApproachingOrigin(nextState.isApproachingOrigin);
          setOffRouteDistanceMeters(nextState.offRouteDistanceMeters);

          // Check destination arrival
          if (nextState.currentManeuver.isDestination && !hasAnnouncedArrivalRef.current) {
            hasAnnouncedArrivalRef.current = true;
            voiceGuidance.announceArrival(isHindi);
          }

          // Trigger auto-reroute when confirmed off-route
          if (nextState.shouldReroute) {
            handleAutoReroute(pos);
          }
        },
        onError: (err) => {
          console.warn('[GPS] Watcher error:', err);
          if (!isGpsLocked) {
            setGpsNotice(
              isHindi
                ? '⚠️ जीपीएस अनुपलब्ध (अनुमति अस्वीकृत या टाइमआउट)। प्रारंभिक बिंदु से नेविगेशन जारी है।'
                : '⚠️ GPS unavailable (Permission denied/timeout). Navigating from route origin.'
            );
          }
        },
      });

      // Keep screen awake during navigation
      voiceGuidance.requestWakeLock().catch(() => {});

      setIsNavigating(true);
    } catch (err: any) {
      console.error('[Navigation] Start failed:', err);
      const msg = err.message || (isHindi ? 'नेविगेशन शुरू करने में विफल।' : 'Failed to start navigation.');
      alert(msg);
      setNavError(msg);
    } finally {
      setIsStartingNavigation(false);
    }
  };

  const handleStopNavigation = async () => {
    geolocationService.stopTracking();
    voiceGuidance.releaseWakeLock().catch(() => {});
    if (activeTripId) {
      await navigationEngine.endTrip(activeTripId);
      setActiveTripId(null);
    }
    activeRouteRef.current = null;
    hasAnnouncedArrivalRef.current = false;
    setIsRerouting(false);
    setIsNavigating(false);
    setIsStartingNavigation(false);
    setDriverPosition(null);
    setCurrentManeuver(null);
    setIsOffRoute(false);
    setIsApproachingOrigin(false);
    setNavError(null);
    setGpsNotice(null);
  };

  // Clean up GPS watchers on component unmount
  useEffect(() => {
    return () => {
      geolocationService.stopTracking();
      voiceGuidance.releaseWakeLock().catch(() => {});
    };
  }, []);

  const selectedRoute: RouteCandidate | undefined = routeResult?.routes.find(
    (r) => r.id === selectedRouteId
  );

  const alternativeRoutes: RouteCandidate[] = (routeResult?.routes || []).filter(
    (r) => r.id !== selectedRouteId
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={async () => {
          await authService.signOut();
          setCurrentUser(null);
        }}
        onOpenSubscription={() => setIsSubModalOpen(true)}
      />

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-sm">
          <span>📶</span>
          <span>
            {isHindi
              ? 'ऑफ़लाइन मोड: पहले से सहेजे गए मार्ग और स्थानीय डेटा का उपयोग हो रहा है।'
              : 'Offline Mode: Operating with pre-cached routes and corridor maps.'}
          </span>
        </div>
      )}

      {/* PWA Install Banner */}
      {installPrompt && !isNavigating && (
        <div className="bg-blue-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span>📲</span>
            <span>
              {isHindi
                ? 'Routiq को अपने फ़ोन पर ऐप की तरह इंस्टॉल करें'
                : 'Install Routiq Truck App for offline GPS & faster access'}
            </span>
          </div>
          <button
            onClick={handleInstallApp}
            className="px-3 py-1 bg-white text-blue-700 rounded-lg text-xs font-extrabold hover:bg-blue-50 transition-colors shadow-xs cursor-pointer"
          >
            {isHindi ? 'इंस्टॉल करें' : 'Install'}
          </button>
        </div>
      )}

      {/* Navigation Tab Bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        vehicleCount={vehicles.length}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full mx-auto p-2 sm:p-3 relative overflow-hidden flex flex-col">
        {activeTab === 'plan' && (
          <div className="relative w-full h-[calc(100vh-130px)] sm:h-[calc(100vh-140px)] rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-slate-900">
            {/* Full-Screen Map Canvas */}
            <InteractiveMap
              origin={routeResult?.origin}
              destination={routeResult?.destination}
              selectedRoute={selectedRoute}
              alternativeRoutes={alternativeRoutes}
              onSelectRoute={setSelectedRouteId}
              onSelectRestriction={setActiveRestriction}
              driverLocation={driverPosition}
              isNavigating={isNavigating}
              onNavigateToPoi={(poi: CommercialPoiItem) => {
                setDestinationOverride(poi.name);
                setSheetSnap('half');
              }}
              onAddPoiStop={(poi: CommercialPoiItem) => {
                setNewStopOverride({ name: poi.name, coordinates: poi.coordinates });
                setSheetSnap('full');
              }}
            />

            {/* Floating Top Search Bar with Category Chips */}
            <FloatingSearchBar
              onSelectPlace={(name) => {
                setDestinationOverride(name);
                setSheetSnap('half');
              }}
              onOpenDirections={() => {
                setSheetSnap(sheetSnap === 'peek' ? 'half' : 'full');
              }}
              onSelectCategory={(cat) => {
                setActiveCategory(cat);
              }}
              activeCategory={activeCategory}
              isNavigating={isNavigating}
            />

            {/* Draggable Bottom Sheet on Mobile / Left Floating Panel on Desktop */}
            <BottomSheet
              snapPoint={sheetSnap}
              onSnapChange={setSheetSnap}
              isNavigating={isNavigating}
            >
              <RoutePlanner
                vehicles={vehicles}
                activeVehicle={activeVehicle}
                onSelectVehicle={handleSelectVehicle}
                onRoutesCalculated={(res) => {
                  setRouteResult(res);
                  setSelectedRouteId(res.recommendedRouteId || res.routes[0]?.id);
                  setSheetSnap('half');
                }}
                routeResult={routeResult}
                selectedRouteId={selectedRouteId}
                onSelectRoute={setSelectedRouteId}
                onSelectRestriction={setActiveRestriction}
                onNavigateToVehicles={() => {
                  setEditingVehicle(null);
                  setIsVehicleModalOpen(true);
                }}
                onStartNavigation={handleStartNavigation}
                isNavigating={isNavigating}
                isStartingNavigation={isStartingNavigation}
                destinationOverride={destinationOverride}
                onClearDestinationOverride={() => setDestinationOverride(null)}
                newStopOverride={newStopOverride}
                onClearStopOverride={() => setNewStopOverride(null)}
              />
            </BottomSheet>

            {/* In-Navigation HUD Overlay */}
            {isNavigating && (
              <NavigationHud
                currentManeuver={currentManeuver}
                currentPosition={driverPosition}
                remainingDistanceKm={remainingDistanceKm}
                remainingDurationMinutes={remainingDurationMinutes}
                isOffRoute={isOffRoute}
                isApproachingOrigin={isApproachingOrigin}
                offRouteDistanceMeters={offRouteDistanceMeters}
                onStopNavigation={handleStopNavigation}
                onRecalculate={() => {
                  if (driverPosition) {
                    handleAutoReroute(driverPosition);
                  } else if (selectedRoute) {
                    handleStartNavigation(selectedRoute);
                  }
                }}
                isRerouting={isRerouting}
                routeName={selectedRoute ? { en: selectedRoute.name.en, hi: selectedRoute.name.hi } : undefined}
                gpsNotice={gpsNotice}
                restrictions={selectedRoute?.restrictions}
              />
            )}
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="py-2 max-w-7xl mx-auto w-full">
            <FleetDashboard />
          </div>
        )}

        {activeTab === 'vehicles' && (
          <div className="max-w-4xl mx-auto py-2 w-full">
            <VehicleManager
              vehicles={vehicles}
              activeVehicleId={activeVehicle.id}
              onSelectActiveVehicle={handleSelectVehicle}
              onOpenAddModal={() => {
                setEditingVehicle(null);
                setIsVehicleModalOpen(true);
              }}
              onOpenEditModal={(v) => {
                setEditingVehicle(v);
                setIsVehicleModalOpen(true);
              }}
              onDeleteVehicle={handleDeleteVehicle}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="py-2 max-w-4xl mx-auto w-full">
            <SettingsHelp />
          </div>
        )}
      </main>

      {/* Modals & Dialogs */}
      <RestrictionDetailModal
        restriction={activeRestriction}
        activeVehicle={activeVehicle}
        onClose={() => setActiveRestriction(null)}
      />

      {isVehicleModalOpen && (
        <VehicleFormModal
          initialVehicle={editingVehicle}
          onSave={handleSaveVehicle}
          onClose={() => {
            setIsVehicleModalOpen(false);
            setEditingVehicle(null);
          }}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={setCurrentUser}
      />

      <SubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
