import React from 'react';
import { RouteCandidate, RoadRestriction, CityLocation } from '../../types';
import { useTranslation } from '../../i18n/context';

interface MapFallbackProps {
  origin?: CityLocation;
  destination?: CityLocation;
  selectedRoute?: RouteCandidate;
  alternativeRoutes?: RouteCandidate[];
  onSelectRoute?: (routeId: string) => void;
  onSelectRestriction?: (restriction: RoadRestriction) => void;
}

export const MapFallback: React.FC<MapFallbackProps> = ({
  origin,
  destination,
  selectedRoute,
  onSelectRestriction,
}) => {
  const { t, isHindi } = useTranslation();

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-slate-100 rounded-2xl border border-slate-200 p-4 relative overflow-hidden">
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 border border-slate-200">
        {t('mapFallbackTitle')} · {t('mapFallbackDesc')}
      </div>

      <svg
        className="w-full h-full max-h-[480px]"
        viewBox="0 0 500 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={t('mapLabel')}
      >
        {/* Schematic Grid */}
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#E2E8F0" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="500" height="360" fill="url(#grid)" />

        {/* Selected Route Path */}
        <path
          d="M 80 260 C 160 250, 240 180, 420 80"
          stroke="#2563EB"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Origin Pin A */}
        <g transform="translate(80, 260)">
          <circle r="16" fill="#142B3B" stroke="#ffffff" strokeWidth="3" />
          <text y="5" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="13">
            A
          </text>
          <text y="28" textAnchor="middle" fill="#0F172A" fontWeight="700" fontSize="12">
            {origin ? (isHindi ? origin.name.hi : origin.name.en) : 'Origin'}
          </text>
        </g>

        {/* Destination Pin B */}
        <g transform="translate(420, 80)">
          <circle r="16" fill="#2563EB" stroke="#ffffff" strokeWidth="3" />
          <text y="5" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="13">
            B
          </text>
          <text y="28" textAnchor="middle" fill="#0F172A" fontWeight="700" fontSize="12">
            {destination ? (isHindi ? destination.name.hi : destination.name.en) : 'Destination'}
          </text>
        </g>

        {/* Restriction Hotspots along the line */}
        {selectedRoute?.restrictions.map((restr, idx) => {
          const cx = 200 + idx * 70;
          const cy = 200 - idx * 55;
          const isBlocked = restr.status === 'BLOCKED';
          return (
            <g
              key={restr.id}
              transform={`translate(${cx}, ${cy})`}
              className="cursor-pointer"
              onClick={() => onSelectRestriction?.(restr)}
            >
              <circle
                r="16"
                fill={isBlocked ? '#B91C1C' : '#B45309'}
                stroke="#ffffff"
                strokeWidth="2.5"
                className="animate-pulse"
              />
              <text y="5" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="14">
                {isBlocked ? '✕' : '!'}
              </text>
              <text y="-20" textAnchor="middle" fill="#B91C1C" fontWeight="700" fontSize="10">
                {isHindi ? restr.roadName.hi : restr.roadName.en}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
