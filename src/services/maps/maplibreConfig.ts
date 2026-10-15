import type { StyleSpecification } from 'maplibre-gl';

/**
 * OpenStreetMap Attribution Constant
 */
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

/**
 * Default OpenStreetMap Raster Tile Style for MapLibre GL JS (Streets)
 */
export const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: OSM_ATTRIBUTION,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/**
 * Esri World Imagery Satellite Raster Style
 */
export const SATELLITE_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'satellite-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'satellite-tiles-layer',
      type: 'raster',
      source: 'satellite-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/**
 * CartoDB Dark Matter Raster Style
 */
export const DARK_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'dark-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'dark-tiles-layer',
      type: 'raster',
      source: 'dark-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export type MapStyleKey = 'streets' | 'satellite' | 'dark';

export const MAP_STYLES: Record<MapStyleKey, { nameEn: string; nameHi: string; icon: string; style: StyleSpecification }> = {
  streets: { nameEn: 'Streets', nameHi: 'सड़क', icon: '🗺️', style: OSM_RASTER_STYLE },
  satellite: { nameEn: 'Satellite', nameHi: 'उपग्रह', icon: '🛰️', style: SATELLITE_RASTER_STYLE },
  dark: { nameEn: 'Night', nameHi: 'रात्रि', icon: '🌙', style: DARK_RASTER_STYLE },
};

/**
 * Initial Default Map Center (Western India Freight Gateway: Mumbai-Pune-Nashik)
 */
export const DEFAULT_MAP_CENTER: [number, number] = [73.5, 19.1];
export const DEFAULT_MAP_ZOOM = 7.5;

