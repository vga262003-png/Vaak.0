import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  AudioLines,
  BatteryLow,
  CheckCircle2,
  Copy,
  Droplets,
  Flame,
  Headphones,
  HeartPulse,
  Home,
  Lock,
  Mic,
  Phone,
  PhoneOff,
  QrCode,
  Radio,
  Send,
  ShieldAlert,
  UserCheck,
  Users,
  Utensils,
  Waves,
  ZapOff,
} from 'lucide-react';
import {
  AppLanguage,
  FamilyMember,
  TransportMode,
  VaakContactUser,
  VoiceNoteAttachment,
  WalkieCodecMode,
  WalkieListenMode,
  WalkieTransmission,
} from '../../types/app';
import { getTranslation } from '../../data/i18n';
import { audioEngine } from '../../utils/audioEngine';
import { QrMatrixSvg } from '../QrMatrixSvg';
import { VoiceNoteHoldButton, VoiceNotePlayer } from '../VoiceNoteBar';

interface WalkieCallTabProps {
  language: AppLanguage;
  mode: TransportMode;
  family: FamilyMember[];
  contacts?: VaakContactUser[];
  transmissions: WalkieTransmission[];
  isSuspended: boolean;
  suspendedDeviceId?: string;
  suspensionReason?: string;
  onSendTransmission: (payload: {
    channel: string;
    text: string;
    durationSec?: number;
    codec?: WalkieCodecMode;
    isAudio?: boolean;
    isQuickIcon?: boolean;
    voiceNote?: VoiceNoteAttachment;
  }) => void;
  onResetSuspension: () => void;
  onRequestAlertPicker?: (payload: { title: string; message: string; subLabel?: string }) => void;
  onCreateBridgeRoom?: () => Promise<string | null> | string | null;
}

const CALL_LIMIT_SEC = 300; // Strict 5-minute auto-cut

interface QuickSignalDef {
  id: string;
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  message: string;
}

