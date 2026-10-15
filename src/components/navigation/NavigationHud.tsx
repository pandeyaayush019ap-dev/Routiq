/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/context';
import { ManeuverInfo } from '../../services/navigation/navigationEngine';
import { GpsPosition } from '../../services/navigation/geolocationService';
import { voiceGuidance } from '../../services/navigation/voiceGuidanceService';
import { RoadRestriction } from '../../types';

interface NavigationHudProps {
  currentManeuver: ManeuverInfo | null;
  currentPosition: GpsPosition | null;
  remainingDistanceKm: number;
  remainingDurationMinutes: number;
  isOffRoute: boolean;
  isApproachingOrigin?: boolean;
  offRouteDistanceMeters: number;
  onStopNavigation: () => void;
  onRecalculate?: () => void;
  isRerouting?: boolean;
  routeName?: { en: string; hi: string };
  gpsNotice?: string | null;
  restrictions?: RoadRestriction[];
  isManualExploration?: boolean;
  onRecenter?: () => void;
}

export const NavigationHud: React.FC<NavigationHudProps> = ({
  currentManeuver,
  currentPosition,
  remainingDistanceKm,
  remainingDurationMinutes,
  isOffRoute,
  isApproachingOrigin = false,
  offRouteDistanceMeters,
  onStopNavigation,
  onRecalculate,
  isRerouting = false,
  routeName,
  gpsNotice,
  restrictions = [],
  isManualExploration = false,
  onRecenter,
}) => {
  const { isHindi, t } = useTranslation();
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(() => voiceGuidance.getIsMuted());

  // Screen Wake Lock & cleanup
  useEffect(() => {
    voiceGuidance.requestWakeLock().catch(() => {});
    return () => {
      voiceGuidance.releaseWakeLock().catch(() => {});
      voiceGuidance.resetProximityAlerts();
    };
  }, []);

  // Voice announcement on new maneuver
  useEffect(() => {
    if (!currentManeuver) return;

    if (currentManeuver.isDestination) {
      const destPhrase = isHindi
        ? 'बधाई हो, आप अपने गंतव्य पर पहुंच गए हैं।'
        : 'You have arrived at your destination.';
      voiceGuidance.speak(destPhrase, isHindi);
      return;
    }

    const phrase = isHindi ? currentManeuver.instructionHi : currentManeuver.instructionEn;
    const distancePrefix = currentManeuver.formattedDistance
      ? isHindi
        ? `${currentManeuver.formattedDistance} में, `
        : `In ${currentManeuver.formattedDistance}, `
      : '';
    voiceGuidance.speak(`${distancePrefix}${phrase}`, isHindi);
  }, [currentManeuver, isHindi]);

  // Voice alert on off-route
  useEffect(() => {
    if (isOffRoute) {
      const phrase = isHindi
        ? 'सावधान: आप निर्धारित भारी वाहन मार्ग से भटक गए हैं। कृपया सुरक्षित कॉरिडोर पर लौटें।'
        : 'Caution: You have departed the planned truck route. Recalculating route.';
      voiceGuidance.speak(phrase, isHindi);
    }
  }, [isOffRoute, isHindi]);

  // Proximity alerts for restrictions (5km, 1km, 500m)
  useEffect(() => {
    if (!currentPosition || restrictions.length === 0) return;
    const mapped = restrictions.map((r) => ({
      id: r.id,
      distanceAlongRouteKm: r.distanceAlongRouteKm,
      roadName: r.roadName,
      maxClearanceMeters: r.limitType === 'height' ? r.limitValue : undefined,
    }));
    voiceGuidance.checkRestrictionProximity(remainingDistanceKm, mapped, isHindi);
  }, [remainingDistanceKm, restrictions, currentPosition, isHindi]);

  const toggleVoice = () => {
    const nextMute = voiceGuidance.toggleMute();
    setIsVoiceMuted(nextMute);
  };

  const formatHoursMins = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const speed = currentPosition ? Math.round(currentPosition.speedKmh) : 0;
  const isDestinationReached = currentManeuver?.isDestination || remainingDistanceKm === 0;

  return (
    <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-30">
      {/* Top Section: Maneuver Instructions & Banners */}
      <div className="pointer-events-auto max-w-xl w-full mx-auto space-y-2">
        {/* GPS Status & Accuracy Notice */}
        {gpsNotice && (
          <div className="bg-slate-900/90 text-amber-200 rounded-xl px-3.5 py-2 text-xs font-semibold border border-amber-500/50 shadow-lg flex items-center gap-2">
            <span>ℹ️</span>
            <span>{gpsNotice}</span>
          </div>
        )}

        {/* Approaching Route Origin Guidance */}
        {isApproachingOrigin && !isOffRoute && (
          <div className="bg-blue-900/95 backdrop-blur-md text-white rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 border border-blue-400/40">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📍</span>
              <div>
                <div className="font-extrabold text-sm">
                  {isHindi ? 'मार्ग के आरंभ बिंदु की ओर बढ़ें' : 'Approaching Route Start'} ({offRouteDistanceMeters}m)
                </div>
                <div className="text-[11px] text-blue-200">
                  {isHindi
                    ? 'कृपया मुख्य राष्ट्रीय राजमार्ग / अधिकृत मालवाहक मार्ग की ओर बढ़ें।'
                    : 'Navigating towards verified heavy vehicle corridor.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Off-Route Alert & Auto-Reroute Banner */}
        {isOffRoute && (
          <div className="bg-amber-600 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-pulse border-2 border-amber-300">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl shrink-0">⚠️</span>
              <div>
                <div className="font-extrabold text-sm">
                  {isRerouting
                    ? isHindi
                      ? 'पुनः मार्ग खोजा जा रहा है...'
                      : 'Rerouting in Progress...'
                    : isHindi
                    ? `मार्ग से भटके हुए हैं (${offRouteDistanceMeters}m)`
                    : `Off Planned Route (${offRouteDistanceMeters}m)`}
                </div>
                <div className="text-[11px] text-amber-100">
                  {isHindi
                    ? 'भारी वाहन के लिए सड़क की ऊंचाई/वजन सीमा सत्यापित नहीं है।'
                    : 'Clearance not guaranteed on unverified roads. Recalculating.'}
                </div>
              </div>
            </div>
            {onRecalculate && (
              <button
                type="button"
                onClick={onRecalculate}
                disabled={isRerouting}
                className="px-3.5 py-1.5 bg-white text-amber-900 font-extrabold text-xs rounded-xl hover:bg-amber-100 shadow transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isRerouting ? '⏳ ...' : isHindi ? 'पुनर्गणना' : 'Reroute'}
              </button>
            )}
          </div>
        )}

        {/* Primary Turn Instruction Card (Google Maps Style) */}
        {!isDestinationReached ? (
          <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-3.5">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Big Maneuver Icon */}
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-3xl font-black shadow-lg shrink-0 border border-blue-400/30">
                  {currentManeuver ? currentManeuver.icon : '⬆'}
                </div>

                <div className="min-w-0">
                  {/* Distance in Huge Bold Text */}
                  <div className="text-blue-400 text-sm font-extrabold tracking-wide uppercase">
                    {currentManeuver ? currentManeuver.formattedDistance : 'Calculating...'}
                  </div>
                  {/* Road Instruction */}
                  <div className="font-black text-base sm:text-lg text-white truncate leading-tight mt-0.5">
                    {currentManeuver
                      ? isHindi
                        ? currentManeuver.instructionHi
                        : currentManeuver.instructionEn
                      : isHindi
                      ? 'नेविगेशन शुरू हो रहा है...'
                      : 'Starting navigation...'}
                  </div>
                  {routeName && (
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      via {isHindi ? routeName.hi : routeName.en}
                    </div>
                  )}
                </div>
              </div>

              {/* Controls: Voice & Live Indicator */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer text-xs"
                    title={isVoiceMuted ? 'Unmute Voice Guidance' : 'Mute Voice Guidance'}
                    aria-label="Voice Guidance Toggle"
                  >
                    <span>{isVoiceMuted ? '🔇' : '🔊'}</span>
                  </button>

                  <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                    <span>GPS LIVE</span>
                  </div>
                </div>

                {currentPosition && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    ±{Math.round(currentPosition.accuracy)}m
                  </div>
                )}
              </div>
            </div>

            {/* Lookahead Secondary Step Preview ("Then...") */}
            {currentManeuver?.subsequentInstructionEn && (
              <div className="bg-slate-800/90 px-4 py-2 border-t border-slate-700/60 flex items-center gap-2 text-xs text-slate-300">
                <span className="text-base font-bold text-blue-400">
                  {currentManeuver.subsequentIcon || '⬆'}
                </span>
                <span className="font-bold text-slate-400">
                  {isHindi ? 'फिर:' : 'Then:'}
                </span>
                <span className="truncate font-semibold text-slate-200">
                  {isHindi
                    ? currentManeuver.subsequentInstructionHi
                    : currentManeuver.subsequentInstructionEn}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Route Complete / Destination Reached Card */
          <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-2xl border-2 border-emerald-300 text-center space-y-2">
            <div className="text-4xl">🏁</div>
            <div className="font-black text-xl">
              {isHindi ? 'गंतव्य पर पहुंच गए!' : 'You have arrived at your destination!'}
            </div>
            <p className="text-xs text-emerald-100 max-w-sm mx-auto">
              {isHindi
                ? 'आपकी यात्रा सफलतापूर्वक पूरी हो गई है। वाहन पार्क करें और सुरक्षित रहें।'
                : 'Your heavy vehicle trip has ended successfully. Park safely and complete inspection.'}
            </p>
            <button
              type="button"
              onClick={onStopNavigation}
              className="mt-2 px-6 py-2.5 bg-white text-emerald-900 font-black text-sm rounded-xl shadow-lg hover:bg-emerald-50 transition-all cursor-pointer"
            >
              {isHindi ? 'यात्रा समाप्त करें' : 'Finish Navigation'}
            </button>
          </div>
        )}
      </div>

      {/* Middle Floating Recenter Button (Appears during manual map exploration) */}
      <div className="pointer-events-auto flex items-center justify-between max-w-xl w-full mx-auto">
        {isManualExploration && onRecenter ? (
          <button
            type="button"
            onClick={onRecenter}
            className="mx-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-full shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce cursor-pointer transition-all"
          >
            <span>🎯</span>
            <span>{isHindi ? 'वाहन पर पुनः केंद्रित करें' : 'Re-center on Vehicle'}</span>
          </button>
        ) : (
          <div className="bg-slate-900/80 backdrop-blur-sm text-slate-300 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-slate-700 text-center shadow-lg mx-auto">
            🛑 {t('driverSafetyNotice')}
          </div>
        )}
      </div>

      {/* Bottom Bar: Trip Telemetry, Speedometer & End Button */}
      <div className="pointer-events-auto max-w-2xl w-full mx-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-3 sm:p-4 shadow-2xl border border-slate-200 flex items-center justify-between gap-3">
          {/* Speedometer */}
          <div className="flex items-baseline gap-1 text-slate-900 shrink-0">
            <span className="font-black text-2xl sm:text-3xl tracking-tight">{speed}</span>
            <span className="text-[11px] font-bold text-slate-500">km/h</span>
          </div>

          <div className="h-8 w-px bg-slate-200"></div>

          {/* Remaining Distance */}
          <div className="text-center">
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">
              {isHindi ? 'दूरी' : 'Distance'}
            </div>
            <div className="font-extrabold text-sm sm:text-base text-slate-900">
              {remainingDistanceKm} km
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200"></div>

          {/* Remaining Time & Clock ETA */}
          <div className="text-center">
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">
              {currentManeuver?.arrivalTimeFormatted ? `ETA (${currentManeuver.arrivalTimeFormatted})` : 'ETA'}
            </div>
            <div className="font-extrabold text-sm sm:text-base text-blue-600">
              {formatHoursMins(remainingDurationMinutes)}
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200"></div>

          {/* Stop / Exit Navigation Button */}
          <button
            type="button"
            onClick={onStopNavigation}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>✕</span>
            <span>{isHindi ? 'समाप्त' : 'End'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
