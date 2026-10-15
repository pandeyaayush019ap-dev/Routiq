import React from 'react';

export type SnapPoint = 'peek' | 'half' | 'full';

interface BottomSheetProps {
  snapPoint: SnapPoint;
  onSnapChange: (snap: SnapPoint) => void;
  children: React.ReactNode;
  isNavigating?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  snapPoint,
  onSnapChange,
  children,
  isNavigating = false,
}) => {
  // If navigating, hide or minimize bottom sheet so Navigation HUD has full screen
  if (isNavigating) return null;

  const cycleSnap = () => {
    if (snapPoint === 'peek') onSnapChange('half');
    else if (snapPoint === 'half') onSnapChange('full');
    else onSnapChange('peek');
  };

  const getMobileHeightClass = () => {
    switch (snapPoint) {
      case 'peek':
        return 'h-24';
      case 'half':
        return 'h-[50vh]';
      case 'full':
        return 'h-[88vh]';
    }
  };

  return (
    <div
      className={`fixed lg:absolute bottom-0 inset-x-0 lg:left-4 lg:right-auto lg:top-20 lg:bottom-4 lg:w-[430px] z-20 bg-white rounded-t-3xl lg:rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 ease-out pointer-events-auto ${getMobileHeightClass()} lg:h-auto lg:max-h-[calc(100vh-100px)]`}
    >
      {/* Drag Handle on Mobile */}
      <div
        onClick={cycleSnap}
        className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-pointer select-none lg:hidden shrink-0 bg-white rounded-t-3xl"
        role="button"
        aria-label="Toggle Sheet Height"
      >
        <div className="w-12 h-1.5 bg-slate-300 hover:bg-slate-400 rounded-full transition-colors mb-1"></div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {snapPoint === 'peek' ? 'Pull up for details ▲' : snapPoint === 'half' ? 'Swipe up / tap ▼' : 'Tap to collapse ▼'}
        </div>
      </div>

      {/* Content Container (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-1 lg:pt-4 no-scrollbar">
        {children}
      </div>
    </div>
  );
};
