import React, { useState } from 'react';
import { VehicleProfile, VehicleCategory, CargoType } from '../../types';
import { VahanVehicleDetails } from '../../types/vahan';
import { vehicleService } from '../../services/vehicles/vehicleService';
import { VahanLookupSection } from './VahanLookupSection';
import { useTranslation } from '../../i18n/context';

interface VehicleFormModalProps {
  initialVehicle?: VehicleProfile | null;
  onSave: (vehicle: VehicleProfile) => void;
  onClose: () => void;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  initialVehicle,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const [showVahanLookup, setShowVahanLookup] = useState<boolean>(!initialVehicle);

  const [formData, setFormData] = useState<Partial<VehicleProfile>>(() => {
    if (initialVehicle) {
      return { ...initialVehicle };
    }
    return {
      id: `veh_${Date.now()}`,
      name: '',
      category: 'truck',
      registrationNumber: '',
      gvwTonnes: 16.0,
      loadedWeightTonnes: 12.0,
      heightMeters: 3.4,
      widthMeters: 2.4,
      lengthMeters: 8.5,
      axles: 2,
      cargoType: 'general',
      isVahanVerified: false,
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleVahanPrefill = (details: VahanVehicleDetails) => {
    setFormData((prev) => ({
      ...prev,
      name: details.makerModel,
      registrationNumber: details.registrationNumber,
      category: details.category,
      gvwTonnes: details.registeredGvwTonnes,
      loadedWeightTonnes: Math.min(
        details.registeredGvwTonnes,
        Number((details.registeredGvwTonnes * 0.85).toFixed(1))
      ),
      heightMeters: details.estimatedHeightMeters || 3.5,
      widthMeters: details.estimatedWidthMeters || 2.5,
      lengthMeters: details.estimatedLengthMeters || 9.0,
      axles: details.suggestedAxles || 3,
      isVahanVerified: true,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = vehicleService.validateVehicle(formData);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    onSave(formData as VehicleProfile);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 id="vehicle-modal-title" className="text-lg font-bold text-slate-900">
            {initialVehicle ? t('editVehicleBtn') : t('addVehicleBtn')}
          </h3>
          <button
            onClick={onClose}
            aria-label={t('cancelBtn')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* VAHAN Fast Lookup Section */}
        {showVahanLookup && (
          <VahanLookupSection
            onVehicleDataFetched={handleVahanPrefill}
            onSwitchToManual={() => setShowVahanLookup(false)}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nickname / Name */}
          <div>
            <label htmlFor="veh-name" className="block text-xs font-bold text-slate-700 mb-1">
              {t('nicknameLabel')} *
            </label>
            <input
              id="veh-name"
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('nicknamePlaceholder')}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">⚠️ {errors.name}</p>}
          </div>

          {/* Registration Number */}
          <div>
            <label htmlFor="veh-rc" className="block text-xs font-bold text-slate-700 mb-1">
              {t('vahanInputLabel')}
            </label>
            <input
              id="veh-rc"
              type="text"
              value={formData.registrationNumber || ''}
              onChange={(e) =>
                setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })
              }
              placeholder="MH 12 AB 1234"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
            />
          </div>

          {/* Category & Cargo Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="veh-cat" className="block text-xs font-bold text-slate-700 mb-1">
                {t('categoryLabel')}
              </label>
              <select
                id="veh-cat"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as VehicleCategory })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px] bg-white"
              >
                <option value="truck">{t('catTruck')}</option>
                <option value="tipper">{t('catTipper')}</option>
                <option value="container">{t('catContainer')}</option>
                <option value="tanker">{t('catTanker')}</option>
                <option value="trailer">{t('catTrailer')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="veh-cargo" className="block text-xs font-bold text-slate-700 mb-1">
                {t('cargoLabel')}
              </label>
              <select
                id="veh-cargo"
                value={formData.cargoType}
                onChange={(e) =>
                  setFormData({ ...formData, cargoType: e.target.value as CargoType })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px] bg-white"
              >
                <option value="general">{t('cargoGeneral')}</option>
                <option value="hazardous">{t('cargoHazardous')}</option>
                <option value="perishable">{t('cargoPerishable')}</option>
                <option value="heavy_machinery">{t('cargoHeavy')}</option>
              </select>
            </div>
          </div>

          {/* Weight Row (GVW & Loaded Weight) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="veh-gvw" className="block text-xs font-bold text-slate-700 mb-1">
                {t('gvwLabel')} *
              </label>
              <input
                id="veh-gvw"
                type="number"
                step="0.1"
                value={formData.gvwTonnes ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, gvwTonnes: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">{t('gvwHint')}</p>
              {errors.gvwTonnes && <p className="text-red-600 text-xs mt-1">⚠️ {errors.gvwTonnes}</p>}
            </div>
            <div>
              <label htmlFor="veh-loaded" className="block text-xs font-bold text-slate-700 mb-1">
                {t('loadedWeightLabel')} *
              </label>
              <input
                id="veh-loaded"
                type="number"
                step="0.1"
                value={formData.loadedWeightTonnes ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, loadedWeightTonnes: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">{t('loadedWeightHint')}</p>
              {errors.loadedWeightTonnes && (
                <p className="text-red-600 text-xs mt-1">⚠️ {errors.loadedWeightTonnes}</p>
              )}
            </div>
          </div>

          {/* Dimensions Row (Height, Width, Length, Axles) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label htmlFor="veh-height" className="block text-xs font-bold text-slate-700 mb-1">
                {t('heightLabel')} *
              </label>
              <input
                id="veh-height"
                type="number"
                step="0.05"
                value={formData.heightMeters ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, heightMeters: parseFloat(e.target.value) })
                }
                className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
              {errors.heightMeters && (
                <p className="text-red-600 text-[11px] mt-1">⚠️ {errors.heightMeters}</p>
              )}
            </div>
            <div>
              <label htmlFor="veh-width" className="block text-xs font-bold text-slate-700 mb-1">
                {t('widthLabel')} *
              </label>
              <input
                id="veh-width"
                type="number"
                step="0.05"
                value={formData.widthMeters ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, widthMeters: parseFloat(e.target.value) })
                }
                className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
              {errors.widthMeters && (
                <p className="text-red-600 text-[11px] mt-1">⚠️ {errors.widthMeters}</p>
              )}
            </div>
            <div>
              <label htmlFor="veh-length" className="block text-xs font-bold text-slate-700 mb-1">
                {t('lengthLabel')} *
              </label>
              <input
                id="veh-length"
                type="number"
                step="0.1"
                value={formData.lengthMeters ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, lengthMeters: parseFloat(e.target.value) })
                }
                className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
              {errors.lengthMeters && (
                <p className="text-red-600 text-[11px] mt-1">⚠️ {errors.lengthMeters}</p>
              )}
            </div>
            <div>
              <label htmlFor="veh-axles" className="block text-xs font-bold text-slate-700 mb-1">
                {t('axlesLabel')} *
              </label>
              <input
                id="veh-axles"
                type="number"
                value={formData.axles ?? ''}
                onChange={(e) => setFormData({ ...formData, axles: parseInt(e.target.value, 10) })}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
              {errors.axles && <p className="text-red-600 text-[11px] mt-1">⚠️ {errors.axles}</p>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors min-h-[44px]"
            >
              {t('cancelBtn')}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-sm transition-colors min-h-[44px]"
            >
              {t('saveVehicleBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
