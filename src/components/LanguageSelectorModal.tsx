import React, { useMemo, useState } from 'react';
import { Check, Globe, Languages, Search, X } from 'lucide-react';
import {
  INDIAN_LANGUAGES_22,
  INTERNATIONAL_LANGUAGES_59,
  LANGUAGES_81,
  LiveTranslationLang,
  lazyLoadLanguagePack,
} from '../data/languages50';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  currentLang: string;
  onSelectLanguage: (code: string) => void;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  currentLang,
  onSelectLanguage,
  onClose,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'indian' | 'international'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = useMemo(() => {
    let list: LiveTranslationLang[] = LANGUAGES_81;
    if (filterTab === 'indian') {
      list = INDIAN_LANGUAGES_22;
    } else if (filterTab === 'international') {
      list = INTERNATIONAL_LANGUAGES_59;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) ||
        lang.native.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q) ||
        (lang.script && lang.script.toLowerCase().includes(q))
    );
  }, [filterTab, searchQuery]);

  if (!isOpen) return null;

  const handleChoose = async (lang: LiveTranslationLang) => {
    await lazyLoadLanguagePack(lang.code);
    onSelectLanguage(lang.code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90dvh] flex flex-col vaak-surface-elevated rounded-2xl sm:rounded-3xl border border-white/15 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-[#1B1E24]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#0EA5E9]/15 border border-[#0EA5E9]/35 flex items-center justify-center text-[#0EA5E9] shrink-0">
              <Languages className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold text-white truncate">
                81 Official State &amp; National Languages
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Day-1 App Menus Localization &amp; Two-Way Auto-Translation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close language selector"
            className="min-h-[40px] min-w-[40px] rounded-xl bg-[#121418] hover:bg-[#232730] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter Tabs */}
        <div className="p-3 sm:p-4 space-y-3 border-b border-white/10 bg-[#121418]/90">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, script, or code (e.g. Sanskrit, Tamil, Hindi, Japanese)..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-[#1B1E24] border border-white/10 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0EA5E9]"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#1B1E24] border border-white/8 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`py-2 px-2 rounded-lg transition-colors cursor-pointer text-center truncate ${
                filterTab === 'all'
                  ? 'bg-[#0EA5E9] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Languages (81)
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('indian')}
              className={`py-2 px-2 rounded-lg transition-colors cursor-pointer text-center truncate ${
                filterTab === 'indian'
                  ? 'bg-[#0EA5E9] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Indian Official (22)
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('international')}
              className={`py-2 px-2 rounded-lg transition-colors cursor-pointer text-center truncate ${
                filterTab === 'international'
                  ? 'bg-[#0EA5E9] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              International (59)
            </button>
          </div>
        </div>

        {/* Language Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {filteredLanguages.length === 0 ? (
            <div className="col-span-full py-12 text-center space-y-2">
              <Globe className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No language found</p>
              <p className="text-xs text-slate-500">Try searching with a different term.</p>
            </div>
          ) : (
            filteredLanguages.map((lang) => {
              const selected = currentLang === lang.code;
              const isInstant = lang.code === 'en' || lang.code === 'hi';

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleChoose(lang)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    selected
                      ? 'bg-[#0EA5E9]/15 border-[#0EA5E9] text-white'
                      : 'bg-[#121418] border-white/8 hover:border-white/20 text-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-semibold truncate text-white">
                        {lang.name}
                      </p>
                      <span className="font-mono-tabular text-[10px] uppercase text-[#0EA5E9] px-1 rounded bg-[#0EA5E9]/10">
                        {lang.code}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-400 truncate mt-0.5">
                      {lang.native}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                      <span>{lang.category === 'indian' ? 'Indian Scheduled' : 'Disaster-Priority'}</span>
                      {isInstant && <span className="text-emerald-400 font-semibold">· Instant</span>}
                    </div>
                  </div>

                  {selected && (
                    <div className="w-5 h-5 rounded-full bg-[#0EA5E9] flex items-center justify-center text-white shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-[#1B1E24] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>Active: {LANGUAGES_81.find((l) => l.code === currentLang)?.name || currentLang.toUpperCase()}</span>
          <span className="font-mono-tabular text-[11px] text-[#0EA5E9]">
            Full Day-1 Dashboard UI + Two-Way Mesh Audio/Text
          </span>
        </div>
      </div>
    </div>
  );
};