const QUICK_SIGNALS: QuickSignalDef[] = [
  { id: 'water', label: 'Need Water', subLabel: 'पानी चाहिए', icon: Droplets, tone: 'text-sky-400 bg-sky-500/15 border-sky-500/30', message: 'URGENT: Need clean drinking water at my location.' },
  { id: 'medical', label: 'Medical Help', subLabel: 'दवाई / डॉक्टर', icon: HeartPulse, tone: 'text-rose-400 bg-rose-500/15 border-rose-500/30', message: 'URGENT: Medical emergency / first-aid needed immediately.' },
  { id: 'food', label: 'Need Food', subLabel: 'खाना चाहिए', icon: Utensils, tone: 'text-amber-400 bg-amber-500/15 border-amber-500/30', message: 'Requesting food / dry rations for family.' },
  { id: 'trapped', label: 'Trapped', subLabel: 'फँसे हुए हैं', icon: AlertTriangle, tone: 'text-orange-400 bg-orange-500/15 border-orange-500/30', message: 'ALERT: Trapped inside structure, send rescue team.' },
  { id: 'safe', label: 'Safe Here', subLabel: 'हम सुरक्षित हैं', icon: ShieldAlert, tone: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', message: 'STATUS: I am safe and accounted for at current coordinates.' },
  { id: 'fire', label: 'Fire Danger', subLabel: 'आग का खतरा', icon: Flame, tone: 'text-red-400 bg-red-500/15 border-red-500/30', message: 'HAZARD: Active fire reported nearby, evacuate corridor.' },
  { id: 'flood', label: 'Flood Rising', subLabel: 'बाढ़ का पानी', icon: Waves, tone: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30', message: 'HAZARD: Water level rising rapidly in this zone.' },
  { id: 'power', label: 'Power Out', subLabel: 'बिजली बंद', icon: ZapOff, tone: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30', message: 'INFO: Grid power down, operating on local mesh.' },
  { id: 'child', label: 'Child Lost', subLabel: 'बच्चा गुम', icon: Users, tone: 'text-pink-400 bg-pink-500/15 border-pink-500/30', message: 'ALERT: Missing child / separated family member nearby.' },
  { id: 'shelter', label: 'Need Shelter', subLabel: 'शरण चाहिए', icon: Home, tone: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30', message: 'Requesting directions to nearest relief shelter.' },
  { id: 'battery', label: 'Battery Low', subLabel: 'बैटरी कम है', icon: BatteryLow, tone: 'text-amber-300 bg-amber-500/15 border-amber-500/30', message: 'NOTICE: Device battery critical (<15%), switching to beacon.' },
  { id: 'come', label: 'Come Here', subLabel: 'यहाँ आएं', icon: UserCheck, tone: 'text-blue-400 bg-blue-500/15 border-blue-500/30', message: 'GROUPING: Regroup at my current GPS pin.' },
];

export const WalkieCallTab: React.FC<WalkieCallTabProps> = ({
  language,
  mode,
  family,
  contacts = [],
  transmissions,
  isSuspended,
  suspendedDeviceId,
  suspensionReason,
  onSendTransmission,
  onResetSuspension,
  onRequestAlertPicker,
  onCreateBridgeRoom,
}) => {
  const t = getTranslation(language);

  // User-Customizable Walkie-Talkie Controls
  const [listenMode, setListenMode] = useState<WalkieListenMode>('ptt');
  const [codecMode, setCodecMode] = useState<WalkieCodecMode>('hd_clear');
  const [privateFreqPin, setPrivateFreqPin] = useState('446820');
  const [privateFreqLocked, setPrivateFreqLocked] = useState(true);

  const [channel, setChannel] = useState('Family Alpha');
  const [isTalking, setIsTalking] = useState(false);
  const [handsFreeActive, setHandsFreeActive] = useState(false);
  const [pttSeconds, setPttSeconds] = useState(0);
  const [textDraft, setTextDraft] = useState('');
  const pttTimerRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micRecorderRef = useRef<MediaRecorder | null>(null);
  const micChunksRef = useRef<Blob[]>([]);
  const activeStartMsRef = useRef<number>(0);

  const callableTargets = [
    ...family.map((f) => ({
      id: f.id,
      label: `${f.name} (${f.distanceKm} km)`,
      phone: f.phone || '',
    })),
    ...contacts
      .filter((c) => c.connected || c.onVaak)
      .map((c) => ({
        id: c.id,
        label: `${c.name} · ${c.phone}`,
        phone: c.phone,
      })),
  ];

  // Strict 5-Minute Auto-Cut Call Timer state
  const [callTargetId, setCallTargetId] = useState(callableTargets[0]?.id ?? '');
  const [callActive, setCallActive] = useState(false);
  const [callRemainingSec, setCallRemainingSec] = useState(CALL_LIMIT_SEC);
  const [callCutoffNotice, setCallCutoffNotice] = useState<string | null>(null);

  // Zero-Install Guest QR Bridge state
  const [activeBridgePin, setActiveBridgePin] = useState<string>('849201');
  const [generatingBridge, setGeneratingBridge] = useState(false);
  const [copiedBridge, setCopiedBridge] = useState(false);
  const [sharedBridge, setSharedBridge] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const bridgeUrl = `${origin}/?roomPin=${activeBridgePin}&bridge=1`;

  const handleGenerateFreshBridge = async () => {
    if (!onCreateBridgeRoom) return;
    setGeneratingBridge(true);
    try {
      const pin = await onCreateBridgeRoom();
      if (pin) {
        setActiveBridgePin(pin);
      }
    } finally {
      setGeneratingBridge(false);
    }
  };

  const activeChannelLabel =
    privateFreqLocked && privateFreqPin.length >= 4
      ? `${channel} [PIN ${privateFreqPin}]`
      : channel;

  const stopMicStream = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((tr) => tr.stop());
      micStreamRef.current = null;
    }
    micRecorderRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopMicStream();
    };
  }, []);

  // Voice timer (for PTT or Hands-Free Auto-Listen)
  useEffect(() => {
    if (isTalking || handsFreeActive) {
      pttTimerRef.current = window.setInterval(() => {
        setPttSeconds((s) => s + 1);
      }, 1000);
    } else if (pttTimerRef.current) {
      clearInterval(pttTimerRef.current);
      pttTimerRef.current = null;
    }
    return () => {
      if (pttTimerRef.current) clearInterval(pttTimerRef.current);
    };
  }, [isTalking, handsFreeActive]);

  // Strict 5-minute call auto-cut interval
  useEffect(() => {
    if (!callActive) return;
    const id = window.setInterval(() => {
      setCallRemainingSec((prev) => {
        if (prev <= 1) {
          setCallActive(false);
          audioEngine.playCallCutoff();
          setCallCutoffNotice('5-minute survival bandwidth limit reached — call auto-terminated.');
          return CALL_LIMIT_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [callActive]);

  const startLiveMicCapture = async (modeKind: 'ptt' | 'vox') => {
    activeStartMsRef.current = Date.now();
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      micChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      micRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) micChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(micChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const audioUrl = blob.size > 0 ? URL.createObjectURL(blob) : undefined;
        stopMicStream();
        const dur = Math.max(1, Math.round((Date.now() - activeStartMsRef.current) / 1000));
        const codecLabel =
          codecMode === 'hd_clear' ? 'HD Clear Voice' : '6kbps Ultra-Saver';
        const bars = Array.from({ length: 14 }, (_, idx) => 28 + ((dur * 17 + idx * 23) % 68));
        onSendTransmission({
          channel: activeChannelLabel,
          text:
            modeKind === 'ptt'
              ? `Voice Push-to-Talk burst (${dur}s, ${codecLabel})`
              : `Hands-Free VOX stream (${dur}s, ${codecLabel})`,
          durationSec: dur,
          codec: codecMode,
          isAudio: true,
          voiceNote: audioUrl
            ? {
                id: `vn-${Date.now()}`,
                durationSec: dur,
                audioUrl,
                codecLabel,
                waveform: bars,
              }
            : undefined,
        });
      };

      recorder.start();
    } catch {
      // Mic permission denied or unavailable; text summary fallback handled on stop
    }
  };

  const finalizeMicCapture = (modeKind: 'ptt' | 'vox', elapsedSec: number) => {
    const recorder = micRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
        return;
      } catch {
        // Fallback below
      }
    }
    stopMicStream();
    const dur = Math.max(1, elapsedSec);
    onSendTransmission({
      channel: activeChannelLabel,
      text:
        modeKind === 'ptt'
          ? `Voice Push-to-Talk burst (${dur}s, ${
              codecMode === 'hd_clear' ? 'HD Clear Voice' : '6kbps Ultra-Saver'
            })`
          : `Hands-Free VOX stream (${dur}s, ${
              codecMode === 'hd_clear' ? 'HD Clear Voice' : '6kbps Ultra-Saver'
            })`,
      durationSec: dur,
      codec: codecMode,
      isAudio: true,
    });
  };

  const startPtt = () => {
    if (isSuspended || isTalking) return;
    audioEngine.playPttStart();
    if (mode === 'sonic') audioEngine.playSonicChirp();
    setPttSeconds(0);
    setIsTalking(true);
    void startLiveMicCapture('ptt');
  };

  const stopPtt = () => {
    if (!isTalking) return;
    setIsTalking(false);
    audioEngine.playRogerBeep();
    const dur = Math.max(1, pttSeconds);
    finalizeMicCapture('ptt', dur);
    setPttSeconds(0);
  };

  const toggleHandsFree = () => {
    if (isSuspended) return;
    if (!handsFreeActive) {
      audioEngine.playPttStart();
      setPttSeconds(0);
      setHandsFreeActive(true);
      void startLiveMicCapture('vox');
    } else {
      audioEngine.playRogerBeep();
      const dur = Math.max(1, pttSeconds);
      setHandsFreeActive(false);
      finalizeMicCapture('vox', dur);
      setPttSeconds(0);
    }
  };

  const handleTextBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textDraft.trim() || isSuspended) return;
    onSendTransmission({
      channel: activeChannelLabel,
      text: textDraft.trim(),
      codec: codecMode,
      isAudio: false,
    });
    setTextDraft('');
  };

  const handleQuickIconPress = (sig: QuickSignalDef) => {
    if (isSuspended) return;
    audioEngine.playSonarPing();
    if (onRequestAlertPicker) {
      onRequestAlertPicker({
        title: sig.label,
        message: sig.message,
        subLabel: sig.subLabel,
      });
    } else {
      onSendTransmission({
        channel: activeChannelLabel,
        text: sig.message,
        codec: codecMode,
        isQuickIcon: true,
      });
    }
  };

  const formatMmSs = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCopyBridge = () => {
    navigator.clipboard?.writeText(bridgeUrl).catch(() => {});
    setCopiedBridge(true);
    setTimeout(() => setCopiedBridge(false), 1800);
  };

  const handleShareBridge = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Vaak / PingTalk Guest Bridge',
          text: `Join my emergency Vaak Walkie Bridge (#${activeBridgePin}):`,
          url: bridgeUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(bridgeUrl).catch(() => {});
    }
    setSharedBridge(true);
    setTimeout(() => setSharedBridge(false), 2000);
  };

  const selectedCallTarget = callableTargets.find(
    (item) => item.id === (callTargetId || callableTargets[0]?.id)
  );

  const activeVoiceStream = isTalking || handsFreeActive;

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Instant Device Suspension Notice */}
      {isSuspended && (
        <div className="rounded-2xl bg-rose-950/70 border border-rose-500 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-white">
                Device {suspendedDeviceId || 'Bound Hardware'} Suspended by Automated Threat Filter
              </p>
              <p className="text-xs text-rose-200 mt-0.5">
                {suspensionReason || 'Prohibited threat keyword detected. Incident sealed in Dual-Key /gov-vault.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onResetSuspension}
            className="min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white cursor-pointer"
          >
            Acknowledge &amp; Restore Access
          </button>
        </div>
      )}

      {/* Top Row: Adaptive Walkie-Talkie Console + 5-Min Auto-Cut Call */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Customizable Walkie-Talkie Console */}
        <section className="lg:col-span-7 min-w-0 w-full overflow-hidden vaak-surface rounded-2xl p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="break-words">Adaptive Walkie-Talkie Engine</span>
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'online'
                  ? 'Browser Cloud Sync via Firebase & Web Audio'
                  : mode === 'mesh'
                  ? 'Offline Local Queue & Acoustic 18.5kHz (Raw BLE/LoRa radio mesh requires Android APK)'
                  : 'Offline 18.5kHz Sonic Wave Acoustic Carrier'}
              </p>
            </div>

            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              aria-label="Walkie channel"
              className="w-full sm:w-auto max-w-full min-h-[40px] px-3 rounded-xl bg-[#121418] border border-white/10 text-xs font-medium text-white focus:outline-none focus:border-[#0EA5E9]"
            >
              <option value="Family Alpha">Channel: Family Alpha</option>
              <option value="20km Mesh Open">Channel: 20km Mesh Open</option>
              <option value="Rescue Relay">Channel: Rescue Relay</option>
            </select>
          </div>

          {/* User-Customizable Mode Switchers + Private Channel Frequency PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-[#121418] border border-white/8">
            {/* Switch 1: PTT vs Hands-Free Auto-Listen */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-400">Trigger Mode</span>
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#1B1E24] border border-white/8">
                <button
                  type="button"
                  onClick={() => {
                    setHandsFreeActive(false);
                    setListenMode('ptt');
                  }}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    listenMode === 'ptt' ? 'bg-[#0EA5E9] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Push-to-Talk
                </button>
                <button
                  type="button"
                  onClick={() => setListenMode('hands_free')}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    listenMode === 'hands_free' ? 'bg-[#0EA5E9] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Hands-Free
                </button>
              </div>
            </div>

            {/* Switch 2: HD Clear Voice vs 6kbps Ultra-Saver */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-400">Voice Codec</span>
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#1B1E24] border border-white/8">
                <button
                  type="button"
                  onClick={() => setCodecMode('hd_clear')}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    codecMode === 'hd_clear' ? 'bg-[#0EA5E9] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  HD Clear
                </button>
                <button
                  type="button"
                  onClick={() => setCodecMode('ultra_saver_6kbps')}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    codecMode === 'ultra_saver_6kbps' ? 'bg-[#0EA5E9] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  6kbps Saver
                </button>
              </div>
            </div>

            {/* Private Channel Frequency PIN */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-400">Private Channel PIN</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  value={privateFreqPin}
                  onChange={(e) => setPrivateFreqPin(e.target.value.replace(/\D/g, ''))}
                  aria-label="Private Channel Frequency PIN"
                  className="w-full min-h-[34px] px-2.5 rounded-lg bg-[#1B1E24] border border-white/10 font-mono-tabular text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                />
                <button
                  type="button"
                  onClick={() => setPrivateFreqLocked((v) => !v)}
                  className={`min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                    privateFreqLocked
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-white/10 text-slate-400'
                  }`}
                  title="Toggle Private Frequency Lock"
                >
                  <Lock className="w-3 h-3" />
                  <span>{privateFreqLocked ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 18.5kHz Sonic Wave Quick Burst Strip when in Sonic Mode */}
          {mode === 'sonic' && (
            <div className="p-3 rounded-xl bg-sky-950/40 border border-[#0EA5E9]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-sky-200 min-w-0 flex-1">
                <AudioLines className="w-4 h-4 text-[#0EA5E9] shrink-0" />
                <span>18.5kHz Sonic Wave Acoustic Modem Ready (Zero RF / Zero Internet)</span>
              </div>
              <button
                type="button"
                onClick={() => audioEngine.playSonicChirp()}
                className="px-3 py-1.5 rounded-lg bg-[#0EA5E9] hover:bg-sky-400 text-white font-semibold shrink-0 cursor-pointer"
              >
                Test 18.5kHz Chirp
              </button>
            </div>
          )}

          {/* Large Tactile Voice Control */}
          <div className="flex flex-col items-center py-2 space-y-4">
            {listenMode === 'ptt' ? (
              <button
                type="button"
                disabled={isSuspended}
                onMouseDown={startPtt}
                onMouseUp={stopPtt}
                onMouseLeave={() => isTalking && stopPtt()}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startPtt();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopPtt();
                }}
                className={`w-44 h-44 rounded-full flex flex-col items-center justify-center gap-2 border-4 transition-all select-none cursor-pointer ${
                  isTalking
                    ? 'bg-[#0EA5E9] border-sky-300 scale-95 shadow-2xl shadow-sky-500/40'
                    : 'bg-[#121418] border-[#0EA5E9]/50 hover:border-[#0EA5E9]'
                } disabled:opacity-40`}
              >
                <Mic className={`w-10 h-10 ${isTalking ? 'text-white' : 'text-blue-400'}`} />
                <span className="text-xs font-bold text-white text-center px-3">
                  {isTalking ? t.pttActive : t.pttHold}
                </span>
                <span className="font-mono-tabular text-[11px] text-blue-200">
                  {isTalking
                    ? formatMmSs(pttSeconds)
                    : codecMode === 'hd_clear'
                    ? 'HD CLEAR VOICE'
                    : '6KBPS ULTRA-SAVER'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSuspended}
                onClick={toggleHandsFree}
                className={`w-44 h-44 rounded-full flex flex-col items-center justify-center gap-2 border-4 transition-all select-none cursor-pointer ${
                  handsFreeActive
                    ? 'bg-emerald-600 border-emerald-300 shadow-2xl shadow-emerald-600/30'
                    : 'bg-[#0B1120] border-emerald-500/50 hover:border-emerald-400'
                } disabled:opacity-40`}
              >
                <Headphones className={`w-10 h-10 ${handsFreeActive ? 'text-white' : 'text-emerald-400'}`} />
                <span className="text-xs font-bold text-white text-center px-3">
                  {handsFreeActive ? 'Auto-Listening Live (Tap to Stop)' : 'Tap to Start Hands-Free Auto-Listen'}
                </span>
                <span className="font-mono-tabular text-[11px] text-emerald-100">
                  {handsFreeActive ? formatMmSs(pttSeconds) : 'VOX HANDS-FREE'}
                </span>
              </button>
            )}

            {/* Acoustic Waveform Bars */}
            <div className="flex items-center justify-center gap-1 h-6" aria-hidden="true">
              {Array.from({ length: 16 }).map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    activeVoiceStream ? 'bg-blue-400' : 'bg-slate-700'
                  }`}
                  style={{
                    height: activeVoiceStream ? `${25 + ((idx * 37 + pttSeconds * 19) % 75)}%` : '20%',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Text / Voice Note Broadcast with Threat Keyword Filter */}
          <form onSubmit={handleTextBroadcast} className="flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-0">
            <input
              type="text"
              value={textDraft}
              disabled={isSuspended}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder="Broadcast message (X25519 + Paninian encrypted, threat-screened)..."
              className="w-full sm:flex-1 min-w-0 min-h-[46px] px-3.5 sm:px-4 rounded-xl bg-[#121418] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0EA5E9]"
            />
            <VoiceNoteHoldButton
              mode={mode}
              disabled={isSuspended}
              label="Hold Mic"
              onSendVoiceNote={(note) =>
                onSendTransmission({
                  channel: activeChannelLabel,
                  text: `Voice Note (${note.durationSec}s · ${note.codecLabel})`,
                  durationSec: note.durationSec,
                  codec: codecMode,
                  isAudio: true,
                  voiceNote: note,
                })
              }
            />
            <button
              type="submit"
              disabled={isSuspended || !textDraft.trim()}
              className="min-h-[46px] px-4 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 disabled:bg-slate-800 text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          {/* Recent Walkie Log with Lamport Sequence Ordering */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {transmissions.length === 0 ? (
              <p className="p-4 rounded-xl bg-[#121418]/60 border border-white/8 text-xs text-slate-400 text-center">
                No walkie transmissions yet. Press &amp; hold Push-to-Talk or send a text message above.
              </p>
            ) : (
              transmissions.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 min-w-0 overflow-hidden ${
                    item.blocked
                      ? 'bg-rose-950/50 border-[#F43F5E]/50 text-rose-200'
                      : 'bg-[#121418]/80 border-white/8 text-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400 min-w-0">
                    <span className="font-semibold text-white truncate max-w-full">
                      {item.sender} · <span className="text-[#0EA5E9]">{item.channel}</span>
                    </span>
                    <span className="font-mono-tabular break-all">
                      {item.lamportSeq ? `L#${String(item.lamportSeq).padStart(3, '0')} · ` : ''}
                      {item.paninianHash} · {item.timestamp}
                    </span>
                  </div>
                  {item.voiceNote ? (
                    <VoiceNotePlayer note={item.voiceNote} />
                  ) : (
                    <p className="text-slate-200 leading-relaxed break-words">{item.text}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Strict 5-Minute Auto-Cut Call + Guest QR Bridge */}
        <div className="lg:col-span-5 min-w-0 w-full space-y-6">
          {/* Strict 5-Minute Auto-Cut Normal Call */}
          <section className="vaak-surface rounded-2xl p-4 sm:p-5 space-y-4 min-w-0 w-full overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-white flex items-center gap-2 min-w-0">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">{t.normalCallTitle}</span>
              </h3>
              <span className="font-mono-tabular text-xs text-amber-300 font-semibold shrink-0">
                MAX 05:00
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-3 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <select
                  value={callTargetId || (callableTargets[0]?.id ?? '')}
                  disabled={callActive || callableTargets.length === 0}
                  onChange={(e) => setCallTargetId(e.target.value)}
                  className="w-full sm:flex-1 min-w-0 min-h-[42px] px-3 rounded-lg bg-[#11192C] border border-slate-700 text-sm text-white focus:outline-none"
                >
                  {callableTargets.length === 0 ? (
                    <option value="">Pin family or add contact first</option>
                  ) : (
                    callableTargets.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))
                  )}
                </select>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Auto-Cut Timer</p>
                  <p
                    className={`font-mono-tabular text-2xl font-bold ${
                      callRemainingSec <= 15 && callActive ? 'text-rose-400' : 'text-white'
                    }`}
                  >
                    {formatMmSs(callRemainingSec)}
                  </p>
                </div>
              </div>

              {callCutoffNotice && (
                <p className="text-xs text-amber-300 bg-amber-950/50 border border-amber-500/30 rounded-lg p-2.5">
                  {callCutoffNotice}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {!callActive ? (
                  <button
                    type="button"
                    disabled={isSuspended || callableTargets.length === 0}
                    onClick={() => {
                      setCallCutoffNotice(null);
                      setCallRemainingSec(CALL_LIMIT_SEC);
                      setCallActive(true);
                      audioEngine.playNormalRing();
                    }}
                    className="flex-1 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Start 5-Min Call</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCallActive(false);
                      audioEngine.playCallCutoff();
                      setCallRemainingSec(CALL_LIMIT_SEC);
                    }}
                    className="flex-1 min-h-[46px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End Call</span>
                  </button>
                )}

                {selectedCallTarget?.phone && (
                  <a
                    href={`tel:${selectedCallTarget.phone}`}
                    className="px-4 min-h-[46px] rounded-xl bg-[#11192C] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-sky-300 flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Dial Carrier</span>
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Zero-Install Guest QR Bridge */}
          <section className="vaak-surface rounded-2xl p-4 sm:p-5 space-y-4 min-w-0 w-full overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-white flex items-center gap-2 min-w-0">
                <QrCode className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">{t.guestBridgeTitle}</span>
              </h3>
              <span className="font-mono-tabular text-xs text-[#0EA5E9] font-bold shrink-0">PIN #{activeBridgePin}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0">
              <QrMatrixSvg value={bridgeUrl} size={132} />
              <div className="min-w-0 w-full flex-1 space-y-2.5 text-xs text-slate-300">
                <p className="leading-relaxed">
                  Nearby users without Vaak installed can scan this QR or open this link to join encrypted room #{activeBridgePin} instantly in their browser.
                </p>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0B1120] border border-slate-800 font-mono-tabular text-[11px] text-blue-300 min-w-0">
                  <span className="truncate flex-1 min-w-0">{bridgeUrl}</span>
                  <button
                    type="button"
                    onClick={handleCopyBridge}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer shrink-0"
                    aria-label="Copy guest bridge link"
                  >
                    {copiedBridge ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {onCreateBridgeRoom && (
                    <button
                      type="button"
                      disabled={generatingBridge}
                      onClick={handleGenerateFreshBridge}
                      className="flex-1 min-w-[120px] min-h-[40px] px-2 rounded-xl text-xs font-semibold cursor-pointer bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
                    >
                      {generatingBridge ? 'Creating Room...' : 'New Bridge Room'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleShareBridge}
                    className="flex-1 min-w-[110px] min-h-[40px] px-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer bg-slate-800 hover:bg-slate-700 text-white"
                  >
                    {sharedBridge ? 'Link Copied' : 'Share Link'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 12 Large Picture-Icon Quick Buttons for Rural / Non-Literate Users */}
      <section className="vaak-surface rounded-2xl p-4 sm:p-5 space-y-4 min-w-0 w-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-white">{t.quickSignalsTitle}</h2>
            <p className="text-xs text-slate-400">
              High-contrast 1-tap pictograms designed for rapid rural &amp; non-literate distress signaling
            </p>
          </div>
          <span className="font-mono-tabular text-xs text-slate-400">12 Instant Mesh Beacons</span>
        </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {QUICK_SIGNALS.map((sig) => {
            const Icon = sig.icon;
            return (
              <button
                key={sig.id}
                type="button"
                disabled={isSuspended}
                onClick={() => handleQuickIconPress(sig)}
                className="min-h-[112px] min-w-0 w-full p-2.5 sm:p-3 rounded-2xl bg-[#121418] hover:bg-[#232730] border border-white/8 hover:border-[#0EA5E9]/50 flex flex-col items-center justify-center gap-2 text-center transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${sig.tone}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-xs sm:text-sm font-bold text-white leading-tight break-words">{sig.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 break-words">{sig.subLabel}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
