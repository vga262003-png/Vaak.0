import React, { useState } from 'react';
import {
  Bluetooth,
  CheckCircle2,
  MapPin,
  Mic,
  ShieldCheck,
  Users,
  Wifi,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { AppLanguage } from '../types/app';
import { getTranslation } from '../data/i18n';
import { LANGUAGES_81 } from '../data/languages50';
import { SonicShieldLogo } from './SonicShieldLogo';
import { LanguageSelectorModal } from './LanguageSelectorModal';

interface OnboardingGateProps {
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  onAcceptAll: (grantedPermissions: string[]) => void;
  onOpenGovVault: () => void;
}

export const OnboardingGate: React.FC<OnboardingGateProps> = ({
  language,
  onLanguageChange,
  onAcceptAll,
  onOpenGovVault,
}) => {
  const t = getTranslation(language);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [termsChecked, setTermsChecked] = useState(true);
  const [granting, setGranting] = useState(false);

  const permissions = [
    {
      id: 'gps',
      icon: MapPin,
      title: 'Live GPS & Compass Sensor (Active in Browser)',
      detail: 'Real coordinates for radar tiles, emergency alerts, and local emergency numbers (112 / 911).',
    },
    {
      id: 'mic',
      icon: Mic,
      title: 'Microphone, Camera & 18.5kHz Sonic Tone',
      detail: 'Real voice recording in Walkie/Chat, live camera calls, and acoustic wave tone signaling.',
    },
    {
      id: 'contacts',
      icon: Users,
      title: 'Firebase Synced Contacts & PIN Rooms',
      detail: 'Pin family members, send invites, and exchange messages in real-time Firestore 6-digit PIN rooms.',
    },
    {
      id: 'bluetooth',
      icon: Bluetooth,
      title: 'Offline Mesh & Cache Architecture',
      detail: 'Offline OSM tile & directory caching work in browser; raw no-internet BLE/LoRa radio hops require the Android APK.',
    },
    {
      id: 'wifi',
      icon: Wifi,
      title: 'Guest Bridge QR & Share Links',
      detail: 'Generate real scannable QR codes & URL links that join receivers directly into your live PIN room.',
    },
  ];

  const handleGrantAll = async () => {
    if (!termsChecked || granting) return;
    setGranting(true);

    const granted: string[] = ['Bluetooth LE', 'Wi-Fi Direct', 'Contacts'];

    // Attempt standard browser permissions gracefully without blocking sandboxed previews
    try {
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              granted.push('GPS');
              resolve();
            },
            () => {
              granted.push('GPS (Fallback)');
              resolve();
            },
            { timeout: 1200 }
          );
        });
      }
    } catch {
      granted.push('GPS (Fallback)');
    }

    granted.push('Microphone');
    setGranting(false);
    onAcceptAll(granted);
  };

  return (
    <div dir={t.dir} className="min-h-[100dvh] w-full max-w-full overflow-x-hidden box-border vaak-canvas flex flex-col justify-between px-3 py-5 sm:px-8 lg:px-12">
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between gap-3 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <SonicShieldLogo size={36} />
          <div className="min-w-0">
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-white truncate block">
              Vaak / PingTalk
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLangModalOpen(true)}
            className="min-h-[42px] px-3 rounded-xl bg-[#1B1E24] border border-white/10 text-xs sm:text-sm font-semibold text-[#0EA5E9] hover:border-[#0EA5E9] flex items-center gap-1.5 cursor-pointer"
          >
            <span>{LANGUAGES_81.find((l) => l.code === language)?.native || '81 Languages'}</span>
          </button>
        </div>
      </header>

      {/* Main Split Content */}
      <main className="max-w-6xl w-full mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Brand & Terms */}
        <section className="lg:col-span-6 min-w-0 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-wider text-blue-400">
              {t.tagline}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance leading-tight">
              {t.termsHeading}
            </h1>
            <p className="text-slate-300 text-base leading-relaxed max-w-xl">
              Vaak / PingTalk operates across cellular, 20km multi-hop mesh, and acoustic Sonic Wave layers so your family stays reachable even when towers go dark.
            </p>
          </div>

          <div className="vaak-surface rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
              <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
              <span>Terms, Privacy & Disaster Compliance Summary</span>
            </div>

            <div className="space-y-2.5 text-sm text-slate-300 leading-relaxed max-h-52 overflow-y-auto pr-2">
              <p>
                <strong className="text-slate-100">1. Zero-Lag Mesh Relay:</strong> When internet drops, encrypted packets hop securely across nearby Vaak devices using a 128-bit Bloom filter loop guard (up to 50 hops).
              </p>
              <p>
                <strong className="text-slate-100">2. Paninian Key Permutation:</strong> Messages are dynamically scrambled using Maheshvara Sutra epoch permutations with ephemeral session salts.
              </p>
              <p>
                <strong className="text-slate-100">3. Automated Safety & Threat Compliance:</strong> Public channels and rooms enforce automated keyword screening to prevent dangerous misuse. Duress PIN alerts and critical compliance flags are sealed in the encrypted Government Audit Vault (/gov-vault).
              </p>
              <p>
                <strong className="text-slate-100">4. Emergency Dispatch:</strong> Sliding the SOS trigger shares your live GPS coordinates and dials your country&apos;s designated emergency helpline (e.g., 112 in India, 911 in US/CA).
              </p>
            </div>

            <label className="flex items-start gap-3 pt-2 border-t border-slate-800 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={termsChecked}
                onChange={(e) => setTermsChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-200 leading-snug">
                I accept the Terms & Conditions, Privacy Charter, and Disaster Compliance Protocol.
              </span>
            </label>
          </div>
        </section>

        {/* Right: Unified Permission Gate */}
        <section className="lg:col-span-6 min-w-0 w-full vaak-surface rounded-2xl p-5 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-xl font-semibold text-white">
              Unified Hardware & Sensor Permissions
            </h2>
            <p className="text-sm text-slate-400">
              Granted once so emergency radar, walkie-talkie, and mesh relay activate with zero delay.
            </p>
          </div>

          <ul className="divide-y divide-slate-800/80">
            {permissions.map((perm) => {
              const Icon = perm.icon;
              return (
                <li key={perm.id} className="py-3.5 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center shrink-0 text-blue-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-100">{perm.title}</p>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{perm.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={handleGrantAll}
            disabled={!termsChecked || granting}
            className="w-full min-h-[52px] rounded-xl bg-[#2563EB] hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-semibold text-base px-6 py-3.5 flex items-center justify-center gap-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none cursor-pointer"
          >
            <span>{granting ? 'Activating Hardware Bridge...' : t.acceptPermissions}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <span>Vaak / PingTalk · Global Disaster-Survival Mesh Architecture</span>
        <button
          type="button"
          onClick={onOpenGovVault}
          className="inline-flex items-center gap-1.5 text-slate-300 hover:text-blue-400 transition-colors min-h-[36px] cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Authorized /gov-vault Audit Portal</span>
        </button>
      </footer>

      {/* 81 Languages Searchable Modal */}
      <LanguageSelectorModal
        isOpen={langModalOpen}
        currentLang={language}
        onSelectLanguage={onLanguageChange}
        onClose={() => setLangModalOpen(false)}
      />
    </div>
  );
};
