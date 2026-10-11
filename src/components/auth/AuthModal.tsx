import React, { useState } from 'react';
import { authService } from '../../services/auth/authService';
import { User } from '../../types/auth';
import { useTranslation } from '../../i18n/context';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const { t, isHindi } = useTranslation();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [identifier, setIdentifier] = useState<string>('9876543210');
  const [password, setPassword] = useState<string>('Driver@123');
  const [name, setName] = useState<string>('Rajesh Driver');
  const [companyName, setCompanyName] = useState<string>('Pune Logistics');
  const [role, setRole] = useState<'driver' | 'fleet_owner' | 'dispatcher'>('driver');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage(t('errReqField'));
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const session = await authService.signIn({ identifier, password });
        if (session.user) {
          onAuthSuccess(session.user);
          onClose();
        }
      } else {
        const session = await authService.signUp({
          name: name.trim() || 'Driver',
          identifier,
          password,
          role,
          companyName: companyName.trim() || undefined,
        });
        if (session.user) {
          onAuthSuccess(session.user);
          onClose();
        }
      }
    } catch {
      setErrorMessage('Authentication request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const session = await authService.signInWithDemo();
      if (session.user) {
        onAuthSuccess(session.user);
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚛</span>
            <h3 id="auth-modal-title" className="text-lg font-bold text-slate-900">
              {mode === 'signin' ? t('authModalTitleSignIn') : t('authModalTitleSignUp')}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t('closeBtn')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Demo Fast Sign In Button */}
        <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
          <div className="font-semibold mb-1.5">{t('authDemoNote')}</div>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-xs"
          >
            ⚡ {isHindi ? 'राजेश कुमार (चालक) के रूप में एक-क्लिक लॉग इन' : 'One-Click Demo Login as Rajesh Kumar (Driver)'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <>
              <div>
                <label htmlFor="auth-name" className="block text-xs font-bold text-slate-700 mb-1">
                  {t('authNameLabel')} *
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Singh"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="auth-role" className="block text-xs font-bold text-slate-700 mb-1">
                  {t('authRoleLabel')}
                </label>
                <select
                  id="auth-role"
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as 'driver' | 'fleet_owner' | 'dispatcher')
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px] bg-white"
                >
                  <option value="driver">{t('roleDriver')}</option>
                  <option value="fleet_owner">{t('roleFleet')}</option>
                  <option value="dispatcher">{t('roleDispatcher')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="auth-company" className="block text-xs font-bold text-slate-700 mb-1">
                  {t('authCompanyLabel')}
                </label>
                <input
                  id="auth-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Western Freight Logistics"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-identifier" className="block text-xs font-bold text-slate-700 mb-1">
              {t('authIdentifierLabel')} *
            </label>
            <input
              id="auth-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="+91 9876543210 / driver@example.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="auth-password" className="text-xs font-bold text-slate-700">
                {t('authPasswordLabel')} *
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                {showPassword ? t('hidePassword') : t('showPassword')}
              </button>
            </div>
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
            />
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold">
              ⚠️ {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-sm transition-colors min-h-[46px] cursor-pointer"
          >
            {isLoading
              ? 'Processing…'
              : mode === 'signin'
              ? t('signInSubmitBtn')
              : t('signUpSubmitBtn')}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setErrorMessage(null);
              }}
              className="text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
            >
              {mode === 'signin' ? t('dontHaveAccount') : t('alreadyHaveAccount')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
