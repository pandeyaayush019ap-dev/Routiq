import React from 'react';
import { useTranslation } from '../../i18n/context';

export const SettingsHelp: React.FC = () => {
  const { language, setLanguage, t, isHindi } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="font-extrabold text-base text-slate-900 mb-3">
          {t('settingsTitle')}
        </h3>

        {/* Language selector */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <div>
            <div className="text-sm font-bold text-slate-800">{t('languageSetting')}</div>
            <div className="text-xs text-slate-500">
              {isHindi ? 'इंटरफ़ेस की भाषा बदलें' : 'Choose application language'}
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                language === 'en'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                language === 'hi'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिंदी (Devanagari)
            </button>
          </div>
        </div>

        {/* Units notice */}
        <div className="pt-3 text-xs text-slate-600 flex items-center gap-2">
          <span>📏</span>
          <span>{t('unitsNotice')}</span>
        </div>
      </div>

      {/* Safety & FAQ Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <span>🛡️</span>
          <span>{t('faqTitle')}</span>
        </h3>

        <details className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 group cursor-pointer">
          <summary className="font-bold text-xs sm:text-sm text-slate-800 list-none flex items-center justify-between">
            <span>{t('faqQ1')}</span>
            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-200/50">
            {t('faqA1')}
          </p>
        </details>

        <details className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 group cursor-pointer">
          <summary className="font-bold text-xs sm:text-sm text-slate-800 list-none flex items-center justify-between">
            <span>{t('faqQ2')}</span>
            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-200/50">
            {t('faqA2')}
          </p>
        </details>

        <details className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 group cursor-pointer">
          <summary className="font-bold text-xs sm:text-sm text-slate-800 list-none flex items-center justify-between">
            <span>{t('faqQ3')}</span>
            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-200/50">
            {t('faqA3')}
          </p>
        </details>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-400 py-4">
        {t('aboutFooter')}
      </div>
    </div>
  );
};
