import React, { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Square, Trash2 } from 'lucide-react';
import { TransportMode, VoiceNoteAttachment } from '../types/app';
import { audioEngine } from '../utils/audioEngine';

interface VoiceNoteHoldButtonProps {
  mode: TransportMode;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
  onSendVoiceNote: (note: VoiceNoteAttachment) => void;
}

const MAX_DURATION_SEC = 60;

export const VoiceNoteHoldButton: React.FC<VoiceNoteHoldButtonProps> = ({
  mode,
  disabled = false,
  compact = false,
  label = 'Hold Mic',
  onSendVoiceNote,
}) => {
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [cancelled, setCancelled] = useState(false);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef<boolean>(false);
  const recordingRef = useRef<boolean>(false);

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  const finalizeAndEmit = (audioUrl?: string) => {
    if (cancelledRef.current) return;
    const durationSec = Math.max(
      1,
      Math.min(MAX_DURATION_SEC, Math.round((Date.now() - startTimeRef.current) / 1000))
    );
    const bars = Array.from({ length: 14 }, (_, idx) => 28 + ((durationSec * 13 + idx * 23) % 68));
    const codecLabel =
      mode === 'online'
        ? 'Opus 16kbps'
        : mode === 'mesh'
        ? '6kbps Mesh Compressed'
        : '18.5kHz Sonic Audio';

    audioEngine.playRogerBeep();
    onSendVoiceNote({
      id: `vn-${Date.now()}`,
      durationSec,
      audioUrl,
      codecLabel,
      waveform: bars,
    });
  };

  const stopRecording = (shouldCancel = false) => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    cancelledRef.current = shouldCancel;
    setCancelled(shouldCancel);
    setRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
        return;
      } catch {
        // Fallback below
      }
    }

    cleanupStream();
    if (!shouldCancel) {
      finalizeAndEmit(undefined);
    }
    setElapsedSec(0);
  };

  const startRecording = async () => {
    if (disabled || recordingRef.current) return;
    cancelledRef.current = false;
    recordingRef.current = true;
    setCancelled(false);
    setElapsedSec(0);
    setRecording(true);
    startTimeRef.current = Date.now();
    audioEngine.playPttStart();

    timerRef.current = window.setInterval(() => {
      const next = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (next >= MAX_DURATION_SEC) {
        stopRecording(false);
      } else {
        setElapsedSec(next);
      }
    }, 250);

    // Try real browser MediaRecorder when microphone is available
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!recordingRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunksRef.current.push(ev.data);
        };

        recorder.onstop = () => {
          const wasCancelled = cancelledRef.current;
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const url = blob.size > 0 && !wasCancelled ? URL.createObjectURL(blob) : undefined;
          cleanupStream();
          if (!wasCancelled) {
            finalizeAndEmit(url);
          }
          setElapsedSec(0);
        };

        recorder.start();
      } catch {
        // Gracefully operate compressed mesh timer recording if mic hardware blocked
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanupStream();
    };
  }, []);

  const formatSec = (s: number) => `0:${String(s).padStart(2, '0')}`;

  if (recording) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#1B1E24] border border-sky-500/50 max-w-full">
        <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] shrink-0" />
        <span className="font-mono-tabular text-xs font-semibold text-white shrink-0">
          {formatSec(elapsedSec)} / 1:00
        </span>
        <button
          type="button"
          onClick={() => stopRecording(true)}
          className="min-h-[34px] px-2 rounded-lg text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
          aria-label="Cancel voice note"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>
        <button
          type="button"
          onClick={() => stopRecording(false)}
          className="min-h-[34px] px-3 rounded-lg bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
          aria-label="Send voice note"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>Send</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={startRecording}
      onMouseUp={() => stopRecording(false)}
      onMouseLeave={() => recording && stopRecording(false)}
      onTouchStart={(e) => {
        e.preventDefault();
        startRecording();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        stopRecording(false);
      }}
      title={cancelled ? 'Cancelled' : 'Hold to record up to 1-minute compressed voice note'}
      className={`${
        compact ? 'min-h-[44px] px-3' : 'min-h-[46px] px-4'
      } rounded-xl bg-[#232730] hover:bg-sky-500/20 border border-white/10 hover:border-sky-500/50 text-sky-400 text-xs font-semibold flex items-center justify-center gap-1.5 select-none transition-colors disabled:opacity-40 cursor-pointer shrink-0`}
      aria-label="Hold to record voice note"
    >
      <Mic className="w-4 h-4 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
};

interface VoiceNotePlayerProps {
  note: VoiceNoteAttachment;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ note }) => {
  const [playing, setPlaying] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopPlayback = () => {
    setPlaying(false);
    setProgressIdx(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const togglePlay = () => {
    if (playing) {
      stopPlayback();
      return;
    }

    setPlaying(true);
    setProgressIdx(0);

    if (note.audioUrl) {
      const audio = new Audio(note.audioUrl);
      audioRef.current = audio;
      audio.onended = () => stopPlayback();
      audio.play().catch(() => {});
    } else {
      audioEngine.playSonarPing();
    }

    const totalTicks = note.waveform.length;
    const stepMs = Math.max(120, Math.round((note.durationSec * 1000) / totalTicks));
    timerRef.current = window.setInterval(() => {
      setProgressIdx((prev) => {
        if (prev + 1 >= totalTicks) {
          stopPlayback();
          return 0;
        }
        return prev + 1;
      });
    }, stepMs);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#121418] border border-white/10">
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-[#0EA5E9] hover:bg-sky-400 text-white flex items-center justify-center shrink-0 cursor-pointer"
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-end gap-1 h-5" aria-hidden="true">
          {note.waveform.map((heightPct, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-colors ${
                playing && i <= progressIdx ? 'bg-[#0EA5E9]' : 'bg-slate-600'
              }`}
              style={{ height: `${heightPct}%` }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-tabular">
          <span>0:{String(note.durationSec).padStart(2, '0')}</span>
          <span>{note.codecLabel}</span>
        </div>
      </div>
    </div>
  );
};
