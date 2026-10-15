import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Feature, LineString } from 'geojson';
import { RouteCandidate, RoadRestriction, CityLocation } from '../../types';
import {
  OSM_RASTER_STYLE,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_STYLES,
  MapStyleKey,
} from '../../services/maps/maplibreConfig';
import { calculateBounds } from '../../services/gis/geoUtils';
import { routingService } from '../../services/routing/routingService';
import { MapLegend } from './MapLegend';
import { MapFallback } from './MapFallback';
import { useTranslation } from '../../i18n/context';

import { GpsPosition } from '../../services/navigation/geolocationService';
import { FleetVehicle } from '../../services/fleet/fleetService';

export interface CommercialPoiItem {
  id: string;
  name: string;
  category: string;
  coordinates: [number, number];
  distanceKm?: number;
  address?: string;
  phone?: string;
}

interface InteractiveMapProps {
  origin?: CityLocation;
  destination?: CityLocation;
  waypoints?: Array<{ name: string; coordinates: [number, number] }>;
  selectedRoute?: RouteCandidate;
  alternativeRoutes?: RouteCandidate[];
  onSelectRoute?: (routeId: string) => void;
  onSelectRestriction?: (restriction: RoadRestriction) => void;
  driverLocation?: GpsPosition | null;
  isNavigating?: boolean;
  fleetVehicles?: FleetVehicle[];
  onSelectFleetVehicle?: (vehicle: FleetVehicle) => void;
  fleetHistoryCoordinates?: [number, number][];
  onNavigateToPoi?: (poi: CommercialPoiItem) => void;
  onAddPoiStop?: (poi: CommercialPoiItem) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  origin,
  destination,
  waypoints = [],
  selectedRoute,
  alternativeRoutes = [],
  onSelectRoute,
  onSelectRestriction,
  driverLocation,
  isNavigating = false,
  fleetVehicles = [],
  onSelectFleetVehicle,
  fleetHistoryCoordinates,
  onNavigateToPoi,
  onAddPoiStop,
}) => {
  const { isHindi } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const driverMarkerRef = useRef<maplibregl.Marker | null>(null);
  const fleetMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [mapError, setMapError] = useState<boolean>(false);
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);

  // Map Style & Layer State
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyleKey>('streets');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState<boolean>(false);
  const [isManualExploration, setIsManualExploration] = useState<boolean>(false);

  // POI Layer State
  const [showPois, setShowPois] = useState<boolean>(true);
  const [poiCategoryFilter, setPoiCategoryFilter] = useState<string>('all');
  const [poiList, setPoiList] = useState<CommercialPoiItem[]>([]);
  const [activePoi, setActivePoi] = useState<CommercialPoiItem | null>(null);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: OSM_RASTER_STYLE,
        center: DEFAULT_MAP_CENTER,
        zoom: DEFAULT_MAP_ZOOM,
        attributionControl: false,
      });

      // Add navigation controls (zoom in/out, pitch)
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution: '© OpenStreetMap contributors',
        }),
        'bottom-right'
      );

      map.on('load', () => {
        setIsMapLoaded(true);
      });

      // User manual interaction detection for Google-Maps-style exploration mode
      map.on('dragstart', () => {
        setIsManualExploration(true);
      });
      map.on('pitchstart', () => {
        setIsManualExploration(true);
      });
      map.on('rotatestart', () => {
        setIsManualExploration(true);
      });

      // Safe style reload listener: When user switches style (e.g. Satellite), re-add route layers
      map.on('style.load', () => {
        setIsMapLoaded(true);
      });

      map.on('error', (e) => {
        console.warn('MapLibre error encountered:', e);
      });

      mapRef.current = map;
    } catch (err) {
      console.warn('MapLibre failed to initialize (WebGL unavailable, falling back):', err);
      setMapError(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Switch Map Style safely
  const handleSwitchStyle = (styleKey: MapStyleKey) => {
    setCurrentMapStyle(styleKey);
    setIsStyleMenuOpen(false);
    if (!mapRef.current) return;
    mapRef.current.setStyle(MAP_STYLES[styleKey].style);
  };

  // Fetch POIs when selected route changes
  useEffect(() => {
    if (!selectedRoute || !selectedRoute.geometry?.coordinates) {
      setPoiList([]);
      return;
    }

    let isSubscribed = true;
    routingService
      .getPlacesAlongRoute(selectedRoute.geometry.coordinates)
      .then((places) => {
        if (isSubscribed) {
          setPoiList(places);
        }
      })
      .catch(() => {
        if (isSubscribed) setPoiList([]);
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedRoute]);

  // Update Route Layers and Markers
  const updateMapLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      if (map) {
        map.once('style.load', () => updateMapLayers());
      }
      return;
    }

    // Clear previous route markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // All coordinates for fitting bounds
    const allCoords: [number, number][] = [];

    // --- 1. Manage Alternative Routes Polylines ---
    let altCleanIdx = alternativeRoutes.length;
    while (map.getLayer(`alt-route-layer-${altCleanIdx}`)) {
      map.removeLayer(`alt-route-layer-${altCleanIdx}`);
      if (map.getSource(`alt-route-src-${altCleanIdx}`)) {
        map.removeSource(`alt-route-src-${altCleanIdx}`);
      }
      altCleanIdx++;
    }

    alternativeRoutes.forEach((altRoute, index) => {
      const sourceId = `alt-route-src-${index}`;
      const layerId = `alt-route-layer-${index}`;

      const rawAltCoords = altRoute.geometry?.coordinates || [];
      const validAltCoords = rawAltCoords
        .filter((c) => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]))
        .map((c) => [Number(c[0]), Number(c[1])] as [number, number]);

      validAltCoords.forEach((c) => allCoords.push(c));

      const geojsonData: GeoJSON.FeatureCollection<LineString> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { id: altRoute.id },
            geometry: {
              type: 'LineString',
              coordinates: validAltCoords,
            },
          },
        ],
      };

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojsonData);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData,
        });
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            visibility: 'visible',
          },
          paint: {
            'line-color': '#64748B',
            'line-width': 5,
            'line-dasharray': [2, 2],
            'line-opacity': 0.8,
          },
        });

        map.on('click', layerId, () => {
          onSelectRoute?.(altRoute.id);
        });

        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      } else {
        map.setLayoutProperty(layerId, 'visibility', 'visible');
      }
    });

    // --- 2. Manage Selected Route Polyline ---
    const selectedSourceId = 'selected-route-src';
    const selectedLayerCasingId = 'selected-route-casing';
    const selectedLayerId = 'selected-route-layer';

    if (selectedRoute) {
      const rawCoords = selectedRoute.geometry?.coordinates || [];
      const validCoords: [number, number][] = rawCoords
        .filter((c) => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]))
        .map((c) => [Number(c[0]), Number(c[1])] as [number, number]);

      validCoords.forEach((c) => allCoords.push(c));

      const selectedGeoJson: GeoJSON.FeatureCollection<LineString> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { id: selectedRoute.id, name: selectedRoute.name?.en || 'Selected Route' },
            geometry: {
              type: 'LineString',
              coordinates: validCoords,
            },
          },
        ],
      };

      // 2a. Source Management
      if (map.getSource(selectedSourceId)) {
        (map.getSource(selectedSourceId) as maplibregl.GeoJSONSource).setData(selectedGeoJson);
      } else {
        map.addSource(selectedSourceId, {
          type: 'geojson',
          data: selectedGeoJson,
        });
      }

      // 2b. High-Contrast White Casing Border Layer (10px)
      if (!map.getLayer(selectedLayerCasingId)) {
        map.addLayer({
          id: selectedLayerCasingId,
          type: 'line',
          source: selectedSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            visibility: 'visible',
          },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 10,
            'line-opacity': 0.95,
          },
        });
      } else {
        map.setLayoutProperty(selectedLayerCasingId, 'visibility', 'visible');
      }

      // 2c. Main Heavy Vehicle Royal Blue Polyline Layer (6px)
      if (!map.getLayer(selectedLayerId)) {
        map.addLayer({
          id: selectedLayerId,
          type: 'line',
          source: selectedSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            visibility: 'visible',
          },
          paint: {
            'line-color': '#2563EB',
            'line-width': 6,
            'line-opacity': 1.0,
          },
        });
      } else {
        map.setLayoutProperty(selectedLayerId, 'visibility', 'visible');
      }

      // 2d. Bring route layers to top
      map.moveLayer(selectedLayerCasingId);
      map.moveLayer(selectedLayerId);

      // Add Restriction Markers
      (selectedRoute.restrictions || []).forEach((restr) => {
        const el = document.createElement('div');
        const isBlocked = restr.status === 'BLOCKED';
        el.className = `w-7 h-7 rounded-full flex items-center justify-center font-black text-xs text-white border-2 border-white shadow-lg cursor-pointer transform hover:scale-125 transition-transform ${
          isBlocked ? 'bg-red-600 animate-bounce' : 'bg-amber-600'
        }`;
        el.innerText = isBlocked ? '✕' : '!';
        el.title = isHindi ? restr.roadName.hi : restr.roadName.en;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectRestriction?.(restr);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(restr.coordinates)
          .addTo(map);

        markersRef.current.push(marker);
      });
    } else {
      if (map.getLayer(selectedLayerId)) {
        map.setLayoutProperty(selectedLayerId, 'visibility', 'none');
      }
      if (map.getLayer(selectedLayerCasingId)) {
        map.setLayoutProperty(selectedLayerCasingId, 'visibility', 'none');
      }
    }

    // --- 3. Add Origin Marker (A) ---
    if (origin) {
      allCoords.push(origin.coordinates);
      const originEl = document.createElement('div');
      originEl.className =
        'w-8 h-8 rounded-full bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center border-2 border-white shadow-lg';
      originEl.innerText = 'A';
      originEl.title = isHindi ? origin.name.hi : origin.name.en;

      const originMarker = new maplibregl.Marker({ element: originEl })
        .setLngLat(origin.coordinates)
        .addTo(map);
      markersRef.current.push(originMarker);
    }

    // --- 4. Add Intermediate Waypoints (Stops) ---
    waypoints.forEach((wp, wpIdx) => {
      allCoords.push(wp.coordinates);
      const wpEl = document.createElement('div');
      wpEl.className =
        'w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-md';
      wpEl.innerText = String(wpIdx + 1);
      wpEl.title = `Stop ${wpIdx + 1}: ${wp.name}`;

      const wpMarker = new maplibregl.Marker({ element: wpEl })
        .setLngLat(wp.coordinates)
        .addTo(map);
      markersRef.current.push(wpMarker);
    });

    // --- 5. Add Destination Marker (B) ---
    if (destination) {
      allCoords.push(destination.coordinates);
      const destEl = document.createElement('div');
      destEl.className =
        'w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center border-2 border-white shadow-lg';
      destEl.innerText = 'B';
      destEl.title = isHindi ? destination.name.hi : destination.name.en;

      const destMarker = new maplibregl.Marker({ element: destEl })
        .setLngLat(destination.coordinates)
        .addTo(map);
      markersRef.current.push(destMarker);
    }

    // --- 6. Fit Bounds to Route ---
    if (allCoords.length >= 2 && !isNavigating) {
      const bounds = calculateBounds(allCoords);
      map.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        {
          padding: { top: 70, bottom: 80, left: 70, right: 70 },
          maxZoom: 13,
          duration: 900,
        }
      );
    }
  }, [
    alternativeRoutes,
    selectedRoute,
    origin,
    destination,
    waypoints,
    isHindi,
    isNavigating,
    onSelectRoute,
    onSelectRestriction,
  ]);

  // Update POI markers on map with category filtering
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    poiMarkersRef.current.forEach((m) => m.remove());
    poiMarkersRef.current = [];

    if (!showPois || poiList.length === 0) return;

    const filteredPois =
      poiCategoryFilter === 'all'
        ? poiList
        : poiList.filter((p) => p.category === poiCategoryFilter);

    filteredPois.forEach((poi) => {
      const el = document.createElement('div');
      let icon = '⛽';
      let bgColor = 'bg-emerald-600';

      if (poi.category === 'parking_rest') {
        icon = '🅿️';
        bgColor = 'bg-indigo-600';
      } else if (poi.category === 'repair') {
        icon = '🔧';
        bgColor = 'bg-amber-600';
      } else if (poi.category === 'weighbridge') {
        icon = '⚖️';
        bgColor = 'bg-purple-600';
      } else if (poi.category === 'food_dhaba') {
        icon = '🍲';
        bgColor = 'bg-orange-600';
      } else if (poi.category === 'toll') {
        icon = '🏷️';
        bgColor = 'bg-blue-600';
      }

      el.className = `w-7 h-7 rounded-full flex items-center justify-center text-xs text-white border-2 border-white shadow-md cursor-pointer transform hover:scale-125 transition-transform ${bgColor}`;
      el.innerText = icon;
      el.title = poi.name;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setActivePoi(poi);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(poi.coordinates)
        .addTo(map);

      poiMarkersRef.current.push(marker);
    });
  }, [isMapLoaded, showPois, poiList, poiCategoryFilter]);

  // --- Driver GPS Marker & Live Follow Mode ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    if (!driverLocation) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      return;
    }

    const { latitude, longitude, heading } = driverLocation;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([longitude, latitude]);
      const el = driverMarkerRef.current.getElement();
      const arrow = el.querySelector<HTMLDivElement>('.driver-heading-arrow');
      if (arrow && typeof heading === 'number') {
        arrow.style.transform = `rotate(${heading}deg)`;
      }
    } else {
      const el = document.createElement('div');
      el.className = 'driver-gps-puck relative flex items-center justify-center';
      el.innerHTML = `
        <div class="absolute w-12 h-12 rounded-full bg-blue-500/30 animate-ping"></div>
        <div class="relative w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-2xl flex items-center justify-center text-white">
          <div class="driver-heading-arrow transition-transform duration-200 text-xs font-black" style="transform: rotate(${heading || 0}deg);">
            ▲
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(map);

      driverMarkerRef.current = marker;
    }

    if (isNavigating && !isManualExploration) {
      map.easeTo({
        center: [longitude, latitude],
        zoom: 16.5,
        pitch: 45,
        bearing: typeof heading === 'number' ? heading : 0,
        duration: 800,
      });
    }
  }, [isMapLoaded, driverLocation, isNavigating, isManualExploration]);

  // Reset 3D pitch and exploration mode when exiting navigation
  useEffect(() => {
    if (!isNavigating) {
      setIsManualExploration(false);
      const map = mapRef.current;
      if (map && isMapLoaded) {
        map.easeTo({
          pitch: 0,
          bearing: 0,
          duration: 600,
        });
      }
    }
  }, [isNavigating, isMapLoaded]);

  // --- Fleet Markers Layer ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    fleetMarkersRef.current.forEach((m) => m.remove());
    fleetMarkersRef.current = [];

    if (!fleetVehicles || fleetVehicles.length === 0) return;

    const fleetCoords: [number, number][] = [];

    fleetVehicles.forEach((veh) => {
      fleetCoords.push([veh.longitude, veh.latitude]);
      const el = document.createElement('div');
      const isMoving = veh.status === 'MOVING';
      const isStationary = veh.status === 'STATIONARY';
      const isStale = veh.status === 'STALE';

      const bgColor = isMoving
        ? 'bg-emerald-600 ring-4 ring-emerald-300'
        : isStationary
        ? 'bg-amber-600 ring-4 ring-amber-300'
        : isStale
        ? 'bg-orange-600'
        : 'bg-slate-500';

      el.className = `w-8 h-8 rounded-full ${bgColor} text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-xl cursor-pointer hover:scale-125 transition-transform`;
      el.innerHTML = '🚛';
      el.title = `${veh.vehicle_name} (${veh.status})`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectFleetVehicle?.(veh);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([veh.longitude, veh.latitude])
        .addTo(map);

      fleetMarkersRef.current.push(marker);
    });

    if (!selectedRoute && fleetCoords.length >= 2) {
      const bounds = calculateBounds(fleetCoords);
      map.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        { padding: 80, maxZoom: 12, duration: 800 }
      );
    }
  }, [isMapLoaded, fleetVehicles, selectedRoute, onSelectFleetVehicle]);

  // --- Fleet History Breadcrumb Line ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const sourceId = 'fleet-history-src';
    const layerId = 'fleet-history-line';

    if (!fleetHistoryCoordinates || fleetHistoryCoordinates.length < 2) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      return;
    }

    const geojsonData: Feature<LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: fleetHistoryCoordinates,
      },
    };

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojsonData);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: geojsonData });
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0EA5E9',
          'line-width': 4,
          'line-dasharray': [1, 1],
        },
      });
    }
  }, [isMapLoaded, fleetHistoryCoordinates]);

  useEffect(() => {
    updateMapLayers();
  }, [updateMapLayers]);

  // Center on Western India freight gateway
  const handleRecenterIndia = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      essential: true,
    });
  };

  // Re-frame the active route on the map
  const handleFitRouteOverview = () => {
    const map = mapRef.current;
    if (!map || !selectedRoute) return;
    const rawCoords = selectedRoute.geometry?.coordinates || [];
    const validCoords: [number, number][] = rawCoords
      .filter((c) => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]))
      .map((c) => [Number(c[0]), Number(c[1])] as [number, number]);

    if (validCoords.length >= 2) {
      const bounds = calculateBounds(validCoords);
      map.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        {
          padding: { top: 70, bottom: 80, left: 70, right: 70 },
          maxZoom: 13,
          duration: 800,
        }
      );
    }
  };

  if (mapError) {
    return (
      <MapFallback
        origin={origin}
        destination={destination}
        selectedRoute={selectedRoute}
        alternativeRoutes={alternativeRoutes}
        onSelectRoute={onSelectRoute}
        onSelectRestriction={onSelectRestriction}
      />
    );
  }

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-100 min-h-[340px]">
      {/* MapLibre DOM container */}
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

      {/* Floating Legend */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none hidden sm:block">
        <MapLegend />
      </div>

      {/* Map Controls Top Left */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <button
          onClick={handleRecenterIndia}
          className="bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span>📍</span>
          <span>Western India</span>
        </button>

        {selectedRoute && (
          <button
            onClick={handleFitRouteOverview}
            className="bg-white/95 backdrop-blur-sm border border-blue-200 px-3 py-1.5 rounded-xl shadow-sm text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Fit Active Route to Screen"
          >
            <span>🧭</span>
            <span>{isHindi ? 'पूरा मार्ग देखें' : 'Route Overview'}</span>
          </button>
        )}

        <button
          onClick={() => setShowPois(!showPois)}
          className={`border px-3 py-1.5 rounded-xl shadow-sm text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
            showPois
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>⛽</span>
          <span>
            {isHindi ? 'फ्रेट सेवाएं (POI)' : 'Freight POIs'} ({poiList.length})
          </span>
        </button>
      </div>

      {/* Map Style Switcher (Top Right below zoom controls) */}
      <div className="absolute top-20 right-4 z-10">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
            className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            title="Map Style"
            aria-label="Map Style"
          >
            <span className="text-lg">{MAP_STYLES[currentMapStyle].icon}</span>
          </button>

          {isStyleMenuOpen && (
            <div className="absolute right-0 top-12 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-2 z-20 flex flex-col gap-1 w-36">
              {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => {
                const styleDef = MAP_STYLES[key];
                const isActive = currentMapStyle === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSwitchStyle(key)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{styleDef.icon}</span>
                    <span>{isHindi ? styleDef.nameHi : styleDef.nameEn}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* POI Category Filter Chips (under top buttons if POIs are enabled) */}
      {showPois && poiList.length > 0 && (
        <div className="absolute top-16 left-4 z-10 flex flex-wrap items-center gap-1.5 max-w-sm sm:max-w-md">
          {[
            { id: 'all', label: isHindi ? 'सभी' : 'All', icon: '📍' },
            { id: 'fuel', label: isHindi ? 'डीजल' : 'Diesel', icon: '⛽' },
            { id: 'parking_rest', label: isHindi ? 'विश्राम' : 'Rest', icon: '🅿️' },
            { id: 'repair', label: isHindi ? 'वर्कशॉप' : 'Repair', icon: '🔧' },
            { id: 'weighbridge', label: isHindi ? 'धर्मकांटा' : 'Weighbridge', icon: '⚖️' },
            { id: 'food_dhaba', label: isHindi ? 'ढाबा' : 'Dhaba', icon: '🍲' },
          ].map((cat) => {
            const isSelected = poiCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setPoiCategoryFilter(cat.id)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white border border-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active POI Interactive Card */}
      {activePoi && (
        <div className="absolute bottom-16 sm:bottom-6 right-4 z-20 bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl p-4 shadow-2xl max-w-xs w-full text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-extrabold text-slate-900 text-sm">{activePoi.name}</div>
              <div className="text-[10px] text-blue-700 font-bold uppercase tracking-wider mt-0.5">
                {activePoi.category.replace('_', ' ')}
              </div>
            </div>
            <button
              onClick={() => setActivePoi(null)}
              className="text-slate-400 hover:text-slate-700 font-black px-1.5 py-0.5 text-base cursor-pointer"
            >
              ✕
            </button>
          </div>

          {activePoi.distanceKm !== undefined && (
            <div className="text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100 flex items-center gap-1.5">
              <span>📍</span>
              <span>
                <strong className="text-slate-800">{activePoi.distanceKm} km</strong> from route line
              </span>
            </div>
          )}

          {activePoi.address && (
            <div className="text-[11px] text-slate-500 leading-snug">{activePoi.address}</div>
          )}

          {activePoi.phone && (
            <div className="text-[11px] text-slate-700 font-mono flex items-center gap-1">
              <span>📞</span>
              <a href={`tel:${activePoi.phone}`} className="hover:underline text-blue-600 font-semibold">
                {activePoi.phone}
              </a>
            </div>
          )}

          {/* Action Buttons: Navigate Here & Add Stop */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            {onNavigateToPoi && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToPoi(activePoi);
                  setActivePoi(null);
                }}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>🧭</span>
                <span>{isHindi ? 'यहाँ जाएं' : 'Navigate'}</span>
              </button>
            )}
            {onAddPoiStop && (
              <button
                type="button"
                onClick={() => {
                  onAddPoiStop(activePoi);
                  setActivePoi(null);
                }}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>➕</span>
                <span>{isHindi ? 'स्टॉप जोड़ें' : 'Add Stop'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Re-center Button during Navigation */}
      {isNavigating && isManualExploration && driverLocation && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={() => {
              setIsManualExploration(false);
              const map = mapRef.current;
              if (map) {
                map.easeTo({
                  center: [driverLocation.longitude, driverLocation.latitude],
                  zoom: 16.5,
                  pitch: 45,
                  bearing: typeof driverLocation.heading === 'number' ? driverLocation.heading : 0,
                  duration: 600,
                });
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border-2 border-white animate-bounce transition-transform active:scale-95 cursor-pointer"
          >
            <span className="text-sm">🎯</span>
            <span>{isHindi ? 'वाहन पर पुनः केंद्रित करें' : 'Re-center on Vehicle'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
