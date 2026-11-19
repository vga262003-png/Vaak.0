import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Download,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import { FounderRootControlState, GovAuditEntry } from '../types/app';
import { SonicShieldLogo } from './SonicShieldLogo';

interface GovVaultPortalProps {
  logs: GovAuditEntry[];
  founderControl: FounderRootControlState;
  deviceId?: string;
  onBackToApp: () => void;
}

export const GovVaultPortal: React.FC<GovVaultPortalProps> = ({
  logs,
  founderControl,
  deviceId,
  onBackToApp,
}) => {
  const [unlocked, setUnlocked] = useState(false);
  const [custodyToken, setCustodyToken] = useState<string | null>(null);
  const [founderKeyInput, setFounderKeyInput] = useState('');
  const [govCodeInput, setGovCodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Strict server-side Dual-Key verification (zero master secrets in client bundle)
  const handleDualKeyUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifying) return;
    setVerifying(true);
    setAuthError(null);

    try {
      const resp = await fetch('/api/gov-vault/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          founderKey: founderKeyInput,
          govOfficerCode: govCodeInput,
          deviceId: deviceId || 'ROOT-AUDITOR',
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.authorized) {
        setAuthError(data.error || 'Server Dual-Key verification rejected.');
      } else {
        setCustodyToken(data.custodyToken || 'CUSTODY-VERIFIED');
        setUnlocked(true);
      }
    } catch {
      setAuthError('Unable to reach server verification endpoint.');
    } finally {
      setVerifying(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      const matchesType = filterType === 'ALL' || entry.eventType === filterType;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        entry.summary.toLowerCase().includes(q) ||
        entry.actor.toLowerCase().includes(q) ||
        entry.id.toLowerCase().includes(q) ||
        (entry.deviceId || '').toLowerCase().includes(q) ||
        entry.paninianKeyId.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [logs, filterType, searchQuery]);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vaak-dualkey-gov-vault-audit.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#0B1120] text-slate-100 p-4 sm:p-8 box-border">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToApp}
              className="min-h-[44px] px-3.5 rounded-xl bg-[#11192C] border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Vaak / PingTalk</span>
            </button>
            <SonicShieldLogo size={32} />
            <div>
              <h1 className="font-display text-lg font-bold text-white">
                Dual-Key /gov-vault Audit Portal
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono-tabular text-slate-400">
            {unlocked ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <Unlock className="w-4 h-4" />
                SERVER-VERIFIED CUSTODY
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <Lock className="w-4 h-4" />
                EDGE / SERVER SEALED
              </span>
            )}
          </div>
        </header>

        {!unlocked ? (
          <section className="max-w-lg mx-auto mt-10 vaak-surface rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-display text-xl font-bold text-white">
                Server-Verified Dual-Key Gate
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                All master credentials reside strictly in server-side Edge environment secrets. Enter both the <strong className="text-white">Founder Admin Authorization Key</strong> and a <strong className="text-white">Verified Government Officer Code</strong> to authenticate via constant-time server verification.
              </p>
            </div>

            <form onSubmit={handleDualKeyUnlock} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>Key 1 · Founder Admin Authorization</span>
                </label>
                <input
                  type="password"
                  value={founderKeyInput}
                  onChange={(e) => setFounderKeyInput(e.target.value)}
                  placeholder="Enter Founder Admin Authorization Key"
                  className="w-full min-h-[46px] px-4 rounded-xl bg-[#0B1120] border border-slate-700 font-mono-tabular text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Key 2 · Verified Government Officer Code</span>
                </label>
                <input
                  type="password"
                  value={govCodeInput}
                  onChange={(e) => setGovCodeInput(e.target.value)}
                  placeholder="Enter Verified Government Officer Code"
                  className="w-full min-h-[46px] px-4 rounded-xl bg-[#0B1120] border border-slate-700 font-mono-tabular text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {authError && (
                <p className="text-xs text-rose-400">{authError}</p>
              )}

              <button
                type="submit"
                disabled={verifying}
                className="w-full min-h-[46px] rounded-xl bg-[#2563EB] hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm font-semibold cursor-pointer"
              >
                {verifying ? 'Verifying via Server Edge Function...' : 'Verify Dual-Key on Server & Unlock'}
              </button>
            </form>
          </section>
        ) : (
          <div className="space-y-5">
            {/* Dual-Key Verification Banner */}
            <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/30 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Server Custody Verified (<span className="font-mono-tabular text-white">{custodyToken}</span>) · Firebase Auth Guard Active
                </span>
              </div>
              <span className="font-mono-tabular text-slate-300">
                Subscription Engine: {founderControl.isSubscriptionActive ? 'ACTIVE' : 'DORMANT (LOCKED)'}
              </span>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="vaak-surface rounded-xl p-4">
                <p className="text-xs text-slate-400">Total Sealed Records</p>
                <p className="font-mono-tabular text-2xl font-bold text-white mt-1">{logs.length}</p>
              </div>
              <div className="vaak-surface rounded-xl p-4">
                <p className="text-xs text-slate-400">Silent Duress Alerts</p>
                <p className="font-mono-tabular text-2xl font-bold text-amber-300 mt-1">
                  {logs.filter((l) => l.eventType === 'DURESS_ALERT').length}
                </p>
              </div>
              <div className="vaak-surface rounded-xl p-4">
                <p className="text-xs text-slate-400">Device Suspensions</p>
                <p className="font-mono-tabular text-2xl font-bold text-rose-400 mt-1">
                  {logs.filter((l) => l.eventType === 'THREAT_KEYWORD_BLOCK').length}
                </p>
              </div>
              <div className="vaak-surface rounded-xl p-4">
                <p className="text-xs text-slate-400">SOS Dispatches</p>
                <p className="font-mono-tabular text-2xl font-bold text-blue-400 mt-1">
                  {logs.filter((l) => l.eventType === 'SOS_DISPATCH').length}
                </p>
              </div>
            </div>

            {/* Filter & Export Bar */}
            <div className="vaak-surface rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                <div className="relative min-w-0 w-full sm:min-w-[220px] flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ID, Device-ID, actor, Paninian key..."
                    className="w-full min-h-[42px] pl-9 pr-3 rounded-xl bg-[#0B1120] border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="min-h-[42px] px-3 rounded-xl bg-[#0B1120] border border-slate-700 text-xs text-white"
                >
                  <option value="ALL">All Event Types</option>
                  <option value="DURESS_ALERT">Duress PIN Alerts</option>
                  <option value="THREAT_KEYWORD_BLOCK">Threat Keyword Blocks</option>
                  <option value="SOS_DISPATCH">SOS Dispatches</option>
                  <option value="KEY_ROTATION">Paninian Key Rotations</option>
                  <option value="BLOOM_HOP_TRACE">Bloom-Filter Traces</option>
                  <option value="FOUNDER_POLICY_SEAL">Founder Master Policy</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleExportJson}
                className="min-h-[42px] px-4 rounded-xl bg-[#2563EB] hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Forensic JSON</span>
              </button>
            </div>

            {/* Audit Log Table */}
            <div className="vaak-surface rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B1120] border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Audit ID / Time</th>
                      <th className="py-3 px-4 font-semibold">Event Type</th>
                      <th className="py-3 px-4 font-semibold">Actor &amp; Device-ID</th>
                      <th className="py-3 px-4 font-semibold">Forensic Summary</th>
                      <th className="py-3 px-4 font-semibold">Paninian / Lamport</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredLogs.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-900/50">
                        <td className="py-3.5 px-4 font-mono-tabular whitespace-nowrap">
                          <div className="font-semibold text-white">{entry.id}</div>
                          <div className="text-slate-400 text-[11px]">{entry.timestamp}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              entry.severity === 'CRITICAL'
                                ? 'text-rose-400'
                                : entry.severity === 'HIGH'
                                ? 'text-amber-300'
                                : 'text-blue-400'
                            }`}
                          >
                            {entry.severity === 'CRITICAL' ? (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            )}
                            {entry.eventType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-slate-100 font-medium">
                            {entry.countryCode} {entry.actor}
                          </div>
                          <div className="font-mono-tabular text-[11px] text-slate-400">
                            {entry.deviceId || 'SYSTEM'} · {entry.coordinates}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-200 max-w-md">
                          {entry.summary}
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular whitespace-nowrap">
                          <div className="text-blue-300">
                            {entry.paninianKeyId}
                            {entry.lamportSeq ? ` · L#${String(entry.lamportSeq).padStart(3, '0')}` : ''}
                          </div>
                          <div className="text-[11px] text-slate-500">{entry.payloadHash}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
