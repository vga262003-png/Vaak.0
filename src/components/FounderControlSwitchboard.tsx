import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Globe,
  Key,
  Layers,
  Lock,
  Phone,
  Radio,
  Server,
  Shield,
  ShieldCheck,
  Unlock,
  X,
  Zap,
} from 'lucide-react';
import { FounderFeatureFlags, FounderRootControlState } from '../types/app';
import { saveFounderFeatureFlags, verifyFounderAuthKeyServer } from '../utils/sixLayerSecurityVault';
import { audioEngine } from '../utils/audioEngine';
import { SonicShieldLogo } from './SonicShieldLogo';

interface FounderControlSwitchboardProps {
  isOpen: boolean;
  onClose: () => void;
  founderControl: FounderRootControlState;
  onUpdateFounderControl: (patch: Partial<FounderRootControlState>) => void;
  onOpenGovVault: () => void;
}

export const FounderControlSwitchboard: React.FC<FounderControlSwitchboardProps> = ({
  isOpen,
  onClose,
  founderControl,
  onUpdateFounderControl,
  onOpenGovVault,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerifyFounderKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim() || verifying) return;
    setVerifying(true);
    setErrorMsg(null);

    const result = await verifyFounderAuthKeyServer(inputKey.trim());
    setVerifying(false);

    if (result.authorized) {
      setIsAuthenticated(true);
      audioEngine.playRogerBeep();
      onUpdateFounderControl({
        founderAccountId: result.founderAccountId || 'FOUNDER-ROOT-001',
      });
    } else {
      setErrorMsg(result.error || 'Invalid Founder Authorization Key.');
      audioEngine.playSosPulse();
    }
  };

  const handleToggleFlag = (flag: keyof FounderFeatureFlags) => {
    const nextVal = !founderControl[flag];
    audioEngine.playSonarPing();
    const nextFlags: FounderFeatureFlags = {
      enableGlobalWorldMapAndHubs: founderControl.enableGlobalWorldMapAndHubs,
      enableExtendedHardwareLoRaMesh: founderControl.enableExtendedHardwareLoRaMesh,
      enableGovVaultAndWhiteLabel: founderControl.enableGovVaultAndWhiteLabel,
      isSubscriptionActive: founderControl.isSubscriptionActive,
      enablePhoneOtpAuth: founderControl.enablePhoneOtpAuth,
      [flag]: nextVal,
    };
    saveFounderFeatureFlags(nextFlags);
    if (inputKey.trim()) {
      void fetch('/api/founder/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderKey: inputKey.trim(), flags: nextFlags }),
      }).catch(() => {});
    }
    onUpdateFounderControl({
      [flag]: nextVal,
      adminAlerts: [
        {
          id: `adm-${Date.now()}`,
          message: `Founder Root switched [${flag}] = ${nextVal}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
        },
        ...founderControl.adminAlerts,
      ],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-[#0E131C] border border-amber-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-6 py-5 bg-[#161D2A] border-b border-amber-500/30 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-bold text-white">
                  Founder Master Control Switchboard
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/40">
                  ROOT SEAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                100% Sole Founder Root Ownership · {founderControl.founderEmail}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#232B3B] text-slate-400 hover:text-white cursor-pointer"
            aria-label="Close founder switchboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {!isAuthenticated ? (
            /* Locked Founder Gate */
            <form onSubmit={handleVerifyFounderKey} className="space-y-5 max-w-md mx-auto py-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  Founder Authorization Required
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter your master <strong className="text-amber-300">FOUNDER_AUTH_KEY</strong> to unlock the 4 dormant enterprise flags and root governance toggles.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Master FOUNDER_AUTH_KEY
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Enter FOUNDER_AUTH_KEY"
                    className="w-full min-h-[46px] pl-4 pr-11 rounded-xl bg-[#090D14] border border-white/10 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={verifying || !inputKey.trim()}
                className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/50"
              >
                {verifying ? (
                  <span>Verifying Server Signature...</span>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Unlock Master Switchboard</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Authenticated Switchboard View */
            <div className="space-y-6">
              {/* Founder Root Ownership Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 to-amber-900/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="text-sm font-bold text-white">
                      100% Sole Founder Root Ownership Sealed
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      Account: {founderControl.founderAccountId} · {founderControl.founderEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenGovVault();
                      onClose();
                    }}
                    className="min-h-[36px] px-3.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Open /gov-vault</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAuthenticated(false)}
                    className="min-h-[36px] px-3 rounded-xl bg-[#232B3B] hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    Lock Gate
                  </button>
                </div>
              </div>

              {/* 4 Dormant Enterprise Feature Flags */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-display text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>4 Enterprise Feature Flags (Zero Memory When OFF)</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Features default to dormant (false) so unneeded enterprise layers consume 0% memory and never cause lag.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Flag 1: Global World Map & Hubs */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      founderControl.enableGlobalWorldMapAndHubs
                        ? 'bg-sky-950/20 border-sky-500/40'
                        : 'bg-[#141A24] border-white/8'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                          <span className="text-xs font-bold text-white">Global World Map &amp; Hubs</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Worldwide satellite maps, regional hub discovery, and planetary mesh routing.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFlag('enableGlobalWorldMapAndHubs')}
                        className={`min-h-[32px] px-3 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                          founderControl.enableGlobalWorldMapAndHubs
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {founderControl.enableGlobalWorldMapAndHubs ? 'ENABLED' : 'DORMANT'}
                      </button>
                    </div>
                  </div>

                  {/* Flag 2: Extended Hardware LoRa Mesh */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      founderControl.enableExtendedHardwareLoRaMesh
                        ? 'bg-purple-950/20 border-purple-500/40'
                        : 'bg-[#141A24] border-white/8'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="text-xs font-bold text-white">Extended LoRa 100km+ Mesh</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Sub-GHz serial transceivers, UART hardware bridging, and 100km+ data mule links.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFlag('enableExtendedHardwareLoRaMesh')}
                        className={`min-h-[32px] px-3 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                          founderControl.enableExtendedHardwareLoRaMesh
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {founderControl.enableExtendedHardwareLoRaMesh ? 'ENABLED' : 'DORMANT'}
                      </button>
                    </div>
                  </div>

                  {/* Flag 3: Gov Vault & White Label Portal */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      founderControl.enableGovVaultAndWhiteLabel
                        ? 'bg-blue-950/20 border-blue-500/40'
                        : 'bg-[#141A24] border-white/8'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="text-xs font-bold text-white">Gov Vault &amp; Dual-Key Portal</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Dual-key forensic audit export for government oversight officers.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFlag('enableGovVaultAndWhiteLabel')}
                        className={`min-h-[32px] px-3 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                          founderControl.enableGovVaultAndWhiteLabel
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {founderControl.enableGovVaultAndWhiteLabel ? 'ENABLED' : 'DORMANT'}
                      </button>
                    </div>
                  </div>

                  {/* Flag 4: White-Label Partner Subscription Engine */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      founderControl.isSubscriptionActive
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-[#141A24] border-white/8'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-xs font-bold text-white">Partner Subscription Engine</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Commercial recurring billing &amp; white-label tier licensing.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFlag('isSubscriptionActive')}
                        className={`min-h-[32px] px-3 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                          founderControl.isSubscriptionActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {founderControl.isSubscriptionActive ? 'ACTIVE' : 'DORMANT'}
                      </button>
                    </div>
                  </div>

                  {/* Flag 5: Phone SMS OTP Auth (Optional Dormant until revenue) */}
                  <div
                    className={`sm:col-span-2 p-4 rounded-2xl border transition-all ${
                      founderControl.enablePhoneOtpAuth
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-[#141A24] border-amber-500/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-xs font-bold text-white">
                            Optional Phone Number SMS OTP Login (Pay-Per-SMS Control)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Keep DORMANT (₹0 SMS cost) while users verify free via Email &amp; ID/Password. Switch ON later when revenue funds SMS OTP.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFlag('enablePhoneOtpAuth')}
                        className={`min-h-[32px] px-3 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                          founderControl.enablePhoneOtpAuth
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-amber-300 hover:text-white'
                        }`}
                      >
                        {founderControl.enablePhoneOtpAuth ? 'ACTIVE' : 'PAUSED (₹0)'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Memory & Performance Meter */}
              <div className="p-4 rounded-2xl bg-[#090D14] border border-white/8 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span>Hardware Runtime Efficiency (Web Workers / Zero-Lag)</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">100% Zero-Lag</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 w-full" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Dormant modules are tree-shaken and lazily bypassed. Cryptographic operations run in non-blocking worker threads.
                </p>
              </div>

              {/* Founder Admin Alerts */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">
                  Recent Founder Root Audit Events ({founderControl.adminAlerts.length})
                </span>
                <div className="max-h-36 overflow-y-auto rounded-xl bg-[#090D14] border border-white/8 p-2 divide-y divide-white/6 text-xs">
                  {founderControl.adminAlerts.map((alert) => (
                    <div key={alert.id} className="py-2 px-1 flex items-center justify-between gap-2">
                      <span className="text-slate-300 truncate">{alert.message}</span>
                      <span className="font-mono text-[10px] text-slate-500 shrink-0">
                        {alert.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
