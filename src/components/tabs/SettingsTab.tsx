import React from 'react';
import {
  BatteryCharging,
  Check,
  CheckCircle2,
  Crown,
  Database,
  Download,
  ExternalLink,
  HardDriveDownload,
  Lock,
  Moon,
  Palette,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Trash2,
  Type,
  Volume2,
} from 'lucide-react';
import {
  AppLanguage,
  AppSettings,
  FirebaseSyncStatus,
  FontSizeOption,
  FontStyleOption,
  FounderRootControlState,
} from '../../types/app';
import { getTranslation } from '../../data/i18n';
import { ACCENT_PRESETS } from '../../data/themePresets';
import { PaninianKeyState, RamRelayPacket } from '../../utils/securityEngine';
import {
  QuarantinedPayload,
  RaspIntegrityReport,
  RaspPolicyConfig,
} from '../../utils/raspShield';
import { SecurityProtocolLab } from '../SecurityProtocolLab';

interface SettingsTabProps {
  language: AppLanguage;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  founderControl: FounderRootControlState;
  onUpdateFounderControl: (patch: Partial<FounderRootControlState>) => void;
  onOpenFounderSwitchboard?: () => void;
  paninianKey: PaninianKeyState;
  lamportClock: number;
  deviceId: string;
  x25519PublicKey: string;
  ramRelayCache: RamRelayPacket[];
  raspReport: RaspIntegrityReport;
  raspPolicy: RaspPolicyConfig;
  quarantinedItems: QuarantinedPayload[];
  keysLocked: boolean;
  syncingRaspPolicy: boolean;
  onSyncRaspPolicyAndScan: () => void;
  onSimulateRaspThreat: (kind: 'overlay_spyware' | 'app_tamper') => void;
  onRestoreRaspIntegrity: () => void;
  onIncomingMeshPacketTest: (rawPayload: string) => void;
  onPurgeRamCache: () => void;
  onRotatePaninianEpoch: () => void;
  onLogBloomSimulation: (summary: string) => void;
  onOpenGovVault: () => void;
  onSignOut: () => void;
  firebaseSyncStatus: FirebaseSyncStatus;
  onVerifyFirebaseConnection: () => void;
  downloadingTiles: boolean;
  tileDownloadProgress: number;
  onDownloadOsmTiles: () => Promise<void>;
  onClearOsmTiles: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  language,
  settings,
  onUpdateSettings,
  founderControl,
  onUpdateFounderControl,
  onOpenFounderSwitchboard,
  paninianKey,
  lamportClock,
  deviceId,
  x25519PublicKey,
  ramRelayCache,
  raspReport,
  raspPolicy,
  quarantinedItems,
  keysLocked,
  syncingRaspPolicy,
  onSyncRaspPolicyAndScan,
  onSimulateRaspThreat,
  onRestoreRaspIntegrity,
  onIncomingMeshPacketTest,
  onPurgeRamCache,
  onRotatePaninianEpoch,
  onLogBloomSimulation,
  onOpenGovVault,
  onSignOut,
  firebaseSyncStatus,
  onVerifyFirebaseConnection,
  downloadingTiles,
  tileDownloadProgress,
  onDownloadOsmTiles,
  onClearOsmTiles,
}) => {
  const t = getTranslation(language);

  const fontStyles: { id: FontStyleOption; label: string; sample: string }[] = [
    { id: 'sans', label: 'Modern Sans', sample: 'Plus Jakarta / DM Sans' },
    { id: 'serif', label: 'Editorial Serif', sample: 'Lora High-Contrast' },
    { id: 'mono', label: 'Tactical Mono', sample: 'JetBrains Mono' },
  ];

  const fontSizes: { id: FontSizeOption; label: string }[] = [
    { id: 'compact', label: 'Compact (14px)' },
    { id: 'standard', label: 'Standard (16px)' },
    { id: 'large', label: 'Large (18px)' },
    { id: 'xlarge', label: 'Extra Large (20px)' },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden box-border space-y-6">
      {/* Security Shield & Antivirus Status Card (RASP) */}
      <section className="vaak-surface rounded-2xl p-5 sm:p-6 space-y-5 border border-blue-500/35">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
              {raspReport.healthy ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              )}
              <span>Security Shield &amp; Antivirus Status (RASP)</span>
            </h2>
            <p className="text-xs text-slate-400">
              In-built runtime anti-tamper, overlay spyware scanner, and auto-updating malware sanitizer
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={syncingRaspPolicy}
              onClick={onSyncRaspPolicyAndScan}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingRaspPolicy ? 'animate-spin' : ''}`} />
              <span>{syncingRaspPolicy ? 'Syncing...' : 'Sync Policy & Scan Now'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400">Protection Health</span>
            <p
              className={`text-sm font-bold flex items-center gap-1.5 ${
                raspReport.healthy ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {raspReport.healthy ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Protected ({raspReport.checksPassed}/{raspReport.totalChecks} OK)</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Threat Locked</span>
                </>
              )}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400">Threat Signature Pack</span>
            <p className="font-mono-tabular text-xs font-bold text-blue-300">
              {raspPolicy.signatureVersion}
            </p>
            <p className="text-[11px] text-slate-400">
              {raspPolicy.rulesCount} active rules · Auto-syncs online
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400">Last Integrity Scan</span>
            <p className="font-mono-tabular text-sm font-bold text-white">
              {raspReport.scannedAt}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              Policy Synced: {raspPolicy.lastSyncedAt}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400">Malware Quarantined</span>
            <p className="font-mono-tabular text-sm font-bold text-amber-300">
              {quarantinedItems.length} Payloads Blocked
            </p>
            <p className="text-[11px] text-slate-400">
              Keys Status: {keysLocked ? 'LOCKED' : 'ACTIVE'}
            </p>
          </div>
        </div>

        {/* RASP Verification & Simulation Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSimulateRaspThreat('overlay_spyware')}
            className="min-h-[38px] px-3 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-xs font-semibold text-rose-200 cursor-pointer"
          >
            Test Screen-Overlay Spyware Lock
          </button>
          <button
            type="button"
            onClick={() => onSimulateRaspThreat('app_tamper')}
            className="min-h-[38px] px-3 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-xs font-semibold text-amber-200 cursor-pointer"
          >
            Test Anti-Tamper Clone Lock
          </button>
          {!raspReport.healthy && (
            <button
              type="button"
              onClick={onRestoreRaspIntegrity}
              className="min-h-[38px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
            >
              Quarantine Threat &amp; Unlock Keys
            </button>
          )}
        </div>

        {quarantinedItems.length > 0 && (
          <div className="rounded-xl bg-[#0B1120] border border-slate-800 divide-y divide-slate-800/80 max-h-36 overflow-y-auto">
            {quarantinedItems.map((q) => (
              <div key={q.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-amber-300">
                    [{q.source}] {q.reason}
                  </p>
                  <p className="font-mono-tabular text-[11px] text-slate-400 truncate">
                    Neutralized: {q.neutralizedPreview}
                  </p>
                </div>
                <span className="font-mono-tabular text-[11px] text-slate-500 shrink-0">
                  {q.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sole Founder Ownership & Master Root Control */}
      <section className="vaak-surface rounded-2xl p-4 sm:p-6 space-y-5 border border-amber-500/30 min-w-0 w-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-300 shrink-0" />
              <span className="break-words">Founder Master Root Account · Sole System Ownership</span>
            </h2>
            <p className="text-xs text-slate-400 break-words">
              100% ownership locked under <span className="font-mono-tabular text-amber-200">{founderControl.founderAccountId}</span> ({founderControl.founderEmail})
            </p>
          </div>
          <span className="font-mono-tabular text-xs font-semibold text-emerald-400 shrink-0">
            SOLE ROOT OWNER
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-2.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-white">White-Label / Subscription Engine</p>
              <span className="font-mono-tabular text-[11px] text-amber-300 shrink-0">
                {founderControl.isSubscriptionActive ? 'ACTIVE' : 'DORMANT'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed break-words">
              <code className="text-blue-300">isSubscriptionActive = {String(founderControl.isSubscriptionActive)}</code> · Sealed behind server-verified Founder Root authentication.
            </p>
            <button
              type="button"
              onClick={() => onOpenFounderSwitchboard?.()}
              className="w-full min-h-[38px] px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-semibold text-amber-300 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Open Founder Switchboard (Key Required)</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-2.5">
            <p className="text-xs font-semibold text-white">System-Wide Safety Rules</p>
            <label className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer">
              <span>Strict Threat Device Suspension</span>
              <input
                type="checkbox"
                checked={founderControl.enforceStrictThreatSuspension}
                onChange={(e) =>
                  onUpdateFounderControl({ enforceStrictThreatSuspension: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-600"
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer">
              <span>Zero-Trace RAM Relay Cache</span>
              <input
                type="checkbox"
                checked={founderControl.enforceZeroTraceRamCache}
                onChange={(e) =>
                  onUpdateFounderControl({ enforceZeroTraceRamCache: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-600"
              />
            </label>
            <p className="font-mono-tabular text-[11px] text-blue-300">
              Vault Keys: Server Edge Sealed
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-2">
            <p className="text-xs font-semibold text-white flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
              <span>Founder Admin Alerts ({founderControl.adminAlerts.length})</span>
            </p>
            <div className="max-h-24 overflow-y-auto space-y-1.5 text-[11px]">
              {founderControl.adminAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2 rounded-lg border ${
                    alert.level === 'critical'
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-mono-tabular text-[10px] text-slate-400 block">
                    {alert.timestamp}
                  </span>
                  {alert.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Display, Typography & AMOLED Battery Saver */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-6 min-w-0 w-full overflow-hidden vaak-surface rounded-2xl p-4 sm:p-6 space-y-5">
          <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
            <Type className="w-5 h-5 text-blue-400 shrink-0" />
            <span>{t.fontStyle} &amp; {t.fontSize}</span>
          </h2>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-300">{t.fontStyle}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {fontStyles.map((fs) => (
                <button
                  key={fs.id}
                  type="button"
                  onClick={() => onUpdateSettings({ fontStyle: fs.id })}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer min-w-0 ${
                    settings.fontStyle === fs.id
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <p className="text-sm font-semibold truncate">{fs.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{fs.sample}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-300">{t.fontSize}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {fontSizes.map((sz) => (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => onUpdateSettings({ fontSize: sz.id })}
                  className={`min-h-[44px] px-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer min-w-0 truncate ${
                    settings.fontSize === sz.id
                      ? 'bg-[#2563EB] border-blue-500 text-white'
                      : 'bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Power & Audio Controls */}
        <section className="lg:col-span-6 min-w-0 w-full overflow-hidden vaak-surface rounded-2xl p-4 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
            <BatteryCharging className="w-5 h-5 text-blue-400 shrink-0" />
            <span>Power, Audio &amp; Dual-Key Audit Controls</span>
          </h2>

          {/* Theme & Color Mode Switcher (Pure White Daylight / Midnight Graphite + 5 Accent Colors) */}
          <div className="p-4 rounded-xl bg-[#121418] border border-white/8 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Palette className="w-5 h-5 text-[#0EA5E9] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Theme &amp; Color Mode</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose Pure White Daylight or Midnight Graphite Dark plus your primary accent color.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ daylightMode: true, amoledMode: false })}
                className={`min-h-[42px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  settings.daylightMode
                    ? 'bg-[#0EA5E9] border-[#0EA5E9] text-white'
                    : 'bg-[#1B1E24] border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4 shrink-0" />
                <span>Pure White Daylight</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ daylightMode: false })}
                className={`min-h-[42px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  !settings.daylightMode
                    ? 'bg-[#0EA5E9] border-[#0EA5E9] text-white'
                    : 'bg-[#1B1E24] border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4 shrink-0" />
                <span>Midnight Graphite</span>
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-400 block">
                Primary Accent Color
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {ACCENT_PRESETS.map((preset) => {
                  const selected = settings.accentColor === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onUpdateSettings({ accentColor: preset.id })}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 text-[11px] font-medium transition-all cursor-pointer min-w-0 ${
                        selected
                          ? 'bg-[#1B1E24] border-[#0EA5E9] text-white'
                          : 'bg-[#1B1E24]/70 border-white/8 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full ${preset.swatchClass} flex items-center justify-center text-white shadow-sm shrink-0`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <span className="truncate w-full text-center">{preset.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121418] border border-white/8 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Moon className="w-5 h-5 text-[#0EA5E9] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{t.amoledMode}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Switches background canvas from #121418 Graphite to pure #000000 pitch black to extend OLED battery life.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.amoledMode}
              onClick={() =>
                onUpdateSettings({
                  amoledMode: !settings.amoledMode,
                  daylightMode: !settings.amoledMode ? false : settings.daylightMode,
                })
              }
              className={`w-13 h-7 rounded-full transition-colors p-1 shrink-0 cursor-pointer ${
                settings.amoledMode ? 'bg-[#0EA5E9]' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.amoledMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#121418] border border-white/8 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Volume2 className="w-5 h-5 text-[#0EA5E9] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Walkie Roger Beep &amp; Sonar Audio</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Web Audio synthesized PTT chirp, family sonar chime, and 5-minute cutoff alert.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.soundEffects}
              onClick={() => onUpdateSettings({ soundEffects: !settings.soundEffects })}
              className={`w-13 h-7 rounded-full transition-colors p-1 shrink-0 cursor-pointer ${
                settings.soundEffects ? 'bg-[#0EA5E9]' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.soundEffects ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Local Tile Cache Toggle (Low-Res Offline OSM Map Tiles for Radar) */}
          <div className="p-4 rounded-xl bg-[#121418] border border-[#0EA5E9]/30 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <HardDriveDownload className="w-5 h-5 text-[#0EA5E9] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Local Tile Cache (Offline OSM Maps)</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Downloads low-resolution OpenStreetMap tiles (Zoom 11–13) so the 20km Radar stays navigable with zero internet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Local Tile Cache"
                aria-checked={settings.localTileCacheEnabled}
                onClick={async () => {
                  const nextVal = !settings.localTileCacheEnabled;
                  if (nextVal && settings.cachedTileCount === 0) {
                    await onDownloadOsmTiles();
                  } else {
                    onUpdateSettings({ localTileCacheEnabled: nextVal });
                  }
                }}
                className={`w-13 h-7 rounded-full transition-colors p-1 shrink-0 cursor-pointer ${
                  settings.localTileCacheEnabled ? 'bg-[#0EA5E9]' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.localTileCacheEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-mono-tabular text-emerald-400 break-words">
                {settings.cachedTileCount > 0
                  ? `${settings.cachedTileCount} Tiles Cached (Z11–Z13 · ~28 KB)${settings.lastTileCacheAt ? ` · ${settings.lastTileCacheAt}` : ''}`
                  : 'No offline OSM tiles downloaded yet'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={downloadingTiles}
                  onClick={() => void onDownloadOsmTiles()}
                  className="min-h-[34px] px-3 rounded-lg bg-[#0EA5E9] hover:bg-sky-400 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className={`w-3.5 h-3.5 ${downloadingTiles ? 'animate-bounce' : ''}`} />
                  <span>
                    {downloadingTiles
                      ? `Downloading ${tileDownloadProgress}%`
                      : settings.cachedTileCount > 0
                      ? 'Refresh OSM Tiles'
                      : 'Download Low-Res OSM Tiles'}
                  </span>
                </button>
                {settings.cachedTileCount > 0 && (
                  <button
                    type="button"
                    onClick={onClearOsmTiles}
                    className="min-h-[34px] px-2.5 rounded-lg bg-[#232730] hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                    aria-label="Clear cached OSM tiles"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {downloadingTiles && (
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#0EA5E9] transition-all duration-150"
                  style={{ width: `${tileDownloadProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Live Firebase Auth & Cloud Firestore Sync Status Card */}
          <div className="p-4 rounded-xl bg-[#121418] border border-[#0EA5E9]/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Database className="w-5 h-5 text-[#0EA5E9] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  Firebase Cloud Firestore · {firebaseSyncStatus.projectId}
                </p>
                <p
                  className={`text-[11px] font-mono-tabular mt-0.5 ${
                    firebaseSyncStatus.mode === 'connected'
                      ? 'text-emerald-400'
                      : firebaseSyncStatus.mode === 'checking'
                      ? 'text-sky-400'
                      : 'text-rose-400'
                  }`}
                >
                  {firebaseSyncStatus.mode.toUpperCase()} · Verified: {firebaseSyncStatus.lastCheckedAt}
                </p>
                {firebaseSyncStatus.error && (
                  <p className="text-[11px] text-rose-300 mt-1 break-words">
                    {firebaseSyncStatus.error}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onVerifyFirebaseConnection}
              className="min-h-[36px] px-3 rounded-lg bg-[#232730] hover:bg-slate-700 text-xs font-semibold text-[#0EA5E9] cursor-pointer shrink-0"
            >
              Verify Connection
            </button>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenGovVault}
              className="w-full sm:flex-1 min-h-[46px] px-4 rounded-xl bg-[#0B1120] hover:bg-slate-900 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span className="truncate">Open Server-Verified /gov-vault</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="w-full sm:w-auto min-h-[46px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer shrink-0"
            >
              Switch / Sign Out
            </button>
          </div>
        </section>
      </div>

      {/* 5-Layer Security Seal & Protocol Lab */}
      <SecurityProtocolLab
        paninianKey={paninianKey}
        lamportClock={lamportClock}
        deviceId={deviceId}
        x25519PublicKey={x25519PublicKey}
        keysLocked={keysLocked}
        ramRelayCache={ramRelayCache}
        onPurgeRamCache={onPurgeRamCache}
        onRotatePaninianEpoch={onRotatePaninianEpoch}
        onLogBloomSimulation={onLogBloomSimulation}
        onIncomingMeshPacketTest={onIncomingMeshPacketTest}
      />

      {/* Legal & Support: Privacy Policy, Terms & Conditions, and Contact Us */}
      <section className="vaak-surface rounded-2xl p-5 sm:p-6 space-y-4 border border-slate-800">
        <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Legal, Privacy &amp; Support</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-[#121418] border border-white/8 space-y-2">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <span>🔒 Privacy Policy</span>
            </h3>
            <p className="leading-relaxed text-slate-400">
              Vaak operates on zero-knowledge end-to-end encryption. Your private keys, Paninian KDF epochs, and voice packets are stored exclusively on your device hardware. We never sell or log personal telemetry.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121418] border border-white/8 space-y-2">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <span>📜 Terms &amp; Conditions</span>
            </h3>
            <p className="leading-relaxed text-slate-400">
              Designed for emergency disaster response and resilient family coordination. Users agree to adhere to local frequency regulations and maintain respectful mesh transmissions during crisis scenarios.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121418] border border-white/8 space-y-2">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <span>📬 Contact Us &amp; Support</span>
            </h3>
            <p className="leading-relaxed text-slate-400">
              Need assistance with mesh relay setup or hardware nodes? Reach our disaster-response engineering desk at <span className="font-mono text-[#0EA5E9]">support@vaak.mesh</span> or via global relay channel #99.
            </p>
          </div>
        </div>
      </section>

      {/* Non-Intrusive Ad Slot at the Very Bottom */}
      <aside
        aria-label="Sponsored Emergency Preparedness Partner"
        className="rounded-2xl bg-[#0B1120]/80 border border-slate-800/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-slate-400">{t.sponsoredLabel}</p>
          <p className="text-sm font-semibold text-slate-100">
            SunCell 20W Foldable Solar Powerbank &amp; Dynamo NOAA Radio Kit
          </p>
          <p className="text-xs text-slate-400">
            IP67 waterproof · Keeps your Vaak 20km mesh node running 14 days off-grid.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 px-3 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20">
            <Shield className="w-3.5 h-3.5" />
            <span>Certified Kit</span>
            <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </aside>
    </div>
  );
};
