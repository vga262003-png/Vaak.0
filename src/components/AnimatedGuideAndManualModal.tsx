import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  Download,
  HelpCircle,
  Home,
  Menu,
  PhoneCall,
  Printer,
  Radio,
  Search,
  Settings,
  Shield,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';

interface AnimatedGuideAndManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface GuideStep {
  category: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  whatItDoes: string;
  whenToUseIt: string;
  simpleTip: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    category: '1. Top Bar & Navigation',
    title: 'Menu Button (☰)',
    icon: Menu,
    whatItDoes: 'Opens your side control drawer to switch tabs, view your device ID, change settings, and access the master help manual.',
    whenToUseIt: 'Whenever you want to jump to another section or change your app preferences.',
    simpleTip: 'Tap the hamburger menu in the top-left corner at any time.',
  },
  {
    category: '1. Top Bar & Navigation',
    title: 'Network / Offline Status Pill',
    icon: Zap,
    whatItDoes: 'Shows whether you are currently connected to standard internet (🟢 Online Mode) or off-grid peer mesh (⚡ Offline Mode).',
    whenToUseIt: 'Check this to know if your messages are traveling over cellular internet or direct device-to-device radio waves.',
    simpleTip: 'Tap this pill anytime to switch instantly between Online and Offline modes.',
  },
  {
    category: '1. Top Bar & Navigation',
    title: 'My QR Code & Scan Nearby',
    icon: Shield,
    whatItDoes: 'Displays your encrypted connection QR code so friends nearby can scan and link with you instantly without internet.',
    whenToUseIt: 'When meeting friends or family in disaster zones or dead zones to add them to your secure circle.',
    simpleTip: 'Tap the QR code icon in the top header to show your code or scan someone else.',
  },
  {
    category: '2. Home Screen & Chats',
    title: 'Global Search & Voice Search',
    icon: Search,
    whatItDoes: 'Allows you to type or speak to instantly find family members, chat history, or emergency help topics.',
    whenToUseIt: 'When you are in a rush and want to find a specific family member or chat without scrolling.',
    simpleTip: 'Tap the microphone icon inside the search bar to speak your search out loud.',
  },
  {
    category: '2. Home Screen & Chats',
    title: 'Pinned Family & WhatsApp Chat',
    icon: Home,
    whatItDoes: 'Displays your 4 closest family members with live battery percentage and location status. Tapping any family member instantly opens their private WhatsApp-style chat.',
    whenToUseIt: 'To check if your loved ones are safe, view their battery level, or send them a private message or voice note.',
    simpleTip: 'Tap any family avatar or name to open a dedicated 1-on-1 chat window.',
  },
  {
    category: '2. Home Screen & Chats',
    title: 'Voice Pings & Delivery Ticks',
    icon: CheckCircle2,
    whatItDoes: 'Lets you record a quick voice note by holding down the button, and shows 3-stage delivery ticks (Queued → Mesh Jump → Delivered) so you know your message arrived.',
    whenToUseIt: 'When typing is hard or when you want to confirm your emergency message successfully jumped through nearby phones.',
    simpleTip: 'Hold the "Hold Voice" button to record, release to send automatically.',
  },
  {
    category: '3. Walkie-Talkie Tab',
    title: 'Channel Selector & Audio Modes',
    icon: Radio,
    whatItDoes: 'Lets you tune into public disaster channels or private frequency PINs, switch between Push-to-Talk (walkie style) and Hands-Free Auto-Listen, and toggle HD Clear vs Ultra Battery Saver codecs.',
    whenToUseIt: 'To talk with groups instantly like a two-way radio, even when cellular towers are jammed.',
    simpleTip: 'Use Ultra Battery Saver mode during prolonged power outages to keep your phone running 24+ hours.',
  },
  {
    category: '3. Walkie-Talkie Tab',
    title: 'Big Hold-to-Talk Mic & 5-Min Guard',
    icon: PhoneCall,
    whatItDoes: 'The giant microphone button lets you speak immediately on the airwaves. The 5-Minute Auto-Cut guard prevents accidental battery drain on weak signals.',
    whenToUseIt: 'During emergency radio broadcasts or team check-ins.',
    simpleTip: 'Press and hold the big mic button to speak, release to listen.',
  },
  {
    category: '4. 20km Radar & Emergency Tab',
    title: 'Distance Range (2km–20km) & Radar Dots',
    icon: Compass,
    whatItDoes: 'Shows a live 20km radar map with moving dots for family, emergency shelters, and rescue squads. Tapping any person dot opens their chat or directions.',
    whenToUseIt: 'To locate family members or find nearest relief shelters and safe points around you.',
    simpleTip: 'Use the zoom buttons (2km, 5km, 10km, 20km) to zoom in or out on your surroundings.',
  },
  {
    category: '4. 20km Radar & Emergency Tab',
    title: 'Safety Cover (Pocket Shield) & 112 SOS',
    icon: Shield,
    whatItDoes: 'Prevents accidental emergency calls in your pocket with a sliding lock. Tapping emergency services opens a confirmation sign-board with a 60-second anti-spam rate limiter.',
    whenToUseIt: 'When you need to call police, ambulance, or NDRF rescue without false alarms.',
    simpleTip: 'Slide the pocket shield fully to the right to unlock emergency buttons.',
  },
  {
    category: '5. Contacts Tab',
    title: 'Sync Phonebook & Vaak Filters',
    icon: Users,
    whatItDoes: 'Imports your phone contacts and automatically sorts who is already on Vaak versus who needs an invite link.',
    whenToUseIt: 'When setting up the app for the first time or adding new friends from your phonebook.',
    simpleTip: 'Tap "Sync Phonebook" to instantly match phone contacts with Vaak users.',
  },
  {
    category: '6. Side Drawer & Settings',
    title: 'Theme Studio, Fonts, & App PIN Lock',
    icon: Settings,
    whatItDoes: 'Lets you choose Daylight or Midnight themes, adjust text size, enable AMOLED black battery saver, set a 4-digit security PIN lock, and replay this guide or download the PDF manual.',
    whenToUseIt: 'To customize your visual comfort, protect your privacy with a PIN, or learn how to use the app.',
    simpleTip: 'Open the left Side Drawer and tap Settings to access all customization options.',
  },
];

