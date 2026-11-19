import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Install Vaak / PingTalk App"
        className={
          compact
            ? 'min-h-[36px] px-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/45 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0'
            : 'w-full min-h-[38px] rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/45 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer'
        }
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{compact ? 'Install' : 'Install Vaak App (PWA)'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Install Vaak on iOS"
          className={
            compact
              ? 'min-h-[36px] px-2.5 rounded-xl bg-[#1B1E24] hover:bg-[#232730] border border-white/10 text-sky-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0'
              : 'w-full min-h-[38px] rounded-xl bg-[#121418] hover:bg-[#1B1E24] border border-white/10 text-xs font-semibold text-sky-300 flex items-center justify-center gap-1.5 cursor-pointer'
          }
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>{compact ? 'iOS App' : 'Install on iPhone / iPad'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#121418] border border-white/15 p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-white">
                  Install Vaak on iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close iOS install instructions"
                  className="p-1.5 rounded-lg bg-[#232730] text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                1. Tap the <strong className="text-white">Share</strong> button in the Safari toolbar.
                <br />
                2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[40px] rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-semibold cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
