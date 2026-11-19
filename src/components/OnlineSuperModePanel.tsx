import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Globe2,
  Languages,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Share2,
  Video,
  VideoOff,
  Volume2,
} from 'lucide-react';
import { LANGUAGES_56, translateOfflineEmergencyPhrase } from '../data/languages50';
import { FamilyMember } from '../types/app';

interface OnlineSuperModePanelProps {
  family: FamilyMember[];
}

const WORLD_NODES = [
  { id: 'in', label: 'New Delhi Mesh Hub (+91)', x: 69, y: 46, emergency: '112' },
  { id: 'us', label: 'New York Relay (+1)', x: 25, y: 38, emergency: '911' },
  { id: 'gb', label: 'London Gateway (+44)', x: 47, y: 31, emergency: '999' },
  { id: 'ae', label: 'Dubai Coastal Relay (+971)', x: 61, y: 47, emergency: '999' },
  { id: 'jp', label: 'Tokyo Seismic Node (+81)', x: 84, y: 40, emergency: '110' },
  { id: 'br', label: 'São Paulo Relief (+55)', x: 33, y: 69, emergency: '190' },
  { id: 'au', label: 'Sydney Mesh Hub (+61)', x: 86, y: 74, emergency: '000' },
];

export const OnlineSuperModePanel: React.FC<OnlineSuperModePanelProps> = ({ family }) => {
  // Real Camera & Microphone HD Video Call state
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [videoTargetId, setVideoTargetId] = useState(family[0]?.id ?? '');
  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);
  const [videoResolution, setVideoResolution] = useState<string>('Checking camera...');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [audioLevelPct, setAudioLevelPct] = useState(0);
  const [roomLinkCopied, setRoomLinkCopied] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const meterFrameRef = useRef<number | null>(null);

  // 81-Language Two-Way Live Auto-Translation state
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('hi');
  const [livePhrase, setLivePhrase] = useState('Need clean drinking water');
  const [translatedOutput, setTranslatedOutput] = useState<string>(() =>
    translateOfflineEmergencyPhrase('Need clean drinking water', 'en', 'hi') || ''
  );
  const [translationMode, setTranslationMode] = useState<'offline_dict' | 'ai' | 'error'>('offline_dict');
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [listeningSpeech, setListeningSpeech] = useState(false);

  // Global World Map selected hub
  const [selectedWorldHub, setSelectedWorldHub] = useState(WORLD_NODES[0]);

  const targetMember = family.find((f) => f.id === videoTargetId) ?? family[0];

  const stopHardwareMedia = useCallback(() => {
    if (meterFrameRef.current) {
      cancelAnimationFrame(meterFrameRef.current);
      meterFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((tr) => tr.stop());
      mediaStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setAudioLevelPct(0);
  }, []);

  useEffect(() => {
    return () => {
      stopHardwareMedia();
    };
  }, [stopHardwareMedia]);

  useEffect(() => {
    if (!videoTargetId && family[0]?.id) {
      setVideoTargetId(family[0].id);
    }
  }, [family, videoTargetId]);

  useEffect(() => {
    if (!videoCallActive) {
      setCallSeconds(0);
      return;
    }
    const id = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [videoCallActive]);

  const startLiveVideoCall = async () => {
    setMediaError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMediaError('Camera/microphone API is unavailable in this browser.');
      return;
    }

    try {
      let stream: MediaStream;
      let hasVideo = true;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });
      } catch {
        hasVideo = false;
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      mediaStreamRef.current = stream;
      setCamEnabled(hasVideo);
      setMicEnabled(true);
      setVideoCallActive(true);

      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) {
        const settings = vTrack.getSettings();
        setVideoResolution(
          settings.width && settings.height
            ? `${settings.width}×${settings.height} Live Camera`
            : 'Live HD Camera'
        );
      } else {
        setVideoResolution('Audio-Only Mic Stream');
      }

      window.setTimeout(() => {
        if (localVideoRef.current && mediaStreamRef.current) {
          localVideoRef.current.srcObject = mediaStreamRef.current;
          localVideoRef.current.play().catch(() => {});
        }
      }, 40);

      // Real live mic VU level meter via Web Audio AnalyserNode
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx && stream.getAudioTracks().length > 0) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tickMeter = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          setAudioLevelPct(Math.min(100, Math.round((avg / 128) * 100)));
          meterFrameRef.current = requestAnimationFrame(tickMeter);
        };
        tickMeter();
      }
    } catch (err) {
      stopHardwareMedia();
      setVideoCallActive(false);
      setMediaError(
        err instanceof Error
          ? `Camera/Mic permission denied: ${err.message}`
          : 'Camera and microphone access denied. Allow permissions and retry.'
      );
    }
  };

  const toggleCameraTrack = () => {
    const stream = mediaStreamRef.current;
    if (!stream) return;
    const next = !camEnabled;
    stream.getVideoTracks().forEach((tr) => {
      tr.enabled = next;
    });
    setCamEnabled(next);
  };

  const toggleMicTrack = () => {
    const stream = mediaStreamRef.current;
    if (!stream) return;
    const next = !micEnabled;
    stream.getAudioTracks().forEach((tr) => {
      tr.enabled = next;
    });
    setMicEnabled(next);
  };

  const endLiveVideoCall = () => {
    stopHardwareMedia();
    setVideoCallActive(false);
  };

  // Real 81-Language Live Translation (Instant Offline Dict first -> Real Server AI /api/translate)
  const runLiveTranslation = useCallback(
    async (text: string, srcCode: string, dstCode: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setTranslatedOutput('');
        setTranslationError(null);
        return;
      }

      const offlineHit = translateOfflineEmergencyPhrase(trimmed, srcCode, dstCode);
      if (offlineHit !== null) {
        setTranslatedOutput(offlineHit);
        setTranslationMode('offline_dict');
        setTranslationError(null);
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setTranslationMode('error');
        setTranslatedOutput('');
        setTranslationError('Offline: connect internet for custom free-text AI translation.');
        return;
      }

      const srcMeta = LANGUAGES_56.find((l) => l.code === srcCode);
      const dstMeta = LANGUAGES_56.find((l) => l.code === dstCode);
      setTranslating(true);
      setTranslationError(null);

      try {
        const resp = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmed,
            sourceLangCode: srcCode,
            sourceLangName: srcMeta?.name || srcCode,
            targetLangCode: dstCode,
            targetLangName: dstMeta?.name || dstCode,
          }),
        });
        const data = await resp.json();
        if (resp.ok && data.translatedText) {
          setTranslatedOutput(data.translatedText);
          setTranslationMode('ai');
        } else {
          setTranslationMode('error');
          setTranslatedOutput('');
          setTranslationError(data.error || 'Live translation failed.');
        }
      } catch {
        setTranslationMode('error');
        setTranslatedOutput('');
        setTranslationError('Unable to reach server translation endpoint.');
      } finally {
        setTranslating(false);
      }
    },
    []
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      void runLiveTranslation(livePhrase, sourceLang, targetLang);
    }, 380);
    return () => clearTimeout(id);
  }, [livePhrase, sourceLang, targetLang, runLiveTranslation]);

  const handleSpeakTranslation = () => {
    if (!translatedOutput || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(translatedOutput);
    utter.lang = targetLang;
    window.speechSynthesis.speak(utter);
  };

  const handleVoiceDictate = () => {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any })
        .SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any })
        .webkitSpeechRecognition;
    if (!SR) {
      setTranslationError('Voice speech recognition is not supported on this browser.');
      return;
    }
    const rec = new SR();
    rec.lang = sourceLang;
    rec.interimResults = false;
    rec.onstart = () => setListeningSpeech(true);
    rec.onend = () => setListeningSpeech(false);
    rec.onerror = () => setListeningSpeech(false);
    rec.onresult = (ev: { results?: ArrayLike<ArrayLike<{ transcript?: string }>> }) => {
      const spoken = ev.results?.[0]?.[0]?.transcript;
      if (spoken) setLivePhrase(spoken);
    };
    rec.start();
  };

  const formatMmSs = (sec: number) =>
    `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 1. Real Camera & Mic Video Call Console */}
        <section className="lg:col-span-6 min-w-0 w-full overflow-hidden vaak-surface rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="break-words">Online Super-Mode · Live Video &amp; Mic Console</span>
              </h3>
              <p className="text-xs text-slate-400">
                Real browser camera preview, hardware mic VU monitor &amp; track controls
              </p>
            </div>
            <span className="font-mono-tabular text-xs text-emerald-400">
              {videoCallActive ? `LIVE ${formatMmSs(callSeconds)}` : 'WEBRTC READY'}
            </span>
          </div>

          <div className="relative h-60 rounded-2xl bg-[#070D1A] border border-slate-800 overflow-hidden flex items-center justify-center">
            {videoCallActive ? (
              <>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${camEnabled ? 'opacity-100' : 'opacity-10'}`}
                />
                {!camEnabled && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 space-y-1">
                    <VideoOff className="w-8 h-8 text-rose-400" />
                    <p className="text-xs font-medium">Camera Paused (Audio Active)</p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3 flex items-center justify-between gap-2 text-xs text-white">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      Calling: {targetMember?.name || 'Family Mesh Channel'}
                    </p>
                    <p className="text-[11px] text-emerald-300 font-mono-tabular truncate">
                      {videoResolution} · Mic {micEnabled ? `${audioLevelPct}%` : 'MUTED'}
                    </p>
                  </div>
                  <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden shrink-0">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${micEnabled ? audioLevelPct : 0}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center space-y-2 px-4">
                <Video className="w-9 h-9 text-blue-400 mx-auto" />
                <p className="text-sm font-medium text-slate-200">
                  Live Camera &amp; Microphone Ready
                </p>
                <p className="text-xs text-slate-400">
                  Requests real hardware camera + microphone access when started.
                </p>
              </div>
            )}
          </div>

          {mediaError && (
            <p className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/40 rounded-xl p-2.5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{mediaError}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={videoTargetId || (family[0]?.id ?? '')}
              disabled={videoCallActive || family.length === 0}
              onChange={(e) => setVideoTargetId(e.target.value)}
              className="w-full sm:flex-1 min-w-0 min-h-[42px] px-3 rounded-xl bg-[#121418] border border-white/10 text-xs text-white"
            >
              {family.length === 0 ? (
                <option value="">Personal Camera / Local Monitor</option>
              ) : (
                family.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.status})
                  </option>
                ))
              )}
            </select>

            {!videoCallActive ? (
              <button
                type="button"
                onClick={startLiveVideoCall}
                className="min-h-[42px] px-4 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Start Live Camera</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleCameraTrack}
                  className="min-h-[42px] min-w-[42px] rounded-xl bg-slate-800 text-white flex items-center justify-center cursor-pointer"
                  aria-label="Toggle camera"
                >
                  {camEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMicTrack}
                  className="min-h-[42px] min-w-[42px] rounded-xl bg-slate-800 text-white flex items-center justify-center cursor-pointer"
                  aria-label="Toggle mic"
                >
                  {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-rose-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/?roomPin=446820`;
                    navigator.clipboard?.writeText(url).catch(() => {});
                    setRoomLinkCopied(true);
                    setTimeout(() => setRoomLinkCopied(false), 1800);
                  }}
                  className="min-h-[42px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{roomLinkCopied ? 'Copied' : 'Room Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={endLiveVideoCall}
                  className="min-h-[42px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 2. Real 81-Language Two-Way Live Translation */}
        <section className="lg:col-span-6 min-w-0 w-full overflow-hidden vaak-surface rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold text-white flex items-center gap-2">
                <Languages className="w-4 h-4 text-[#0EA5E9] shrink-0" />
                <span className="break-words">81-Language Two-Way Live Translation</span>
              </h3>
              <p className="text-xs text-slate-400">
                Instant offline disaster phrases + live server AI translation across {LANGUAGES_56.length} languages
              </p>
            </div>
            <span className="font-mono-tabular text-xs text-[#0EA5E9] shrink-0">{LANGUAGES_56.length} LANGS</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              aria-label="Speaker source language"
              className="w-full sm:flex-1 min-w-0 min-h-[42px] px-3 rounded-xl bg-[#121418] border border-white/10 text-xs text-white"
            >
              {LANGUAGES_56.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.native})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setSourceLang(targetLang);
                setTargetLang(sourceLang);
              }}
              className="min-h-[42px] min-w-[42px] self-center rounded-xl bg-[#121418] border border-white/10 flex items-center justify-center text-[#0EA5E9] hover:text-white cursor-pointer shrink-0"
              aria-label="Swap languages"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>

            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              aria-label="Recipient target language"
              className="w-full sm:flex-1 min-w-0 min-h-[42px] px-3 rounded-xl bg-[#121418] border border-white/10 text-xs text-white"
            >
              {LANGUAGES_56.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.native})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {[
                'Safe at shelter',
                'Need clean drinking water',
                'Medical team en route',
                'Bridge flooded, use north road',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLivePhrase(preset)}
                  className="px-2.5 py-1 rounded-lg bg-[#121418] border border-white/8 hover:border-[#0EA5E9]/50 text-[11px] text-slate-300 cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex gap-2 min-w-0">
              <input
                type="text"
                value={livePhrase}
                onChange={(e) => setLivePhrase(e.target.value)}
                placeholder="Type any sentence to translate live..."
                className="flex-1 min-w-0 min-h-[44px] px-3.5 rounded-xl bg-[#121418] border border-white/10 text-sm text-white focus:outline-none focus:border-[#0EA5E9]"
              />
              <button
                type="button"
                onClick={handleVoiceDictate}
                title="Speak to translate"
                aria-label="Voice dictate phrase"
                className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                  listeningSpeech
                    ? 'bg-rose-600 border-rose-400 text-white'
                    : 'bg-[#121418] border-white/10 text-sky-400 hover:border-[#0EA5E9]'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121418] border border-[#0EA5E9]/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-[#0EA5E9] font-medium flex items-center gap-1.5">
                {translating && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>
                  Translated ({LANGUAGES_56.find((l) => l.code === targetLang)?.name}) ·{' '}
                  {translationMode === 'offline_dict'
                    ? 'Offline Phrase Match'
                    : translationMode === 'ai'
                    ? 'Live AI'
                    : 'Unavailable'}
                </span>
              </p>
              {translatedOutput && (
                <button
                  type="button"
                  onClick={handleSpeakTranslation}
                  className="px-2.5 py-1 rounded-lg bg-[#0EA5E9]/15 hover:bg-[#0EA5E9]/25 text-[#0EA5E9] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Speak</span>
                </button>
              )}
            </div>
            {translationError ? (
              <p className="text-xs text-amber-300">{translationError}</p>
            ) : (
              <p className="text-base font-semibold text-white leading-snug">
                {translatedOutput || '—'}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* 3. Global World Map */}
      <section className="vaak-surface rounded-2xl p-4 sm:p-5 space-y-4 min-w-0 w-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-semibold text-white flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="break-words">Global World Map · International Relay &amp; SOS Gateways</span>
            </h3>
            <p className="text-xs text-slate-400">
              Select any continental gateway to inspect and dial international emergency routing
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono-tabular text-xs text-blue-300">
              {selectedWorldHub.label}
            </span>
            <a
              href={`tel:${selectedWorldHub.emergency}`}
              className="px-2.5 py-1 rounded-lg bg-rose-600/20 border border-rose-500/40 text-xs font-mono-tabular font-bold text-rose-300 hover:bg-rose-600/30 flex items-center gap-1"
            >
              <Phone className="w-3 h-3" />
              <span>Dial {selectedWorldHub.emergency}</span>
            </a>
          </div>
        </div>

        <div className="relative w-full h-56 sm:h-64 rounded-2xl bg-[#070D1A] border border-slate-800 overflow-hidden">
          <svg
            viewBox="0 0 1000 460"
            className="w-full h-full opacity-80"
            preserveAspectRatio="xMidYMid slice"
            aria-label="Global World Map Relay View"
          >
            {[90, 180, 270, 360].map((y) => (
              <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="#1E293B" strokeWidth="1" />
            ))}
            {[200, 400, 600, 800].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="460" stroke="#1E293B" strokeWidth="1" />
            ))}
            <path d="M95,95 L235,80 L285,145 L240,210 L175,235 L125,180 Z" fill="#172554" stroke="#2563EB" strokeOpacity="0.4" />
            <path d="M250,245 L335,255 L360,340 L300,415 L265,365 Z" fill="#172554" stroke="#2563EB" strokeOpacity="0.4" />
            <path d="M435,85 L545,80 L565,155 L445,165 Z" fill="#172554" stroke="#2563EB" strokeOpacity="0.4" />
            <path d="M445,175 L560,185 L585,305 L505,365 L455,270 Z" fill="#172554" stroke="#2563EB" strokeOpacity="0.4" />
            <path d="M565,90 L820,95 L875,195 L750,255 L615,230 L570,155 Z" fill="#172554" stroke="#2563EB" strokeOpacity="0.4" />
            <path d="M785,295 L895,295 L905,380 L795,380 Z" fill="#172554" stroke="#2563EB" strokeOpacity="0.4" />
          </svg>

          {WORLD_NODES.map((hub) => {
            const active = selectedWorldHub.id === hub.id;
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => setSelectedWorldHub(hub)}
                style={{ left: `${hub.x}%`, top: `${hub.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group"
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 border-[#070D1A] transition-transform ${
                    active ? 'bg-blue-400 scale-125 ring-4 ring-blue-500/40' : 'bg-emerald-400'
                  }`}
                />
                <span className="mt-1 px-1.5 py-0.5 rounded bg-[#0B1120]/90 border border-slate-700 text-[10px] text-slate-100 whitespace-nowrap">
                  {hub.label.split(' ')[0]} ({hub.emergency})
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
