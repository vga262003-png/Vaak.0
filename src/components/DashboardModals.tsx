import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  CheckCheck,
  Copy,
  Download,
  Lock,
  QrCode,
  ScanLine,
  Share2,
  ShieldAlert,
  VideoOff,
  X,
} from 'lucide-react';
import { MedicalIdProfile, NotificationItem } from '../types/app';
import { RaspPolicyConfig, sanitizeIncomingContent } from '../utils/raspShield';
import { PaninianKeyState, permuteWithPaninianKey } from '../utils/securityEngine';
import { QrMatrixSvg, buildQrModules } from './QrMatrixSvg';

interface QrModalProps {
  isOpen: boolean;
  userIdentifier: string;
  callSign: string;
  deviceId: string;
  x25519PublicKey: string;
  paninianKey: PaninianKeyState;
  medicalId: MedicalIdProfile;
  raspPolicy: RaspPolicyConfig;
  onClose: () => void;
  onScanConnect: (scannedCode: string) => void;
  onQuarantineQrThreat: (raw: string, reason: string) => void;
}

export const QrModal: React.FC<QrModalProps> = ({
  isOpen,
  userIdentifier,
  callSign,
  deviceId,
  x25519PublicKey,
  paninianKey,
  medicalId,
  raspPolicy,
  onClose,
  onScanConnect,
  onQuarantineQrThreat,
}) => {
  const [tab, setTab] = useState<'myqr' | 'scan'>('myqr');
  const [manualScanCode, setManualScanCode] = useState('');
  const [scanResult, setScanResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [sharedOk, setSharedOk] = useState(false);
  const [badgeDownloaded, setBadgeDownloaded] = useState(false);

  // Field Camera Scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Paninian + X25519 Encrypted Public ID (safe to broadcast in field QR without leaking raw phone/email)
  const encryptedPublicId = useMemo(() => {
    const cipher = permuteWithPaninianKey(
      `${callSign}|${deviceId}|${userIdentifier}`,
      paninianKey,
      paninianKey.epoch
    );
    const shortSeg1 = cipher.slice(0, 8);
    const shortSeg2 = cipher.slice(8, 16) || paninianKey.hexDigest.slice(0, 8);
    return `EPID-${paninianKey.keyId.replace('PAN-', '')}-${shortSeg1}-${shortSeg2}`;
  }, [callSign, deviceId, userIdentifier, paninianKey]);

  const myQrValue = useMemo(
    () =>
      `vaak://connect?epid=${encodeURIComponent(encryptedPublicId)}&cs=${encodeURIComponent(
        callSign
      )}&pk=${encodeURIComponent(x25519PublicKey)}&epoch=${paninianKey.epoch}`,
    [encryptedPublicId, callSign, x25519PublicKey, paninianKey.epoch]
  );

  // Stop camera stream cleanly when modal closes or user switches away from scanner
  useEffect(() => {
    if (!isOpen || tab !== 'scan' || !cameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let detectorInterval: number | null = null;

    const startCamera = async () => {
      setCameraError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API unavailable in this browser. Use field token paste below.');
        setCameraActive(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        type BarcodeDetectorCtor = new (opts?: { formats: string[] }) => {
          detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
        };
        const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
          .BarcodeDetector;

        if (Detector) {
          const detector = new Detector({ formats: ['qr_code'] });
          detectorInterval = window.setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const hits = await detector.detect(videoRef.current);
              const raw = hits?.[0]?.rawValue;
              if (raw) {
                setManualScanCode(raw);
                processScannedPayload(raw);
                setCameraActive(false);
              }
            } catch {
              // Ignore per-frame detector errors
            }
          }, 500);
        }
      } catch {
        setCameraError('Camera permission blocked or unavailable. Enter scanned ID below.');
        setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (detectorInterval) clearInterval(detectorInterval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, tab, cameraActive]);

  if (!isOpen) return null;

  const processScannedPayload = (rawPayload: string) => {
    const trimmed = rawPayload.trim();
    if (!trimmed) return;

    const scanCheck = sanitizeIncomingContent(trimmed, raspPolicy);
    if (!scanCheck.clean) {
      const reason = scanCheck.quarantinedReason || 'Malicious QR script detected';
      setScanResult({
        ok: false,
        msg: `QUARANTINED BY RASP SHIELD: ${reason}`,
      });
      onQuarantineQrThreat(trimmed, reason);
      return;
    }

    let label = scanCheck.sanitizedText;
    if (label.startsWith('vaak://connect')) {
      try {
        const parsed = new URL(label.replace('vaak://', 'https://vaak.local/'));
        const cs = parsed.searchParams.get('cs');
        const epid = parsed.searchParams.get('epid');
        label = cs ? `${cs} (${epid?.slice(0, 18) || 'Encrypted ID'})` : epid || label;
      } catch {
        // Use sanitized string
      }
    }

    setScanResult({
      ok: true,
      msg: `Connected in field with ${label} via Paninian X25519 handshake.`,
    });
    onScanConnect(label);
  };

  const handleCopyEncryptedId = () => {
    navigator.clipboard?.writeText(encryptedPublicId).catch(() => {});
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleShareFieldQr = () => {
    const shareText = `Connect with me on Vaak / PingTalk (${callSign})\nEncrypted Public ID: ${encryptedPublicId}\nMesh Pair URI: ${myQrValue}`;
    if (navigator.share) {
      navigator
        .share({
          title: `Vaak / PingTalk · ${callSign}`,
          text: shareText,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareText).catch(() => {});
    }
    setSharedOk(true);
    setTimeout(() => setSharedOk(false), 2000);
  };

  const handleDownloadPrintableBadge = () => {
    const { size: modSize, rows } = buildQrModules(myQrValue);
    const qrBoxSize = 188;
    const qrOriginX = 412;
    const qrOriginY = 114;
    const quiet = 2;
    const cellPx = qrBoxSize / (modSize + quiet * 2);

    const qrRects = rows
      .flatMap((row, r) =>
        row.map((dark, c) =>
          dark
            ? `<rect x="${(qrOriginX + (c + quiet) * cellPx).toFixed(2)}" y="${(
                qrOriginY +
                (r + quiet) * cellPx
              ).toFixed(2)}" width="${cellPx.toFixed(2)}" height="${cellPx.toFixed(
                2
              )}" fill="#121418"/>`
            : ''
        )
      )
      .join('');

    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" rx="24" fill="#FFFFFF" stroke="#0EA5E9" stroke-width="4"/>
      <rect x="0" y="0" width="640" height="76" rx="20" fill="#121418"/>
      <text x="32" y="46" font-family="sans-serif" font-size="22" font-weight="bold" fill="#FFFFFF">VAAK / PINGTALK — FIELD SAFETY &amp; ENCRYPTED QR</text>
      <text x="32" y="118" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0F172A">Call-Sign: ${callSign}</text>
      <text x="32" y="146" font-family="monospace" font-size="11.5" fill="#0284C7">Encrypted Public ID: ${encryptedPublicId}</text>
      <text x="32" y="172" font-family="monospace" font-size="11" fill="#475569">Key: ${x25519PublicKey} · ${paninianKey.keyId}</text>
      <rect x="32" y="198" width="352" height="158" rx="14" fill="#FFF1F2" stroke="#F43F5E" stroke-width="2"/>
      <text x="48" y="230" font-family="sans-serif" font-size="14" font-weight="bold" fill="#E11D48">OFFLINE MEDICAL ID</text>
      <text x="48" y="262" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0F172A">Blood Group: ${medicalId.bloodGroup || 'Not set'}</text>
      <text x="48" y="292" font-family="sans-serif" font-size="13" fill="#334155">Allergies: ${medicalId.allergies || 'None reported'}</text>
      <text x="48" y="322" font-family="sans-serif" font-size="12" fill="#475569">Notes: ${(medicalId.emergencyNotes || 'None').slice(0, 44)}</text>
      <rect x="${qrOriginX - 4}" y="${qrOriginY - 4}" width="${qrBoxSize + 8}" height="${qrBoxSize + 8}" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
      ${qrRects}
      <text x="${qrOriginX + qrBoxSize / 2}" y="336" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0F172A">SCAN TO CONNECT IN FIELD</text>
    </svg>`;

    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vaak-my-qr-${callSign.toLowerCase()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBadgeDownloaded(true);
    setTimeout(() => setBadgeDownloaded(false), 2600);
  };

  const handleSimulateScan = (e: React.FormEvent) => {
    e.preventDefault();
    processScannedPayload(manualScanCode);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-qr-modal-title"
    >
      <div className="w-full max-w-md min-w-0 vaak-surface-elevated rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div>
            <h2
              id="my-qr-modal-title"
              className="font-display text-lg font-bold text-white flex items-center gap-2"
            >
              <QrCode className="w-5 h-5 text-[#0EA5E9]" />
              <span>My QR · Field Connect</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Encrypted Public ID for instant zero-server pairing
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-[#121418] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
            aria-label="Close My QR modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: My QR vs Field Scanner */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#121418] border border-white/8">
          <button
            type="button"
            onClick={() => {
              setCameraActive(false);
              setTab('myqr');
            }}
            className={`min-h-[40px] rounded-lg text-xs font-semibold cursor-pointer ${
              tab === 'myqr' ? 'bg-[#0EA5E9] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            My QR Code
          </button>
          <button
            type="button"
            onClick={() => setTab('scan')}
            className={`min-h-[40px] rounded-lg text-xs font-semibold cursor-pointer ${
              tab === 'scan' ? 'bg-[#0EA5E9] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Scan Peer QR
          </button>
        </div>

        {tab === 'myqr' ? (
          <div className="flex flex-col items-center space-y-3.5 text-center">
            {/* Scannable High-Contrast QR Card */}
            <div className="p-3.5 rounded-2xl bg-white shadow-lg">
              <QrMatrixSvg value={myQrValue} size={188} />
            </div>

            {/* Encrypted Public ID Strip */}
            <div className="w-full p-3 rounded-xl bg-[#121418] border border-white/10 text-left space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Encrypted Public ID</span>
                </span>
                <span className="font-mono-tabular text-[11px] text-[#0EA5E9] font-semibold">
                  {callSign}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono-tabular text-xs text-white break-all">
                  {encryptedPublicId}
                </code>
                <button
                  type="button"
                  onClick={handleCopyEncryptedId}
                  className="min-h-[34px] px-2.5 rounded-lg bg-[#232730] hover:bg-slate-700 text-xs font-semibold text-[#0EA5E9] flex items-center gap-1 shrink-0 cursor-pointer"
                  aria-label="Copy Encrypted Public ID"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="font-mono-tabular text-[10px] text-slate-400">
                {x25519PublicKey} · {paninianKey.keyId} · Medical ID {medicalId.bloodGroup || 'Not set'}
              </p>
            </div>

            {/* Quick Field Share + Printable Safety QR Badge */}
            <div className="w-full grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleShareFieldQr}
                className="min-h-[42px] px-3 rounded-xl bg-[#232730] hover:bg-slate-700 border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {sharedOk ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Ready</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-[#0EA5E9]" />
                    <span>Share ID</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadPrintableBadge}
                className="min-h-[42px] px-3 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{badgeDownloaded ? 'Downloaded!' : 'Save Badge'}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSimulateScan} className="space-y-3.5">
            <div className="h-44 rounded-2xl bg-[#121418] border border-dashed border-[#0EA5E9]/50 flex flex-col items-center justify-center gap-2 text-slate-300 relative overflow-hidden">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <ScanLine className="w-10 h-10 text-[#0EA5E9]" />
                  <p className="text-xs flex items-center gap-1.5 text-center px-4">
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span>RASP-Protected Optical &amp; Mesh QR Scanner</span>
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCameraActive((v) => !v)}
                className="w-full min-h-[40px] px-3 rounded-xl bg-[#232730] hover:bg-slate-700 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {cameraActive ? (
                  <>
                    <VideoOff className="w-3.5 h-3.5 text-[#F43F5E]" />
                    <span>Stop Camera</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5 text-[#0EA5E9]" />
                    <span>Open Camera</span>
                  </>
                )}
              </button>
            </div>

            {cameraError && (
              <p className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5">
                {cameraError}
              </p>
            )}

            <div className="flex flex-wrap sm:flex-nowrap gap-2 min-w-0">
              <input
                type="text"
                value={manualScanCode}
                onChange={(e) => setManualScanCode(e.target.value)}
                placeholder="Paste vaak://connect?... or Encrypted Public ID"
                className="flex-1 min-w-0 min-h-[44px] px-3 rounded-xl bg-[#121418] border border-white/10 font-mono-tabular text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0EA5E9]"
              />
              <button
                type="submit"
                disabled={!manualScanCode.trim()}
                className="min-h-[44px] px-4 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 disabled:bg-slate-800 text-white text-xs font-semibold cursor-pointer shrink-0"
              >
                Pair
              </button>
            </div>

            {scanResult && (
              <p
                className={`text-xs rounded-xl p-3 border flex items-center gap-2 ${
                  scanResult.ok
                    ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                    : 'text-rose-300 bg-rose-950/50 border-[#F43F5E]/40'
                }`}
              >
                {!scanResult.ok && <ShieldAlert className="w-4 h-4 shrink-0" />}
                <span>{scanResult.msg}</span>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

interface NotificationsModalProps {
  isOpen: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  notifications,
  onClose,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-end p-4 sm:p-6">
      <div className="w-full max-w-md min-w-0 mt-12 vaak-surface-elevated rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#0EA5E9]" />
            <span>Alerts &amp; Mesh Notifications</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-xs text-[#0EA5E9] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[36px] min-w-[36px] rounded-lg bg-[#121418] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-white/8 max-h-80 overflow-y-auto">
          {notifications.map((n) => (
            <div key={n.id} className="py-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-xs font-semibold ${
                    n.severity === 'critical'
                      ? 'text-[#F43F5E]'
                      : n.severity === 'warning'
                      ? 'text-amber-300'
                      : 'text-white'
                  }`}
                >
                  {n.title}
                </p>
                <span className="font-mono-tabular text-[11px] text-slate-500">{n.timestamp}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{n.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyMembers: { id: string; name: string; avatar?: string; relation?: string }[];
  contacts: { id: string; name: string; phone: string }[];
  onCreateGroup: (groupName: string, selectedIds: string[]) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  familyMembers,
  contacts,
  onCreateGroup,
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    onCreateGroup(groupName.trim(), selectedIds);
    setGroupName('');
    setSelectedIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg min-w-0 vaak-surface-elevated rounded-2xl p-4 sm:p-6 space-y-5 shadow-2xl animate-fade-in max-h-[92vh] overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold">+</span>
            <span>Create Friends, Family or Any Group</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-[#121418] border border-white/10 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Group Name (e.g. &ldquo;Friends Circle&rdquo;, &ldquo;College Buddies&rdquo;, &ldquo;Family Group&rdquo;, &ldquo;Team&rdquo;)
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter any group name..."
              className="w-full min-h-[44px] px-4 rounded-xl bg-[#121418] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-300 mb-2">
              Select Members to Include ({selectedIds.length} selected):
            </p>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {familyMembers.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#121418] border border-white/6 hover:border-emerald-500/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {m.name[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{m.relation || 'Family Member'}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleSelect(m.id)}
                    className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                  />
                </label>
              ))}

              {contacts.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#121418] border border-white/6 hover:border-emerald-500/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-sky-600/30 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.phone}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#121418] hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!groupName.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer transition-colors shadow"
            >
              Create Group Chat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
