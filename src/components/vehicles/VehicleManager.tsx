import React from 'react';
import { VehicleProfile } from '../../types';
import { useTranslation } from '../../i18n/context';

interface VehicleManagerProps {
  vehicles: VehicleProfile[];
  activeVehicleId: string;
  onSelectActiveVehicle: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (vehicle: VehicleProfile) => void;
  onDeleteVehicle: (id: string) => void;
}

export const VehicleManager: React.FC<VehicleManagerProps> = ({
  vehicles,
  activeVehicleId,
  onSelectActiveVehicle,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteVehicle,
}) => {
  const { t, isHindi } = useTranslation();

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'truck':
        return t('catTruck');
      case 'tipper':
        return t('catTipper');
      case 'container':
        return t('catContainer');
      case 'tanker':
        return t('catTanker');
      case 'trailer':
        return t('catTrailer');
      default:
        return cat;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900">
            {t('vehiclesTitle')}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('vehiclesDesc')}
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0 min-h-[44px]"
        >
          <span>＋</span>
          <span>{t('addVehicleBtn')}</span>
        </button>
      </div>

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {vehicles.map((vehicle) => {
          const isActive = vehicle.id === activeVehicleId;

          return (
            <div
              key={vehicle.id}
              className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-blue-50/50 border-blue-600 shadow-sm ring-2 ring-blue-600/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div>
                {/* Title & RC Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                      {vehicle.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 font-semibold">
                        {getCategoryLabel(vehicle.category)}
                      </span>
                      {vehicle.registrationNumber && (
                        <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {vehicle.registrationNumber}
                        </span>
                      )}
                      {vehicle.isVahanVerified && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-md">
                          VAHAN ✓
                        </span>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      {isHindi ? 'सक्रिय' : 'Active'}
                    </span>
                  )}
                </div>

                {/* Specs Matrix */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 my-3 border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">
                      {t('heightLabel')}
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {vehicle.heightMeters} m
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">
                      {t('loadedWeightLabel')}
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {vehicle.loadedWeightTonnes} t
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">
                      {t('gvwLabel')}
                    </span>
                    <span className="font-extrabold text-slate-700 text-sm">
                      {vehicle.gvwTonnes} t
                    </span>
                  </div>
                </div>

                {/* Secondary Specs */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                  <span>{t('widthLabel')}: {vehicle.widthMeters}m</span>
                  <span>·</span>
                  <span>{t('lengthLabel')}: {vehicle.lengthMeters}m</span>
                  <span>·</span>
                  <span>{vehicle.axles} {t('axlesLabel')}</span>
                  {vehicle.cargoType === 'hazardous' && (
                    <>
                      <span>·</span>
                      <span className="text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                        ☣️ {t('cargoHazardous')}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                {!isActive ? (
                  <button
                    onClick={() => onSelectActiveVehicle(vehicle.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors min-h-[38px]"
                  >
                    {t('useForRouting')}
                  </button>
                ) : (
                  <span className="text-xs font-bold text-blue-700">
                    ✔ {t('activeVehicleBadge')}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenEditModal(vehicle)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors min-h-[38px]"
                  >
                    {t('editVehicleBtn')}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(t('confirmDelete'))) {
                        onDeleteVehicle(vehicle.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold transition-colors min-h-[38px]"
                  >
                    {t('deleteVehicleBtn')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
