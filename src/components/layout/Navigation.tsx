import React from 'react';
import { useTranslation } from '../../i18n/context';

export type ActiveTab = 'plan' | 'vehicles' | 'fleet' | 'settings';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  vehicleCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  vehicleCount,
}) => {
  const { t, isHindi } = useTranslation();

  const tabs: { id: ActiveTab; label: string; icon: string; count?: number }[] = [
    { id: 'plan', label: t('navPlan'), icon: '🧭' },
    { id: 'vehicles', label: t('navVehicles'), icon: '🚛', count: vehicleCount },
    { id: 'fleet', label: isHindi ? 'फ्लीट डैशबोर्ड' : 'Live Fleet', icon: '📡' },
    { id: 'settings', label: t('navSettings'), icon: '⚙️' },
  ];

  return (
    <nav className="bg-white border-b border-slate-200/90 px-4">
      <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px] transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-extrabold ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
