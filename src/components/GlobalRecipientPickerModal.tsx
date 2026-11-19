import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCheck,
  MessageSquare,
  Phone,
  Radio,
  Send,
  Share2,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { FamilyMember, VaakContactUser } from '../types/app';
import { ChatContactUser } from './WhatsAppChatView';
import { audioEngine } from '../utils/audioEngine';
import {
  buildMapsLink,
  formatLiveLocationSummary,
  getCachedGps,
  LiveGpsState,
  requestLiveGps,
} from '../utils/geolocation';

export interface PendingAlertPayload {
  title: string;
  message: string;
  subLabel?: string;
  type?: string;
}

interface GlobalRecipientPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: PendingAlertPayload | null;
  family: FamilyMember[];
  contacts: VaakContactUser[];
  customGroups?: ChatContactUser[];
  onDispatchAlert: (result: {
    recipientIds: string[];
    channel: 'vaak' | 'whatsapp' | 'sms' | 'social';
    formattedMessage: string;
    recipientNames: string[];
    launchUrl?: string;
  }) => void;
}

function triggerExternalLink(url: string, newTab: boolean) {
  try {
    const a = document.createElement('a');
    a.href = url;
    if (newTab) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    // Ignore restricted iframe navigation
  }
}

export const GlobalRecipientPickerModal: React.FC<GlobalRecipientPickerModalProps> = ({
  isOpen,
  onClose,
  payload,
  family,
  contacts,
  customGroups = [],
  onDispatchAlert,
}) => {
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [sendVia, setSendVia] = useState<'vaak' | 'whatsapp' | 'sms' | 'social'>('vaak');
  const [includePolice, setIncludePolice] = useState(false);
  const [liveGps, setLiveGps] = useState<LiveGpsState | null>(() => getCachedGps());

  // When modal opens, pre-select all family members and refresh live GPS
  useEffect(() => {
    if (isOpen && payload) {
      const familyIds = family.map((f) => f.id);
      setSelectedRecipientIds(familyIds);
      setIncludePolice(false);
      setSendVia('vaak');
      requestLiveGps(2500).then((gps) => {
        if (gps) setLiveGps(gps);
      });
    }
  }, [isOpen, payload, family]);

  if (!isOpen || !payload) return null;

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleAllFamily = () => {
    const familyIds = family.map((f) => f.id);
    const allSelected = familyIds.every((id) => selectedRecipientIds.includes(id));
    if (allSelected) {
      setSelectedRecipientIds((prev) => prev.filter((id) => !familyIds.includes(id)));
    } else {
      setSelectedRecipientIds((prev) => Array.from(new Set([...prev, ...familyIds])));
    }
  };

  const handleToggleSelectAll = () => {
    const allIds = [
      ...family.map((f) => f.id),
      ...customGroups.map((g) => g.id),
      ...contacts.map((c) => c.id),
    ];
    if (selectedRecipientIds.length === allIds.length) {
      setSelectedRecipientIds([]);
    } else {
      setSelectedRecipientIds(allIds);
    }
  };

  const getRecipientNames = (): string[] => {
    const names: string[] = [];
    if (includePolice) names.push('Police Emergency (112)');
    family.forEach((f) => {
      if (selectedRecipientIds.includes(f.id)) names.push(f.name);
    });
    customGroups.forEach((g) => {
      if (selectedRecipientIds.includes(g.id)) names.push(g.name);
    });
    contacts.forEach((c) => {
      if (selectedRecipientIds.includes(c.id)) names.push(c.name);
    });
    return names;
  };

  const getSelectedPhones = (): string[] => {
    const phones: string[] = [];
    family.forEach((f) => {
      if (selectedRecipientIds.includes(f.id) && f.phone) {
        const cleaned = f.phone.replace(/[^+\d]/g, '');
        if (cleaned.length >= 6) phones.push(cleaned);
      }
    });
    contacts.forEach((c) => {
      if (selectedRecipientIds.includes(c.id) && c.phone) {
        const cleaned = c.phone.replace(/[^+\d]/g, '');
        if (cleaned.length >= 6) phones.push(cleaned);
      }
    });
    return Array.from(new Set(phones));
  };

  const locationSummary = formatLiveLocationSummary(liveGps ?? getCachedGps());

  const handleSend = () => {
    if (selectedRecipientIds.length === 0 && !includePolice) return;
    audioEngine.playRogerBeep();

    const activeGps = liveGps ?? getCachedGps();
    const gpsSummary = formatLiveLocationSummary(activeGps);
    const mapUrlLine =
      activeGps && activeGps.source === 'gps'
        ? `\n🗺️ Live Map: ${buildMapsLink(activeGps.lat, activeGps.lng)}`
        : '';
    const policeNote = includePolice ? '\n🚨 EMERGENCY POLICE 112 DISPATCH REQUESTED' : '';
    const formattedMessage = `🚨 [VAAK EMERGENCY ALERT] ${payload.title.toUpperCase()}\n${payload.message}\n📍 GPS: ${gpsSummary.coordsText}${mapUrlLine}${policeNote}\nSent via Vaak Mesh & Emergency Shield`;

    const recipientNames = getRecipientNames();
    const selectedPhones = getSelectedPhones();
    let launchUrl: string | undefined;

    if (sendVia === 'whatsapp') {
      const targetDigits =
        selectedPhones.length === 1 ? selectedPhones[0].replace(/\D/g, '') : '';
      launchUrl = targetDigits
        ? `https://wa.me/${targetDigits}?text=${encodeURIComponent(formattedMessage)}`
        : `https://wa.me/?text=${encodeURIComponent(formattedMessage)}`;
      navigator.clipboard?.writeText(formattedMessage).catch(() => {});
      triggerExternalLink(launchUrl, true);
    } else if (sendVia === 'sms') {
      const targetList = selectedPhones.join(',');
      launchUrl = targetList
        ? `sms:${targetList}?body=${encodeURIComponent(formattedMessage)}`
        : `sms:?body=${encodeURIComponent(formattedMessage)}`;
      navigator.clipboard?.writeText(formattedMessage).catch(() => {});
      triggerExternalLink(launchUrl, false);
    } else if (sendVia === 'social') {
      if (navigator.share) {
        navigator
          .share({
            title: `Vaak Emergency Alert: ${payload.title}`,
            text: formattedMessage,
          })
          .catch(() => {
            navigator.clipboard?.writeText(formattedMessage).catch(() => {});
          });
      } else {
        navigator.clipboard?.writeText(formattedMessage).catch(() => {});
      }
    }

    onDispatchAlert({
      recipientIds: selectedRecipientIds,
      channel: sendVia,
      formattedMessage,
      recipientNames,
      launchUrl,
    });

    onClose();
  };

  const totalRecipientsCount = selectedRecipientIds.length + (includePolice ? 1 : 0);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-lg my-auto rounded-3xl bg-[#121418] border-2 border-emerald-500/60 shadow-2xl overflow-hidden flex flex-col p-4 sm:p-6 space-y-4 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3 gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-sm font-bold shrink-0">
                💬
              </span>
              <span>Who do you want to send this to?</span>
            </h2>
            <p className="text-xs text-emerald-400 font-mono mt-0.5 truncate">
              {payload.title} {payload.subLabel ? `· ${payload.subLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] rounded-xl bg-[#232730] hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer shrink-0 transition-colors"
            aria-label="Close Alert Recipient Picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alert Text Preview Banner */}
        <div className="p-3 rounded-2xl bg-[#1B1E24] border border-emerald-500/30 flex items-start gap-2.5 shrink-0 text-xs text-slate-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">Alert Message Preview:</p>
            <p className="text-slate-300 leading-relaxed font-mono text-[11px] mt-0.5 line-clamp-2">
              "{payload.message}"
            </p>
            <p className="text-[10px] font-mono text-sky-400 mt-1 truncate">
              📍 {locationSummary.coordsText}
            </p>
          </div>
        </div>

        {/* Multi-Channel Delivery Toggles ("Send Via:") */}
        <div className="space-y-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            1. Select Delivery Channel:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#1B1E24] border border-white/8">
            <button
              type="button"
              onClick={() => setSendVia('vaak')}
              className={`py-2 px-1 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                sendVia === 'vaak'
                  ? 'bg-[#00A884] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span className="truncate w-full text-center">📡 Vaak Mesh</span>
            </button>
            <button
              type="button"
              onClick={() => setSendVia('whatsapp')}
              className={`py-2 px-1 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                sendVia === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="truncate w-full text-center">💬 WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setSendVia('sms')}
              className={`py-2 px-1 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                sendVia === 'sms'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40 ring-1 ring-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span className="truncate w-full text-center">📩 Phone SMS</span>
            </button>
            <button
              type="button"
              onClick={() => setSendVia('social')}
              className={`py-2 px-1 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                sendVia === 'social'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40 ring-1 ring-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span className="truncate w-full text-center">🌐 Social Share</span>
            </button>
          </div>
        </div>

        {/* Quick Bulk Selection Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            2. Choose Recipients ({totalRecipientsCount} selected):
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleAllFamily}
              className="px-2.5 py-1 rounded-lg bg-[#1B1E24] hover:bg-slate-800 border border-white/10 text-[11px] font-semibold text-emerald-300 cursor-pointer"
            >
              Toggle Pinned Family
            </button>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-2.5 py-1 rounded-lg bg-[#1B1E24] hover:bg-slate-800 border border-white/10 text-[11px] font-semibold text-sky-300 cursor-pointer"
            >
              Select All
            </button>
          </div>
        </div>

        {/* Recipient Checkboxes List (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-white/6 max-h-[220px]">
          {/* Priority 1: Police & Emergency Services */}
          <div
            onClick={() => setIncludePolice((p) => !p)}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              includePolice
                ? 'bg-rose-950/60 border-rose-500 text-white shadow'
                : 'bg-[#181B20] border-white/8 text-slate-300 hover:border-rose-500/40'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                🚨
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">Police / Emergency (112)</p>
                <p className="text-[11px] text-rose-300 truncate">Immediate Regional Emergency Services &amp; NDRF Dispatch</p>
              </div>
            </div>
            <div
              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                includePolice ? 'bg-rose-600 border-rose-500 text-white' : 'border-white/20'
              }`}
            >
              {includePolice && <Check className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Priority 2: Pinned Family Members */}
          <div className="pt-2 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-400">👨👩👧👦 Pinned Family Circle:</p>
            {family.map((f) => {
              const isChecked = selectedRecipientIds.includes(f.id);
              return (
                <div
                  key={f.id}
                  onClick={() => toggleRecipient(f.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isChecked
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-white shadow-sm'
                      : 'bg-[#181B20] border-white/8 text-slate-300 hover:border-emerald-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {f.avatar ? (
                      <img src={f.avatar} alt={f.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {f.name[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{f.name} ({f.relation || 'Family'})</p>
                      <p className="text-[11px] text-slate-400 truncate">{f.status} · {f.distanceKm} km</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      isChecked ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-white/20'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Priority 3: Groups */}
          {customGroups.length > 0 && (
            <div className="pt-2 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-400">👥 Active Groups:</p>
              {customGroups.map((g) => {
                const isChecked = selectedRecipientIds.includes(g.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => toggleRecipient(g.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isChecked
                        ? 'bg-sky-500/20 border-sky-500/60 text-white shadow-sm'
                        : 'bg-[#181B20] border-white/8 text-slate-300 hover:border-sky-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{g.name}</p>
                        <p className="text-[11px] text-sky-300 truncate">{g.status}</p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-sky-600 border-sky-500 text-white' : 'border-white/20'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Priority 4: Individual Contacts */}
          <div className="pt-2 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-400">📇 Phonebook &amp; Contacts:</p>
            {contacts.map((c) => {
              const isChecked = selectedRecipientIds.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleRecipient(c.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isChecked
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-white shadow-sm'
                      : 'bg-[#181B20] border-white/8 text-slate-300 hover:border-emerald-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                      <p className="text-[11px] font-mono text-slate-400 truncate">{c.phone}</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      isChecked ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-white/20'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Big Green Send Alert Now Button */}
        <div className="pt-2 shrink-0 border-t border-white/10 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-2xl bg-[#1B1E24] hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={totalRecipientsCount === 0}
            onClick={handleSend}
            className="flex-1 min-w-0 min-h-[50px] px-3 rounded-2xl bg-[#00A884] hover:bg-[#008f72] disabled:opacity-40 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-emerald-950/50 transition-all active:scale-[0.98]"
          >
            <Send className="w-4 h-4 shrink-0" />
            <span className="truncate">Send Alert Now ({totalRecipientsCount} · {sendVia.toUpperCase()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
