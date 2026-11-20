import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Columns,
  Compass,
  ExternalLink,
  Globe,
  Home,
  Languages,
  Lock,
  Maximize2,
  Menu,
  MessageSquareLock,
  Palette,
  QrCode,
  Radio,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  AppLanguage,
  AppSettings,
  CachedEmergencyDirectory,
  ChatRoom,
  ConnectRequestLog,
  DashboardTab,
  EmergencyServiceEntry,
  FamilyMember,
  FirebaseSyncStatus,
  FounderRootControlState,
  MedicalIdProfile,
  NotificationItem,
  RadarNode,
  RadioTrackingFootprint,
  RadioTrackingTag,
  TransportMode,
  UserSession,
  VaakContactUser,
  VoiceNoteAttachment,
  WalkieCodecMode,
  WalkieTransmission,
} from '../types/app';
import { getTranslation } from '../data/i18n';
import { LANGUAGES_81 } from '../data/languages50';
import { PaninianKeyState, RamRelayPacket } from '../utils/securityEngine';
import {
  QuarantinedPayload,
  RaspIntegrityReport,
  RaspPolicyConfig,
} from '../utils/raspShield';
import { sanitizeDocId } from '../utils/firebaseService';
import { audioEngine } from '../utils/audioEngine';
import { SonicShieldLogo } from './SonicShieldLogo';
import { NotificationsModal, QrModal, CreateGroupModal } from './DashboardModals';
import { HomeTab } from './tabs/HomeTab';
import { RadarFamilyTab } from './tabs/RadarFamilyTab';
import { WalkieCallTab } from './tabs/WalkieCallTab';
import { ContactsTab } from './tabs/ContactsTab';
import { RoomsTab } from './tabs/RoomsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { OnlineSuperModePanel } from './OnlineSuperModePanel';
import { SecurityProtocolLab } from './SecurityProtocolLab';
import { SideEmergencyDrawer } from './SideEmergencyDrawer';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { ThemeColorStudioModal } from './ThemeColorStudioModal';
import { FounderControlSwitchboard } from './FounderControlSwitchboard';
import { ChatContactUser, ChatMessage, WhatsAppChatView } from './WhatsAppChatView';
import { AnimatedGuideAndManualModal } from './AnimatedGuideAndManualModal';
import { SafeNonBlockingAdCard } from './SafeNonBlockingAdCard';
import { GlobalRecipientPickerModal, PendingAlertPayload } from './GlobalRecipientPickerModal';
import { PWAInstallButton } from './PWAInstallButton';
import { BookOpen } from 'lucide-react';

