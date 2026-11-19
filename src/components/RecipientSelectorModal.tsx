import React, { useState } from 'react';
import { Check, Send, X } from 'lucide-react';
import { FamilyMember, VaakContactUser } from '../types/app';

interface RecipientSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickActionLabel: string;
  family: FamilyMember[];
  contacts: VaakContactUser[];
  onDispatchQuickAction: (selectedIds: string[], message: string) => void;
}

export const RecipientSelectorModal: React.FC<RecipientSelectorModalProps> = ({
  isOpen,
  onClose,
  quickActionLabel,
  family,
  contacts,
  onDispatchQuickAction,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    if (selectedIds.length === 0) return;
    onDispatchQuickAction(selectedIds, `Emergency Quick Action: ${quickActionLabel}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-[#121418] border border-sky-500/40 shadow-2xl overflow-hidden flex flex-col p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Who to Send To?
            </h3>
            <p className="text-xs text-sky-400 font-mono">
              Action: {quickActionLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#232730] text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          <p className="text-xs font-semibold text-slate-400">Select Recipient(s):</p>
          {family.map((f) => {
            const isSelected = selectedIds.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleId(f.id)}
                className={`w-full p-3 rounded-xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer border ${
                  isSelected ? 'bg-sky-500/20 border-sky-500/50 text-white' : 'bg-[#1B1E24] border-white/8 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={f.avatar} alt={f.name} className="w-8 h-8 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{f.name} (Pinned Family)</p>
                    <p className="text-[11px] text-slate-400 truncate">{f.status}</p>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
              </button>
            );
          })}

          {contacts.map((c) => {
            const isSelected = selectedIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleId(c.id)}
                className={`w-full p-3 rounded-xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer border ${
                  isSelected ? 'bg-sky-500/20 border-sky-500/50 text-white' : 'bg-[#1B1E24] border-white/8 text-slate-300'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                  <p className="text-[11px] font-mono text-slate-400 truncate">{c.phone} · {c.phonebookLabel}</p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={handleSend}
          className="w-full min-h-[46px] rounded-xl bg-[#0EA5E9] hover:bg-sky-400 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
        >
          <Send className="w-4 h-4" />
          <span>Dispatch Quick Action ({selectedIds.length} Selected)</span>
        </button>
      </div>
    </div>
  );
};
