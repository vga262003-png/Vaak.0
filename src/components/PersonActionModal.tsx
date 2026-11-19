import React from 'react';
import { MessageSquare, PhoneCall, ShieldAlert, X } from 'lucide-react';
import { ChatContactUser } from './WhatsAppChatView';

interface PersonActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: ChatContactUser | null;
  onOpenChat: (person: ChatContactUser) => void;
  onWalkieCall: (person: ChatContactUser) => void;
  onSendEmergencyAlert: (person: ChatContactUser) => void;
}

export const PersonActionModal: React.FC<PersonActionModalProps> = ({
  isOpen,
  onClose,
  person,
  onOpenChat,
  onWalkieCall,
  onSendEmergencyAlert,
}) => {
  if (!isOpen || !person) return null;

  const initials = person.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-[#121418] border border-white/15 shadow-2xl overflow-hidden flex flex-col p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 font-bold overflow-hidden shrink-0">
              {person.avatar ? (
                <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white truncate">{person.name}</h3>
              <p className="font-mono text-xs text-slate-400">{person.phone} · {person.status}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#232730] text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenChat(person);
            }}
            className="w-full min-h-[46px] px-4 rounded-xl bg-[#00A884] hover:bg-[#008f72] text-white text-xs font-bold flex items-center gap-3 cursor-pointer shadow-md transition-colors"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <p className="text-sm">Open Chat</p>
              <p className="text-[10px] opacity-80 font-normal">Full-screen WhatsApp-style 1-on-1 chat</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onWalkieCall(person);
            }}
            className="w-full min-h-[46px] px-4 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-3 cursor-pointer shadow-md transition-colors"
          >
            <PhoneCall className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <p className="text-sm">Walkie / Voice Call</p>
              <p className="text-[10px] opacity-80 font-normal">Direct secure voice or PTT channel</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onSendEmergencyAlert(person);
            }}
            className="w-full min-h-[46px] px-4 rounded-xl bg-[#F43F5E] hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-3 cursor-pointer shadow-md transition-colors"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <p className="text-sm">Send Emergency Alert</p>
              <p className="text-[10px] opacity-80 font-normal">Instant high-priority SOS ping with GPS</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
