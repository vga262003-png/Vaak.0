import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TransportMode } from '../types/app';

interface SafeNonBlockingAdCardProps {
  mode: TransportMode;
  sosActive: boolean;
  onlineDurationSec: number;
  sessionCount: number;
}

export const SafeNonBlockingAdCard: React.FC<SafeNonBlockingAdCardProps> = ({
  mode,
  sosActive,
  onlineDurationSec,
  sessionCount,
}) => {
  const [dismissed, setDismissed] = useState(false);

  // Conditions for displaying silent non-blocking ad:
  // - Not during SOS, Radar, or offline mesh/sonic mode.
  // - Mode must be 'online'.
  // - Online duration >= 150 seconds (2.5 mins).
  // - Session count >= 2.
  const shouldShow =
    !dismissed &&
    !sosActive &&
    mode === 'online' &&
    onlineDurationSec >= 150 &&
    sessionCount >= 2;

  if (!shouldShow) return null;

  const sponsors = [
    {
      title: 'Solar Emergency Power Bank (IP68 Waterproof & 20km Mesh Ready)',
      badge: 'Verified Sponsor',
      tag: 'Off-Grid Survival',
    },
    {
      title: 'Satellite Backup Dual-SIM Global Messenger (No Roaming Fees)',
      badge: 'Partner Offer',
      tag: 'Global Comms',
    },
    {
      title: 'Encrypted Tactical Walkie-Talkie Antennas & Sub-GHz Boosters',
      badge: 'Verified Sponsor',
      tag: 'Hardware',
    },
  ];

  const currentSponsor = sponsors[Math.floor(onlineDurationSec / 60) % sponsors.length];

  return (
    <div className="w-full max-w-4xl mx-auto px-3 my-2">
      <div className="h-10 sm:h-12 px-3.5 rounded-xl bg-[#121820]/90 border border-[#0EA5E9]/30 flex items-center justify-between gap-3 text-xs shadow-sm overflow-hidden box-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] shrink-0">
            {currentSponsor.badge}
          </span>
          <span className="text-slate-200 truncate font-medium">
            {currentSponsor.title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 hidden sm:inline font-mono">
            {currentSponsor.tag} · 100% Silent
          </span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
            aria-label="Dismiss sponsor banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
