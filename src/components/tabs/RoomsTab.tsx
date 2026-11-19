import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Hash,
  KeyRound,
  Plus,
  Send,
  Share2,
  Shield,
  Users,
} from 'lucide-react';
import { AppLanguage, ChatRoom, TransportMode, VoiceNoteAttachment } from '../../types/app';
import { getTranslation } from '../../data/i18n';
import { VoiceNoteHoldButton, VoiceNotePlayer } from '../VoiceNoteBar';

interface RoomsTabProps {
  language: AppLanguage;
  mode: TransportMode;
  rooms: ChatRoom[];
  isSuspended: boolean;
  onCreateRoom: (name: string, category: ChatRoom['category']) => ChatRoom;
  onJoinByPin: (pin: string) => Promise<ChatRoom | null> | ChatRoom | null;
  onSendRoomMessage: (roomId: string, text: string, voiceNote?: VoiceNoteAttachment) => void;
}

export const RoomsTab: React.FC<RoomsTabProps> = ({
  language,
  mode,
  rooms,
  isSuspended,
  onCreateRoom,
  onJoinByPin,
  onSendRoomMessage,
}) => {
  const t = getTranslation(language);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id ?? '');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [roomLinkCopied, setRoomLinkCopied] = useState(false);

  React.useEffect(() => {
    if (rooms.length > 0 && !rooms.some((r) => r.id === selectedRoomId)) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState<ChatRoom['category']>('Outing');
  const [msgDraft, setMsgDraft] = useState('');

  const activeRoom = rooms.find((r) => r.id === selectedRoomId) ?? rooms[0];

  const handleCopyRoomLink = () => {
    if (!activeRoom) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/?roomPin=${activeRoom.pin}`;
    const text = `Join my encrypted room #${activeRoom.pin} (${activeRoom.name}) on Vaak: ${shareUrl}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setRoomLinkCopied(true);
    setTimeout(() => setRoomLinkCopied(false), 2200);
  };

  const handleShareRoomWhatsApp = () => {
    if (!activeRoom) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/?roomPin=${activeRoom.pin}`;
    const msg = `Join my encrypted Vaak room #${activeRoom.pin} (${activeRoom.name}): ${shareUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    const a = document.createElement('a');
    a.href = waUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const cleaned = pinInput.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      setPinError('Enter an exact 6-digit Room PIN.');
      return;
    }
    const found = await onJoinByPin(cleaned);
    if (found) {
      setSelectedRoomId(found.id);
      setPinInput('');
    } else {
      setPinError(`No active room found for PIN ${cleaned}. Create a room or ask a member for their 6-digit PIN.`);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const created = onCreateRoom(newRoomName.trim(), newRoomCategory);
    setSelectedRoomId(created.id);
    setNewRoomName('');
    setShowCreateForm(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !msgDraft.trim() || isSuspended) return;
    onSendRoomMessage(activeRoom.id, msgDraft.trim());
    setMsgDraft('');
  };

  const handleSendRoomVoiceNote = (note: VoiceNoteAttachment) => {
    if (!activeRoom || isSuspended) return;
    onSendRoomMessage(activeRoom.id, `Voice note (${note.durationSec}s · ${note.codecLabel})`, note);
  };

  return (
    <div className="w-full max-w-5xl mx-auto min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Sidebar: PIN Entry + Room Directory */}
      <section className="lg:col-span-5 min-w-0 w-full overflow-hidden vaak-surface rounded-2xl p-4 sm:p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-white">{t.roomsTitle}</h2>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="min-h-[40px] px-3 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createRoom}</span>
          </button>
        </div>

        {/* Create Room Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateSubmit} className="p-4 rounded-xl bg-[#121418] border border-[#0EA5E9]/40 space-y-3">
            <p className="text-xs font-semibold text-sky-300">Auto-generates a unique 6-digit PIN</p>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name (e.g. Weekend Camp, Flood Ward 3)"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#1B1E24] border border-white/10 text-sm text-white focus:outline-none focus:border-[#0EA5E9]"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={newRoomCategory}
                onChange={(e) => setNewRoomCategory(e.target.value as ChatRoom['category'])}
                className="w-full sm:flex-1 min-w-0 min-h-[44px] px-3 rounded-xl bg-[#1B1E24] border border-white/10 text-xs text-white"
              >
                <option value="Outing">Outing</option>
                <option value="Event">Event</option>
                <option value="Friend Group">Friend Group</option>
                <option value="Neighborhood">Neighborhood</option>
              </select>
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shrink-0"
              >
                Generate PIN
              </button>
            </div>
          </form>
        )}

        {/* Join by 6-Digit PIN */}
        <form onSubmit={handleJoinSubmit} className="space-y-2">
          <label className="text-xs font-medium text-slate-300">{t.joinRoom}</label>
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit PIN"
                className="w-full min-h-[46px] pl-9 pr-3 rounded-xl bg-[#121418] border border-white/10 font-mono-tabular text-sm tracking-widest text-white focus:outline-none focus:border-[#0EA5E9]"
              />
            </div>
            <button
              type="submit"
              className="min-h-[46px] px-4 rounded-xl bg-[#232730] hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
            >
              Join
            </button>
          </div>
          {pinError && (
            <p className="text-xs text-[#F43F5E] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{pinError}</span>
            </p>
          )}
        </form>

        {/* Active Room List */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400">Your Active Rooms ({rooms.length})</p>
          <div className="divide-y divide-white/8 rounded-xl bg-[#121418]/80 border border-white/8 overflow-hidden">
            {rooms.length === 0 ? (
              <p className="p-5 text-center text-xs text-slate-400">
                No active rooms yet. Tap &ldquo;Create Room&rdquo; or enter a 6-digit Room PIN above.
              </p>
            ) : (
              rooms.map((room) => {
                const isSelected = activeRoom?.id === room.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`w-full p-3.5 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected ? 'bg-[#0EA5E9]/15' : 'hover:bg-[#1B1E24]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{room.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {room.category} · {room.memberCount} members · {room.createdAt}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 font-mono-tabular text-xs font-bold text-[#0EA5E9]">
                        <Hash className="w-3 h-3" />
                        {room.pin}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Right: Active Room Conversation + Voice Note */}
      <section className="lg:col-span-7 min-w-0 w-full overflow-hidden vaak-surface rounded-2xl p-4 sm:p-6 flex flex-col min-h-[480px]">
        {activeRoom ? (
          <>
            <div className="pb-4 border-b border-white/8 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-bold text-white truncate">{activeRoom.name}</h3>
                <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                  <span>{activeRoom.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {activeRoom.memberCount} participants
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyRoomLink}
                    title="Copy 6-Digit Room Link"
                    className="min-h-[34px] px-2.5 rounded-lg bg-[#121418] hover:bg-[#232730] border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    {roomLinkCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#0EA5E9]" />
                        <span>Share Link</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleShareRoomWhatsApp}
                    title="Share Room PIN via WhatsApp"
                    className="min-h-[34px] px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>
                </div>
                <div className="text-right pl-2 border-l border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Room PIN</p>
                  <p className="font-mono-tabular text-lg font-bold text-[#0EA5E9] tracking-wider">
                    {activeRoom.pin}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 py-4 space-y-3 overflow-y-auto max-h-[340px]">
              {activeRoom.messages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3.5 rounded-xl bg-[#121418] border border-white/8 space-y-2 min-w-0 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 text-xs min-w-0">
                    <span className="font-semibold text-white truncate">{msg.sender}</span>
                    <span className="font-mono-tabular text-slate-500 shrink-0">{msg.timestamp}</span>
                  </div>
                  {msg.voiceNote ? (
                    <VoiceNotePlayer note={msg.voiceNote} />
                  ) : (
                    <p className="text-sm text-slate-200 leading-relaxed break-words">{msg.text}</p>
                  )}
                  <p className="text-[11px] font-mono-tabular text-[#0EA5E9]/80 flex items-center gap-1.5 min-w-0">
                    <Shield className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      X25519 + Paninian{msg.lamportSeq ? ` (L#${String(msg.lamportSeq).padStart(3, '0')})` : ''}: {msg.paninianCipherPreview}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {/* Room Input + Hold-to-Record Voice Note */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-white/8 flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-0">
              <input
                type="text"
                disabled={isSuspended}
                value={msgDraft}
                onChange={(e) => setMsgDraft(e.target.value)}
                placeholder={
                  isSuspended
                    ? 'Account suspended by Automated Threat Filter'
                    : `Message #${activeRoom.pin}...`
                }
                className="w-full sm:flex-1 min-w-0 min-h-[46px] px-3.5 sm:px-4 rounded-xl bg-[#121418] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0EA5E9]"
              />
              <VoiceNoteHoldButton
                mode={mode}
                disabled={isSuspended}
                label="Hold Voice"
                onSendVoiceNote={handleSendRoomVoiceNote}
              />
              <button
                type="submit"
                disabled={isSuspended || !msgDraft.trim()}
                className="min-h-[46px] px-5 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 disabled:bg-slate-800 text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="m-auto text-center text-sm text-slate-400">
            Select or join a 6-digit PIN room to begin messaging.
          </div>
        )}
      </section>
    </div>
  );
};

