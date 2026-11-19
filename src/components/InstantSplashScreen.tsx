import React, { useEffect, useState } from 'react';
import { SonicShieldLogo } from './SonicShieldLogo';

interface InstantSplashScreenProps {
  onFinish: () => void;
}

export const InstantSplashScreen: React.FC<InstantSplashScreenProps> = ({ onFinish }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // 600ms (0.6s) instant splash duration
    const timer = window.setTimeout(() => {
      setFading(true);
      const closeTimer = window.setTimeout(() => {
        onFinish();
      }, 150);
      return () => clearTimeout(closeTimer);
    }, 600);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      onClick={() => onFinish()}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#121418] text-white select-none transition-opacity duration-150 cursor-pointer ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Concentric radar pulse wave animations */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-48 h-48 rounded-full border border-sky-500/20 animate-ping opacity-75" />
        <div className="absolute w-36 h-36 rounded-full border border-sky-400/30 animate-pulse" />
        <div className="relative z-10 animate-splash-pulse">
          <SonicShieldLogo size={76} />
        </div>
      </div>

      <div className="mt-8 text-center space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">
          Vaak / PingTalk
        </h1>
        <div className="flex items-center justify-center gap-1.5 text-xs font-mono-tabular text-sky-400">
          <span>Initializing Secure Mesh</span>
          <span className="inline-flex gap-0.5">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
          </span>
        </div>
      </div>

      <div className="absolute bottom-8 text-[11px] font-mono-tabular text-slate-500">
        X25519 · Paninian KDF · 81-Language Mesh
      </div>
    </div>
  );
};
