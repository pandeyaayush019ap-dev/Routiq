import React from 'react';
import { useTranslation } from '../../i18n/context';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, isHindi } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-900 mb-2">
              ⭐ {isHindi ? 'भविष्य की योजनाएँ' : 'Future Plans Preview'}
            </div>
            <h3 id="subscription-modal-title" className="text-xl sm:text-2xl font-black text-slate-900">
              {t('subModalTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t('subModalSubtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('closeBtn')}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Informational Phase 2 Banner */}
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 mb-6 text-xs text-amber-900 flex items-start gap-2.5">
          <span className="text-base shrink-0">ℹ️</span>
          <span>{t('subModalNotice')}</span>
        </div>

        {/* Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Free Tier */}
          <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-base text-slate-900 mb-1">{t('planFree')}</h4>
              <div className="text-xl font-black text-slate-800 mb-2">{t('planFreePrice')}</div>
              <p className="text-xs text-slate-500 mb-4">{t('planFreeDesc')}</p>
              <ul className="space-y-2 text-xs text-slate-600 mb-6">
                <li className="flex items-center gap-2"><span>✔</span><span>{t('planFreeF1')}</span></li>
                <li className="flex items-center gap-2"><span>✔</span><span>{t('planFreeF2')}</span></li>
                <li className="flex items-center gap-2"><span>✔</span><span>{t('planFreeF3')}</span></li>
                <li className="flex items-center gap-2"><span>✔</span><span>{t('planFreeF4')}</span></li>
              </ul>
            </div>
            <button
              disabled
              className="w-full py-2.5 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed"
            >
              {isHindi ? 'वर्तमान में सक्रिय' : 'Currently Active'}
            </button>
          </div>

          {/* Pro Tier (Popular) */}
          <div className="rounded-2xl border-2 border-blue-600 p-5 bg-blue-50/20 shadow-md relative flex flex-col justify-between">
            <span className="absolute -top-3 right-5 bg-blue-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-xs">
              {t('planProBadge')}
            </span>
            <div>
              <h4 className="font-bold text-base text-blue-950 mb-1">{t('planPro')}</h4>
              <div className="text-xl font-black text-blue-900 mb-2">{t('planProPrice')}</div>
              <p className="text-xs text-slate-600 mb-4">{t('planProDesc')}</p>
              <ul className="space-y-2 text-xs text-slate-700 mb-6">
                <li className="flex items-center gap-2"><span>⭐</span><span>{t('planProF1')}</span></li>
                <li className="flex items-center gap-2"><span>⭐</span><span>{t('planProF2')}</span></li>
                <li className="flex items-center gap-2"><span>⭐</span><span>{t('planProF3')}</span></li>
                <li className="flex items-center gap-2"><span>⭐</span><span>{t('planProF4')}</span></li>
              </ul>
            </div>
            <div>
              <span className="block text-center text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">
                {t('comingSoonBadge')}
              </span>
              <button
                disabled
                className="w-full py-2.5 rounded-xl bg-blue-600/30 text-blue-900 text-xs font-bold cursor-not-allowed border border-blue-400/40"
              >
                {t('upgradeInquiryBtn')}
              </button>
            </div>
          </div>

          {/* Fleet Tier */}
          <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-base text-slate-900 mb-1">{t('planFleet')}</h4>
              <div className="text-xl font-black text-slate-800 mb-2">{t('planFleetPrice')}</div>
              <p className="text-xs text-slate-500 mb-4">{t('planFleetDesc')}</p>
              <ul className="space-y-2 text-xs text-slate-600 mb-6">
                <li className="flex items-center gap-2"><span>🏢</span><span>{t('planFleetF1')}</span></li>
                <li className="flex items-center gap-2"><span>🏢</span><span>{t('planFleetF2')}</span></li>
                <li className="flex items-center gap-2"><span>🏢</span><span>{t('planFleetF3')}</span></li>
                <li className="flex items-center gap-2"><span>🏢</span><span>{t('planFleetF4')}</span></li>
              </ul>
            </div>
            <div>
              <span className="block text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('comingSoonBadge')}
              </span>
              <button
                disabled
                className="w-full py-2.5 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed"
              >
                {t('upgradeInquiryBtn')}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors"
          >
            {t('closeBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
