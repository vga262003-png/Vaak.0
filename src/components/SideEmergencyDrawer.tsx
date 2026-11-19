import React, { useEffect, useRef, useState } from 'react';
import {
  Ambulance,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Edit3,
  Flame,
  HeartHandshake,
  HeartPulse,
  Hospital,
  Lock,
  PhoneCall,
  Radio,
  Save,
  Send,
  Shield,
  ShieldAlert,
  Unlock,
  Users,
  Utensils,
  Waves,
  X,
  Zap,
  ZapOff,
  BatteryLow,
  Home,
  UserCheck,
} from 'lucide-react';
import {
  CachedEmergencyDirectory,
  CountryOption,
  EmergencyServiceEntry,
  MedicalIdProfile,
} from '../types/app';
import { audioEngine } from '../utils/audioEngine';
import { EmergencyConfirmationModal } from './EmergencyConfirmationModal';

interface QuickSignalDef {
  id: string;
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  message: string;
}

const QUICK_SIGNALS: QuickSignalDef[] = [
  { id: 'water', label: 'Need Water', subLabel: 'पानी चाहिए', icon: Droplets, tone: 'text-sky-400 bg-sky-500/15 border-sky-500/30', message: 'URGENT: Need clean drinking water at my location.' },
  { id: 'medical', label: 'Medical Help', subLabel: 'दवाई / डॉक्टर', icon: HeartPulse, tone: 'text-rose-400 bg-rose-500/15 border-rose-500/30', message: 'URGENT: Medical emergency / first-aid needed immediately.' },
  { id: 'food', label: 'Need Food', subLabel: 'खाना चाहिए', icon: Utensils, tone: 'text-amber-400 bg-amber-500/15 border-amber-500/30', message: 'Requesting food / dry rations for family.' },
  { id: 'trapped', label: 'Trapped', subLabel: 'फँसे हुए हैं', icon: AlertTriangle, tone: 'text-orange-400 bg-orange-500/15 border-orange-500/30', message: 'ALERT: Trapped inside structure, send rescue team.' },
  { id: 'safe', label: 'Safe Here', subLabel: 'हम सुरक्षित हैं', icon: ShieldAlert, tone: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', message: 'STATUS: I am safe and accounted for at current coordinates.' },
  { id: 'fire', label: 'Fire Danger', subLabel: 'आग का खतरा', icon: Flame, tone: 'text-red-400 bg-red-500/15 border-red-500/30', message: 'HAZARD: Active fire reported nearby, evacuate corridor.' },
  { id: 'flood', label: 'Flood Rising', subLabel: 'बाढ़ का पानी', icon: Waves, tone: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30', message: 'HAZARD: Water level rising rapidly in this zone.' },
  { id: 'power', label: 'Power Out', subLabel: 'बिजली बंद', icon: ZapOff, tone: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30', message: 'INFO: Grid power down, operating on local mesh.' },
  { id: 'child', label: 'Child Lost', subLabel: 'बच्चा गुम', icon: Users, tone: 'text-pink-400 bg-pink-500/15 border-pink-500/30', message: 'ALERT: Missing child / separated family member nearby.' },
  { id: 'shelter', label: 'Need Shelter', subLabel: 'शरण चाहिए', icon: Home, tone: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30', message: 'Requesting directions to nearest relief shelter.' },
  { id: 'battery', label: 'Battery Low', subLabel: 'बैटरी कम है', icon: BatteryLow, tone: 'text-amber-300 bg-amber-500/15 border-amber-500/30', message: 'NOTICE: Device battery critical (<15%), switching to beacon.' },
  { id: 'come', label: 'Come Here', subLabel: 'यहाँ आएं', icon: UserCheck, tone: 'text-blue-400 bg-blue-500/15 border-blue-500/30', message: 'GROUPING: Regroup at my current GPS pin.' },
];

interface SideEmergencyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  country: CountryOption;
  emergencyDir: CachedEmergencyDirectory;
  medicalId: MedicalIdProfile;
  onUpdateMedicalId: (next: MedicalIdProfile) => void;
  onCallService: (service: EmergencyServiceEntry) => void;
  onSendServiceSosGps: (service: EmergencyServiceEntry) => void;
  onSendPriorityMeshBlast: (urgentMessage: string) => void;
  onRequestAlertPicker?: (payload: { title: string; message: string; subLabel?: string }) => void;
}

export const SideEmergencyDrawer: React.FC<SideEmergencyDrawerProps> = ({
  isOpen,
  onClose,
  country,
  emergencyDir,
  medicalId,
  onUpdateMedicalId,
  onCallService,
  onSendServiceSosGps,
  onSendPriorityMeshBlast,
  onRequestAlertPicker,
}) => {
  const [unlocked, setUnlocked] = useState(false);
  const [slideVal, setSlideVal] = useState(0);
  const [holdMs, setHoldMs] = useState(0);
  const holdRef = useRef<number | null>(null);

  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Offline Medical ID Card editor
  const [editingMed, setEditingMed] = useState(false);
  const [bloodGroup, setBloodGroup] = useState(medicalId.bloodGroup);
  const [allergies, setAllergies] = useState(medicalId.allergies);
  const [emergencyNotes, setEmergencyNotes] = useState(medicalId.emergencyNotes);

  // Emergency Confirmation Sign-Board & 60-second Anti-Spam Rate-Limiter
  const [selectedServiceForSignBoard, setSelectedServiceForSignBoard] = useState<EmergencyServiceEntry | null>(null);
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (rateLimitSecondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setRateLimitSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitSecondsLeft]);

  useEffect(() => {
    setBloodGroup(medicalId.bloodGroup);
    setAllergies(medicalId.allergies);
    setEmergencyNotes(medicalId.emergencyNotes);
  }, [medicalId]);

  useEffect(() => {
    if (!isOpen) {
      setUnlocked(false);
      setSlideVal(0);
      setHoldMs(0);
      setEditingMed(false);
      if (holdRef.current) {
        clearInterval(holdRef.current);
        holdRef.current = null;
      }
    }
  }, [isOpen]);

  const startHoldUnlock = () => {
    if (unlocked) return;
    if (holdRef.current) clearInterval(holdRef.current);
    const start = Date.now();
    holdRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= 2000) {
        if (holdRef.current) clearInterval(holdRef.current);
        holdRef.current = null;
        setHoldMs(2000);
        setUnlocked(true);
        audioEngine.playRogerBeep();
      } else {
        setHoldMs(elapsed);
      }
    }, 50);
  };

  const cancelHoldUnlock = () => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
    if (!unlocked) setHoldMs(0);
  };

  const handleSlideChange = (val: number) => {
    setSlideVal(val);
    if (val >= 94) {
      setUnlocked(true);
      setSlideVal(100);
      audioEngine.playRogerBeep();
    }
  };

  const getServiceIcon = (cat: EmergencyServiceEntry['category']) => {
    switch (cat) {
      case 'Police':
        return Shield;
      case 'Ambulance':
        return Ambulance;
      case 'Nearest Hospitals':
        return Hospital;
      case 'Disaster Rescue (NDRF)':
        return HeartHandshake;
      case 'Fire Brigade':
        return Flame;
      case 'Govt Helplines':
        return ShieldAlert;
    }
  };

  const showToast = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(null), 4000);
  };

  const handleCall = (svc: EmergencyServiceEntry) => {
    audioEngine.playSosPulse();
    onCallService(svc);
    showToast(`Dialing ${svc.category} (${svc.phone}) via device dialer...`);
  };

  const handleSaveMedicalId = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMedicalId({
      ...medicalId,
      bloodGroup: bloodGroup.trim() || 'O+',
      allergies: allergies.trim() || 'None reported',
      emergencyNotes: emergencyNotes.trim() || 'No chronic conditions',
      updatedAt: new Date().toTimeString().slice(0, 5),
    });
    setEditingMed(false);
    showToast('Offline Medical ID saved locally.');
  };

  const handleQuickSignalTap = (sig: QuickSignalDef) => {
    audioEngine.playSonarPing();
    if (onRequestAlertPicker) {
      onRequestAlertPicker({
        title: sig.label,
        message: sig.message,
        subLabel: sig.subLabel,
      });
      onClose();
    }
  };

  const handleTriggerDrawerPriorityBlast = () => {
    audioEngine.playSonarPing();
    const blastMsg = 'URGENT: Emergency Priority Mesh Blast from Side Shield — immediate regroup & response required.';
    if (onRequestAlertPicker) {
      onRequestAlertPicker({
        title: '60-Second Priority Mesh Blast',
        message: blastMsg,
        subLabel: '50-Hop Jumping Jack',
      });
      onClose();
    } else {
      onSendPriorityMeshBlast(blastMsg);
      showToast('Priority mesh blast dispatched.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-[#121418] border-l border-white/10 flex flex-col overflow-hidden shadow-2xl relative">
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-[#1B1E24] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/40 flex items-center justify-center text-[#F43F5E]">
              {unlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Emergency Shield &amp; Quick Icons
              </h2>
              <p className="text-xs text-slate-400">
                {country.name} · {emergencyDir.services.length} Services Offline-Ready
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-[#232730] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
            aria-label="Close emergency drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!unlocked ? (
            /* Pocket Lock Safety Gate */
            <div className="my-auto py-8 space-y-5">
              <div className="p-5 rounded-2xl bg-[#1B1E24] border border-[#F43F5E]/30 space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#F43F5E]/15 text-[#F43F5E] flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  Pocket Safety Lock Active
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hold for 2 seconds or slide right to reveal the 12 Quick Help Icons, Offline Medical ID, and regional SOS controls.
                </p>
              </div>

              {/* 2-Second Hold Unlock */}
              <button
                type="button"
                onMouseDown={startHoldUnlock}
                onMouseUp={cancelHoldUnlock}
                onMouseLeave={cancelHoldUnlock}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startHoldUnlock();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  cancelHoldUnlock();
                }}
                className="relative w-full min-h-[54px] rounded-2xl bg-[#F43F5E] hover:bg-rose-500 text-white text-sm font-bold overflow-hidden select-none cursor-pointer"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-75"
                  style={{ width: `${Math.round((holdMs / 2000) * 100)}%` }}
                />
                <span className="relative z-10 font-mono-tabular">
                  {holdMs > 0
                    ? `Unlocking ${(holdMs / 1000).toFixed(1)}s / 2.0s...`
                    : 'Hold 2 Seconds to Unlock Emergency Shield'}
                </span>
              </button>

              {/* Alternative Slide to Unlock */}
              <div className="relative h-12 rounded-2xl bg-[#1B1E24] border border-white/10 flex items-center px-3 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[#F43F5E]/30 pointer-events-none"
                  style={{ width: `${slideVal}%` }}
                />
                <span className="w-full text-center text-xs font-medium text-slate-300 pointer-events-none z-10">
                  Or slide 100% right to unlock
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={slideVal}
                  onChange={(e) => handleSlideChange(Number(e.target.value))}
                  onMouseUp={() => slideVal < 94 && setSlideVal(0)}
                  onTouchEnd={() => slideVal < 94 && setSlideVal(0)}
                  aria-label="Slide to unlock Emergency Shield"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-grab z-20"
                />
              </div>
            </div>
          ) : (
            /* Unlocked: 12 Quick Distress Signals + Medical ID + Emergency Services */
            <>
              {statusFeedback && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{statusFeedback}</span>
                </div>
              )}

              {/* 60-Second Priority Mesh Blast Card */}
              <div className="p-4 rounded-2xl bg-[#1B1E24] border border-[#F43F5E]/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#F43F5E]" />
                    <span>60-Second Priority Mesh Blast</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                    50-Hop Jump
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Override background traffic &amp; broadcast high-priority SOS alert to chosen recipients.
                </p>
                <button
                  type="button"
                  onClick={handleTriggerDrawerPriorityBlast}
                  className="w-full min-h-[42px] rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-950/40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Choose Recipients &amp; Send 60s Mesh Blast</span>
                </button>
              </div>

              {/* 12 Quick Help Picture Icons Section */}
              <div className="p-4 rounded-2xl bg-[#1B1E24] border border-[#0EA5E9]/30 space-y-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-sky-400" />
                    <span>Quick Distress Signals (12 Icons)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tap any icon to choose exact recipients &amp; delivery channel before sending
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {QUICK_SIGNALS.map((sig) => {
                    const Icon = sig.icon;
                    return (
                      <button
                        key={sig.id}
                        type="button"
                        onClick={() => handleQuickSignalTap(sig)}
                        className="p-2.5 rounded-xl bg-[#121418] hover:bg-[#232730] border border-white/8 hover:border-sky-500/50 flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer group"
                      >
                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${sig.tone} group-hover:scale-105`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-white leading-tight truncate w-full">
                          {sig.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Offline Medical ID Card */}
              <div className="p-4 rounded-2xl bg-[#1B1E24] border border-[#F43F5E]/40 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-[#F43F5E]" />
                    <span>Offline Medical ID Card</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingMed((v) => !v)}
                    className="text-xs text-[#0EA5E9] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{editingMed ? 'Cancel' : 'Edit'}</span>
                  </button>
                </div>

                {!editingMed ? (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#121418] border border-white/8">
                      <span className="text-[10px] text-slate-400 block">Blood Group</span>
                      <span className="font-mono-tabular text-base font-bold text-[#F43F5E]">
                        {medicalId.bloodGroup || 'Not set'}
                      </span>
                    </div>
                    <div className="col-span-2 p-2.5 rounded-xl bg-[#121418] border border-white/8">
                      <span className="text-[10px] text-slate-400 block">Allergies</span>
                      <span className="font-semibold text-white">
                        {medicalId.allergies || 'Not set — tap Edit'}
                      </span>
                    </div>
                    <div className="col-span-3 p-2.5 rounded-xl bg-[#121418] border border-white/8">
                      <span className="text-[10px] text-slate-400 block">Medical Notes</span>
                      <span className="text-slate-200">{medicalId.emergencyNotes || 'Not set — tap Edit'}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveMedicalId} className="space-y-2.5 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        placeholder="Blood (O+)"
                        className="min-h-[38px] px-2.5 rounded-xl bg-[#121418] border border-white/10 text-white"
                      />
                      <input
                        type="text"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="Allergies"
                        className="col-span-2 min-h-[38px] px-2.5 rounded-xl bg-[#121418] border border-white/10 text-white"
                      />
                    </div>
                    <input
                      type="text"
                      value={emergencyNotes}
                      onChange={(e) => setEmergencyNotes(e.target.value)}
                      placeholder="Emergency medical notes..."
                      className="w-full min-h-[38px] px-2.5 rounded-xl bg-[#121418] border border-white/10 text-white"
                    />
                    <button
                      type="submit"
                      className="w-full min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Offline Medical ID</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Emergency Services */}
              <div className="space-y-3">
                {emergencyDir.services.map((svc) => {
                  const Icon = getServiceIcon(svc.category);
                  return (
                    <div
                      key={svc.id}
                      className="p-4 rounded-2xl bg-[#1B1E24] border border-white/8 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#F43F5E]/15 text-[#F43F5E] flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {svc.category}
                            </p>
                            <p className="text-xs text-slate-400">
                              {svc.name} · {svc.distanceKm} km
                            </p>
                          </div>
                        </div>
                        <span className="font-mono-tabular text-sm font-bold text-[#F43F5E]">
                          {svc.phone}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedServiceForSignBoard(svc)}
                          className="min-h-[42px] px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-950/40"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          <span>Verify &amp; Dispatch SOS</span>
                        </button>
                        <a
                          href={`tel:${svc.phone}`}
                          onClick={() => handleCall(svc)}
                          className="min-h-[42px] px-3 rounded-xl bg-[#232730] hover:bg-slate-700 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Direct Dial</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Emergency Confirmation Sign-Board Modal */}
        <EmergencyConfirmationModal
          isOpen={Boolean(selectedServiceForSignBoard)}
          onClose={() => setSelectedServiceForSignBoard(null)}
          service={selectedServiceForSignBoard}
          medicalId={medicalId}
          rateLimitSecondsLeft={rateLimitSecondsLeft}
          onDispatchVerifiedSos={(payload) => {
            setRateLimitSecondsLeft(60);
            onSendServiceSosGps(payload.service);
            showToast(`Verified SOS dispatched to ${payload.service.category}. 60s anti-spam lock active.`);
          }}
        />
      </div>
    </div>
  );
};
