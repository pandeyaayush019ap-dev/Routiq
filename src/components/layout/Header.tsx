import React from 'react';
import { useTranslation } from '../../i18n/context';
import { User } from '../../types/auth';

interface HeaderProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenSubscription: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenAuth,
  onSignOut,
  onOpenSubscription,
}) => {
  const { language, setLanguage, t, isHindi } = useTranslation();

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl font-black shadow-md shrink-0">
            🚛
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                {t('appName')}
              </span>
              <span className="hidden md:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-blue-400 border border-slate-700">
                Heavy Route
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {t('tagline')}
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Bilingual Switcher */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                language === 'en'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                language === 'hi'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              हिंदी
            </button>
          </div>

          {/* Upgrade / Pricing Modal Trigger */}
          <button
            onClick={onOpenSubscription}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-colors"
          >
            <span>⭐</span>
            <span>{isHindi ? 'प्रो योजना' : 'Pro Plan'}</span>
          </button>

          {/* User Auth */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-bold text-slate-200 truncate max-w-[140px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-emerald-400 capitalize">
                  {currentUser.subscriptionTier} tier
                </div>
              </div>
              <button
                onClick={onSignOut}
                title={t('navSignOut')}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                {t('navSignOut')}
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
            >
              {t('navSignIn')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
