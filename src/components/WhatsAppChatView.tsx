import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCheck,
  MapPin,
  Paperclip,
  PhoneCall,
  Radio,
  Send,
  Smile,
  Users,
  AlertTriangle,
  X,
  PhoneOff,
} from 'lucide-react';
import { TransportMode, VoiceNoteAttachment } from '../types/app';
import { audioEngine } from '../utils/audioEngine';
import {
  buildMapsLink,
  formatLiveLocationSummary,
  requestLiveGps,
} from '../utils/geolocation';
import { VoiceNoteHoldButton, VoiceNotePlayer } from './VoiceNoteBar';

export interface ChatContactUser {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  status: string;
  isGroup?: boolean;
  members?: string[];
  groupCategory?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string; // 'me' or contact id
  senderName?: string; // For group chats
  text: string;
  timestamp: string;
  isVoice?: boolean;
  voiceNote?: VoiceNoteAttachment;
  delivered: boolean;
}

interface WhatsAppChatViewProps {
  currentUserCallSign: string;
  contact: ChatContactUser;
  mode: TransportMode;
  messages: ChatMessage[];
  onBack: () => void;
  onSendMessage: (contactId: string, text: string, voiceNote?: VoiceNoteAttachment) => void;
  onVoiceCall: (contact: ChatContactUser) => void;
  onSendTransmission?: (payload: {
    channel: string;
    text: string;
    isAudio?: boolean;
    voiceNote?: VoiceNoteAttachment;
  }) => void;
}