export const AnimatedGuideAndManualModal: React.FC<AnimatedGuideAndManualModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'animated_tour' | 'printable_manual'>('animated_tour');

  if (!isOpen) return null;

  const currentStep = GUIDE_STEPS[activeStepIndex];
  const StepIcon = currentStep.icon;

  const handleNext = () => {
    audioEngine.playSonarPing();
    if (activeStepIndex < GUIDE_STEPS.length - 1) {
      setActiveStepIndex((prev) => prev + 1);
    } else {
      setActiveStepIndex(0);
    }
  };

  const handlePrev = () => {
    audioEngine.playSonarPing();
    if (activeStepIndex > 0) {
      setActiveStepIndex((prev) => prev - 1);
    } else {
      setActiveStepIndex(GUIDE_STEPS.length - 1);
    }
  };

  const handlePrintPdfManual = () => {
    audioEngine.playRogerBeep();
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Vaak / PingTalk — Official User Manual & Guide</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 10px; }
            h2 { color: #334155; margin-top: 30px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
            .item { margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .title { font-weight: bold; color: #0f172a; font-size: 16px; margin-bottom: 4px; }
            .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-bottom: 6px; font-weight: 600; }
            .desc { margin: 4px 0; color: #334155; font-size: 14px; }
            .tip { font-style: italic; color: #64748b; font-size: 13px; margin-top: 4px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Vaak / PingTalk — Official User Manual</h1>
          <p>Complete option-by-option guide explaining every button, icon, toggle, and feature in simple, everyday language for disaster survival and off-grid communication.</p>
          <hr/>
          ${GUIDE_STEPS.map(
            (s) => `
            <div class="item">
              <span class="badge">${s.category}</span>
              <div class="title">${s.title}</div>
              <div class="desc"><strong>What it does:</strong> ${s.whatItDoes}</div>
              <div class="desc"><strong>When to use it:</strong> ${s.whenToUseIt}</div>
              <div class="tip">💡 <strong>Simple Tip:</strong> ${s.simpleTip}</div>
            </div>
          `
          ).join('')}
        </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vaak-pingtalk-user-manual.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl rounded-3xl bg-[#121418] border border-sky-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1B1E24] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-white">
                Interactive Animated Tour &amp; PDF User Manual
              </h2>
              <p className="text-xs text-slate-400">
                Simple everyday language explanation of every button and feature
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#0B0E14] p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('animated_tour')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'animated_tour'
                    ? 'bg-[#0EA5E9] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Animated Tour
              </button>
              <button
                type="button"
                onClick={() => setViewMode('printable_manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'printable_manual'
                    ? 'bg-[#0EA5E9] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Printable PDF Manual
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#232730] text-slate-400 hover:text-white cursor-pointer"
              aria-label="Close guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {viewMode === 'animated_tour' ? (
            <div className="max-w-2xl mx-auto space-y-6 py-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
                  <span>Step {activeStepIndex + 1} of {GUIDE_STEPS.length}</span>
                  <span className="text-sky-400 font-semibold">{currentStep.category}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-[#0EA5E9] transition-all duration-300"
                    style={{ width: `${((activeStepIndex + 1) / GUIDE_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Spotlight Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#1B1E24] border border-sky-500/40 shadow-xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#0EA5E9]/20 border border-[#0EA5E9]/40 flex items-center justify-center text-[#0EA5E9] shrink-0 shadow-lg">
                    <StepIcon className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#0EA5E9]/15 text-[#0EA5E9] text-[11px] font-bold font-mono">
                      {currentStep.category}
                    </span>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                      {currentStep.title}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-[#121418] border border-white/8 space-y-1.5">
                    <p className="text-xs font-bold text-sky-400 uppercase tracking-wider">What it does</p>
                    <p className="text-sm text-slate-200 leading-relaxed">{currentStep.whatItDoes}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#121418] border border-white/8 space-y-1.5">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">When to use it</p>
                    <p className="text-sm text-slate-200 leading-relaxed">{currentStep.whenToUseIt}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-500/30 flex items-center gap-3 text-xs text-sky-200">
                  <HelpCircle className="w-5 h-5 shrink-0 text-sky-400" />
                  <span><strong>Simple Tip:</strong> {currentStep.simpleTip}</span>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="min-h-[44px] px-5 rounded-xl bg-[#232730] hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="min-h-[44px] px-6 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-950/40"
                >
                  <span>{activeStepIndex === GUIDE_STEPS.length - 1 ? 'Restart Tour' : 'Next Feature'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Printable PDF Manual View */
            <div className="space-y-6 max-w-3xl mx-auto py-2">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#1B1E24] border border-white/10">
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Official Printable User Manual
                  </h3>
                  <p className="text-xs text-slate-400">
                    All {GUIDE_STEPS.length} features formatted cleanly for print or PDF export.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrintPdfManual}
                  className="min-h-[42px] px-4 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Download / Print PDF Manual</span>
                </button>
              </div>

              <div className="space-y-4">
                {GUIDE_STEPS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="p-4 sm:p-5 rounded-2xl bg-[#1B1E24] border border-white/8 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/15 text-[#0EA5E9] flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-display text-sm font-bold text-white">{s.title}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono font-semibold">
                          {s.category}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                        <p><strong className="text-sky-400">What it does:</strong> {s.whatItDoes}</p>
                        <p><strong className="text-emerald-400">When to use it:</strong> {s.whenToUseIt}</p>
                      </div>
                      <p className="text-[11px] text-slate-400 italic pt-1 border-t border-white/6">
                        💡 {s.simpleTip}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
