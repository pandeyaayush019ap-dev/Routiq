import React, { useState } from 'react';
import { RouteCandidate, RoadRestriction } from '../../types';
import { formatDuration, calculateArrivalTime } from '../../services/gis/geoUtils';
import { useTranslation } from '../../i18n/context';

interface RouteResultsProps {
  routes: RouteCandidate[];
  selectedRouteId?: string;
  departureTime?: string;
  onSelectRoute: (routeId: string) => void;
  onSelectRestriction: (restriction: RoadRestriction) => void;
  onStartNavigation?: (route: RouteCandidate) => void;
  isNavigating?: boolean;
  isStartingNavigation?: boolean;
}

export const RouteResults: React.FC<RouteResultsProps> = ({
  routes,
  selectedRouteId,
  departureTime,
  onSelectRoute,
  onSelectRestriction,
  onStartNavigation,
  isNavigating = false,
  isStartingNavigation = false,
}) => {
  const { t, isHindi } = useTranslation();
  const [expandedTurns, setExpandedTurns] = useState<Record<string, boolean>>({});

  const toggleTurns = (routeId: string) => {
    setExpandedTurns((prev) => ({ ...prev, [routeId]: !prev[routeId] }));
  };

  if (!routes || routes.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-base text-slate-900">
          {t('routeResultsTitle')}
        </h3>
        <span className="text-xs text-slate-500 font-medium">
          {routes.length} options evaluated
        </span>
      </div>

      {routes.map((route) => {
        const isSelected = route.id === selectedRouteId;
        const isBlocked = route.status === 'BLOCKED';
        const isWarning = route.status === 'WARNING';
        const isRecommended = route.status === 'RECOMMENDED';
        const turnsOpen = !!expandedTurns[route.id];

        const arrivalTime = departureTime
          ? calculateArrivalTime(departureTime, route.durationMinutes)
          : null;

        return (
          <div
            key={route.id}
            className={`rounded-2xl border transition-all p-4 ${
              isSelected
                ? 'bg-blue-50/40 border-blue-600 shadow-md ring-2 ring-blue-600/20'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            {/* Top row: Route Name & Selection Indicator */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                  {isHindi ? route.name.hi : route.name.en}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                  <span>{route.distanceKm} {t('km')}</span>
                  <span>·</span>
                  <span>
                    {formatDuration(route.durationMinutes, {
                      h: t('hours'),
                      m: t('mins'),
                    })}
                  </span>
                  {route.tollEstimateInr && (
                    <>
                      <span>·</span>
                      <span>₹{route.tollEstimateInr} {t('tollEst')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {isRecommended && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span>✔</span>
                    <span>{t('recommendedBadge')}</span>
                  </span>
                )}
                {isWarning && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <span>⚠️</span>
                    <span>{t('warningBadge')}</span>
                  </span>
                )}
                {isBlocked && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                    <span>⛔</span>
                    <span>{t('blockedBadge')}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Why This Route Explanation */}
            <div className="text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 my-2.5 border border-slate-100">
              <span className="font-bold text-slate-800">{t('whyRoute')}: </span>
              <span>{isHindi ? route.whyExplanation.hi : route.whyExplanation.en}</span>
              {arrivalTime && (
                <div className="mt-1 text-slate-500 font-medium">
                  🕒 {t('approxArrival')}: <strong className="text-slate-800">{arrivalTime}</strong>
                </div>
              )}
            </div>

            {/* Road-Width Intelligence Advisory (Rule 1.1) */}
            <div className="text-[11px] bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 my-2 text-amber-900 flex items-start gap-2">
              <span className="text-sm shrink-0">📏</span>
              <div>
                <strong className="font-bold">
                  {isHindi ? 'सड़क की चौड़ाई: डेटा असत्यापित' : 'Road Width Intelligence: Unverified Data'}
                </strong>
                <p className="mt-0.5 text-amber-800 leading-tight">
                  {isHindi
                    ? 'इस मार्ग पर आधिकारिक चौड़ाई सर्वेक्षण उपलब्ध नहीं है। नक्शे की लाइन से सड़क की वास्तविक चौड़ाई का अनुमान न लगाएं।'
                    : 'Exact carriageway width data is unavailable for this corridor. Do not infer usable physical width from map line thickness. Verify local signage on narrow sections.'}
                </p>
              </div>
            </div>

            {/* Road Restrictions List */}
            {route.restrictions.length > 0 ? (
              <div className="my-2.5 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {t('restrictionsTitle')} ({route.restrictions.length})
                </div>
                {route.restrictions.map((restr) => (
                  <button
                    key={restr.id}
                    onClick={() => onSelectRestriction(restr)}
                    className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between gap-2 border transition-colors ${
                      restr.status === 'BLOCKED'
                        ? 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{restr.status === 'BLOCKED' ? '⛔' : '⚠️'}</span>
                      <span className="font-semibold truncate">
                        {isHindi ? restr.roadName.hi : restr.roadName.en}
                      </span>
                    </span>
                    <span className="text-[10px] underline font-bold shrink-0">
                      {t('restrictionDetailsTitle')}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 mb-2">
                ✔ {t('noRestrictionsFound')}
              </div>
            )}

            {/* Turn-by-Turn Collapsible */}
            <div className="mt-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => toggleTurns(route.id)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <span>{turnsOpen ? '▼' : '▶'}</span>
                <span>{t('stepsTitle')}</span>
              </button>
              {turnsOpen && (
                <ol className="mt-2 pl-4 text-xs text-slate-600 list-decimal space-y-1">
                  {(isHindi ? route.turnSteps.hi : route.turnSteps.en).map((step, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Action Buttons: Select Route & Start Live Navigation */}
            <div className="mt-3.5 space-y-2">
              {isSelected && onStartNavigation && (
                <button
                  type="button"
                  disabled={isBlocked || isStartingNavigation}
                  onClick={() => onStartNavigation(route)}
                  className={`w-full py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                    isBlocked || isStartingNavigation
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : isNavigating
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-emerald-600/20'
                  }`}
                >
                  <span className="text-base">
                    {isStartingNavigation ? '⏳' : isNavigating ? '📍' : '🧭'}
                  </span>
                  <span>
                    {isBlocked
                      ? isHindi
                        ? 'प्रतिबंधित मार्ग (नेविगेशन अनुपलब्ध)'
                        : 'Blocked Route (Navigation Unavailable)'
                      : isStartingNavigation
                      ? isHindi
                        ? 'जीपीएस खोजा जा रहा है...'
                        : 'Acquiring GPS...'
                      : isNavigating
                      ? isHindi
                        ? 'नेविगेशन सक्रिय है'
                        : 'Navigation in Progress'
                      : isHindi
                      ? 'नेविगेशन शुरू करें'
                      : 'Start Navigation'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onSelectRoute(route.id)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 border border-blue-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                }`}
              >
                <span>{isSelected ? '✔' : '📍'}</span>
                <span>{isSelected ? t('selectedRouteLabel') : t('selectThisRoute')}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
