import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  Battery,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  Database,
  HardDriveDownload,
  Lock,
  MessageSquare,
  Navigation,
  PhoneCall,
  Plus,
  QrCode,
  Radio,
  Send,
  ShieldCheck,
  Unlock,
  Watch,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  AppLanguage,
  CountryOption,
  FamilyMember,
  RadarNode,
  RadioTrackingFootprint,
  RadioTrackingTag,
  TransportMode,
} from '../../types/app';
import { ChatContactUser } from '../WhatsAppChatView';
import { TRANSLATIONS } from '../../data/i18n';
import { audioEngine } from '../../utils/audioEngine';
import { loadOfflineTileCacheMeta } from '../../utils/offlineTileCache';
import { QrMatrixSvg } from '../QrMatrixSvg';

interface RadarFamilyTabProps {
  language: AppLanguage;
  mode: TransportMode;
  country: CountryOption;
  family: FamilyMember[];
  radarNodes: RadarNode[];
  onPingFamily: (memberId: string) => void;
  onTriggerSos: () => void;
  onCancelSos: () => void;
  sosActive: boolean;
  onSendPriorityMeshBlast: (urgentMessage: string) => void;
  localTileCacheEnabled: boolean;
  cachedTileCount: number;
  onOpenTileSettings?: () => void;
  trackingTags: RadioTrackingTag[];
  trackingFootprints: RadioTrackingFootprint[];
  onAddTrackingTag: (payload: {
    name: string;
    targetType: RadioTrackingTag['targetType'];
    dutyCycleSec: 30 | 60 | 300;
  }) => void;
  onToggleTrackingTag: (tagId: string) => void;
  onPulseTrackingTag: (tagId: string) => void;
  onOpenChat?: (contact: ChatContactUser) => void;
  onRequestPriorityBlast?: (payload: { title: string; message: string; subLabel?: string }) => void;
}

const ZOOM_LEVELS = [2, 5, 10, 20];

function bearingToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round((deg % 360) / 45) % 8;
  return dirs[idx];
}

