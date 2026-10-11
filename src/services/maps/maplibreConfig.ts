import type { StyleSpecification } from 'maplibre-gl';

/**
 * OpenStreetMap Attribution Constant
 */
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

/**
 * Default OpenStreetMap Raster Tile Style for MapLibre GL JS
 */
export const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
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
 * Initial Default Map Center (Western India Freight Gateway: Mumbai-Pune-Nashik)
 */
export const DEFAULT_MAP_CENTER: [number, number] = [73.5, 19.1];
export const DEFAULT_MAP_ZOOM = 7.5;