interface DashboardProps {
  session: UserSession;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  mode: TransportMode;
  onModeChange: (mode: TransportMode) => void;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  founderControl: FounderRootControlState;
  onUpdateFounderControl: (patch: Partial<FounderRootControlState>) => void;
  family: FamilyMember[];
  radarNodes: RadarNode[];
  radarScanning?: boolean;
  onRefreshRadarScan?: () => void;
  onSendRadarConnectRequest?: (peer: RadarNode) => void;
  transmissions: WalkieTransmission[];
  rooms: ChatRoom[];
  notifications: NotificationItem[];
  paninianKey: PaninianKeyState;
  lamportClock: number;
  ramRelayCache: RamRelayPacket[];
  raspReport: RaspIntegrityReport;
  raspPolicy: RaspPolicyConfig;
  quarantinedItems: QuarantinedPayload[];
  keysLocked: boolean;
  syncingRaspPolicy: boolean;
  sosActive: boolean;
  medicalId: MedicalIdProfile;
  onUpdateMedicalId: (next: MedicalIdProfile) => void;
  firebaseSyncStatus: FirebaseSyncStatus;
  onVerifyFirebaseConnection: () => void;
  syncError?: string | null;
  onDismissSyncError?: () => void;
  onPingFamily: (memberId: string) => void;
  onTriggerSos: () => void;
  onCancelSos: () => void;
  onCallService: (service: EmergencyServiceEntry) => void;
  onSendServiceSosGps: (service: EmergencyServiceEntry) => void;
  onSendServiceCustomMessage: (service: EmergencyServiceEntry, message: string) => void;
  onSendTransmission: (payload: {
    channel: string;
    text: string;
    durationSec?: number;
    codec?: WalkieCodecMode;
    isAudio?: boolean;
    isQuickIcon?: boolean;
    voiceNote?: VoiceNoteAttachment;
  }) => void;
  onResetSuspension: () => void;
  onCreateRoom: (name: string, category: ChatRoom['category']) => ChatRoom;
  onJoinByPin: (pin: string) => Promise<ChatRoom | null> | ChatRoom | null;
  onSendRoomMessage: (roomId: string, text: string, voiceNote?: VoiceNoteAttachment) => void;
  onSyncRaspPolicyAndScan: () => void;
  onSimulateRaspThreat: (kind: 'overlay_spyware' | 'app_tamper') => void;
  onRestoreRaspIntegrity: () => void;
  onIncomingMeshPacketTest: (rawPayload: string) => void;
  onQuarantineQrThreat: (raw: string, reason: string) => void;
  onPurgeRamCache: () => void;
  onRotatePaninianEpoch: () => void;
  onLogBloomSimulation: (summary: string) => void;
  onMarkAllNotificationsRead: () => void;
  onPairQrNode: (code: string) => void;
  onOpenGovVault: () => void;
  onSignOut: () => void;
  onSendPriorityMeshBlast: (urgentMessage: string) => void;
  contacts: VaakContactUser[];
  connectRequests: ConnectRequestLog[];
  emergencyDir: CachedEmergencyDirectory;
  syncingEmergencyDir: boolean;
  onSyncEmergencyDir: () => void;
  onSyncPhonebook: (imported?: { name: string; phone: string }[]) => void;
  onSendConnectRequest: (contact: VaakContactUser) => void;
  onRespondConnectRequest: (reqId: string, accept: boolean) => void;
  onSendInviteLink: (phone: string, name?: string) => void;
  trackingTags: RadioTrackingTag[];
  trackingFootprints: RadioTrackingFootprint[];
  onAddTrackingTag: (payload: {
    name: string;
    targetType: RadioTrackingTag['targetType'];
    dutyCycleSec: 30 | 60 | 300;
  }) => void;
  onToggleTrackingTag: (tagId: string) => void;
  onPulseTrackingTag: (tagId: string) => void;
  downloadingTiles: boolean;
  tileDownloadProgress: number;
  onDownloadOsmTiles: () => Promise<void>;
  onClearOsmTiles: () => void;
  customGroups: ChatContactUser[];
  chatMessagesMap: Record<string, ChatMessage[]>;
  onSendChatMessage: (
    contactId: string,
    text: string,
    voiceNote?: VoiceNoteAttachment,
    contactName?: string,
    isEmergency?: boolean
  ) => void;
  onCreateGroup: (groupName: string, selectedIds: string[]) => void;
  onAddFamilyMember: (member: { name: string; relation: string; phone?: string }) => void;
  requestedTab?: { tab: DashboardTab; nonce: number } | null;
  onCreateBridgeRoom?: () => Promise<string | null> | string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  session,
  language,
  onLanguageChange,
  mode,
  onModeChange,
  settings,
  onUpdateSettings,
  founderControl,
  onUpdateFounderControl,
  family,
  radarNodes,
  radarScanning,
  onRefreshRadarScan,
  onSendRadarConnectRequest,
  transmissions,
  rooms,
  notifications,
  paninianKey,
  lamportClock,
  ramRelayCache,
  raspReport,
  raspPolicy,
  quarantinedItems,
  keysLocked,
  syncingRaspPolicy,
  sosActive,
  medicalId,
  onUpdateMedicalId,
  firebaseSyncStatus,
  onVerifyFirebaseConnection,
  syncError,
  onDismissSyncError,
  onPingFamily,
  onTriggerSos,
  onCancelSos,
  onCallService,
  onSendServiceSosGps,
  onSendServiceCustomMessage,
  onSendTransmission,
  onResetSuspension,
  onCreateRoom,
  onJoinByPin,
  onSendRoomMessage,
  onSyncRaspPolicyAndScan,
  onSimulateRaspThreat,
  onRestoreRaspIntegrity,
  onIncomingMeshPacketTest,
  onQuarantineQrThreat,
  onPurgeRamCache,
  onRotatePaninianEpoch,
  onLogBloomSimulation,
  onMarkAllNotificationsRead,
  onPairQrNode,
  onOpenGovVault,
  onSignOut,
  onSendPriorityMeshBlast,
  contacts,
  connectRequests,
  emergencyDir,
  syncingEmergencyDir,
  onSyncEmergencyDir,
  onSyncPhonebook,
  onSendConnectRequest,
  onRespondConnectRequest,
  onSendInviteLink,
  trackingTags,
  trackingFootprints,
  onAddTrackingTag,
  onToggleTrackingTag,
  onPulseTrackingTag,
  downloadingTiles,
  tileDownloadProgress,
  onDownloadOsmTiles,
  onClearOsmTiles,
  customGroups,
  chatMessagesMap,
  onSendChatMessage,
  onCreateGroup,
  onAddFamilyMember,
  requestedTab,
  onCreateBridgeRoom,
}) => {
  const t = getTranslation(language);
  const [activeTab, setActiveTab] = useState<DashboardTab>(requestedTab?.tab ?? 'home');

  useEffect(() => {
    if (requestedTab?.tab) {
      setActiveTab(requestedTab.tab);
    }
  }, [requestedTab]);

  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [themeStudioOpen, setThemeStudioOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  // Active 1-on-1 WhatsApp-style Chat State
  const [activeChatUser, setActiveChatUser] = useState<ChatContactUser | null>(null);
  const [sessionCount] = useState<number>(() => {
    try {
      const prev = Number(localStorage.getItem('vaak_session_count_v1') || '0');
      const next = (Number.isFinite(prev) ? prev : 0) + 1;
      localStorage.setItem('vaak_session_count_v1', String(next));
      return next;
    } catch {
      return 1;
    }
  });
  const [onlineDurationSec, setOnlineDurationSec] = useState<number>(0);

  useEffect(() => {
    if (mode !== 'online') return;
    const id = window.setInterval(() => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        setOnlineDurationSec((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [mode]);

  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);

  const openChat = (contact: ChatContactUser) => {
    setSideMenuOpen(false);
    setEmergencyOpen(false);
    setQrOpen(false);
    setNotifOpen(false);
    setActiveChatUser(contact);
  };

  const handleCreateGroup = (groupName: string, selectedIds: string[]) => {
    onCreateGroup(groupName, selectedIds);
    audioEngine.playNotificationChime();
  };

  const resolveContactName = (contactId: string): string => {
    if (activeChatUser?.id === contactId) return activeChatUser.name;
    const f = family.find((m) => m.id === contactId);
    if (f) return f.name;
    const c = contacts.find((m) => m.id === contactId);
    if (c) return c.name;
    const g = customGroups.find((m) => m.id === contactId);
    if (g) return g.name;
    return 'Contact';
  };

  const handleSendChatMessage = (
    contactId: string,
    text: string,
    voiceNote?: VoiceNoteAttachment,
    isEmergency?: boolean
  ) => {
    onSendChatMessage(contactId, text, voiceNote, resolveContactName(contactId), isEmergency);
  };

  // Global High-Priority Alert State (z-[9999]) & Delivery Feedback Banner
  const [pendingAlertPayload, setPendingAlertPayload] = useState<PendingAlertPayload | null>(null);
  const [alertConfirmationToast, setAlertConfirmationToast] = useState<{
    message: string;
    recipientsCount: number;
    channel: string;
    launchUrl?: string;
  } | null>(null);

  const handleDispatchGlobalAlert = (result: {
    recipientIds: string[];
    channel: 'vaak' | 'whatsapp' | 'sms' | 'social';
    formattedMessage: string;
    recipientNames: string[];
    launchUrl?: string;
  }) => {
    result.recipientIds.forEach((recipientId) => {
      handleSendChatMessage(recipientId, result.formattedMessage, undefined, true);
    });

    onSendPriorityMeshBlast(result.formattedMessage);
    audioEngine.playRogerBeep();

    setAlertConfirmationToast({
      message: result.formattedMessage,
      recipientsCount: result.recipientNames.length,
      channel: result.channel.toUpperCase(),
      launchUrl: result.launchUrl,
    });

    setTimeout(() => {
      setAlertConfirmationToast(null);
    }, 8000);
  };

  // Hidden Founder Master Switchboard (unlocked strictly by tapping Sonic-Shield logo 5 times within 3s)
  const [founderLogoTaps, setFounderLogoTaps] = useState(0);
  const [founderSwitchboardOpen, setFounderSwitchboardOpen] = useState(false);
  const lastLogoTapTimeRef = useRef<number>(0);

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastLogoTapTimeRef.current > 3000) {
      setFounderLogoTaps(1);
    } else {
      const nextTaps = founderLogoTaps + 1;
      if (nextTaps >= 5) {
        setFounderLogoTaps(0);
        setFounderSwitchboardOpen(true);
      } else {
        setFounderLogoTaps(nextTaps);
      }
    }
    lastLogoTapTimeRef.current = now;
  };

  // Desktop Chrome 2-Column Split View toggle
  const [desktopSplitView, setDesktopSplitView] = useState(true);

  useEffect(() => {
    const handleOnline = () => {
      onVerifyFirebaseConnection();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [onVerifyFirebaseConnection]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const currentLangMeta = LANGUAGES_81.find((l) => l.code === language);

  // 1-Tap Dual-Mode Switch handler
  const handleToggleDualMode = () => {
    if (mode === 'online') {
      onModeChange('mesh');
    } else {
      onModeChange('online');
    }
  };

  // Clean 4-item bottom bar with thumb navigation
  const bottomTabs: { id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: t.tabHome, icon: Home },
    { id: 'walkie', label: t.tabWalkie.split('-')[0], icon: Radio },
    { id: 'radar', label: t.tabRadar.split(' ')[0], icon: Compass },
    { id: 'contacts', label: t.tabContacts, icon: Users },
  ];

  // Side Drawer navigation (lazy-load toggled modules: World Tab only appears when enableGlobalWorldMapAndHubs is true)
  const sideMenuItems: {
    id: DashboardTab;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'home', label: t.tabHome, subtitle: 'Friends · Family · Groups · Voice notes', icon: Home },
    { id: 'walkie', label: t.tabWalkie, subtitle: 'PTT · Signal-Smart call', icon: Radio },
    { id: 'contacts', label: t.tabContacts, subtitle: 'Vaak filter · Invite · Social', icon: Users },
    { id: 'radar', label: t.tabRadar, subtitle: 'Compass · Directional radar', icon: Compass },
    ...(founderControl.enableGlobalWorldMapAndHubs
      ? [{ id: 'world' as const, label: t.tabWorld, subtitle: 'World relays · HD Video call', icon: Globe }]
      : []),
    { id: 'rooms', label: t.tabRooms, subtitle: '6-digit private mesh groups', icon: MessageSquareLock },
    { id: 'security', label: t.tabSecurity, subtitle: 'RASP scanner · Paninian KDF', icon: ShieldCheck },
    { id: 'settings', label: t.tabSettings, subtitle: 'Theme Studio · Display · Sync', icon: Settings },
  ];

  const shouldMaskSensitiveScreen =
    !raspReport.healthy && activeTab !== 'settings' && activeTab !== 'security';

  const navigateFromDrawer = (tab: DashboardTab) => {
    setActiveTab(tab);
    setSideMenuOpen(false);
  };

  return (
    <div
      dir={t.dir}
      className="h-[100dvh] w-full max-w-full overflow-hidden box-border vaak-canvas flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {/* Universal Single Top Header (Pinned) */}
      <header className="shrink-0 z-40 w-full max-w-full min-h-[3.5rem] bg-[#121418]/95 backdrop-blur-md border-b border-white/8 px-2 sm:px-6 flex items-center justify-between gap-1 sm:gap-3 box-border">
        {/* Left Section: Drawer + Logo + Brand */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setSideMenuOpen(true)}
            aria-label="Open Side Menu"
            className="min-h-[36px] min-w-[36px] sm:min-h-[38px] sm:min-w-[38px] rounded-xl bg-[#1B1E24] hover:bg-[#232730] border border-white/10 text-slate-200 flex items-center justify-center cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleLogoTap}
            aria-label="Vaak Sonic Shield"
            title="Vaak / PingTalk Sonic Shield"
            className="shrink-0 cursor-pointer select-none focus:outline-none transition-transform active:scale-95"
          >
            <SonicShieldLogo size={24} />
          </button>
          <div className="flex flex-col leading-none min-w-0">
            <span className="hidden min-[360px]:inline font-display text-xs sm:text-base font-bold tracking-tight text-white truncate">
              Vaak<span className="hidden sm:inline"> / PingTalk</span>
            </span>
            <span className="hidden md:inline font-mono-tabular text-[10px] text-[#0EA5E9] truncate">
              {session.callSign}
            </span>
          </div>
        </div>

        {/* Center: 1-Tap Dual-Mode Switch (Online Mode <-> Offline Mesh) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleToggleDualMode}
            title={
              mode === 'online'
                ? 'Online Mode Active: Cloud chat, live 81-language translation, HD Video/Voice. Tap to switch to Offline Mesh.'
                : 'Offline Mode Active: Zero-tower Auto-Jump mesh, 12 Quick Help Icons, offline compass. Tap to switch to Online Mode.'
            }
            className={`min-h-[34px] sm:min-h-[36px] px-2 sm:px-3 rounded-xl border flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold cursor-pointer transition-all shadow-sm max-w-[110px] sm:max-w-none ${
              mode === 'online'
                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-200 hover:bg-amber-500/30'
            }`}
          >
            {mode === 'online' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-medium truncate">{t.modeOnline}</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="font-medium truncate">{t.modeMesh}</span>
              </>
            )}
          </button>
        </div>

        {/* Right Section: Install (sm+) + 81 Languages + Emergency Shield + QR + Notifications */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="hidden sm:flex shrink-0">
            <PWAInstallButton compact />
          </div>

          {/* 81 Official State & National Languages Selector Trigger */}
          <button
            type="button"
            onClick={() => setLangModalOpen(true)}
            title="81 Official State & National Languages"
            aria-label="Open 81 Languages Selector"
            className="min-h-[34px] min-w-[34px] sm:min-h-[36px] px-1.5 sm:px-2.5 rounded-xl bg-[#1B1E24] border border-white/10 text-xs font-semibold text-[#0EA5E9] hover:border-[#0EA5E9] flex items-center justify-center gap-1 cursor-pointer shrink-0"
          >
            <Languages className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline truncate max-w-[85px]">
              {currentLangMeta?.native || '81 Langs'}
            </span>
          </button>

          {/* Desktop 2-Column Split View Toggle (hidden on mobile) */}
          <button
            type="button"
            onClick={() => setDesktopSplitView((v) => !v)}
            title="Toggle Desktop 2-Column Split View"
            aria-label="Toggle Desktop 2-Column Split View"
            className={`hidden lg:flex min-h-[36px] min-w-[36px] rounded-xl border items-center justify-center cursor-pointer transition-colors shrink-0 ${
              desktopSplitView
                ? 'bg-[#0EA5E9]/15 border-[#0EA5E9]/50 text-[#0EA5E9]'
                : 'bg-[#1B1E24] border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {desktopSplitView ? <Columns className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Locked Emergency Shield Icon in Header */}
          <button
            type="button"
            onClick={() => setEmergencyOpen(true)}
            title="Open Locked Emergency Shield & Medical ID"
            aria-label="Open Locked Emergency Shield Drawer"
            className="relative min-h-[34px] min-w-[34px] sm:min-h-[36px] sm:min-w-[36px] px-1.5 sm:px-2 rounded-xl bg-[#F43F5E]/15 hover:bg-[#F43F5E]/25 border border-[#F43F5E]/45 text-[#F43F5E] flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer shrink-0"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <Lock className="w-3 h-3 opacity-80 hidden sm:inline" />
            <span className="hidden xl:inline">SOS</span>
          </button>

          {/* My QR Modal */}
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="min-h-[34px] min-w-[34px] sm:min-h-[36px] sm:min-w-[36px] px-1.5 sm:px-2 rounded-xl bg-[#1B1E24] border border-white/10 text-slate-200 hover:text-white flex items-center justify-center gap-1 text-xs font-medium cursor-pointer shrink-0"
            aria-label="Open My QR for field pairing"
          >
            <QrCode className="w-4 h-4 text-[#0EA5E9]" />
            <span className="hidden sm:inline">My QR</span>
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            className="relative min-h-[34px] min-w-[34px] sm:min-h-[36px] sm:min-w-[36px] rounded-xl bg-[#1B1E24] border border-white/10 flex items-center justify-center text-slate-200 hover:text-white cursor-pointer shrink-0"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#F43F5E] text-[10px] font-mono-tabular font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Left Side Slide-Out Menu Drawer (☰) */}
      {sideMenuOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/65 backdrop-blur-sm">
          <aside className="w-80 max-w-[85vw] h-full bg-[#121418] border-r border-white/10 flex flex-col shadow-2xl">
            <div className="p-5 bg-[#1B1E24] border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <SonicShieldLogo size={32} />
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-white truncate">
                    Vaak / PingTalk
                  </p>
                  <p className="font-mono-tabular text-[11px] text-[#0EA5E9] truncate">
                    {session.callSign}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSideMenuOpen(false)}
                aria-label="Close Side Menu"
                className="min-h-[38px] min-w-[38px] rounded-xl bg-[#232730] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {sideMenuItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateFromDrawer(item.id)}
                    className={`w-full p-3 rounded-xl text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#0EA5E9]/15 border border-[#0EA5E9]/40 text-white'
                        : 'hover:bg-[#1B1E24] border border-transparent text-slate-300'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        active ? 'bg-[#0EA5E9] text-white' : 'bg-[#1B1E24] text-[#0EA5E9]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{item.label}</p>
                      <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-white/10 space-y-2.5 bg-[#1B1E24]/60">
              <div className="text-[11px] font-mono-tabular text-slate-400 flex items-center justify-between">
                <span>Device: {session.deviceId.slice(0, 10)}</span>
                <span className="text-emerald-400">
                  {raspReport.healthy ? 'RASP OK' : 'LOCKED'}
                </span>
              </div>
              <PWAInstallButton />
              <button
                type="button"
                onClick={() => {
                  setSideMenuOpen(false);
                  setThemeStudioOpen(true);
                }}
                className="w-full min-h-[38px] rounded-xl bg-[#121418] border border-white/10 text-xs font-semibold text-sky-400 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5 text-[#0EA5E9]" />
                <span>Theme &amp; Color Studio</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSideMenuOpen(false);
                  setGuideModalOpen(true);
                }}
                className="w-full min-h-[38px] rounded-xl bg-[#0EA5E9]/20 hover:bg-[#0EA5E9]/30 border border-[#0EA5E9]/40 text-xs font-semibold text-sky-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#0EA5E9]" />
                <span>Animated Guide &amp; PDF Manual</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSideMenuOpen(false);
                  setLangModalOpen(true);
                }}
                className="w-full min-h-[38px] rounded-xl bg-[#121418] border border-white/10 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Languages className="w-3.5 h-3.5 text-[#0EA5E9]" />
                <span>81 Languages Studio</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSideMenuOpen(false);
                  onOpenGovVault();
                }}
                className="w-full min-h-[38px] rounded-xl bg-[#121418] hover:bg-[#232730] border border-white/10 text-xs font-semibold text-[#0EA5E9] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Open /gov-vault Portal</span>
              </button>
            </div>
          </aside>
          <div className="flex-1" onClick={() => setSideMenuOpen(false)} />
        </div>
      )}

      {/* RASP Threat Warning Banner */}
      {!raspReport.healthy && (
        <div
          role="alert"
          className="shrink-0 bg-rose-950 border-b border-[#F43F5E] px-4 py-3 text-xs text-rose-100"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <ShieldAlert className="w-5 h-5 text-[#F43F5E] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-bold text-white break-words">
                  RASP SECURITY SHIELD ALERT: {raspReport.threats[0]}
                </p>
                <p className="text-rose-200 mt-0.5">
                  Sensitive screens masked and encryption keys locked automatically.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRestoreRaspIntegrity}
              className="min-h-[38px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shrink-0 cursor-pointer"
            >
              Quarantine Threat &amp; Restore Keys
            </button>
          </div>
        </div>
      )}

      {/* Firebase / Cloud Sync Error Banner */}
      {syncError && (
        <div
          role="alert"
          className="shrink-0 bg-amber-950/90 border-b border-amber-500/60 px-4 py-2.5 text-xs text-amber-100"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate font-mono">{syncError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onVerifyFirebaseConnection}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-semibold cursor-pointer"
              >
                Retry Sync
              </button>
              {onDismissSyncError && (
                <button
                  type="button"
                  onClick={onDismissSyncError}
                  aria-label="Dismiss sync error"
                  className="p-1 text-amber-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Viewport: Internal Scroll Region Only (No Whole-App Body Scroll) */}
      <main className="relative flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-contain box-border">
        <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-6 box-border">
        {/* Google-Compliant, Network-Stability-Guarded, Silent Non-Blocking Ad Card */}
        {activeTab !== 'radar' && (
          <SafeNonBlockingAdCard
            mode={mode}
            sosActive={sosActive}
            onlineDurationSec={onlineDurationSec}
            sessionCount={sessionCount}
          />
        )}

        {shouldMaskSensitiveScreen ? (
          <section className="min-h-[420px] vaak-surface rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 border border-[#F43F5E]/50">
            <div className="w-16 h-16 rounded-2xl bg-[#F43F5E]/20 border border-[#F43F5E]/40 flex items-center justify-center text-[#F43F5E]">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className="font-display text-xl font-bold text-white">
                Sensitive Screen Masked by RASP Shield
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed break-words">
                {raspReport.threats.join(' ')} Coordinates and keys are secured from overlay capture.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onRestoreRaspIntegrity}
                className="min-h-[46px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer"
              >
                Quarantine Threat &amp; Unmask
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className="min-h-[46px] px-5 rounded-xl bg-[#232730] hover:bg-slate-700 text-slate-200 text-sm font-semibold cursor-pointer"
              >
                Inspect in Security Shield
              </button>
            </div>
          </section>
        ) : (
          /* Desktop Split View: On lg viewports, when activeTab is home/walkie, show side-by-side with radar/tracking */
          desktopSplitView && (activeTab === 'home' || activeTab === 'walkie') ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Primary Tab (Home or Walkie) */}
              <div className="lg:col-span-7 min-w-0 space-y-6">
                {activeTab === 'home' ? (
                  <HomeTab
                    mode={mode}
                    family={family}
                    contacts={contacts}
                    transmissions={transmissions}
                    isSuspended={session.isSuspended}
                    onPingFamily={onPingFamily}
                    onSendTransmission={onSendTransmission}
                    onOpenChat={openChat}
                    onSelectPerson={openChat}
                    customGroups={customGroups}
                    roomsCount={rooms.length}
                    onOpenRoomsTab={() => setActiveTab('rooms')}
                    onCreateGroupClick={() => setCreateGroupModalOpen(true)}
                    onAddFamilyMember={onAddFamilyMember}
                  />
                ) : (
                  <WalkieCallTab
                    language={language}
                    mode={mode}
                    family={family}
                    contacts={contacts}
                    transmissions={transmissions}
                    isSuspended={session.isSuspended}
                    suspendedDeviceId={session.suspendedDeviceId}
                    suspensionReason={session.suspensionReason}
                    onSendTransmission={onSendTransmission}
                    onResetSuspension={onResetSuspension}
                    onRequestAlertPicker={(payload) => setPendingAlertPayload(payload)}
                    onCreateBridgeRoom={onCreateBridgeRoom}
                  />
                )}
              </div>

              {/* Right Column: Live Mesh Radar & Compass Navigation */}
              <div className="hidden lg:block lg:col-span-5 min-w-0 lg:sticky lg:top-4">
                <RadarFamilyTab
                  language={language}
                  mode={mode}
                  country={session.country}
                  family={family}
                  radarNodes={radarNodes}
                  radarScanning={radarScanning}
                  onRefreshRadarScan={onRefreshRadarScan}
                  connectRequests={connectRequests}
                  onSendRadarConnectRequest={onSendRadarConnectRequest}
                  onRespondConnectRequest={onRespondConnectRequest}
                  onPingFamily={onPingFamily}
                  onTriggerSos={onTriggerSos}
                  onCancelSos={onCancelSos}
                  sosActive={sosActive}
                  onSendPriorityMeshBlast={onSendPriorityMeshBlast}
                  localTileCacheEnabled={settings.localTileCacheEnabled}
                  cachedTileCount={settings.cachedTileCount}
                  onOpenTileSettings={() => setActiveTab('settings')}
                  trackingTags={trackingTags}
                  trackingFootprints={trackingFootprints}
                  onAddTrackingTag={onAddTrackingTag}
                  onToggleTrackingTag={onToggleTrackingTag}
                  onPulseTrackingTag={onPulseTrackingTag}
                  onOpenChat={openChat}
                  onRequestPriorityBlast={(payload) => setPendingAlertPayload(payload)}
                />
              </div>
            </div>
          ) : (
            /* Single Column / Full-Width Tab Content */
            <>
              {activeTab === 'home' && (
                <HomeTab
                  mode={mode}
                  family={family}
                  contacts={contacts}
                  transmissions={transmissions}
                  isSuspended={session.isSuspended}
                  onPingFamily={onPingFamily}
                  onSendTransmission={onSendTransmission}
                  onOpenChat={openChat}
                  onSelectPerson={openChat}
                  customGroups={customGroups}
                  roomsCount={rooms.length}
                  onOpenRoomsTab={() => setActiveTab('rooms')}
                  onCreateGroupClick={() => setCreateGroupModalOpen(true)}
                  onAddFamilyMember={onAddFamilyMember}
                />
              )}

              {activeTab === 'walkie' && (
                <WalkieCallTab
                  language={language}
                  mode={mode}
                  family={family}
                  contacts={contacts}
                  transmissions={transmissions}
                  isSuspended={session.isSuspended}
                  suspendedDeviceId={session.suspendedDeviceId}
                  suspensionReason={session.suspensionReason}
                  onSendTransmission={onSendTransmission}
                  onResetSuspension={onResetSuspension}
                  onRequestAlertPicker={(payload) => setPendingAlertPayload(payload)}
                  onCreateBridgeRoom={onCreateBridgeRoom}
                />
              )}

              {activeTab === 'contacts' && (
                <ContactsTab
                  contacts={contacts}
                  connectRequests={connectRequests}
                  emergencyDir={emergencyDir}
                  syncingEmergencyDir={syncingEmergencyDir}
                  onSyncEmergencyDir={onSyncEmergencyDir}
                  onSyncPhonebook={onSyncPhonebook}
                  onSendConnectRequest={onSendConnectRequest}
                  onRespondConnectRequest={onRespondConnectRequest}
                  onSendInviteLink={onSendInviteLink}
                  onOpenChat={openChat}
                />
              )}

              {activeTab === 'radar' && (
                <RadarFamilyTab
                  language={language}
                  mode={mode}
                  country={session.country}
                  family={family}
                  radarNodes={radarNodes}
                  radarScanning={radarScanning}
                  onRefreshRadarScan={onRefreshRadarScan}
                  connectRequests={connectRequests}
                  onSendRadarConnectRequest={onSendRadarConnectRequest}
                  onRespondConnectRequest={onRespondConnectRequest}
                  onPingFamily={onPingFamily}
                  onTriggerSos={onTriggerSos}
                  onCancelSos={onCancelSos}
                  sosActive={sosActive}
                  onSendPriorityMeshBlast={onSendPriorityMeshBlast}
                  localTileCacheEnabled={settings.localTileCacheEnabled}
                  cachedTileCount={settings.cachedTileCount}
                  onOpenTileSettings={() => setActiveTab('settings')}
                  trackingTags={trackingTags}
                  trackingFootprints={trackingFootprints}
                  onAddTrackingTag={onAddTrackingTag}
                  onToggleTrackingTag={onToggleTrackingTag}
                  onPulseTrackingTag={onPulseTrackingTag}
                  onOpenChat={openChat}
                  onRequestPriorityBlast={(payload) => setPendingAlertPayload(payload)}
                />
              )}

              {activeTab === 'world' && <OnlineSuperModePanel family={family} />}

              {activeTab === 'rooms' && (
                <RoomsTab
                  language={language}
                  mode={mode}
                  rooms={rooms}
                  isSuspended={session.isSuspended}
                  onCreateRoom={onCreateRoom}
                  onJoinByPin={onJoinByPin}
                  onSendRoomMessage={onSendRoomMessage}
                />
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <section className="vaak-surface rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 border border-[#0EA5E9]/30">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <span>Runtime Antivirus &amp; Integrity Status</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Signature Pack {raspPolicy.signatureVersion} · Scanned {raspReport.scannedAt} ·{' '}
                        {quarantinedItems.length} malware payloads neutralized
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={onSyncRaspPolicyAndScan}
                        disabled={syncingRaspPolicy}
                        className="min-h-[40px] px-3.5 rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-xs font-semibold cursor-pointer"
                      >
                        {syncingRaspPolicy ? 'Syncing...' : 'Sync & Scan Now'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className="min-h-[40px] px-3.5 rounded-xl bg-[#232730] hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                      >
                        Full RASP Controls
                      </button>
                    </div>
                  </section>

                  <SecurityProtocolLab
                    paninianKey={paninianKey}
                    lamportClock={lamportClock}
                    deviceId={session.deviceId}
                    x25519PublicKey={session.x25519PublicKey}
                    keysLocked={keysLocked}
                    ramRelayCache={ramRelayCache}
                    onPurgeRamCache={onPurgeRamCache}
                    onRotatePaninianEpoch={onRotatePaninianEpoch}
                    onLogBloomSimulation={onLogBloomSimulation}
                    onIncomingMeshPacketTest={onIncomingMeshPacketTest}
                  />
                </div>
              )}

              {activeTab === 'settings' && (
                <SettingsTab
                  session={session}
                  language={language}
                  settings={settings}
                  onUpdateSettings={onUpdateSettings}
                  founderControl={founderControl}
                  onUpdateFounderControl={onUpdateFounderControl}
                  onOpenFounderSwitchboard={() => setFounderSwitchboardOpen(true)}
                  paninianKey={paninianKey}
                  lamportClock={lamportClock}
                  deviceId={session.deviceId}
                  x25519PublicKey={session.x25519PublicKey}
                  ramRelayCache={ramRelayCache}
                  raspReport={raspReport}
                  raspPolicy={raspPolicy}
                  quarantinedItems={quarantinedItems}
                  keysLocked={keysLocked}
                  syncingRaspPolicy={syncingRaspPolicy}
                  onSyncRaspPolicyAndScan={onSyncRaspPolicyAndScan}
                  onSimulateRaspThreat={onSimulateRaspThreat}
                  onRestoreRaspIntegrity={onRestoreRaspIntegrity}
                  onIncomingMeshPacketTest={onIncomingMeshPacketTest}
                  onPurgeRamCache={onPurgeRamCache}
                  onRotatePaninianEpoch={onRotatePaninianEpoch}
                  onLogBloomSimulation={onLogBloomSimulation}
                  onOpenGovVault={onOpenGovVault}
                  onSignOut={onSignOut}
                  firebaseSyncStatus={firebaseSyncStatus}
                  onVerifyFirebaseConnection={onVerifyFirebaseConnection}
                  downloadingTiles={downloadingTiles}
                  tileDownloadProgress={tileDownloadProgress}
                  onDownloadOsmTiles={onDownloadOsmTiles}
                  onClearOsmTiles={onClearOsmTiles}
                />
              )}
            </>
          )
        )}
        </div>
      </main>

      {/* Locked Emergency Shield Drawer (Triggered from Top Header Icon) */}
      <SideEmergencyDrawer
        isOpen={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        country={session.country}
        emergencyDir={emergencyDir}
        medicalId={medicalId}
        onUpdateMedicalId={onUpdateMedicalId}
        onCallService={onCallService}
        onSendServiceSosGps={onSendServiceSosGps}
        onSendPriorityMeshBlast={onSendPriorityMeshBlast}
        onRequestAlertPicker={(payload) => setPendingAlertPayload(payload)}
      />

      {/* Pinned 4-Tab Bottom Navigation Bar */}
      <nav
        aria-label="Primary Dashboard Navigation"
        className="shrink-0 w-full z-40 bg-[#121418]/95 backdrop-blur-md border-t border-white/8"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="max-w-lg mx-auto h-16 grid grid-cols-4 items-center px-2">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-full flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  isActive ? 'text-[#0EA5E9]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`px-3 py-1 rounded-xl transition-colors ${
                    isActive ? 'bg-[#0EA5E9]/15' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium leading-none truncate max-w-[70px]">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <QrModal
        isOpen={qrOpen}
        userIdentifier={session.identifier}
        callSign={session.callSign}
        deviceId={session.deviceId}
        x25519PublicKey={session.x25519PublicKey}
        paninianKey={paninianKey}
        medicalId={medicalId}
        raspPolicy={raspPolicy}
        onClose={() => setQrOpen(false)}
        onScanConnect={onPairQrNode}
        onQuarantineQrThreat={onQuarantineQrThreat}
      />

      <NotificationsModal
        isOpen={notifOpen}
        notifications={notifications}
        onClose={() => setNotifOpen(false)}
        onMarkAllRead={onMarkAllNotificationsRead}
      />

      {/* 81 Languages Searchable Modal */}
      <LanguageSelectorModal
        isOpen={langModalOpen}
        currentLang={language}
        onSelectLanguage={onLanguageChange}
        onClose={() => setLangModalOpen(false)}
      />

      {/* Theme & Color Studio Modal */}
      <ThemeColorStudioModal
        isOpen={themeStudioOpen}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onClose={() => setThemeStudioOpen(false)}
      />

      {/* Hidden Founder Master Control Switchboard */}
      <FounderControlSwitchboard
        isOpen={founderSwitchboardOpen}
        onClose={() => setFounderSwitchboardOpen(false)}
        founderControl={founderControl}
        onUpdateFounderControl={onUpdateFounderControl}
        onOpenGovVault={onOpenGovVault}
      />

      {/* Create WhatsApp-Style Family / Team Group Modal */}
      <CreateGroupModal
        isOpen={createGroupModalOpen}
        onClose={() => setCreateGroupModalOpen(false)}
        familyMembers={family}
        contacts={contacts}
        onCreateGroup={handleCreateGroup}
      />

      {/* Animated Guide & Printable PDF Manual Modal */}
      <AnimatedGuideAndManualModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
      />

      {/* Full-Screen WhatsApp-Style 1-on-1 & Group Chat View (fixed inset-0 z-[70]) */}
      {activeChatUser && (
        <WhatsAppChatView
          currentUserCallSign={session.callSign}
          contact={activeChatUser}
          mode={mode}
          messages={
            chatMessagesMap[sanitizeDocId(activeChatUser.id)] ||
            chatMessagesMap[activeChatUser.id] ||
            []
          }
          onBack={() => setActiveChatUser(null)}
          onSendMessage={handleSendChatMessage}
          onVoiceCall={(c) => {
            audioEngine.playNormalRing();
            setAlertConfirmationToast({
              message: `Voice call channel connected to ${c.name} (${c.phone}).`,
              recipientsCount: 1,
              channel: 'VOICE CALL',
            });
            setTimeout(() => setAlertConfirmationToast(null), 4000);
          }}
        />
      )}

      {/* Global High-Priority Alert Recipient Picker Modal (fixed inset-0 z-[9999]) */}
      <GlobalRecipientPickerModal
        isOpen={Boolean(pendingAlertPayload)}
        payload={pendingAlertPayload}
        onClose={() => setPendingAlertPayload(null)}
        family={family}
        contacts={contacts}
        customGroups={customGroups}
        onDispatchAlert={handleDispatchGlobalAlert}
      />

      {/* Global High-Priority Dispatched Alert Confirmation Toast (z-[10000]) */}
      {alertConfirmationToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] max-w-md w-[92vw] p-4 rounded-2xl bg-[#0F291E] border-2 border-emerald-400 text-white shadow-2xl backdrop-blur-md flex items-start gap-3 animate-fade-in">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center font-bold text-base shrink-0">
            ✓
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <h4 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
              <span>Alert Dispatched Successfully</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-mono">
                {alertConfirmationToast.channel}
              </span>
            </h4>
            <p className="text-xs text-emerald-200">
              Sent to {alertConfirmationToast.recipientsCount} recipient(s) across mesh &amp; selected channels.
            </p>
            {alertConfirmationToast.launchUrl && (
              <a
                href={alertConfirmationToast.launchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open {alertConfirmationToast.channel} App</span>
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAlertConfirmationToast(null)}
            className="text-emerald-300 hover:text-white p-1 rounded-lg cursor-pointer"
            aria-label="Dismiss Alert Confirmation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