export const RadarFamilyTab: React.FC<RadarFamilyTabProps> = ({
  language,
  mode,
  country,
  family,
  radarNodes,
  onPingFamily,
  onTriggerSos,
  onCancelSos,
  sosActive,
  onSendPriorityMeshBlast,
  localTileCacheEnabled,
  cachedTileCount,
  onOpenTileSettings,
  trackingTags,
  trackingFootprints,
  onAddTrackingTag,
  onToggleTrackingTag,
  onPulseTrackingTag,
  onOpenChat,
  onRequestPriorityBlast,
}) => {
  const t = TRANSLATIONS[language];
  const [subTab, setSubTab] = useState<'radar_map' | 'radio_tracking'>('radar_map');
  const [zoomKm, setZoomKm] = useState<number>(20);
  const [headingDeg, setHeadingDeg] = useState<number>(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string>(family[0]?.id ?? '');
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [compassOpen, setCompassOpen] = useState<boolean>(false);
  const [liveCompassEnabled, setLiveCompassEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedTargetId) {
      if (family.length > 0) {
        setSelectedTargetId(family[0].id);
      } else if (radarNodes.length > 0) {
        setSelectedTargetId(radarNodes[0].id);
      }
    }
  }, [family, radarNodes, selectedTargetId]);

  useEffect(() => {
    if (!liveCompassEnabled || typeof window === 'undefined') return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === 'number' && !Number.isNaN(webkitHeading)) {
        setHeadingDeg(Math.round(webkitHeading));
      } else if (typeof e.alpha === 'number' && !Number.isNaN(e.alpha)) {
        setHeadingDeg(Math.round(360 - e.alpha) % 360);
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [liveCompassEnabled]);

  // Radio Tracking Host Tag state
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState<RadioTrackingTag['targetType']>('Child');
  const [newDutyCycle, setNewDutyCycle] = useState<30 | 60 | 300>(60);
  const [expandedQrTagId, setExpandedQrTagId] = useState<string | null>(trackingTags[0]?.id ?? null);
  const [copiedBeaconId, setCopiedBeaconId] = useState<string | null>(null);

  // Lane 1: Anti-Accidental Safety Guard (Flip-to-Unlock Cover + 3-Second Hold or Slide)
  const [coverOpen, setCoverOpen] = useState<boolean>(false);
  const [holdElapsedMs, setHoldElapsedMs] = useState<number>(0);
  const [sosSlideVal, setSosSlideVal] = useState<number>(0);
  const holdIntervalRef = useRef<number | null>(null);
  const autoRelatchRef = useRef<number | null>(null);

  // Lane 2: 60-Second Family Priority Mesh Blast (50-Hop Jumping Jack, Zero-SIM/Internet)
  const [priorityDraft, setPriorityDraft] = useState('Urgent: Crowd / medical priority — regroup at safe pin.');
  const [priorityBlastSec, setPriorityBlastSec] = useState<number>(0);

  const cachedOsmMeta = useMemo(
    () => (localTileCacheEnabled ? loadOfflineTileCacheMeta() : null),
    [localTileCacheEnabled, cachedTileCount]
  );

  const selectedFamily = family.find((f) => f.id === selectedTargetId);
  const selectedNode = radarNodes.find((n) => n.id === selectedTargetId);
  const selectedTag = trackingTags.find((tag) => tag.id === selectedTargetId);

  const activeTarget = useMemo(() => {
    if (selectedFamily) {
      return {
        id: selectedFamily.id,
        label: selectedFamily.name,
        subtitle: `${selectedFamily.status} · ${selectedFamily.lastPingAgo}`,
        distanceKm: selectedFamily.distanceKm,
        bearingDeg: selectedFamily.bearingDeg,
      };
    }
    if (selectedNode) {
      return {
        id: selectedNode.id,
        label: selectedNode.label,
        subtitle: `${selectedNode.kind.toUpperCase()} · Signal ${selectedNode.signalStrength}%`,
        distanceKm: selectedNode.distanceKm,
        bearingDeg: selectedNode.bearingDeg,
      };
    }
    if (selectedTag) {
      return {
        id: selectedTag.id,
        label: selectedTag.name,
        subtitle: `${selectedTag.targetType} Beacon · Duty ${selectedTag.dutyCycleSec}s`,
        distanceKm: selectedTag.distanceKm,
        bearingDeg: selectedTag.bearingDeg,
      };
    }
    return null;
  }, [selectedFamily, selectedNode, selectedTag]);

  // Auto-relatch safety cover after 15s if untouched
  useEffect(() => {
    if (coverOpen && !sosActive) {
      autoRelatchRef.current = window.setTimeout(() => {
        setCoverOpen(false);
        setHoldElapsedMs(0);
        setSosSlideVal(0);
      }, 15000);
    }
    return () => {
      if (autoRelatchRef.current) clearTimeout(autoRelatchRef.current);
    };
  }, [coverOpen, sosActive]);

  // 60-Second Family Priority Mesh countdown
  useEffect(() => {
    if (priorityBlastSec <= 0) return;
    const id = window.setInterval(() => {
      setPriorityBlastSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [priorityBlastSec]);

  const handleFamilyPing = (member: FamilyMember) => {
    audioEngine.playSonarPing();
    setSelectedTargetId(member.id);
    setPingingId(member.id);
    onPingFamily(member.id);
    setTimeout(() => setPingingId(null), 900);
  };

  const startThreeSecondHold = () => {
    if (!coverOpen || sosActive) return;
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    const start = Date.now();
    holdIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= 3000) {
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
        setHoldElapsedMs(3000);
        audioEngine.playSosPulse();
        onTriggerSos();
      } else {
        setHoldElapsedMs(elapsed);
      }
    }, 50);
  };

  const cancelThreeSecondHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (!sosActive) {
      setHoldElapsedMs(0);
    }
  };

  const handleSosSliderChange = (val: number) => {
    if (!coverOpen) return;
    setSosSlideVal(val);
    if (val >= 95 && !sosActive) {
      audioEngine.playSosPulse();
      onTriggerSos();
      setSosSlideVal(100);
    }
  };

  const handleSosSliderRelease = () => {
    if (!sosActive && sosSlideVal < 95) {
      setSosSlideVal(0);
    }
  };

  const handleTriggerFamilyPriorityBlast = () => {
    audioEngine.playSonarPing();
    const blastMsg = priorityDraft.trim() || 'Urgent: Crowd / medical priority — regroup at safe pin.';
    if (onRequestPriorityBlast) {
      onRequestPriorityBlast({
        title: '60-Second Priority Mesh Blast',
        message: blastMsg,
        subLabel: '50-Hop Jumping Jack',
      });
    } else {
      setPriorityBlastSec(60);
      onSendPriorityMeshBlast(blastMsg);
    }
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    onAddTrackingTag({
      name: newTagName.trim(),
      targetType: newTagType,
      dutyCycleSec: newDutyCycle,
    });
    setNewTagName('');
  };

  const handleCopyBeaconLink = (tag: RadioTrackingTag) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/?beacon=${encodeURIComponent(tag.beaconCode)}&duty=${tag.dutyCycleSec}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedBeaconId(tag.id);
    setTimeout(() => setCopiedBeaconId(null), 2000);
  };

  const zoomIndex = ZOOM_LEVELS.indexOf(zoomKm);
  const holdProgressPct = Math.min(100, Math.round((holdElapsedMs / 3000) * 100));

  return (
    <div className="w-full max-w-full overflow-x-hidden box-border space-y-5">
      {/* Radar Module Sub-Navigation */}
      <div className="w-full grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#1B1E24] border border-white/10">
        <button
          type="button"
          onClick={() => setSubTab('radar_map')}
          className={`min-h-[42px] px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            subTab === 'radar_map'
              ? 'bg-[#0EA5E9] text-white'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Compass className="w-4 h-4 shrink-0" />
          <span className="truncate">20km Mesh Radar</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('radio_tracking')}
          className={`min-h-[42px] px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            subTab === 'radio_tracking'
              ? 'bg-[#0EA5E9] text-white'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Watch className="w-4 h-4 shrink-0" />
          <span className="truncate">Radio Tracking (Host Tag)</span>
        </button>
      </div>

      {subTab === 'radio_tracking' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full max-w-full min-w-0">
          {/* Left: Host Phone Beacon Generator */}
          <section className="lg:col-span-5 min-w-0 overflow-hidden vaak-surface rounded-2xl p-4 sm:p-5 space-y-4 w-full max-w-full box-border">
            <div className="space-y-1">
              <h2 className="font-display text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <Watch className="w-5 h-5 text-[#0EA5E9] shrink-0" />
                <span>Radio Tracking (Mobile-Hosted Tag)</span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Turn your phone into the primary host. Generate a unique beacon link or QR to leave running on a smartwatch, car screen, or spare phone for children, pets, or luggage — ultra-low-power duty-cycled radio/GPS pulses, zero subscription.
              </p>
            </div>

            <form onSubmit={handleCreateTag} className="space-y-3 p-3.5 rounded-xl bg-[#121418] border border-white/10">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Tracker Label</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g. Watch, Pet Collar, Car Screen"
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#1B1E24] border border-white/10 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Tracked Asset</label>
                  <select
                    value={newTagType}
                    onChange={(e) => setNewTagType(e.target.value as RadioTrackingTag['targetType'])}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-[#1B1E24] border border-white/10 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                  >
                    <option value="Child">Child</option>
                    <option value="Pet">Pet</option>
                    <option value="Luggage">Luggage</option>
                    <option value="Car Screen">Car Screen</option>
                    <option value="Smartwatch">Smartwatch</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Duty Cycle (Battery)</label>
                  <select
                    value={newDutyCycle}
                    onChange={(e) => setNewDutyCycle(Number(e.target.value) as 30 | 60 | 300)}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-[#1B1E24] border border-white/10 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                  >
                    <option value={30}>30s Active (High)</option>
                    <option value={60}>60s Balanced (Std)</option>
                    <option value={300}>300s Ultra-Low Power</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[42px] rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Tracking Beacon Code &amp; Link</span>
              </button>
            </form>

            {/* Encrypted Digital Footprints Log */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Firestore Encrypted Footprints</span>
                </span>
                <span className="font-mono-tabular text-[11px] text-slate-400">
                  {trackingFootprints.length} Logged
                </span>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-white/8 rounded-xl bg-[#121418] border border-white/10">
                {trackingFootprints.length === 0 ? (
                  <p className="p-3 text-xs text-slate-400">
                    Tap &ldquo;Pulse Now&rdquo; on any hosted tag to log a duty-cycled encrypted digital footprint.
                  </p>
                ) : (
                  trackingFootprints.map((fp) => (
                    <div key={fp.id} className="p-2.5 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-tabular font-semibold text-[#0EA5E9] truncate">
                          {fp.beaconCode}
                        </span>
                        <span className="font-mono-tabular text-slate-400 shrink-0">
                          {fp.distanceKm} km · {fp.timestamp}
                        </span>
                      </div>
                      <p className="font-mono-tabular text-[10px] text-emerald-400 truncate">
                        Hash: {fp.encryptedCoordHash} · Duty {fp.dutyCycleSec}s
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Right: Active Hosted Tracking Beacons */}
          <section className="lg:col-span-7 min-w-0 overflow-hidden space-y-4 w-full max-w-full box-border">
            {trackingTags.length === 0 ? (
              <div className="vaak-surface rounded-2xl p-6 text-center space-y-2 border border-white/10">
                <p className="text-sm font-semibold text-white">No Radio Tracking Beacons Created</p>
                <p className="text-xs text-slate-400">
                  Use the generator on the left to create a real tracking beacon stored in Firestore.
                </p>
              </div>
            ) : trackingTags.map((tag) => {
              const origin = typeof window !== 'undefined' ? window.location.origin : '';
              const beaconUrl = `${origin}/?beacon=${encodeURIComponent(tag.beaconCode)}&duty=${tag.dutyCycleSec}`;
              const qrExpanded = expandedQrTagId === tag.id;
              return (
                <div
                  key={tag.id}
                  className={`vaak-surface rounded-2xl p-4 space-y-3 border ${
                    tag.active ? 'border-[#0EA5E9]/40' : 'border-white/10 opacity-75'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{tag.name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#0EA5E9]/15 text-[#0EA5E9] font-mono-tabular text-[10px] font-semibold">
                          {tag.targetType}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono-tabular text-[10px] font-semibold ${
                            tag.active
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-slate-700/60 text-slate-400'
                          }`}
                        >
                          {tag.active ? `Duty ${tag.dutyCycleSec}s` : 'Paused'}
                        </span>
                      </div>
                      <p className="font-mono-tabular text-[11px] text-slate-400 mt-1 break-all">
                        {tag.beaconCode} · {tag.distanceKm} km ({bearingToCardinal(tag.bearingDeg)} {tag.bearingDeg}°) · Last Pulse {tag.lastPulseAt}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-mono-tabular text-emerald-400 shrink-0">
                      <Battery className="w-3.5 h-3.5" />
                      {tag.batteryEstPct}%
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPulseTrackingTag(tag.id)}
                      className="min-h-[36px] px-3 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Pulse Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyBeaconLink(tag)}
                      className="min-h-[36px] px-3 rounded-xl bg-[#121418] hover:bg-[#232730] border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedBeaconId === tag.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Link Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#0EA5E9]" />
                          <span>Copy Host Link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedQrTagId(qrExpanded ? null : tag.id)}
                      className="min-h-[36px] px-3 rounded-xl bg-[#121418] hover:bg-[#232730] border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#0EA5E9]" />
                      <span>{qrExpanded ? 'Hide Beacon QR' : 'Watch / Car QR'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleTrackingTag(tag.id)}
                      className="min-h-[36px] px-3 rounded-xl bg-[#121418] hover:bg-[#232730] border border-white/10 text-xs font-medium text-slate-300 cursor-pointer"
                    >
                      {tag.active ? 'Pause Duty' : 'Resume'}
                    </button>
                  </div>

                  {qrExpanded && (
                    <div className="p-3.5 rounded-xl bg-[#121418] border border-white/10 flex flex-col sm:flex-row items-center gap-4">
                      <div className="p-1.5 rounded-xl bg-white shrink-0">
                        <QrMatrixSvg value={beaconUrl} size={112} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
                        <p className="text-xs font-semibold text-white">
                          Open on Smartwatch, Car Screen, or Spare Phone
                        </p>
                        <p className="font-mono-tabular text-[11px] text-[#0EA5E9] break-all">
                          {beaconUrl}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Sends ultra-low-power duty-cycled radio/GPS pulses directly to your host phone and seals encrypted footprint <span className="font-mono-tabular text-emerald-400">{tag.encryptedFootprintHash}</span>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full max-w-full min-w-0">
          {/* Merged Sleek Card: Pinned Family + 20km Zoomable Radar (with Offline OSM Tile Layer) + Expandable Compass Drawer */}
          <section className="lg:col-span-7 min-w-0 overflow-hidden vaak-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5 w-full max-w-full box-border">
            {/* Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base sm:text-lg font-semibold text-white break-words">
                  {t.familyPinned} &amp; {t.radarHeading}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Range <span className="font-mono-tabular text-[#0EA5E9]">{zoomKm} km</span> · Mode {mode.toUpperCase()}
                </p>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1 bg-[#121418] p-1 rounded-xl border border-white/10 max-w-full overflow-x-auto">
                <button
                  type="button"
                  onClick={() => zoomIndex > 0 && setZoomKm(ZOOM_LEVELS[zoomIndex - 1])}
                  disabled={zoomIndex === 0}
                  className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-35 cursor-pointer"
                  aria-label="Zoom in radar"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                {ZOOM_LEVELS.map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setZoomKm(km)}
                    className={`px-1.5 sm:px-2 py-1 rounded-lg text-xs font-mono-tabular font-medium transition-colors cursor-pointer ${
                      zoomKm === km ? 'bg-[#0EA5E9] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {km}km
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => zoomIndex < ZOOM_LEVELS.length - 1 && setZoomKm(ZOOM_LEVELS[zoomIndex + 1])}
                  disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                  className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-35 cursor-pointer"
                  aria-label="Zoom out radar"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Offline OSM Local Tile Cache Status Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#121418] border border-white/10 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <HardDriveDownload
                  className={`w-4 h-4 shrink-0 ${
                    localTileCacheEnabled && cachedOsmMeta ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span className="text-slate-200 truncate">
                  {localTileCacheEnabled && cachedOsmMeta
                    ? `OSM Offline Map Cached (${cachedTileCount} low-res tiles · Z11–Z13)`
                    : 'Offline OSM Tile Layer: Off (Grid-only mode)'}
                </span>
              </div>
              {onOpenTileSettings && (
                <button
                  type="button"
                  onClick={onOpenTileSettings}
                  className="text-[11px] font-semibold text-[#0EA5E9] hover:underline shrink-0 cursor-pointer"
                >
                  {localTileCacheEnabled ? 'Manage Tiles' : 'Enable Tile Cache'}
                </button>
              )}
            </div>

            {/* Compact Pinned Family Quick-Ping Strip */}
            {family.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#121418]/80 border border-white/8 text-center text-xs text-slate-400">
                No pinned family members yet. Pin family members from the Home tab to monitor them on radar.
              </div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {family.map((member) => {
                const isSelected = selectedTargetId === member.id;
                const isPinging = pingingId === member.id;
                const statusColor =
                  member.statusType === 'safe'
                    ? 'text-emerald-400'
                    : member.statusType === 'transit'
                    ? 'text-amber-300'
                    : 'text-[#F43F5E]';

                const batteryColor =
                  member.batteryPct <= 25
                    ? 'text-[#F43F5E]'
                    : member.batteryPct <= 50
                    ? 'text-amber-400'
                    : 'text-emerald-400';

                return (
                  <div
                    key={member.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleFamilyPing(member)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleFamilyPing(member);
                      }
                    }}
                    className={`text-left rounded-2xl p-2.5 transition-all cursor-pointer border min-w-0 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/60 ${
                      isSelected
                        ? 'bg-[#0EA5E9]/15 border-[#0EA5E9]/60'
                        : 'bg-[#121418]/80 border-white/8 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-10 h-10 rounded-full p-0.5 shrink-0 transition-transform ${
                          isPinging ? 'scale-105 ring-4 ring-[#0EA5E9]/40' : ''
                        } ${
                          member.statusType === 'safe'
                            ? 'bg-emerald-500/70'
                            : member.statusType === 'transit'
                            ? 'bg-amber-400/80'
                            : 'bg-[#F43F5E]'
                        }`}
                      >
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full rounded-full object-cover bg-slate-800"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
                            {member.name[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{member.name}</p>
                        <p className={`text-[11px] font-medium truncate ${statusColor}`}>{member.status}</p>
                      </div>
                      {onOpenChat && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            audioEngine.playSonarPing();
                            onOpenChat({
                              id: member.id,
                              name: member.name,
                              phone: member.phone || '',
                              avatar: member.avatar || undefined,
                              status: member.status,
                            });
                          }}
                          aria-label={`Chat with ${member.name}`}
                          title={`Open 1-on-1 Chat with ${member.name}`}
                          className="w-7 h-7 rounded-full bg-[#00A884] hover:bg-[#008f72] text-white flex items-center justify-center cursor-pointer shadow-md shrink-0 transition-transform active:scale-90"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-white/8 flex items-center justify-between text-[10px] text-slate-400 font-mono-tabular">
                      <span className="truncate">{member.distanceKm}km · {member.lastPingAgo}</span>
                      <span className={`inline-flex items-center gap-0.5 shrink-0 ${batteryColor}`}>
                        <Battery className="w-3 h-3" />
                        {member.batteryPct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            {/* 20km Radar Canvas (with Offline Low-Res OSM Map Tiles when cached) */}
            <div className="relative w-full max-w-[min(290px,100%)] sm:max-w-[360px] aspect-square mx-auto rounded-full bg-[#070C14] border border-[#0EA5E9]/30 overflow-hidden select-none">
              {localTileCacheEnabled && cachedOsmMeta && cachedOsmMeta.tiles.length > 0 && (
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-55 pointer-events-none">
                  {cachedOsmMeta.tiles.slice(0, 16).map((tile) => (
                    <img
                      key={tile.key}
                      src={tile.dataUrl}
                      alt={`Offline OSM sector ${tile.key}`}
                      className="w-full h-full object-cover"
                    />
                  ))}
                </div>
              )}

              {[0.25, 0.5, 0.75, 1].map((scale, i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-[#0EA5E9]/25 pointer-events-none"
                  style={{
                    width: `${scale * 100}%`,
                    height: `${scale * 100}%`,
                    top: `${(1 - scale) * 50}%`,
                    left: `${(1 - scale) * 50}%`,
                  }}
                />
              ))}
              <div className="absolute inset-y-0 left-1/2 w-px bg-[#0EA5E9]/20 pointer-events-none" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-[#0EA5E9]/20 pointer-events-none" />

              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[11px] font-mono-tabular font-bold text-sky-300 z-10">N</span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-mono-tabular text-slate-400 z-10">S</span>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono-tabular text-slate-400 z-10">E</span>
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono-tabular text-slate-400 z-10">W</span>

              <div
                className="absolute inset-0 animate-radar-sweep pointer-events-none z-10"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(14, 165, 233, 0.24) 0deg, rgba(14, 165, 233, 0.03) 40deg, transparent 70deg)',
                }}
              />

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#0EA5E9] ring-4 ring-[#0EA5E9]/25 z-20" />

              {[
                ...family.map((f) => ({
                  id: f.id,
                  label: f.name.split(' ')[0],
                  fullName: f.name,
                  distanceKm: f.distanceKm,
                  bearingDeg: f.bearingDeg,
                  kind: 'family' as const,
                  statusType: f.statusType,
                  avatar: f.avatar,
                  status: f.status,
                })),
                ...radarNodes.map((n) => ({
                  id: n.id,
                  label: n.label.split(' ')[0],
                  fullName: n.label,
                  distanceKm: n.distanceKm,
                  bearingDeg: n.bearingDeg,
                  kind: n.kind,
                  statusType: 'safe' as const,
                  avatar: undefined,
                  status: `${n.kind.toUpperCase()} Node`,
                })),
                ...trackingTags
                  .filter((tag) => tag.active)
                  .map((tag) => ({
                    id: tag.id,
                    label: tag.name.split(' ')[0],
                    fullName: tag.name,
                    distanceKm: tag.distanceKm,
                    bearingDeg: tag.bearingDeg,
                    kind: 'tag' as const,
                    statusType: 'safe' as const,
                    avatar: undefined,
                    status: `${tag.targetType} Beacon`,
                  })),
              ].map((blip) => {
                const clampedDist = Math.min(blip.distanceKm, zoomKm);
                const pctRadius = (clampedDist / zoomKm) * 44;
                const adjustedAngleRad = ((blip.bearingDeg - headingDeg - 90) * Math.PI) / 180;
                const x = 50 + pctRadius * Math.cos(adjustedAngleRad);
                const y = 50 + pctRadius * Math.sin(adjustedAngleRad);
                const outOfRange = blip.distanceKm > zoomKm;
                const isSelected = selectedTargetId === blip.id;

                return (
                  <div
                    key={blip.id}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center ${
                      outOfRange ? 'opacity-45' : 'opacity-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.playSonarPing();
                        setSelectedTargetId(blip.id);
                      }}
                      className={`flex flex-col items-center cursor-pointer transition-transform ${
                        isSelected ? 'scale-115' : 'hover:scale-110'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 border-[#090E17] ${
                          blip.kind === 'family'
                            ? blip.statusType === 'safe'
                              ? 'bg-emerald-400'
                              : 'bg-amber-400'
                            : blip.kind === 'rescue'
                            ? 'bg-[#F43F5E]'
                            : blip.kind === 'tag'
                            ? 'bg-purple-400'
                            : 'bg-[#0EA5E9]'
                        } ${isSelected ? 'ring-4 ring-white/40' : ''}`}
                      />
                      <span className="mt-0.5 px-1.5 py-0.5 rounded bg-[#090E17]/90 text-[10px] font-medium text-slate-100 whitespace-nowrap border border-slate-700/60">
                        {blip.label}
                      </span>
                    </button>

                    {/* Floating mini-popup on selected dot with WhatsApp-style round green chat button */}
                    {isSelected && onOpenChat && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-full mb-1 z-40 px-2 py-1 rounded-xl bg-[#0B141A]/95 border border-emerald-500/70 shadow-2xl flex items-center gap-1.5 animate-fade-in pointer-events-auto shrink-0"
                      >
                        <span className="text-[10px] font-bold text-white whitespace-nowrap">{blip.label}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            audioEngine.playSonarPing();
                            onOpenChat({
                              id: blip.id,
                              name: blip.fullName || blip.label,
                              phone: blip.kind === 'family' ? (family.find((f) => f.id === blip.id)?.phone || '') : 'Mesh Node',
                              avatar: blip.avatar || undefined,
                              status: blip.status || `${blip.distanceKm}km away`,
                            });
                          }}
                          aria-label={`Chat with ${blip.label}`}
                          title={`Open 1-on-1 Chat with ${blip.label}`}
                          className="w-7 h-7 rounded-full bg-[#00A884] hover:bg-[#008f72] text-white flex items-center justify-center cursor-pointer shadow-md shadow-emerald-950/40 shrink-0 transition-transform active:scale-90"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Floating Mini-Card for Selected Target on 20km Radar */}
            {activeTarget && (
              <div className="p-3 rounded-2xl bg-[#121820] border border-emerald-500/40 shadow-lg flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold overflow-hidden shrink-0">
                    {selectedFamily?.avatar ? (
                      <img src={selectedFamily.avatar} alt={activeTarget.label} className="w-full h-full object-cover" />
                    ) : (
                      <span>{activeTarget.label[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-semibold text-white truncate">{activeTarget.label}</p>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    </div>
                    <p className="text-[11px] font-mono-tabular text-emerald-400 truncate">
                      {activeTarget.distanceKm} km · {activeTarget.subtitle}
                    </p>
                  </div>
                </div>

                {onOpenChat && (
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playSonarPing();
                      onOpenChat({
                        id: activeTarget.id,
                        name: activeTarget.label,
                        phone: selectedFamily?.phone || 'Mesh Radar Node',
                        avatar: selectedFamily?.avatar || undefined,
                        status: activeTarget.subtitle,
                      });
                    }}
                    aria-label={`Chat with ${activeTarget.label}`}
                    title={`Open 1-on-1 Chat with ${activeTarget.label}`}
                    className="w-9 h-9 rounded-full bg-[#00A884] hover:bg-[#008f72] text-white flex items-center justify-center cursor-pointer shadow-md shadow-emerald-950/40 shrink-0 transition-transform active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Expandable Directional Compass Drawer */}
            <div className="rounded-2xl bg-[#121418] border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setCompassOpen((o) => !o)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Compass className="w-4 h-4 text-[#0EA5E9] shrink-0" />
                  <span className="truncate">
                    Directional Bearing Compass
                    {activeTarget
                      ? ` · ${activeTarget.label} (${bearingToCardinal(activeTarget.bearingDeg)} ${activeTarget.bearingDeg}°)`
                      : ''}
                  </span>
                </span>
                {compassOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
              </button>

              {compassOpen && activeTarget && (
                <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#0EA5E9]/15 border border-[#0EA5E9]/40 flex items-center justify-center shrink-0">
                      <Navigation
                        className="w-6 h-6 text-[#0EA5E9] transition-transform duration-200"
                        style={{
                          transform: `rotate(${activeTarget.bearingDeg - headingDeg}deg)`,
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-semibold text-white truncate">{activeTarget.label}</p>
                      <p className="text-xs text-slate-400 truncate">{activeTarget.subtitle}</p>
                      <p className="text-xs font-mono-tabular text-emerald-400">
                        {activeTarget.distanceKm} km · {bearingToCardinal(activeTarget.bearingDeg)} ({activeTarget.bearingDeg}°)
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
                    <span className="font-mono-tabular shrink-0">Heading {headingDeg}°</span>
                    <input
                      type="range"
                      min={0}
                      max={359}
                      value={headingDeg}
                      onChange={(e) => setHeadingDeg(Number(e.target.value))}
                      aria-label="Compass heading rotation"
                      className="min-w-[110px] flex-1 accent-[#0EA5E9] cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setHeadingDeg(0)}
                      className="text-[#0EA5E9] hover:underline shrink-0 cursor-pointer"
                    >
                      North
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveCompassEnabled((v) => !v)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                        liveCompassEnabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {liveCompassEnabled ? 'Live Compass: On' : 'Live Compass: Off'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right Column: Dual Emergency Lanes (Anti-Accidental Guard + 60s Family Priority Mesh) */}
          <section className="lg:col-span-5 min-w-0 overflow-hidden space-y-5 w-full max-w-full box-border">
            {/* Lane 1: Call Emergency Police behind Flip-to-Unlock Safety Cover + 3-Second Hold/Slide */}
            <div
              className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 border transition-colors ${
                sosActive
                  ? 'bg-rose-950/65 border-[#F43F5E]'
                  : 'vaak-surface border-[#F43F5E]/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-[#F43F5E] shrink-0" />
                    <span className="truncate">{sosActive ? t.sosActivePrompt : `Call Emergency Police (${country.emergencyNumber})`}</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Anti-Accidental Pocket Guard: Open safety cover, then hold 3.0s or slide 100%.
                  </p>
                </div>
                <span className="font-mono-tabular text-xs font-bold text-[#F43F5E] shrink-0">
                  {country.emergencyNumber}
                </span>
              </div>

              {!sosActive ? (
                !coverOpen ? (
                  <button
                    type="button"
                    onClick={() => setCoverOpen(true)}
                    className="w-full min-h-[70px] rounded-2xl bg-[#121418] hover:bg-slate-900 border-2 border-dashed border-[#F43F5E]/40 px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 text-left min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 flex items-center justify-center text-[#F43F5E] shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          Safety Cover Locked (Pocket Shield)
                        </p>
                        <p className="text-xs text-slate-400">
                          Tap to flip open safety cover before dialing {country.emergencyNumber}
                        </p>
                      </div>
                    </div>
                    <Unlock className="w-4 h-4 text-[#F43F5E] shrink-0" />
                  </button>
                ) : (
                  <div className="space-y-3 p-4 rounded-2xl bg-[#121418] border border-[#F43F5E]/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-rose-300 font-semibold">
                        Safety Cover Open (Auto-locks in 15s)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCoverOpen(false);
                          cancelThreeSecondHold();
                          setSosSlideVal(0);
                        }}
                        className="text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Close Cover
                      </button>
                    </div>

                    <button
                      type="button"
                      onMouseDown={startThreeSecondHold}
                      onMouseUp={cancelThreeSecondHold}
                      onMouseLeave={cancelThreeSecondHold}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        startThreeSecondHold();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        cancelThreeSecondHold();
                      }}
                      className="relative w-full min-h-[52px] rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-sm overflow-hidden select-none cursor-pointer"
                    >
                      <span
                        className="absolute inset-y-0 left-0 bg-[#F43F5E] transition-all duration-75"
                        style={{ width: `${holdProgressPct}%` }}
                      />
                      <span className="relative z-10 flex items-center justify-center gap-2 font-mono-tabular px-2">
                        <PhoneCall className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {holdElapsedMs > 0
                            ? `Holding ${(holdElapsedMs / 1000).toFixed(1)}s / 3.0s...`
                            : `Hold 3s to Call Police (${country.emergencyNumber})`}
                        </span>
                      </span>
                    </button>

                    <div className="relative h-12 rounded-xl bg-rose-950/80 border border-[#F43F5E]/40 flex items-center px-2 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-rose-600/40 pointer-events-none"
                        style={{ width: `${sosSlideVal}%` }}
                      />
                      <span className="w-full text-center text-xs font-medium text-rose-100 pointer-events-none z-10">
                        Or slide 100% right to dispatch {country.emergencyNumber}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={sosSlideVal}
                        onChange={(e) => handleSosSliderChange(Number(e.target.value))}
                        onMouseUp={handleSosSliderRelease}
                        onTouchEnd={handleSosSliderRelease}
                        aria-label="Slide to dispatch Emergency Police"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-grab z-20"
                      />
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-rose-900/40 border border-[#F43F5E]/40 text-xs text-rose-100 flex items-center gap-2.5">
                    <Radio className="w-4 h-4 text-[#F43F5E] shrink-0" />
                    <span>
                      Emergency SOS dispatched to {country.name} Police ({country.emergencyNumber}) &amp; GPS mesh gateway.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onCancelSos();
                      setCoverOpen(false);
                      setHoldElapsedMs(0);
                      setSosSlideVal(0);
                    }}
                    className="w-full min-h-[46px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Stand Down / Mark Safe</span>
                  </button>
                </div>
              )}
            </div>

            {/* Lane 2: Separate 60-Second Family Priority Mesh Blast (Zero SIM / Crowd Emergencies) */}
            <div className="vaak-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 border border-emerald-500/30">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>60-Second Family Priority Mesh Blast</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    50-hop Jumping Jack priority burst to pinned family — works with zero SIM or internet
                  </p>
                </div>
                {priorityBlastSec > 0 && (
                  <span className="font-mono-tabular text-sm font-bold text-emerald-400 shrink-0">
                    {priorityBlastSec}s
                  </span>
                )}
              </div>

              <textarea
                rows={2}
                value={priorityDraft}
                onChange={(e) => setPriorityDraft(e.target.value)}
                placeholder="Urgent family message or location hint..."
                className="w-full p-3 rounded-2xl bg-[#121418] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />

              <button
                type="button"
                onClick={handleTriggerFamilyPriorityBlast}
                className="w-full min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {priorityBlastSec > 0
                    ? `Priority 50-Hop Burst Active (${priorityBlastSec}s)`
                    : 'Send 60-Second Family Priority Mesh Blast'}
                </span>
              </button>

              {priorityBlastSec > 0 && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
                  <p className="font-semibold">
                    Bursting across 50 Jumping-Jack mesh hops to all pinned family members
                  </p>
                  <p className="font-mono-tabular text-[11px] text-emerald-300/90">
                    Estimated family delivery window: &le; {priorityBlastSec}s (Zero SIM / Zero Internet)
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
