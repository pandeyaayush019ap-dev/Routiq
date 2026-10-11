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
import { vehicleService } from './services/vehicles/vehicleService';
import { routingService } from './services/routing/routingService';
import { authService } from './services/auth/authService';
import { VehicleProfile, RouteCalculationResult, RouteCandidate, RoadRestriction } from './types';
import { User } from './types/auth';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('plan');
  const [vehicles, setVehicles] = useState<VehicleProfile[]>(() => vehicleService.getVehicles());
  const [activeVehicle, setActiveVehicle] = useState<VehicleProfile>(() => vehicleService.getActiveVehicle());
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());

  // Routing State
  const [routeResult, setRouteResult] = useState<RouteCalculationResult | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(undefined);
  const [activeRestriction, setActiveRestriction] = useState<RoadRestriction | null>(null);

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
              />
            </div>

            {/* Right Column: Genuine MapLibre Interactive Map */}
            <div className="lg:col-span-7 xl:col-span-8 order-1 lg:order-2 h-[420px] sm:h-[480px] lg:h-[calc(100vh-160px)] lg:sticky lg:top-24">
              <InteractiveMap
                origin={routeResult?.origin}
                destination={routeResult?.destination}
                selectedRoute={selectedRoute}
                alternativeRoutes={alternativeRoutes}
                onSelectRoute={setSelectedRouteId}
                onSelectRestriction={setActiveRestriction}
              />
            </div>
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
