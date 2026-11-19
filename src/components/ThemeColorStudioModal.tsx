import React from 'react';
import { Check, Moon, Palette, Sun, X, Zap } from 'lucide-react';
import { AppSettings, BaseThemeMode, ThemeAccentOption } from '../types/app';
import { ACCENT_PRESETS } from '../data/themePresets';

interface ThemeColorStudioModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onClose: () => void;
}

export const ThemeColorStudioModal: React.FC<ThemeColorStudioModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleSelectTheme = (mode: BaseThemeMode) => {
    if (mode === 'sunlight') {
      onUpdateSettings({
        themeMode: 'sunlight',
        sunlightMode: true,
        daylightMode: false,
        amoledMode: false,
      });
    } else if (mode === 'pearl') {
      onUpdateSettings({
        themeMode: 'pearl',
        sunlightMode: false,
        daylightMode: true,
        amoledMode: false,
      });
    } else if (mode === 'charcoal') {
      onUpdateSettings({
        themeMode: 'charcoal',
        sunlightMode: false,
        daylightMode: false,
        amoledMode: false,
      });
    } else if (mode === 'amoled') {
      onUpdateSettings({
        themeMode: 'amoled',
        sunlightMode: false,
        daylightMode: false,
        amoledMode: true,
      });
    }
  };

  const currentThemeMode: BaseThemeMode = settings.sunlightMode
    ? 'sunlight'
    : settings.daylightMode
    ? 'pearl'
    : settings.amoledMode
    ? 'amoled'
    : 'charcoal';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg vaak-surface-elevated rounded-2xl sm:rounded-3xl border border-white/15 shadow-2xl overflow-hidden p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0EA5E9]/15 border border-[#0EA5E9]/35 flex items-center justify-center text-[#0EA5E9]">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-white">
                Theme &amp; Color Studio
              </h2>
              <p className="text-xs text-slate-400">
                Custom visual ergonomics for outdoor survival &amp; OLED battery life
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Theme Studio"
            className="min-h-[38px] min-w-[38px] rounded-xl bg-[#121418] hover:bg-[#232730] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Base Themes (Sunlight High-Contrast, Pearl White, Charcoal Dark, AMOLED Black) */}
        <div className="space-y-2.5">
          <span className="text-xs font-semibold text-slate-300 block">
            Base Canvas Theme
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Sunlight High-Contrast */}
            <button
              type="button"
              onClick={() => handleSelectTheme('sunlight')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                currentThemeMode === 'sunlight'
                  ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 text-white'
                  : 'bg-[#121418] border-white/10 hover:border-white/25 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Sun className="w-5 h-5 text-amber-400" />
                {currentThemeMode === 'sunlight' && <Check className="w-4 h-4 text-amber-400" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Sunlight High-Contrast</p>
                <p className="text-[11px] text-slate-400">21:1 Pure daylight outdoor survival</p>
              </div>
            </button>

            {/* Pearl White */}
            <button
              type="button"
              onClick={() => handleSelectTheme('pearl')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                currentThemeMode === 'pearl'
                  ? 'bg-sky-500/20 border-sky-400 ring-2 ring-sky-400/40 text-white'
                  : 'bg-[#121418] border-white/10 hover:border-white/25 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-5 h-5 rounded-full bg-[#F8FAFC] border border-slate-300" />
                {currentThemeMode === 'pearl' && <Check className="w-4 h-4 text-sky-400" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Pearl White (#F8FAFC)</p>
                <p className="text-[11px] text-slate-400">Soft daytime daylight canvas</p>
              </div>
            </button>

            {/* Charcoal Dark */}
            <button
              type="button"
              onClick={() => handleSelectTheme('charcoal')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                currentThemeMode === 'charcoal'
                  ? 'bg-sky-500/20 border-sky-400 ring-2 ring-sky-400/40 text-white'
                  : 'bg-[#121418] border-white/10 hover:border-white/25 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Moon className="w-5 h-5 text-slate-300" />
                {currentThemeMode === 'charcoal' && <Check className="w-4 h-4 text-sky-400" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Charcoal Dark (#121418)</p>
                <p className="text-[11px] text-slate-400">Default midnight graphite aesthetic</p>
              </div>
            </button>

            {/* AMOLED Black */}
            <button
              type="button"
              onClick={() => handleSelectTheme('amoled')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                currentThemeMode === 'amoled'
                  ? 'bg-sky-500/20 border-sky-400 ring-2 ring-sky-400/40 text-white'
                  : 'bg-[#121418] border-white/10 hover:border-white/25 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Zap className="w-5 h-5 text-emerald-400" />
                {currentThemeMode === 'amoled' && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">AMOLED Black (#000000)</p>
                <p className="text-[11px] text-slate-400">Max battery saving on OLED displays</p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. 5 Accents: Ocean Blue, Emerald Green, Royal Purple, Warm Saffron, Coral Rose */}
        <div className="space-y-2.5">
          <span className="text-xs font-semibold text-slate-300 block">
            Primary Accent Color (5 Studio Presets)
          </span>
          <div className="grid grid-cols-5 gap-2">
            {ACCENT_PRESETS.map((preset) => {
              const selected = settings.accentColor === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onUpdateSettings({ accentColor: preset.id as ThemeAccentOption })}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#1B1E24] border-[#0EA5E9] ring-2 ring-[#0EA5E9]/40 text-white'
                      : 'bg-[#121418] border-white/10 hover:border-white/25 text-slate-400'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full ${preset.swatchClass} flex items-center justify-center text-white shadow-md`}
                  >
                    {selected && <Check className="w-4 h-4" />}
                  </span>
                  <span className="text-[11px] font-semibold text-center truncate w-full">
                    {preset.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[46px] rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white font-semibold text-sm cursor-pointer"
        >
          Apply Theme &amp; Continue
        </button>
      </div>
    </div>
  );
};
