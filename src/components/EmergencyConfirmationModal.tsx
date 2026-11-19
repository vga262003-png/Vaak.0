import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mic,
  PhoneCall,
  Radio,
  Send,
  ShieldAlert,
  Volume2,
  X,
} from 'lucide-react';
import { EmergencyServiceEntry, MedicalIdProfile } from '../types/app';
import { audioEngine } from '../utils/audioEngine';

interface EmergencyConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: EmergencyServiceEntry | null;
  medicalId: MedicalIdProfile;
  rateLimitSecondsLeft: number;
  onDispatchVerifiedSos: (payload: {
    service: EmergencyServiceEntry;
    situationText: string;
    hasVoiceNote: boolean;
    dispatchTimestamp: string;
  }) => void;
}

export const EmergencyConfirmationModal: React.FC<EmergencyConfirmationModalProps> = ({
  isOpen,
  onClose,
  service,
  medicalId,
  rateLimitSecondsLeft,
  onDispatchVerifiedSos,
}) => {
  const [situationText, setSituationText] = useState('');
  const [confirmedNotFalseAlarm, setConfirmedNotFalseAlarm] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceRecordedDuration, setVoiceRecordedDuration] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSituationText('');
      setConfirmedNotFalseAlarm(false);
      setIsVoiceRecording(false);
      setVoiceRecordedDuration(null);
    }
  }, [isOpen]);

  if (!isOpen || !service) return null;

  const isRateLimited = rateLimitSecondsLeft > 0;

  const handleVoiceRecordToggle = () => {
    if (isVoiceRecording) {
      setIsVoiceRecording(false);
      setVoiceRecordedDuration(6);
      audioEngine.playRogerBeep();
      if (!situationText) {
        setSituationText('Audio situation dispatch recorded: Priority medical / rescue required.');
      }
    } else {
      setIsVoiceRecording(true);
      audioEngine.playPttStart();

      // Check for SpeechRecognition
      type SpeechRecCtor = new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };

      const win = window as unknown as {
        SpeechRecognition?: SpeechRecCtor;
        webkitSpeechRecognition?: SpeechRecCtor;
      };
      const Rec = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (Rec) {
        try {
          const rec = new Rec();
          rec.lang = 'en-US';
          rec.interimResults = false;
          rec.maxAlternatives = 1;
          rec.onresult = (ev) => {
            const spoken = ev.results?.[0]?.[0]?.transcript || '';
            if (spoken) setSituationText((prev) => (prev ? `${prev} · ${spoken}` : spoken));
          };
          rec.onerror = () => setIsVoiceRecording(false);
          rec.onend = () => {
            setIsVoiceRecording(false);
            setVoiceRecordedDuration(5);
            audioEngine.playRogerBeep();
          };
          rec.start();
          return;
        } catch {}
      }

      // Fallback timer simulation
      setTimeout(() => {
        setIsVoiceRecording(false);
        setVoiceRecordedDuration(4);
        audioEngine.playRogerBeep();
        if (!situationText) {
          setSituationText('Urgent emergency situation at current GPS coordinates.');
        }
      }, 3500);
    }
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedNotFalseAlarm || isRateLimited) return;

    audioEngine.playSosPulse();
    onDispatchVerifiedSos({
      service,
      situationText: situationText.trim() || 'Verified emergency assistance requested.',
      hasVoiceNote: voiceRecordedDuration !== null,
      dispatchTimestamp: new Date().toLocaleTimeString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-[#121418] border border-rose-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#1B1E24] border-b border-rose-500/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <span>Emergency Confirmation Sign-Board</span>
              </h2>
              <p className="text-xs text-rose-400 font-medium">
                Target: {service.category} ({service.name} · {service.phone})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#232730] text-slate-400 hover:text-white cursor-pointer"
            aria-label="Cancel emergency confirmation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleDispatch} className="p-5 space-y-4 overflow-y-auto">
          {/* Rate-Limiter Alert Banner */}
          {isRateLimited ? (
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center gap-3 text-amber-200">
              <Clock className="w-5 h-5 shrink-0 text-amber-400 animate-pulse" />
              <div className="text-xs">
                <p className="font-bold">60-Second Anti-Spam Rate-Limiter Active</p>
                <p className="text-amber-300/90 font-mono-tabular">
                  Please wait {rateLimitSecondsLeft}s before dispatching another SOS to prevent network jamming.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-[#1B1E24] border border-white/8 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Anti-Spam Verification: Ready</span>
              </span>
              <span className="font-mono-tabular text-emerald-400 font-semibold">1-Minute Cooldown Guard</span>
            </div>
          )}

          {/* Offline Medical ID Snapshot attached to SOS */}
          <div className="p-3.5 rounded-2xl bg-[#1B1E24] border border-white/8 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Auto-Attached Offline Medical ID</span>
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold font-mono-tabular text-[11px]">
                Blood: {medicalId.bloodGroup}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              <strong className="text-slate-400">Allergies:</strong> {medicalId.allergies} · <strong className="text-slate-400">Notes:</strong> {medicalId.emergencyNotes}
            </p>
          </div>

          {/* Situation Input: Text or Voice */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span>Describe Emergency Situation (Optional voice/text)</span>
              <button
                type="button"
                onClick={handleVoiceRecordToggle}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isVoiceRecording
                    ? 'bg-rose-600 text-white animate-pulse'
                    : voiceRecordedDuration
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-[#232730] text-sky-400 hover:bg-slate-700'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>
                  {isVoiceRecording
                    ? 'Recording...'
                    : voiceRecordedDuration
                    ? `Voice Attached (${voiceRecordedDuration}s)`
                    : 'Record Voice'}
                </span>
              </button>
            </label>
            <textarea
              rows={3}
              value={situationText}
              onChange={(e) => setSituationText(e.target.value)}
              placeholder="e.g. Collision at crossroad, passenger injured with severe bleeding; water rescue needed..."
              className="w-full p-3 rounded-2xl bg-[#0B0E14] border border-white/10 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Mandatory Checkbox */}
          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmedNotFalseAlarm}
              onChange={(e) => setConfirmedNotFalseAlarm(e.target.checked)}
              className="w-5 h-5 rounded mt-0.5 accent-rose-500 cursor-pointer shrink-0"
            />
            <span className="text-xs text-slate-200 leading-relaxed">
              <strong className="text-rose-400 block font-semibold">Mandatory Confirmation:</strong>
              I confirm this is a genuine emergency, not a false alarm. Misuse of emergency channels is prohibited.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/3 min-h-[46px] rounded-xl bg-[#232730] hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!confirmedNotFalseAlarm || isRateLimited}
              className="w-full sm:w-2/3 min-h-[46px] rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-900/40"
            >
              <Send className="w-4 h-4" />
              <span>OK — Dispatch Verified SOS</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
