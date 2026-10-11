import React from 'react';
import { RoadRestriction, VehicleProfile } from '../../types';
import { useTranslation } from '../../i18n/context';

interface RestrictionDetailModalProps {
  restriction: RoadRestriction | null;
  activeVehicle: VehicleProfile;
  onClose: () => void;
}

export const RestrictionDetailModal: React.FC<RestrictionDetailModalProps> = ({
  restriction,
  activeVehicle,
  onClose,
}) => {
  const { t, isHindi } = useTranslation();

  if (!restriction) return null;

  const isBlocked = restriction.status === 'BLOCKED';
  const isWarning = restriction.status === 'WARNING';

  const kindLabels: Record<string, string> = {
    bridge: t('kindBridge'),
    axle: t('kindAxle'),
    weight: t('kindWeight'),
    time_ban: t('kindTimeBan'),
    width: t('kindWidth'),
  };

  const getLimitDisplay = () => {
    if (restriction.limitType === 'height') {
      return `${restriction.limitValue} m`;
    }
    if (restriction.limitType === 'weight') {
      return `${restriction.limitValue} t`;
    }
    if (restriction.limitType === 'time' && restriction.timeWindow) {
      return `${restriction.timeWindow.start} – ${restriction.timeWindow.end}`;
    }
    return t('unverifiedNotice');
  };

  const getVehicleSpecDisplay = () => {
    if (restriction.limitType === 'height') {
      return `${activeVehicle.heightMeters} m (${t('heightLabel')})`;
    }
    if (restriction.limitType === 'weight') {
      return `${activeVehicle.loadedWeightTonnes} t (${t('loadedWeightLabel')})`;
    }
    if (restriction.limitType === 'axle') {
      return `${activeVehicle.axles} axles`;
    }
    return '—';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restriction-dialog-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-black shrink-0 ${
                isBlocked ? 'bg-red-600' : isWarning ? 'bg-amber-600' : 'bg-teal-600'
              }`}
            >
              {isBlocked ? '⛔' : '⚠️'}
            </span>
            <div>
              <h3 id="restriction-dialog-title" className="text-lg font-bold text-slate-900">
                {isHindi ? restriction.name.hi : restriction.name.en}
              </h3>
              <div className="text-xs font-semibold text-slate-500">
                {kindLabels[restriction.kind] || restriction.kind}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('closeBtn')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Status Callout */}
        <div
          className={`p-3.5 rounded-xl border mb-4 text-xs font-medium ${
            isBlocked
              ? 'bg-red-50 text-red-900 border-red-200'
              : 'bg-amber-50 text-amber-900 border-amber-200'
          }`}
        >
          <div className="font-bold mb-1">
            {isBlocked ? t('blockedBadge') : t('warningBadge')}
          </div>
          <div>
            {isHindi ? restriction.actionGuidance.hi : restriction.actionGuidance.en}
          </div>
        </div>

        {/* Specification Table */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2 text-xs mb-5">
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">{t('roadNameLabel')}</span>
            <span className="font-semibold text-slate-800 text-right max-w-[240px]">
              {isHindi ? restriction.roadName.hi : restriction.roadName.en}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">{t('clearanceLimit')}</span>
            <span className="font-bold text-red-700">{getLimitDisplay()}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">{t('yourVehicleSpec')}</span>
            <span className="font-bold text-slate-900">{getVehicleSpecDisplay()}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">{t('dataAuthority')}</span>
            <span className="font-medium text-slate-700 text-right">
              {restriction.sourceAuthority || 'National Highway Authority'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">{t('verificationStatus')}</span>
            <span className="font-semibold text-amber-700">
              {restriction.verificationStatus === 'verified' ? 'Verified Hazard' : t('unverifiedNotice')}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors"
          >
            {t('closeBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
