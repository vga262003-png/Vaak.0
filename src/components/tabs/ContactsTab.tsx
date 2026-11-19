import React, { useMemo, useState } from 'react';
import {
  Check,
  Globe,
  Languages,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  CachedEmergencyDirectory,
  ConnectRequestLog,
  VaakContactUser,
} from '../../types/app';
import { ChatContactUser } from '../WhatsAppChatView';
import { COUNTRIES } from '../../data/countries';
import { LANGUAGES_56 } from '../../data/languages50';

interface ContactsTabProps {
  contacts: VaakContactUser[];
  connectRequests: ConnectRequestLog[];
  emergencyDir: CachedEmergencyDirectory;
  syncingEmergencyDir: boolean;
  onSyncEmergencyDir: () => void;
  onSyncPhonebook: (imported?: { name: string; phone: string }[]) => void;
  onSendConnectRequest: (contact: VaakContactUser) => void;
  onRespondConnectRequest: (reqId: string, accept: boolean) => void;
  onSendInviteLink: (phone: string, name?: string) => void;
  onOpenChat: (contact: ChatContactUser) => void;
}

type ContactFilter = 'all' | 'on_vaak' | 'invite';

export const ContactsTab: React.FC<ContactsTabProps> = ({
  contacts,
  connectRequests,
  onSyncPhonebook,
  onSendConnectRequest,
  onRespondConnectRequest,
  onSendInviteLink,
  onOpenChat,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ContactFilter>('all');
  const [selectedDialCode, setSelectedDialCode] = useState<string>('ALL');
  const [inviteLangCode, setInviteLangCode] = useState<string>('en');
  const [inviteCopied, setInviteCopied] = useState<string | null>(null);
  const [syncingBook, setSyncingBook] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const handleAddManualContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    onSyncPhonebook([{ name: newName.trim(), phone: newPhone.trim() }]);
    setNewName('');
    setNewPhone('');
    setShowAddContact(false);
  };

  const normalizedQuery = query.trim().toLowerCase();
  const digitsOnly = query.replace(/\D/g, '');

  const onVaakCount = useMemo(() => contacts.filter((c) => c.onVaak).length, [contacts]);
  const nonVaakCount = contacts.length - onVaakCount;

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (filter === 'on_vaak' && !c.onVaak) return false;
      if (filter === 'invite' && c.onVaak) return false;
      if (selectedDialCode !== 'ALL' && !c.phone.startsWith(selectedDialCode)) return false;

      if (!normalizedQuery) return true;
      const phoneDigits = c.phone.replace(/\D/g, '');
      return (
        c.name.toLowerCase().includes(normalizedQuery) ||
        c.phone.toLowerCase().includes(normalizedQuery) ||
        (digitsOnly.length >= 3 && phoneDigits.includes(digitsOnly))
      );
    });
  }, [contacts, filter, selectedDialCode, normalizedQuery, digitsOnly]);

  const showDirectNumberInvite =
    digitsOnly.length >= 6 && filteredContacts.length === 0;

  const triggerInvite = (phone: string, name?: string) => {
    const chosenLang = LANGUAGES_56.find((l) => l.code === inviteLangCode) ?? LANGUAGES_56[0];
    const formattedPhone =
      phone.startsWith('+') || selectedDialCode === 'ALL'
        ? phone
        : `${selectedDialCode} ${phone}`;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = `${origin}/?invitePhone=${encodeURIComponent(formattedPhone)}&lang=${chosenLang.code}${name ? `&inviteName=${encodeURIComponent(name)}` : ''}`;
    navigator.clipboard?.writeText(inviteUrl).catch(() => {});
    onSendInviteLink(formattedPhone, name ? `${name} (${chosenLang.name})` : undefined);
    setInviteCopied(phone);
    setTimeout(() => setInviteCopied(null), 2200);
  };

  const handleSyncDevicePhonebook = async () => {
    setSyncingBook(true);
    try {
      const navWithContacts = navigator as Navigator & {
        contacts?: {
          select?: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
        };
      };
      if (navWithContacts.contacts?.select) {
        const picked = await navWithContacts.contacts.select(['name', 'tel'], { multiple: true });
        const mapped = picked
          .filter((item) => item.tel && item.tel[0])
          .map((item) => ({
            name: item.name?.[0] || 'Phone Contact',
            phone: item.tel![0],
          }));
        if (mapped.length > 0) {
          onSyncPhonebook(mapped);
        }
      } else {
        setShowAddContact(true);
      }
    } catch {
      setShowAddContact(true);
    } finally {
      setTimeout(() => setSyncingBook(false), 350);
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden box-border space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full max-w-full min-w-0">
        {/* Left: Real Phonebook Contact List & Vaak Filter */}
        <section className="lg:col-span-7 min-w-0 overflow-hidden vaak-surface rounded-2xl p-4 sm:p-6 space-y-4 w-full max-w-full box-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold text-white">
                Phonebook &amp; Vaak Contacts
              </h1>
              <p className="text-xs text-slate-400">
                {onVaakCount} connected · {nonVaakCount} ready to invite
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddContact((v) => !v)}
                className="min-h-[40px] px-3 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Contact</span>
              </button>
              <button
                type="button"
                onClick={handleSyncDevicePhonebook}
                disabled={syncingBook}
                className="min-h-[40px] px-3 rounded-xl bg-[#232730] hover:bg-slate-700 border border-white/10 text-xs font-semibold text-sky-400 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingBook ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Import Phonebook</span>
              </button>
            </div>
          </div>

          {showAddContact && (
            <form
              onSubmit={handleAddManualContact}
              className="p-3.5 rounded-xl bg-[#121418] border border-[#0EA5E9]/40 grid grid-cols-1 sm:grid-cols-3 gap-2"
            >
              <input
                type="text"
                required
                maxLength={100}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contact Name *"
                className="min-h-[40px] px-3 rounded-xl bg-[#1B1E24] border border-white/10 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
              />
              <input
                type="tel"
                required
                maxLength={40}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (+91 ...)"
                className="min-h-[40px] px-3 rounded-xl bg-[#1B1E24] border border-white/10 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
              />
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                Save to Firestore
              </button>
            </form>
          )}

          {/* Search by Phone Number or Name */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search phonebook by number or name..."
              className="w-full min-h-[46px] pl-10 pr-10 rounded-xl bg-[#121418] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0EA5E9]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Complete Untruncated Country Dialing Codes & 56-Language Invite Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-[#0EA5E9] shrink-0" />
                <span>Country Dial Code ({COUNTRIES.length} Countries)</span>
              </label>
              <select
                value={selectedDialCode}
                onChange={(e) => setSelectedDialCode(e.target.value)}
                aria-label="Filter or prefix by country dialing code"
                className="w-full min-h-[40px] px-2.5 rounded-xl bg-[#121418] border border-white/10 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
              >
                <option value="ALL">All International Codes ({COUNTRIES.length})</option>
                {COUNTRIES.map((c) => (
                  <option key={c.iso} value={c.code}>
                    {c.code} · {c.name} ({c.iso})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Languages className="w-3.5 h-3.5 text-[#0EA5E9] shrink-0" />
                <span>Invite Language ({LANGUAGES_56.length} Languages)</span>
              </label>
              <select
                value={inviteLangCode}
                onChange={(e) => setInviteLangCode(e.target.value)}
                aria-label="Select invite language from all 56 languages"
                className="w-full min-h-[40px] px-2.5 rounded-xl bg-[#121418] border border-white/10 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
              >
                {LANGUAGES_56.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.native})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Bar: All Phonebook / On Vaak / Invite */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#121418] border border-white/8">
            {[
              { id: 'all' as const, label: `All (${contacts.length})` },
              { id: 'on_vaak' as const, label: `On Vaak (${onVaakCount})` },
              { id: 'invite' as const, label: `Invite (${nonVaakCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filter === tab.id
                    ? 'bg-[#0EA5E9] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Direct Invite Card if Phone Search Has No Match */}
          {showDirectNumberInvite && (
            <div className="p-4 rounded-xl bg-[#121418] border border-[#0EA5E9]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{query.trim()}</p>
                <p className="text-xs text-slate-400">
                  Not in your Vaak directory yet. Send a 1-tap invite link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => triggerInvite(query.trim())}
                className="min-h-[42px] px-4 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {inviteCopied === query.trim() ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Invite Copied</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Invite via Link</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Phonebook Contact Rows */}
          <div className="divide-y divide-white/8 rounded-xl bg-[#121418]/75 border border-white/8 overflow-hidden">
            {filteredContacts.length === 0 && !showDirectNumberInvite ? (
              <p className="p-6 text-center text-xs text-slate-400">
                No contacts match your filter. Enter a phone number to send an invite link.
              </p>
            ) : (
              filteredContacts.map((contact) => {
                const initials = contact.name
                  .split(' ')
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase();

                const pendingOutgoing = connectRequests.some(
                  (r) =>
                    r.phone === contact.phone &&
                    r.status === 'pending' &&
                    r.direction === 'outgoing'
                );

                return (
                  <div
                    key={contact.id}
                    onClick={() => {
                      if (contact.connected) {
                        onOpenChat({
                          id: contact.id,
                          name: contact.name,
                          phone: contact.phone,
                          status: contact.status || 'Connected',
                          avatar: undefined,
                        });
                      }
                    }}
                    className={`p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 transition-colors ${
                      contact.connected
                        ? 'hover:bg-[#1B1E24] cursor-pointer'
                        : 'hover:bg-[#1B1E24]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-full font-display text-xs font-bold flex items-center justify-center shrink-0 ${
                          contact.onVaak
                            ? 'bg-sky-500/15 border border-sky-500/35 text-sky-300'
                            : 'bg-slate-800 border border-white/10 text-slate-400'
                        }`}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-white truncate">
                            {contact.name}
                          </p>
                          {contact.onVaak && contact.verified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <span className="font-mono-tabular">{contact.phone}</span>
                          <span aria-hidden="true">·</span>
                          <span>{contact.phonebookLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              contact.onVaak ? 'text-[#0EA5E9] font-medium' : 'text-slate-500'
                            }
                          >
                            {contact.onVaak ? contact.status : 'Not on Vaak'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {!contact.onVaak ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerInvite(contact.phone, contact.name);
                          }}
                          className="min-h-[38px] px-3 rounded-xl bg-[#232730] hover:bg-slate-700 border border-white/10 text-sky-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          {inviteCopied === contact.phone ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Invited</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Invite</span>
                            </>
                          )}
                        </button>
                      ) : contact.connected ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-emerald-400 hidden sm:inline-flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Connected</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenChat({
                                id: contact.id,
                                name: contact.name,
                                phone: contact.phone,
                                status: contact.status || 'Connected',
                                avatar: undefined,
                              });
                            }}
                            aria-label={`Chat with ${contact.name}`}
                            title={`Open 1-on-1 Chat with ${contact.name}`}
                            className="w-9 h-9 rounded-full bg-[#00A884] hover:bg-[#008f72] text-white flex items-center justify-center cursor-pointer shadow-md shadow-emerald-950/40 shrink-0 transition-transform active:scale-90"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      ) : pendingOutgoing ? (
                        <span className="text-xs font-medium text-amber-300">Request Sent</span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendConnectRequest(contact);
                          }}
                          className="min-h-[38px] px-3.5 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Connect</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right: Mutual Connect Request Logs + Social Media Sharing */}
        <section className="lg:col-span-5 min-w-0 w-full space-y-6">
          <div className="vaak-surface rounded-2xl p-4 sm:p-6 space-y-4 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0EA5E9]" />
                <span>Connect Requests</span>
              </h2>
              <span className="font-mono-tabular text-xs text-slate-400">
                {connectRequests.length} Logs
              </span>
            </div>

            <div className="divide-y divide-white/8 rounded-xl bg-[#121418]/75 border border-white/8 max-h-[320px] overflow-y-auto">
              {connectRequests.length === 0 ? (
                <p className="p-5 text-center text-xs text-slate-400">
                  No connect requests or invite logs yet.
                </p>
              ) : connectRequests.map((req) => (
                <div key={req.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => {
                        if (req.status === 'accepted') {
                          onOpenChat({
                            id: `contact-${req.id}`,
                            name: req.contactName,
                            phone: req.phone,
                            status: 'Connected Contact',
                          });
                        }
                      }}
                    >
                      <p className="text-sm font-semibold text-white truncate hover:text-[#00A884]">
                        {req.contactName}
                      </p>
                      <p className="text-xs text-slate-400 font-mono-tabular flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{req.phone} · {req.timestamp}</span>
                      </p>
                    </div>

                    {req.status === 'accepted' ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-emerald-400 hidden xs:inline">
                          Connected
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onOpenChat({
                              id: `contact-${req.id}`,
                              name: req.contactName,
                              phone: req.phone,
                              status: 'Connected Contact',
                            });
                          }}
                          aria-label={`Chat with ${req.contactName}`}
                          title={`Open 1-on-1 Chat with ${req.contactName}`}
                          className="w-9 h-9 rounded-full bg-[#00A884] hover:bg-[#008f72] text-white flex items-center justify-center cursor-pointer shadow-md shadow-emerald-950/40 shrink-0 transition-transform active:scale-90"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-semibold shrink-0 ${
                          req.status === 'declined'
                            ? 'text-[#F43F5E]'
                            : req.status === 'invited'
                            ? 'text-[#0EA5E9]'
                            : 'text-amber-300'
                        }`}
                      >
                        {req.direction === 'incoming' && req.status === 'pending'
                          ? 'Incoming'
                          : req.status === 'invited'
                          ? 'Invited'
                          : req.status === 'declined'
                          ? 'Declined'
                          : 'Pending'}
                      </span>
                    )}
                  </div>

                  {req.direction === 'incoming' && req.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onRespondConnectRequest(req.id, true);
                          onOpenChat({
                            id: `contact-${req.id}`,
                            name: req.contactName,
                            phone: req.phone,
                            status: 'Connected Contact',
                          });
                        }}
                        className="flex-1 min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept &amp; Chat</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRespondConnectRequest(req.id, false)}
                        className="flex-1 min-h-[38px] rounded-xl bg-[#232730] hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Social Media Friend Sharing */}
          <div className="vaak-surface rounded-2xl p-4 sm:p-5 space-y-3 min-w-0 overflow-hidden">
            <div>
              <h3 className="font-display text-sm font-semibold text-white">
                Social Media Friend Sharing
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Invite friends to your encrypted Vaak family mesh circle
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'WhatsApp', label: 'WhatsApp', accent: 'text-emerald-400 border-emerald-500/30' },
                { id: 'Instagram', label: 'Instagram', accent: 'text-pink-400 border-pink-500/30' },
                { id: 'Facebook', label: 'Facebook', accent: 'text-sky-400 border-sky-500/30' },
                { id: 'YouTube', label: 'YouTube', accent: 'text-[#F43F5E] border-[#F43F5E]/30' },
              ].map((net) => (
                <button
                  key={net.id}
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    const inviteUrl = `${origin}/?invitePhone=GROUP-INVITE&inviteName=Vaak-Friend`;
                    const msg = `Join my encrypted emergency & mesh circle on Vaak / PingTalk: ${inviteUrl}`;
                    if (net.id === 'WhatsApp') {
                      const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                      const a = document.createElement('a');
                      a.href = waUrl;
                      a.target = '_blank';
                      a.rel = 'noopener noreferrer';
                      a.click();
                    } else if (navigator.share) {
                      navigator.share({ title: 'Vaak / PingTalk Invite', text: msg, url: inviteUrl }).catch(() => {});
                    } else {
                      navigator.clipboard?.writeText(msg).catch(() => {});
                    }
                    onSendInviteLink(`${net.label} Share`, `${net.label} Friends`);
                    setInviteCopied(net.id);
                    setTimeout(() => setInviteCopied(null), 2000);
                  }}
                  className={`min-h-[42px] min-w-0 w-full overflow-hidden px-2.5 sm:px-3 rounded-xl bg-[#121418] hover:bg-[#232730] border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${net.accent}`}
                >
                  {inviteCopied === net.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Link Ready</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        <span className="hidden sm:inline">Share on </span>
                        {net.label}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
