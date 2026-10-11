import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Feature, LineString } from 'geojson';
import { RouteCandidate, RoadRestriction, CityLocation } from '../../types';
import { OSM_RASTER_STYLE, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../services/maps/maplibreConfig';
import { calculateBounds } from '../../services/gis/geoUtils';
import { routingService } from '../../services/routing/routingService';
import { MapLegend } from './MapLegend';
import { MapFallback } from './MapFallback';
import { useTranslation } from '../../i18n/context';

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
  selectedRoute?: RouteCandidate;
  alternativeRoutes?: RouteCandidate[];
  onSelectRoute?: (routeId: string) => void;
  onSelectRestriction?: (restriction: RoadRestriction) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  origin,
  destination,
  selectedRoute,
  alternativeRoutes = [],
  onSelectRoute,
  onSelectRestriction,
}) => {
  const { isHindi } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [mapError, setMapError] = useState<boolean>(false);
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);

  // POI Layer State
  const [showPois, setShowPois] = useState<boolean>(true);
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
    if (!map || !isMapLoaded) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // All coordinates for fitting bounds
    const allCoords: [number, number][] = [];

    // --- 1. Manage Alternative Routes Polylines ---
    alternativeRoutes.forEach((altRoute, index) => {
      const sourceId = `alt-route-src-${index}`;
      const layerId = `alt-route-layer-${index}`;

      const geojsonData: Feature<LineString> = {
        type: 'Feature',
        properties: { id: altRoute.id },
        geometry: {
          type: 'LineString',
          coordinates: altRoute.geometry.coordinates,
        },
      };

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojsonData);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData,
        });

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#64748B',
            'line-width': 4,
            'line-dasharray': [2, 2],
            'line-opacity': 0.75,
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
      }
    });

    // --- 2. Manage Selected Route Polyline ---
    if (selectedRoute) {
      const selectedSourceId = 'selected-route-src';
      const selectedLayerCasingId = 'selected-route-casing';
      const selectedLayerId = 'selected-route-layer';

      const selectedGeoJson: Feature<LineString> = {
        type: 'Feature',
        properties: { id: selectedRoute.id },
        geometry: {
          type: 'LineString',
          coordinates: selectedRoute.geometry.coordinates,
        },
      };

      selectedRoute.geometry.coordinates.forEach((c) => allCoords.push(c));

      if (map.getSource(selectedSourceId)) {
        (map.getSource(selectedSourceId) as maplibregl.GeoJSONSource).setData(selectedGeoJson);
      } else {
        map.addSource(selectedSourceId, {
          type: 'geojson',
          data: selectedGeoJson,
        });

        // White casing border
        map.addLayer({
          id: selectedLayerCasingId,
          type: 'line',
          source: selectedSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 9,
          },
        });

        // Main blue polyline
        map.addLayer({
          id: selectedLayerId,
          type: 'line',
          source: selectedSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#2563EB',
            'line-width': 6,
          },
        });
      }

      // Add Restriction Markers
      selectedRoute.restrictions.forEach((restr) => {
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

    // --- 4. Add Destination Marker (B) ---
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

    // --- 5. Fit Bounds to Route ---
    if (allCoords.length >= 2) {
      const bounds = calculateBounds(allCoords);
      map.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        {
          padding: { top: 60, bottom: 60, left: 60, right: 60 },
          maxZoom: 13,
          duration: 900,
        }
      );
    }
  }, [
    isMapLoaded,
    selectedRoute,
    alternativeRoutes,
    origin,
    destination,
    isHindi,
    onSelectRoute,
    onSelectRestriction,
  ]);

  // Update POI markers on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    poiMarkersRef.current.forEach((m) => m.remove());
    poiMarkersRef.current = [];

    if (!showPois || poiList.length === 0) return;

    poiList.forEach((poi) => {
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

      el.className = `w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white border border-white shadow cursor-pointer transform hover:scale-125 transition-transform ${bgColor}`;
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
  }, [isMapLoaded, showPois, poiList]);

  useEffect(() => {
    updateMapLayers();
  }, [updateMapLayers]);

  // Center on India button
  const handleRecenterIndia = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      essential: true,
    });
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
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <MapLegend />
      </div>

      {/* Map Controls Top Left */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <button
          onClick={handleRecenterIndia}
          className="bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
        >
          <span>📍</span>
          <span>Western India</span>
        </button>

        <button
          onClick={() => setShowPois(!showPois)}
          className={`border px-3 py-1.5 rounded-xl shadow-sm text-xs font-semibold transition-colors flex items-center gap-1.5 ${
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

      {/* Active POI Inspection Card */}
      {activePoi && (
        <div className="absolute top-16 right-4 z-20 bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl p-3 shadow-xl max-w-xs text-xs space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="font-bold text-slate-900 text-sm">{activePoi.name}</div>
            <button
              onClick={() => setActivePoi(null)}
              className="text-slate-400 hover:text-slate-700 font-bold px-1"
            >
              ✕
            </button>
          </div>
          <div className="text-[11px] text-blue-700 font-semibold uppercase tracking-wider">
            {activePoi.category.replace('_', ' ')}
          </div>
          {activePoi.distanceKm !== undefined && (
            <div className="text-slate-600">
              📍 <strong className="text-slate-800">{activePoi.distanceKm} km</strong> from route line
            </div>
          )}
          {activePoi.address && (
            <div className="text-[11px] text-slate-500 leading-tight">{activePoi.address}</div>
          )}
          {activePoi.phone && (
            <div className="text-[11px] text-slate-700 font-mono">📞 {activePoi.phone}</div>
          )}
        </div>
      )}
    </div>
  );
};
