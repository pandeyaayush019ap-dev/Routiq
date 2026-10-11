/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LanguageProvider } from './i18n/context';
import { Header } from './components/layout/Header';
import { Navigation, ActiveTab } from './components/layout/Navigation';
import { InteractiveMap } from './components/map/InteractiveMap';
import { RoutePlanner } from './components/routing/RoutePlanner';
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

  // Live GPS Navigation State
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [driverPosition, setDriverPosition] = useState<GpsPosition | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [currentManeuver, setCurrentManeuver] = useState<ManeuverInfo | null>(null);
  const [remainingDistanceKm, setRemainingDistanceKm] = useState<number>(0);
  const [remainingDurationMinutes, setRemainingDurationMinutes] = useState<number>(0);
  const [isOffRoute, setIsOffRoute] = useState<boolean>(false);
  const [offRouteDistanceMeters, setOffRouteDistanceMeters] = useState<number>(0);
  const [navError, setNavError] = useState<string | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleProfile | null>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState<boolean>(false);

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

  // --- Real Driver GPS Navigation Flow ---
  const handleStartNavigation = async (route: RouteCandidate) => {
    setNavError(null);

    // 1. Validate route and destination
    if (!route || !routeResult?.destination) {
      alert(isHindi ? 'कृपया पहले एक वैध मार्ग खोजें और चुनें।' : 'Please find and select a valid route first.');
      return;
    }

    // 2. Request Geolocation Permission & Initial Position
    try {
      const initialPos = await geolocationService.requestPosition();
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
      setOffRouteDistanceMeters(evalState.offRouteDistanceMeters);

      // 5. Start continuous watchPosition tracking
      geolocationService.startTracking({
        vehicleId: activeVehicle.id,
        tripId,
        onPosition: (pos) => {
          setDriverPosition(pos);
          const nextState = navigationEngine.evaluateState(pos, route, isHindi);
          setCurrentManeuver(nextState.currentManeuver);
          setRemainingDistanceKm(nextState.remainingDistanceKm);
          setRemainingDurationMinutes(nextState.remainingDurationMinutes);
          setIsOffRoute(nextState.isOffRoute);
          setOffRouteDistanceMeters(nextState.offRouteDistanceMeters);
        },
        onError: (err) => {
          console.warn('[GPS] Watcher error:', err);
          setNavError(err.message);
        },
      });

      setIsNavigating(true);
    } catch (err: any) {
      console.error('[Navigation] Start failed:', err);
      const msg = err.message || (isHindi ? 'जीपीएस स्थान प्राप्त करने में विफल।' : 'Failed to acquire driver GPS location.');
      alert(msg);
      setNavError(msg);
    }
  };

  const handleStopNavigation = async () => {
    geolocationService.stopTracking();
    if (activeTripId) {
      await navigationEngine.endTrip(activeTripId);
      setActiveTripId(null);
    }
    setIsNavigating(false);
    setDriverPosition(null);
    setCurrentManeuver(null);
    setIsOffRoute(false);
    setNavError(null);
  };

  // Clean up GPS watchers on component unmount
  useEffect(() => {
    return () => {
      geolocationService.stopTracking();
    };
  }, []);

  const selectedRoute: RouteCandidate | undefined = routeResult?.routes.find(
    (r) => r.id === selectedRouteId
  );

  const alternativeRoutes: RouteCandidate[] = (routeResult?.routes || []).filter(
    (r) => r.id !== selectedRouteId
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
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

      {/* Navigation Tab Bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        vehicleCount={vehicles.length}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6">
        {activeTab === 'plan' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full items-start">
            {/* Left Column: Route Form & Results (Scrollable Sidebar) */}
            <div className="lg:col-span-5 xl:col-span-4 order-2 lg:order-1">
              <RoutePlanner
                vehicles={vehicles}
                activeVehicle={activeVehicle}
                onSelectVehicle={handleSelectVehicle}
                onRoutesCalculated={(res) => {
                  setRouteResult(res);
                  setSelectedRouteId(res.recommendedRouteId || res.routes[0]?.id);
                }}
                selectedRouteId={selectedRouteId}
                onSelectRoute={setSelectedRouteId}
                onSelectRestriction={setActiveRestriction}
                onNavigateToVehicles={() => {
                  setEditingVehicle(null);
                  setIsVehicleModalOpen(true);
                }}
                onStartNavigation={handleStartNavigation}
                isNavigating={isNavigating}
              />
            </div>

            {/* Right Column: Genuine MapLibre Interactive Map */}
            <div className="lg:col-span-7 xl:col-span-8 order-1 lg:order-2 h-[460px] sm:h-[520px] lg:h-[calc(100vh-160px)] lg:sticky lg:top-24 relative">
              <InteractiveMap
                origin={routeResult?.origin}
                destination={routeResult?.destination}
                selectedRoute={selectedRoute}
                alternativeRoutes={alternativeRoutes}
                onSelectRoute={setSelectedRouteId}
                onSelectRestriction={setActiveRestriction}
                driverLocation={driverPosition}
                isNavigating={isNavigating}
              />

              {isNavigating && (
                <NavigationHud
                  currentManeuver={currentManeuver}
                  currentPosition={driverPosition}
                  remainingDistanceKm={remainingDistanceKm}
                  remainingDurationMinutes={remainingDurationMinutes}
                  isOffRoute={isOffRoute}
                  offRouteDistanceMeters={offRouteDistanceMeters}
                  onStopNavigation={handleStopNavigation}
                  onRecalculate={() => {
                    if (selectedRoute) handleStartNavigation(selectedRoute);
                  }}
                  routeName={selectedRoute ? { en: selectedRoute.name.en, hi: selectedRoute.name.hi } : undefined}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="py-1">
            <FleetDashboard />
          </div>
        )}

        {activeTab === 'vehicles' && (
          <div className="max-w-4xl mx-auto py-2">
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
          <div className="py-2">
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
