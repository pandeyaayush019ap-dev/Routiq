import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../i18n/context';
import { routingService } from '../../services/routing/routingService';

interface FloatingSearchBarProps {
  onSelectPlace: (name: string, coordinates: [number, number]) => void;
  onOpenDirections: () => void;
  onSelectCategory: (category: string) => void;
  activeCategory?: string;
  isNavigating?: boolean;
}

export const FloatingSearchBar: React.FC<FloatingSearchBarProps> = ({
  onSelectPlace,
  onOpenDirections,
  onSelectCategory,
  activeCategory,
  isNavigating = false,
}) => {
  const { isHindi } = useTranslation();
  const [query, setQuery] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; address: string; coordinates: [number, number] }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const categories = [
    { id: 'fuel', labelEn: 'Diesel', labelHi: 'डीजल', icon: '⛽' },
    { id: 'parking_rest', labelEn: 'Rest Areas', labelHi: 'विश्राम गृह', icon: '🅿️' },
    { id: 'repair', labelEn: 'Workshops', labelHi: 'वर्कशॉप', icon: '🔧' },
    { id: 'weighbridge', labelEn: 'Weighbridge', labelHi: 'धर्मकांटा', icon: '⚖️' },
    { id: 'food_dhaba', labelEn: 'Dhabas', labelHi: 'ढाबा', icon: '🍲' },
  ];

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (val.trim().length >= 3) {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsLoading(true);

      routingService
        .searchPlaces(val)
        .then((places) => {
          if (!controller.signal.aborted) {
            setSuggestions(places);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
  };

  // If navigating, hide floating search bar so navigation HUD has full focus
  if (isNavigating) return null;

  return (
    <div className="absolute top-3 inset-x-3 sm:left-4 sm:right-auto sm:w-[420px] z-20 pointer-events-auto space-y-2">
      {/* Floating Rounded Search Box */}
      <div className="relative bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl flex items-center px-3.5 py-2.5 gap-2.5 transition-all focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent">
        <span className="text-xl shrink-0">🚛</span>

        <input
          type="text"
          value={query}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={isHindi ? 'स्थान या फ्रेट हब खोजें...' : 'Search place, freight hub, or city...'}
          className="flex-1 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-400 hover:text-slate-700 font-bold px-1 text-sm cursor-pointer"
          >
            ✕
          </button>
        )}

        <div className="h-5 w-px bg-slate-200" />

        {/* Directions Icon Button */}
        <button
          type="button"
          onClick={onOpenDirections}
          className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 transition-all cursor-pointer shrink-0"
          title="Open Directions"
        >
          <span>🧭</span>
          <span className="hidden sm:inline font-bold">{isHindi ? 'मार्ग' : 'Routes'}</span>
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSelectPlace(item.name, item.coordinates);
                setQuery(item.name);
                setSuggestions([]);
                setIsFocused(false);
              }}
              className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 transition-colors flex items-start gap-2.5 cursor-pointer"
            >
              <span className="text-base mt-0.5">📍</span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{item.address}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Quick Category Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white ring-2 ring-slate-900/20'
                  : 'bg-white/95 backdrop-blur-md text-slate-700 hover:bg-white border border-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{isHindi ? cat.labelHi : cat.labelEn}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
