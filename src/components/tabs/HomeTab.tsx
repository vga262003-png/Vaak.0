import React, { useMemo, useState } from 'react';
import {
  Battery,
  Hash,
  MessageSquare,
  Mic,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  FamilyMember,
  TransportMode,
  VaakContactUser,
  VoiceNoteAttachment,
  WalkieTransmission,
} from '../../types/app';
import { ChatContactUser } from '../WhatsAppChatView';
import { VoiceNotePlayer } from '../VoiceNoteBar';
import { audioEngine } from '../../utils/audioEngine';

interface HomeTabProps {
  mode: TransportMode;
  family: FamilyMember[];
  contacts?: VaakContactUser[];
  transmissions: WalkieTransmission[];
  isSuspended: boolean;
  onPingFamily: (memberId: string) => void;
  onSendTransmission: (payload: {
    channel: string;
    text: string;
    durationSec?: number;
    isAudio?: boolean;
    voiceNote?: VoiceNoteAttachment;
  }) => void;
  onOpenChat: (contact: ChatContactUser) => void;
  onSelectPerson: (person: ChatContactUser) => void;
  customGroups?: ChatContactUser[];
  roomsCount?: number;
  onOpenRoomsTab?: () => void;
  onCreateGroupClick?: () => void;
  onAddFamilyMember?: (member: { name: string; relation: string; phone?: string }) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  family,
  contacts = [],
  transmissions,
  onOpenChat,
  onSelectPerson,
  customGroups = [],
  roomsCount = 0,
  onOpenRoomsTab,
  onCreateGroupClick,
  onAddFamilyMember,
}) => {
  const [globalQuery, setGlobalQuery] = useState('');
  const [circleFilter, setCircleFilter] = useState<'all' | 'friends' | 'family' | 'groups'>('all');
  const [voiceSearching, setVoiceSearching] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [newFamName, setNewFamName] = useState('');
  const [newFamRelation, setNewFamRelation] = useState('Friend');
  const [newFamPhone, setNewFamPhone] = useState('');

  const handleVoiceSearch = () => {
    if (voiceSearching) return;
    setVoiceSearching(true);
    audioEngine.playPttStart();

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
          if (spoken) setGlobalQuery(spoken);
        };
        rec.onerror = () => setVoiceSearching(false);
        rec.onend = () => {
          setVoiceSearching(false);
          audioEngine.playRogerBeep();
        };
        rec.start();
        return;
      } catch {
        // Browser speech API unavailable
      }
    }

    setTimeout(() => {
      setVoiceSearching(false);
      audioEngine.playRogerBeep();
    }, 600);
  };

  const handleCreateFamilySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamName.trim() || !onAddFamilyMember) return;
    onAddFamilyMember({
      name: newFamName.trim(),
      relation: newFamRelation.trim() || 'Friend',
      phone: newFamPhone.trim() || undefined,
    });
    setNewFamName('');
    setNewFamPhone('');
    setShowAddFamily(false);
  };

  const filteredFamily = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    return family.filter((f) => {
      if (circleFilter === 'groups') return false;
      if (circleFilter === 'friends' && f.relation.toLowerCase() === 'family') return false;
      if (circleFilter === 'family' && f.relation.toLowerCase() !== 'family') return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.status.toLowerCase().includes(q) ||
        f.relation.toLowerCase().includes(q)
      );
    });
  }, [family, globalQuery, circleFilter]);

  const connectedFriends = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    return contacts.filter((c) => {
      if (!c.connected) return false;
      if (circleFilter === 'family' || circleFilter === 'groups') return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.phonebookLabel.toLowerCase().includes(q)
      );
    });
  }, [contacts, globalQuery, circleFilter]);

  const filteredGroups = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (circleFilter === 'friends' || circleFilter === 'family') return [];
    if (!q) return customGroups;
    return customGroups.filter(
      (g) => g.name.toLowerCase().includes(q) || (g.status || '').toLowerCase().includes(q)
    );
  }, [customGroups, globalQuery, circleFilter]);

  const filteredTransmissions = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return transmissions;
    return transmissions.filter(
      (item) =>
        item.sender.toLowerCase().includes(q) ||
        item.text.toLowerCase().includes(q) ||
        item.channel.toLowerCase().includes(q)
    );
  }, [transmissions, globalQuery]);

  return (
    <div className="w-full max-w-4xl mx-auto min-w-0 space-y-5 pb-2">
      {/* 1. Global Search Bar with Voice-Activated Mic Search */}
      <div className="vaak-surface rounded-2xl p-2 flex items-center gap-2 min-w-0">
        <Search className="w-4 h-4 text-slate-400 ml-2.5 shrink-0" />
        <input
          type="text"
          value={globalQuery}
          onChange={(e) => setGlobalQuery(e.target.value)}
          placeholder="Search friends, family, groups, chats, or voice-search..."
          className="flex-1 min-w-0 min-h-[40px] bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
        />
        {globalQuery && (
          <button
            type="button"
            onClick={() => setGlobalQuery('')}
            className="p-2 text-slate-400 hover:text-white cursor-pointer"
            aria-label="Clear global search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={handleVoiceSearch}
          className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
            voiceSearching
              ? 'bg-[#F43F5E] text-white'
              : 'bg-[#232730] hover:bg-slate-700 text-[#0EA5E9]'
          }`}
          aria-label="Voice-activated search"
        >
          <Mic className="w-4 h-4" />
          <span className="hidden sm:inline">
            {voiceSearching ? 'Listening...' : 'Voice Search'}
          </span>
        </button>
      </div>

      {/* 2. Friends, Family & Chat Groups */}
      <section className="vaak-surface rounded-2xl p-3.5 sm:p-5 space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0">
            <h1 className="font-display text-base sm:text-lg font-semibold text-white">
              Friends, Family &amp; Chat Groups
            </h1>
            <p className="text-xs text-slate-400">
              Chat 1-on-1 with friends, family &amp; nearby peers, or start any group
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onAddFamilyMember && (
              <button
                type="button"
                onClick={() => setShowAddFamily((v) => !v)}
                className="px-3 py-2 rounded-xl bg-[#0EA5E9]/20 hover:bg-[#0EA5E9]/30 border border-[#0EA5E9]/40 text-[#0EA5E9] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Friend / Family</span>
              </button>
            )}
            {onCreateGroupClick && (
              <button
                type="button"
                onClick={onCreateGroupClick}
                className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Group</span>
              </button>
            )}
            {onOpenRoomsTab && (
              <button
                type="button"
                onClick={onOpenRoomsTab}
                className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Group Rooms{roomsCount > 0 ? ` (${roomsCount})` : ''}</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#121418] border border-white/8">
          {[
            { id: 'all' as const, label: 'All' },
            { id: 'friends' as const, label: 'Friends' },
            { id: 'family' as const, label: 'Family' },
            { id: 'groups' as const, label: 'Groups' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCircleFilter(tab.id)}
              className={`min-h-[34px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                circleFilter === tab.id
                  ? 'bg-[#0EA5E9] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showAddFamily && onAddFamilyMember && (
          <form
            onSubmit={handleCreateFamilySubmit}
            className="p-3.5 rounded-2xl bg-[#121418] border border-[#0EA5E9]/40 grid grid-cols-1 sm:grid-cols-4 gap-2"
          >
            <input
              type="text"
              required
              maxLength={100}
              value={newFamName}
              onChange={(e) => setNewFamName(e.target.value)}
              placeholder="Friend or Family Name *"
              className="min-h-[40px] px-3 rounded-xl bg-[#1B1E24] border border-white/10 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
            />
            <select
              value={newFamRelation}
              onChange={(e) => setNewFamRelation(e.target.value)}
              aria-label="Relationship category"
              className="min-h-[40px] px-3 rounded-xl bg-[#1B1E24] border border-white/10 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
            >
              <option value="Friend">Friend</option>
              <option value="Family">Family</option>
              <option value="Neighbor">Neighbor</option>
              <option value="Work / Team">Work / Team</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="tel"
              maxLength={40}
              value={newFamPhone}
              onChange={(e) => setNewFamPhone(e.target.value)}
              placeholder="Phone / Call-Sign (optional)"
              className="min-h-[40px] px-3 rounded-xl bg-[#1B1E24] border border-white/10 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
            />
            <button
              type="submit"
              className="min-h-[40px] px-4 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-semibold cursor-pointer"
            >
              Save to Chat List
            </button>
          </form>
        )}

        {/* Custom Groups List */}
        {filteredGroups.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-white/8">
            {filteredGroups.map((grp) => (
              <button
                key={grp.id}
                type="button"
                onClick={() => {
                  audioEngine.playSonarPing();
                  onSelectPerson(grp);
                }}
                className="p-3 rounded-2xl text-left transition-all cursor-pointer border bg-[#16222A]/80 border-emerald-500/30 hover:border-emerald-400 group flex items-center gap-3 min-w-0 w-full overflow-hidden"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-emerald-300">
                    {grp.name}
                  </p>
                  <p className="text-xs font-mono text-emerald-400 truncate">
                    {grp.status}
                  </p>
                </div>
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Connected Friends & Contacts (from Radar / Contacts) */}
        {connectedFriends.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">
              Connected Friends &amp; Nearby Peers ({connectedFriends.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {connectedFriends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => {
                    audioEngine.playSonarPing();
                    onOpenChat({
                      id: friend.id,
                      name: friend.name,
                      phone: friend.phone,
                      status: `${friend.phonebookLabel} · ${friend.status}`,
                    });
                  }}
                  className="p-3 rounded-2xl text-left transition-all cursor-pointer border bg-[#121820] border-sky-500/25 hover:border-sky-400/70 group flex items-center justify-between gap-2.5 min-w-0 w-full overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 font-bold text-sm shrink-0">
                      {friend.name[0]?.toUpperCase() || 'F'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-sky-300">
                        {friend.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {friend.phonebookLabel} · {friend.status}
                      </p>
                    </div>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-[#00A884] text-white flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Family & Saved People Grid */}
        {filteredFamily.length === 0 && connectedFriends.length === 0 && filteredGroups.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[#121418]/75 border border-white/8 text-center space-y-2.5">
            <p className="text-xs text-slate-200 font-medium">
              {circleFilter === 'groups'
                ? 'No custom groups created yet.'
                : 'No friends, family, or groups in this view yet.'}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tap &ldquo;Add Friend / Family&rdquo; to chat 1-on-1, tap &ldquo;New Group&rdquo; for any friend or team group, or open &ldquo;Group Rooms&rdquo; for 6-digit PIN rooms.
            </p>
          </div>
        ) : (
          filteredFamily.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {filteredFamily.map((member) => {
              const statusColor =
                member.statusType === 'safe'
                  ? 'text-emerald-400'
                  : member.statusType === 'transit'
                  ? 'text-amber-300'
                  : 'text-[#F43F5E]';

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    audioEngine.playSonarPing();
                    onSelectPerson({
                      id: member.id,
                      name: member.name,
                      phone: member.phone || '',
                      avatar: member.avatar || undefined,
                      status: `${member.relation} · ${member.status}`,
                    });
                  }}
                  className="p-2.5 sm:p-3 rounded-2xl text-left transition-all cursor-pointer border bg-[#121418]/75 border-white/6 hover:border-[#0EA5E9]/50 group min-w-0 w-full overflow-hidden"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full p-0.5 shrink-0 transition-transform group-hover:scale-105 ${
                        member.statusType === 'safe'
                          ? 'bg-emerald-500/75'
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
                        <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-white">
                          {member.name[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-[#0EA5E9]">
                        {member.name.split(' ')[0]}
                      </p>
                      <p className={`text-[11px] font-medium truncate ${statusColor}`}>
                        {member.relation} · {member.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-white/6 flex items-center justify-between text-[11px] text-slate-400 font-mono-tabular">
                    <span>{member.lastPingAgo}</span>
                    <span className="inline-flex items-center gap-1">
                      <Battery className="w-3 h-3" />
                      {member.batteryPct}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          )
        )}
      </section>

      {/* 3. Clean Recent Messages & Notifications Inbox List */}
      <section className="vaak-surface rounded-2xl p-3.5 sm:p-5 space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/8">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-white">
              Recent Messages &amp; Transmissions
            </h2>
            <p className="text-xs text-slate-400">
              All real messages &amp; broadcasts saved in Firebase Firestore
            </p>
          </div>
        </div>

        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {filteredTransmissions.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-400">
              No messages or broadcasts recorded yet. Send a Walkie transmission or 1-on-1 chat message to get started.
            </p>
          ) : (
            filteredTransmissions.map((item) => {
              const isSelfOrSystem =
                item.sender.startsWith('You') || item.sender.startsWith('AUTOMATED');
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!isSelfOrSystem) {
                      onOpenChat({
                        id: item.sender.toLowerCase().replace(/\s+/g, '-'),
                        name: item.sender,
                        phone: '',
                        status: item.channel,
                      });
                    }
                  }}
                  className={`p-3 sm:p-3.5 rounded-2xl bg-[#121418]/80 border border-white/8 transition-all space-y-2 min-w-0 w-full overflow-hidden ${
                    !isSelfOrSystem ? 'hover:bg-[#1B1E24] cursor-pointer group' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold flex items-center justify-center shrink-0">
                        {item.sender[0]?.toUpperCase() || 'M'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-sky-400">
                            {item.sender}
                          </p>
                          <span className="text-[10px] font-mono text-sky-400 truncate">
                            {item.channel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 break-words mt-0.5">
                          {item.text}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <span className="font-mono-tabular text-[11px] text-slate-500">
                        {item.timestamp}
                      </span>
                      {!isSelfOrSystem && (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 font-medium">
                            <MessageSquare className="w-3 h-3" />
                            <span>Chat</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {item.voiceNote && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <VoiceNotePlayer note={item.voiceNote} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