export const WhatsAppChatView: React.FC<WhatsAppChatViewProps> = ({
  currentUserCallSign,
  contact,
  mode,
  messages,
  onBack,
  onSendMessage,
  onVoiceCall,
  onSendTransmission,
}) => {
  const [draft, setDraft] = useState('');
  const [activeCallMode, setActiveCallMode] = useState<'none' | 'voice' | 'walkie' | 'sos'>('none');
  const [callTimerSec, setCallTimerSec] = useState(300); // 5 minute max voice call countdown
  const [walkieTransmitting, setWalkieTransmitting] = useState(false);
  const [showQuickBar, setShowQuickBar] = useState(false);
  const [attachingGps, setAttachingGps] = useState(false);

  // Call timer countdown for 5-minute voice call
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (activeCallMode === 'voice') {
      audioEngine.playNormalRing();
      interval = setInterval(() => {
        setCallTimerSec((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            setActiveCallMode('none');
            audioEngine.playCallCutoff();
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (activeCallMode === 'sos') {
      const sosInterval = setInterval(() => {
        audioEngine.playEmergencySosRingtone();
      }, 600);
      return () => clearInterval(sosInterval);
    } else {
      setCallTimerSec(300);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCallMode]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    audioEngine.playSonarPing();
    onSendMessage(contact.id, draft.trim());
    setDraft('');
    setShowQuickBar(false);
  };

  const handleSendVoice = (note: VoiceNoteAttachment) => {
    onSendMessage(contact.id, `Voice message (${note.durationSec}s · ${note.codecLabel})`, note);
  };

  const handleAttachLiveGps = async () => {
    if (attachingGps) return;
    setAttachingGps(true);
    const gps = await requestLiveGps(3500);
    setAttachingGps(false);
    audioEngine.playSonarPing();
    if (gps && gps.source === 'gps') {
      const summary = formatLiveLocationSummary(gps);
      const mapUrl = buildMapsLink(gps.lat, gps.lng);
      onSendMessage(
        contact.id,
        `📍 Live GPS Share: ${summary.coordsText}${gps.accuracyM ? ` (±${gps.accuracyM}m)` : ''}\n🗺️ Map: ${mapUrl}`
      );
    } else {
      setDraft((prev) => (prev ? `${prev} [GPS permission required on device]` : 'Need help at my location (enable browser GPS to attach exact coordinates)'));
    }
  };

  const handleStartWalkiePtt = () => {
    audioEngine.playPttStart();
    setWalkieTransmitting(true);
    if (onSendTransmission) {
      onSendTransmission({
        channel: contact.name,
        text: `Walkie PTT ping from ${currentUserCallSign} to ${contact.name}`,
        isAudio: true,
      });
    }
    onSendMessage(contact.id, `📻 Walkie PTT channel ping sent by ${currentUserCallSign}`);
    setTimeout(() => {
      audioEngine.playRogerBeep();
      setWalkieTransmitting(false);
    }, 1500);
  };

  const contactInitials = contact.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[70] w-full max-w-full overflow-x-hidden box-border flex flex-col bg-[#0B141A] text-slate-100 select-none animate-fade-in">
      {/* WhatsApp Green Top Header with Compact Action Toolbar */}
      <header className="px-3 sm:px-4 py-2.5 bg-[#1F2C34] border-b border-white/10 flex items-center justify-between gap-2 shrink-0 shadow-md w-full max-w-full box-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-10 h-10 rounded-full bg-sky-600/30 border border-sky-400/40 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
            {contact.avatar ? (
              <img
                src={contact.avatar}
                alt={contact.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : contact.isGroup ? (
              <Users className="w-5 h-5 text-sky-400" />
            ) : (
              <span>{contactInitials}</span>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-semibold text-white truncate">
              {contact.name}
            </span>
            <span className="text-[11px] font-mono-tabular text-emerald-400 truncate">
              {contact.isGroup ? `${contact.members?.length || 0} members · Group Chat` : `${contact.phone} · ${contact.status}`}
            </span>
          </div>
        </div>

        {/* Compact Action Toolbar inside Header */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 5-Min Voice Call Button */}
          <button
            type="button"
            onClick={() => {
              setActiveCallMode('voice');
              onVoiceCall(contact);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
            title="Start 5-Minute Secure Voice Call"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Voice Call</span>
          </button>

          {/* 1-on-1 Walkie PTT Button */}
          <button
            type="button"
            onClick={handleStartWalkiePtt}
            className="px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
            title="Instant Push-to-Talk Walkie"
          >
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Walkie</span>
          </button>

          {/* Emergency SOS Call Button */}
          <button
            type="button"
            onClick={() => {
              setActiveCallMode('sos');
              audioEngine.playEmergencySosRingtone();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors animate-pulse"
            title="Emergency SOS Priority Call"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">SOS Call</span>
          </button>
        </div>
      </header>

      {/* Active Call / SOS Overlays */}
      {activeCallMode === 'voice' && (
        <div className="bg-[#1F2C34] border-b border-emerald-500/30 px-4 py-3 flex items-center justify-between gap-3 animate-fade-in shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <p className="text-xs font-semibold text-white">Secure 5-Minute Voice Call with {contact.name}</p>
              <p className="text-[11px] font-mono text-emerald-400">Live Encryption Active · Time Remaining: {formatCountdown(callTimerSec)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                audioEngine.playCallCutoff();
                setActiveCallMode('none');
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" /> End Call
            </button>
          </div>
        </div>
      )}

      {activeCallMode === 'sos' && (
        <div className="bg-rose-950/90 border-b border-rose-600 px-4 py-3 flex items-center justify-between gap-3 animate-pulse shrink-0">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">🚨 EMERGENCY SOS PRIORITY CALL ACTIVE</p>
              <p className="text-[11px] font-mono text-rose-200">Broadcasting urgent SOS ping &amp; repeating alarm to {contact.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              audioEngine.playCallCutoff();
              setActiveCallMode('none');
            }}
            className="px-3 py-1.5 rounded-lg bg-white text-rose-900 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <X className="w-4 h-4" /> Dismiss SOS
          </button>
        </div>
      )}

      {walkieTransmitting && (
        <div className="bg-sky-950/90 border-b border-sky-600 px-4 py-2 flex items-center justify-center gap-2 text-sky-200 text-xs font-semibold shrink-0 animate-pulse">
          <Radio className="w-4 h-4 text-sky-400 animate-spin" />
          <span>Broadcasting 1-on-1 Walkie Transmission to {contact.name}...</span>
        </div>
      )}

      {/* Chat Wallpaper Background & Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-[radial-gradient(#111B21_1px,transparent_1px)] bg-[size:16px_16px] w-full max-w-full box-border">
        {/* Encryption Security Banner */}
        <div className="max-w-md mx-auto my-2 p-2.5 rounded-xl bg-[#182229] border border-[#222D34] text-center text-[11px] text-amber-300/90 shadow">
          🔒 End-to-end encrypted with Paninian KDF &amp; Mesh Transport. Secure communications verified.
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 space-y-1">
            <p>No messages yet with {contact.name}.</p>
            <p className="font-mono text-slate-500">Send a message, voice note, or announcement (Suchna) below.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === 'me';
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in w-full`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-md space-y-1 text-sm ${
                    isMe
                      ? 'bg-[#005C4B] text-white rounded-tr-none'
                      : 'bg-[#202C33] text-slate-100 rounded-tl-none'
                  }`}
                >
                  {!isMe && contact.isGroup && msg.senderName && (
                    <p className="text-[11px] font-semibold text-emerald-400 pb-0.5 border-b border-white/10">
                      {msg.senderName}
                    </p>
                  )}

                  {msg.voiceNote ? (
                    <VoiceNotePlayer note={msg.voiceNote} />
                  ) : (
                    <p className="leading-relaxed break-words">{msg.text}</p>
                  )}

                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-300/80 font-mono-tabular pt-0.5">
                    <span>{msg.timestamp}</span>
                    {isMe && (
                      <span className="text-sky-400" title="Delivered">
                        <CheckCheck className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Emoji / Emergency Chips Strip */}
      {showQuickBar && (
        <div className="px-3 py-2 bg-[#182229] border-t border-white/10 flex items-center gap-1.5 overflow-x-auto shrink-0">
          {[
            '✅ Safe here',
            '🚨 Need help',
            '💧 Need water',
            '💊 Medical aid',
            '🔋 Low battery',
            '👍',
            '🙏',
            '📍',
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setDraft((prev) => (prev ? `${prev} ${chip}` : chip));
              }}
              className="px-2.5 py-1.5 rounded-xl bg-[#2A3942] hover:bg-emerald-700/40 text-xs text-white whitespace-nowrap cursor-pointer shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* WhatsApp Bottom Input Bar - Strictly responsive w-full max-w-full */}
      <footer className="p-2 sm:p-3 bg-[#1F2C34] border-t border-white/10 shrink-0 w-full max-w-full box-border">
        <form onSubmit={handleSend} className="w-full max-w-4xl mx-auto flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setShowQuickBar((v) => !v)}
            className={`p-2 cursor-pointer rounded-xl transition-colors shrink-0 ${
              showQuickBar
                ? 'text-emerald-400 bg-emerald-500/15'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Quick Replies & Emoji"
            aria-label="Emoji selector"
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            type="button"
            disabled={attachingGps}
            onClick={() => void handleAttachLiveGps()}
            className="p-2 text-slate-400 hover:text-emerald-400 cursor-pointer rounded-xl hover:bg-white/5 transition-colors shrink-0 flex items-center gap-1"
            title="Share Live GPS Pin"
            aria-label="Share Live GPS Location"
          >
            {attachingGps ? <MapPin className="w-5 h-5 animate-pulse text-sky-400" /> : <Paperclip className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={contact.isGroup ? `Broadcast notice to ${contact.name}...` : `Type message to ${contact.name}...`}
            className="flex-1 min-w-0 min-h-[44px] px-3 sm:px-4 rounded-xl bg-[#2A3942] border border-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 box-border"
          />

          <div className="shrink-0">
            <VoiceNoteHoldButton
              mode={mode}
              label=""
              compact
              onSendVoiceNote={handleSendVoice}
            />
          </div>

          <button
            type="submit"
            disabled={!draft.trim()}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#00A884] hover:bg-[#008f72] disabled:bg-[#2A3942] disabled:opacity-50 text-white flex items-center justify-center cursor-pointer transition-colors shadow shrink-0"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
};
