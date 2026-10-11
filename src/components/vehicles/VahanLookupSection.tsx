import React, { useState } from 'react';
import { vahanService } from '../../services/vahan/vahanService';
import { VahanVehicleDetails, VahanLookupStatus } from '../../types/vahan';
import { useTranslation } from '../../i18n/context';

interface VahanLookupSectionProps {
  onVehicleDataFetched: (details: VahanVehicleDetails) => void;
  onSwitchToManual: () => void;
}

export const VahanLookupSection: React.FC<VahanLookupSectionProps> = ({
  onVehicleDataFetched,
  onSwitchToManual,
}) => {
  const { t, isHindi } = useTranslation();
  const [rcNumber, setRcNumber] = useState<string>('MH12AB1234');
  const [status, setStatus] = useState<VahanLookupStatus>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const normalized = vahanService.normalizeRegistration(rcNumber);
    if (!vahanService.validateRegistrationFormat(normalized)) {
      setStatus('INVALID_FORMAT');
      setErrorMessage(t('vahanInvalidFormat'));
      return;
    }

    setStatus('LOADING');

    try {
      const result = await vahanService.lookupVehicle(normalized);
      if (result.status === 'SUCCESS' && result.vehicle) {
        setStatus('SUCCESS');
        onVehicleDataFetched(result.vehicle);
      } else {
        setStatus('NOT_FOUND');
        setErrorMessage(result.errorMessage || t('vahanNotFound'));
      }
    } catch {
      setStatus('API_UNAVAILABLE');
      setErrorMessage('VAHAN Gateway connection timed out. Please enter details manually.');
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl border border-blue-200/80 p-4 mb-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h4 className="font-extrabold text-sm sm:text-base text-blue-950 flex items-center gap-1.5">
            <span>🇮🇳</span>
            <span>{t('vahanSectionTitle')}</span>
          </h4>
          <p className="text-xs text-blue-800/80 mt-0.5">
            {t('vahanSectionDesc')}
          </p>
        </div>
        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 border border-blue-300">
          VAHAN API
        </span>
      </div>

      <form onSubmit={handleFetch} className="mt-3 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={rcNumber}
            onChange={(e) => setRcNumber(e.target.value.toUpperCase())}
            placeholder="MH 12 AB 1234"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-blue-300 bg-white text-sm font-bold tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[46px]"
          />
          <button
            type="submit"
            disabled={status === 'LOADING'}
            className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-extrabold text-xs sm:text-sm shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 min-h-[46px]"
          >
            {status === 'LOADING' ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>{t('vahanFetching')}</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>{t('vahanFetchBtn')}</span>
              </>
            )}
          </button>
        </div>

        {/* Status Callouts */}
        {status === 'SUCCESS' && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <span>✔</span>
            <span>{t('vahanSuccessMsg')}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs font-medium">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Quick test registration badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-blue-900/70">
          <span>{isHindi ? 'नमूना नंबर:' : 'Try:'}</span>
          <button
            type="button"
            onClick={() => setRcNumber('MH12AB1234')}
            className="font-mono font-bold underline hover:text-blue-950"
          >
            MH12AB1234
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setRcNumber('MH04AZ9940')}
            className="font-mono font-bold underline hover:text-blue-950"
          >
            MH04AZ9940
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setRcNumber('DL01AA8821')}
            className="font-mono font-bold underline hover:text-blue-950"
          >
            DL01AA8821
          </button>
        </div>

        {/* Driver Verification Advisory */}
        <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium flex items-start gap-1.5">
          <span className="shrink-0 text-sm">ℹ️</span>
          <span>{t('vahanDriverVerificationNotice')}</span>
        </div>

        {/* Manual Fallback Option */}
        <div className="text-right pt-1">
          <button
            type="button"
            onClick={onSwitchToManual}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 underline"
          >
            {t('vahanManualFallback')} →
          </button>
        </div>
      </form>
    </div>
  );
};
