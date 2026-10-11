import React from 'react';
import { useTranslation } from '../../i18n/context';

export const MapLegend: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl p-3 shadow-md text-xs text-slate-700 pointer-events-auto">
      <div className="font-semibold text-slate-900 mb-1.5 flex items-center justify-between">
        <span>{t('mapLegend')}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="w-5 h-1 bg-blue-600 rounded-full inline-block shadow-xs"></span>
          <span>{t('mapLegendSelected')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-1 border-b-2 border-dashed border-slate-500 inline-block"></span>
          <span>{t('mapLegendAlt')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
            ✕
          </span>
          <span>{t('mapLegendViolation')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-amber-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
            !
          </span>
          <span>{t('mapLegendWarning')}</span>
        </div>
      </div>
    </div>
  );
};
