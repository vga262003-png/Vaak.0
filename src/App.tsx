import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppLanguage,
  AppSettings,
  CachedEmergencyDirectory,
  ChatRoom,
  ConnectRequestLog,
  CountryOption,
  DashboardTab,
  EmergencyServiceEntry,
  FamilyMember,
  FirebaseSyncStatus,
  FounderRootControlState,
  GovAuditEntry,
  MedicalIdProfile,
  MeshDeliveryStage,
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
} from './types/app';
import { COUNTRIES } from './data/countries';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_FAMILY_MEMBERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_RADAR_NODES,
  INITIAL_ROOMS,
  INITIAL_WALKIE_MESSAGES,
} from './data/initialData';
import {
  INITIAL_CONNECT_REQUESTS,
  INITIAL_VAAK_CONTACTS,
  loadCachedEmergencyDirectory,
  saveCachedEmergencyDirectory,
} from './data/emergencyDirectories';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, firebaseConfig, testConnection } from './firebase';
import {
  createRoomInFirestore,
  fetchUserProfile,
  joinRoomByPinInFirestore,
  sanitizeDocId,
  saveConnectRequestToFirestore,
  saveContactToFirestore,
  saveFamilyMemberToFirestore,
  saveGroupToFirestore,
  sendRoomMessageToFirestore,
  saveTrackingTagToFirestore,
  saveWalkieTransmissionToFirestore,
  sendChatMessageToFirestore,
  subscribeChatMessages,
  subscribeConnectRequests,
  subscribeContacts,
  subscribeFamilyMembers,
  subscribeGroups,
  subscribeRooms,
  subscribeTrackingTags,
  subscribeWalkieTransmissions,
  updateConnectRequestStatusInFirestore,
  updateFamilyMemberPingInFirestore,
  updateTrackingTagInFirestore,
  upsertUserProfile,
} from './utils/firebaseService';
import {
  RamRelayPacket,
  generateBoundDeviceId,
  generatePaninianKey,
  generateX25519KeyFingerprint,
  permuteWithPaninianKey,
  scanForThreatKeywords,
} from './utils/securityEngine';
import {
  DEFAULT_RASP_POLICY,
  QuarantinedPayload,
  RaspIntegrityReport,
  RaspPolicyConfig,
  runDeviceAndAppIntegrityScan,
  sanitizeIncomingContent,
} from './utils/raspShield';
import { audioEngine } from './utils/audioEngine';
import {
  clearOfflineTileCache,
  downloadLowResOsmTileBundle,
  loadOfflineTileCacheMeta,
} from './utils/offlineTileCache';
import {
  computeBearingDeg,
  computeDistanceKm,
  computeFallbackSector,
  formatLiveLocationSummary,
  getCachedGps,
  requestLiveGps,
} from './utils/geolocation';
import {
  broadcastLocalMeshPacket,
  broadcastLocalRadarBeacon,
  broadcastLocalRadarRequest,
  enqueueDtnOutboxItem,
  LocalRadarBeacon,
  LocalRadarRequestPacket,
  loadDtnOutbox,
  saveDtnOutbox,
  subscribeLocalMesh,
  subscribeLocalRadarBeacons,
  subscribeLocalRadarRequests,
} from './utils/offlineMeshTransport';
import { loadFounderFeatureFlags } from './utils/sixLayerSecurityVault';
import {
  loadOfflineDataSnapshot,
  saveBaseVerifiedVault,
  saveOfflineDataSnapshot,
} from './utils/authVault';
import { OnboardingGate } from './components/OnboardingGate';
import { AuthGate, USER_PREFS_STORAGE_KEY } from './components/AuthGate';
import { DuressDecoyScreen } from './components/DuressDecoyScreen';
import { Dashboard } from './components/Dashboard';
import { ChatContactUser, ChatMessage } from './components/WhatsAppChatView';
import { GovVaultPortal } from './components/GovVaultPortal';
import { InstantSplashScreen } from './components/InstantSplashScreen';

const ONBOARDING_ACCEPTED_STORAGE_KEY = 'vaak_onboarding_accepted_v1';
const MEDICAL_ID_STORAGE_KEY = 'vaak_medical_id_v1';
const DEFAULT_MEDICAL_ID: MedicalIdProfile = {
  fullName: '',
  bloodGroup: '',
  allergies: '',
  emergencyNotes: '',
  updatedAt: '',
};

function loadSavedMedicalId(): MedicalIdProfile {
  try {
    const raw = localStorage.getItem(MEDICAL_ID_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MedicalIdProfile;
  } catch {
    // Ignore storage unavailability
  }
  return DEFAULT_MEDICAL_ID;
}

type AppStage = 'onboarding' | 'auth' | 'dashboard' | 'gov-vault';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [stage, setStage] = useState<AppStage>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/gov-vault') {
      return 'gov-vault';
    }
    try {
      const savedPrefs = localStorage.getItem(USER_PREFS_STORAGE_KEY);
      const accepted = localStorage.getItem(ONBOARDING_ACCEPTED_STORAGE_KEY);
      if (savedPrefs || accepted === '1') return 'auth';
    } catch {}
    return 'onboarding';
  });
  const [prevStageBeforeVault, setPrevStageBeforeVault] = useState<AppStage>('onboarding');

  const [language, setLanguage] = useState<AppLanguage>('en');
  const [mode, setMode] = useState<TransportMode>('mesh');
  const [session, setSession] = useState<UserSession | null>(null);
  const [profileReadyUid, setProfileReadyUid] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [voiceNotesById, setVoiceNotesById] = useState<Record<string, VoiceNoteAttachment>>({});
  const [requestedTab, setRequestedTab] = useState<{ tab: DashboardTab; nonce: number } | null>(null);
  const handledDeepLinkRef = useRef<string | null>(null);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const tileMeta = loadOfflineTileCacheMeta();
    return {
      fontStyle: 'sans',
      fontSize: 'standard',
      themeMode: 'charcoal',
      amoledMode: false,
      daylightMode: false,
      sunlightMode: false,
      accentColor: 'ocean',
      soundEffects: true,
      autoRelayMesh: true,
      localTileCacheEnabled: Boolean(tileMeta?.enabled),
      cachedTileCount: tileMeta?.tileCount ?? 0,
      lastTileCacheAt: tileMeta?.cachedAt,
    };
  });
  const [downloadingTiles, setDownloadingTiles] = useState(false);
  const [tileDownloadProgress, setTileDownloadProgress] = useState(0);

  const [medicalId, setMedicalId] = useState<MedicalIdProfile>(() => loadSavedMedicalId());
  const [firebaseSyncStatus, setFirebaseSyncStatus] = useState<FirebaseSyncStatus>({
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
    mode: 'checking',
    lastCheckedAt: 'Pending sign-in',
  });

  // Sole Founder Ownership & Master Root Account State (no master secrets in client bundle)
  const [founderControl, setFounderControl] = useState<FounderRootControlState>(() => {
    const savedFlags = loadFounderFeatureFlags();
    return {
      founderAccountId: 'FOUNDER-ROOT-001',
      founderEmail: 'vga262003@gmail.com',
      enableGlobalWorldMapAndHubs: savedFlags.enableGlobalWorldMapAndHubs,
      enableExtendedHardwareLoRaMesh: savedFlags.enableExtendedHardwareLoRaMesh,
      enableGovVaultAndWhiteLabel: savedFlags.enableGovVaultAndWhiteLabel,
      isSubscriptionActive: savedFlags.isSubscriptionActive,
      enablePhoneOtpAuth: savedFlags.enablePhoneOtpAuth,
      whiteLabelPartnerName: 'Dormant Partner Slot',
      enforceStrictThreatSuspension: true,
      enforceZeroTraceRamCache: true,
      adminAlerts: [
        {
          id: 'adm-1',
          message: '100% platform ownership sealed under FOUNDER-ROOT-001. Optional Phone SMS OTP paused (₹0 cost).',
          timestamp: '14:00 UTC',
          level: 'info',
        },
      ],
    };
  });

  const [paninianEpoch, setPaninianEpoch] = useState<number>(5);
  const [lamportClock, setLamportClock] = useState<number>(14);
  const paninianKey = generatePaninianKey(paninianEpoch);

  // Zero-Trace RAM Relay Cache (volatile in-memory only; auto-purged on Duress)
  const [ramRelayCache, setRamRelayCache] = useState<RamRelayPacket[]>([]);

  // RASP Runtime Antivirus & Anti-Malware Shield State
  const [raspPolicy, setRaspPolicy] = useState<RaspPolicyConfig>(DEFAULT_RASP_POLICY);
  const [raspReport, setRaspReport] = useState<RaspIntegrityReport>(() =>
    runDeviceAndAppIntegrityScan('none')
  );
  const [simulatedThreat, setSimulatedThreat] = useState<'none' | 'overlay_spyware' | 'app_tamper'>('none');
  const [keysLocked, setKeysLocked] = useState<boolean>(false);
  const [syncingRaspPolicy, setSyncingRaspPolicy] = useState<boolean>(false);
  const [quarantinedItems, setQuarantinedItems] = useState<QuarantinedPayload[]>([]);

  const [family, setFamily] = useState<FamilyMember[]>(INITIAL_FAMILY_MEMBERS);
  const [contacts, setContacts] = useState<VaakContactUser[]>(INITIAL_VAAK_CONTACTS);
  const [connectRequests, setConnectRequests] = useState<ConnectRequestLog[]>(INITIAL_CONNECT_REQUESTS);
  const [customGroups, setCustomGroups] = useState<ChatContactUser[]>([]);
  const [chatMessagesMap, setChatMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const [emergencyDir, setEmergencyDir] = useState<CachedEmergencyDirectory>(() =>
    loadCachedEmergencyDirectory(COUNTRIES[0])
  );
  const [syncingEmergencyDir, setSyncingEmergencyDir] = useState<boolean>(false);
  const [transmissions, setTransmissions] = useState<WalkieTransmission[]>(INITIAL_WALKIE_MESSAGES);
  const [rooms, setRooms] = useState<ChatRoom[]>(INITIAL_ROOMS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [auditLogs, setAuditLogs] = useState<GovAuditEntry[]>(INITIAL_AUDIT_LOGS);
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [trackingTags, setTrackingTags] = useState<RadioTrackingTag[]>([]);
  const [trackingFootprints, setTrackingFootprints] = useState<RadioTrackingFootprint[]>([]);
  const [nearbyServerPeers, setNearbyServerPeers] = useState<RadarNode[]>([]);
  const [localBeaconsMap, setLocalBeaconsMap] = useState<Record<string, LocalRadarBeacon>>({});
  const [radarPeerRequests, setRadarPeerRequests] = useState<
    {
      id: string;
      fromNodeId: string;
      fromCallSign: string;
      toNodeId: string;
      toCallSign: string;
      status: 'pending' | 'accepted' | 'declined';
      note?: string;
    }[]
  >([]);
  const [radarScanning, setRadarScanning] = useState<boolean>(false);
  const notifiedRadarReqIdsRef = useRef<Set<string>>(new Set());

  const appendFounderAlert = useCallback((message: string, level: 'info' | 'critical' = 'info') => {
    const timestamp = new Date().toTimeString().slice(0, 5) + ' UTC';
    setFounderControl((prev) => ({
      ...prev,
      adminAlerts: [{ id: `adm-${Date.now()}`, message, timestamp, level }, ...prev.adminAlerts],
    }));
  }, []);

  const appendNotification = useCallback(
    (title: string, detail: string, severity: NotificationItem['severity'] = 'info') => {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title,
          detail,
          timestamp: 'Just now',
          severity,
          read: false,
        },
        ...prev,
      ]);
    },
    []
  );

  // Auto-Sync RASP Threat Policies whenever online + periodic background Device/App Integrity Scan
  const syncRaspPolicyAndScan = useCallback(
    async (threatOverride?: 'none' | 'overlay_spyware' | 'app_tamper') => {
      const targetSim = threatOverride ?? simulatedThreat;
      const report = runDeviceAndAppIntegrityScan(targetSim);
      setRaspReport(report);
      if (!report.healthy) {
        setKeysLocked(true);
      }

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        setSyncingRaspPolicy(true);
        try {
          const resp = await fetch('/api/security/policy-sync');
          if (resp.ok) {
            const data = await resp.json();
            setRaspPolicy({
              signatureVersion: data.signatureVersion,
              policyHash: data.policyHash,
              lastSyncedAt: new Date().toTimeString().slice(0, 8),
              rulesCount: data.rulesCount,
              blockedPatterns: data.blockedPatterns,
              maxPacketBytes: data.maxPacketBytes,
            });
          }
        } catch {
          // Offline fallback uses baseline RASP policy cleanly
        } finally {
          setSyncingRaspPolicy(false);
        }
      }
    },
    [simulatedThreat]
  );

  useEffect(() => {
    syncRaspPolicyAndScan();
    const timer = window.setInterval(() => {
      const report = runDeviceAndAppIntegrityScan(simulatedThreat);
      setRaspReport(report);
      if (!report.healthy) setKeysLocked(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [simulatedThreat, syncRaspPolicyAndScan]);

  // Auto-Updating Local Emergency & Help Directory (Syncs online & caches offline per GPS/country)
  const syncEmergencyDirectory = useCallback(async (targetCountry: CountryOption) => {
    const cached = loadCachedEmergencyDirectory(targetCountry);
    setEmergencyDir(cached);

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setSyncingEmergencyDir(true);
      try {
        const resp = await fetch(
          `/api/emergency/directory?iso=${encodeURIComponent(targetCountry.iso)}`
        );
        if (resp.ok) {
          const data = await resp.json();
          const fresh: CachedEmergencyDirectory = {
            iso: data.iso || targetCountry.iso,
            regionName: data.regionName || `${targetCountry.name} Regional Gateway`,
            syncedAt: new Date().toTimeString().slice(0, 8),
            services: Array.isArray(data.services) ? data.services : cached.services,
            source: 'live',
          };
          saveCachedEmergencyDirectory(fresh);
          setEmergencyDir(fresh);
        }
      } catch {
        // Offline cache already applied
      } finally {
        setSyncingEmergencyDir(false);
      }
    }
  }, []);

  useEffect(() => {
    const activeCountry = session?.country ?? COUNTRIES[0];
    syncEmergencyDirectory(activeCountry);
    const onOnline = () => syncEmergencyDirectory(activeCountry);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [session?.country, syncEmergencyDirectory]);

  // Sync URL navigation for /gov-vault
  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname === '/gov-vault') {
        setStage('gov-vault');
      } else if (session) {
        setStage('dashboard');
      } else {
        setStage('onboarding');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [session]);

  // Apply Font Style, Font Size, AMOLED Black, Pearl White, Sunlight High-Contrast, and Accent Color to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('amoled-mode', settings.amoledMode || settings.themeMode === 'amoled');
    root.classList.toggle('daylight-mode', settings.daylightMode || settings.themeMode === 'pearl');
    root.classList.toggle('pearl-mode', settings.daylightMode || settings.themeMode === 'pearl');
    root.classList.toggle('sunlight-mode', settings.sunlightMode || settings.themeMode === 'sunlight');
    root.classList.remove('accent-ocean', 'accent-emerald', 'accent-purple', 'accent-saffron', 'accent-coral');
    root.classList.add(`accent-${settings.accentColor}`);
    root.classList.remove('font-style-sans', 'font-style-serif', 'font-style-mono');
    root.classList.add(`font-style-${settings.fontStyle}`);
    root.classList.remove('font-size-compact', 'font-size-standard', 'font-size-large', 'font-size-xlarge');
    root.classList.add(`font-size-${settings.fontSize}`);
    audioEngine.enabled = settings.soundEffects;
  }, [settings]);

  const handleVerifyFirebaseConnection = useCallback(async () => {
    setFirebaseSyncStatus((prev) => ({ ...prev, mode: 'checking' }));
    const res = await testConnection();
    setFirebaseSyncStatus({
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
      mode: res.ok ? 'connected' : 'offline',
      lastCheckedAt: res.checkedAt,
      error: res.error,
    });
    if (!res.ok && res.error && res.error !== 'Not signed in yet') {
      setSyncError(`Firestore connection issue: ${res.error}`);
    } else if (res.ok) {
      setSyncError(null);
    }
  }, []);

  const reportFirestoreError = useCallback(
    (actionLabel: string, err: unknown) => {
      const rawMsg = err instanceof Error ? err.message : String(err);
      let displayMsg = rawMsg;
      try {
        const parsed = JSON.parse(rawMsg) as { error?: string; path?: string };
        if (parsed?.error) {
          displayMsg = `${parsed.error}${parsed.path ? ` (${parsed.path})` : ''}`;
        }
      } catch {
        // Use raw message cleanly
      }
      setSyncError(`${actionLabel}: ${displayMsg}`);
      appendNotification(actionLabel, displayMsg, 'critical');
    },
    [appendNotification]
  );

  // Firebase Auth Session Observer (strictly awaits profile doc before enabling subscriptions)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const isVerifiedEmailUser = Boolean(firebaseUser?.email && firebaseUser?.emailVerified);
      const isPhoneUser = Boolean(firebaseUser?.phoneNumber);
      if (firebaseUser && (isVerifiedEmailUser || isPhoneUser)) {
        const resolvedEmail =
          firebaseUser.email ||
          `${(firebaseUser.phoneNumber || firebaseUser.uid).replace(/[^a-zA-Z0-9]/g, '')}@phone.vaak.mesh`;
        const resolvedIdentifier = firebaseUser.email || firebaseUser.phoneNumber || firebaseUser.uid;
        const resolvedAuthMethod: UserSession['authMethod'] =
          firebaseUser.phoneNumber && !firebaseUser.email
            ? 'otp'
            : firebaseUser.providerData?.some((p) => p.providerId === 'password')
            ? 'password'
            : 'google';

        let profile: Awaited<ReturnType<typeof fetchUserProfile>> = null;
        try {
          profile = await fetchUserProfile(firebaseUser.uid);
        } catch (err) {
          profile = null;
          reportFirestoreError('Profile Lookup Failed', err);
        }

        let localPrefs: { countryIso?: string; callSign?: string } = {};
        try {
          const raw = localStorage.getItem(USER_PREFS_STORAGE_KEY);
          if (raw) localPrefs = JSON.parse(raw) as { countryIso?: string; callSign?: string };
        } catch {
          // Ignore storage errors
        }

        const resolvedIso = profile?.countryIso || localPrefs.countryIso || COUNTRIES[0].iso;
        const country = COUNTRIES.find((c) => c.iso === resolvedIso) ?? COUNTRIES[0];
        const rawPrefix = (
          firebaseUser.displayName ||
          (firebaseUser.email ? firebaseUser.email.split('@')[0] : firebaseUser.phoneNumber) ||
          'USER'
        )
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()
          .slice(0, 8);
        const callSign =
          profile?.callSign ||
          localPrefs.callSign ||
          `VAAK-${country.iso}-${rawPrefix || firebaseUser.uid.slice(0, 6).toUpperCase()}`;
        const deviceId = profile?.deviceId || generateBoundDeviceId(firebaseUser.uid);
        const x25519PublicKey =
          profile?.x25519PublicKey || generateX25519KeyFingerprint(`${firebaseUser.uid}:${deviceId}`);

        if (!profile) {
          try {
            await upsertUserProfile({
              uid: firebaseUser.uid,
              email: resolvedEmail,
              displayName: firebaseUser.displayName || callSign,
              callSign,
              deviceId,
              x25519PublicKey,
              countryIso: country.iso,
              photoURL: firebaseUser.photoURL || undefined,
            });
          } catch (err) {
            reportFirestoreError('Account Profile Sync Error', err);
          }
        }

        const builtSession: UserSession = {
          uid: firebaseUser.uid,
          email: resolvedEmail,
          loginId: firebaseUser.displayName || callSign.toLowerCase(),
          displayName: firebaseUser.displayName || callSign,
          photoURL: firebaseUser.photoURL || undefined,
          identifier: resolvedIdentifier,
          callSign,
          deviceId,
          x25519PublicKey,
          country,
          authMethod: resolvedAuthMethod,
          isOfflineUnlocked: false,
          isDuressMode: false,
          isSuspended: false,
          strikeCount: 0,
          duressPin: '',
        };
        saveBaseVerifiedVault(builtSession, builtSession.loginId);
        setSession((prev) => (prev?.isDuressMode ? prev : builtSession));
        setProfileReadyUid(firebaseUser.uid);
        setStage((prev) => (prev === 'gov-vault' ? 'gov-vault' : 'dashboard'));
        void handleVerifyFirebaseConnection();
        void requestLiveGps(3500);
      } else {
        setProfileReadyUid(null);
        setSession((prev) => {
          if (prev?.isDuressMode || prev?.isOfflineUnlocked) return prev;
          return null;
        });
      }
    });

    return () => unsubscribe();
  }, [handleVerifyFirebaseConnection, reportFirestoreError]);

  // Real-time Firestore Subscriptions for Authenticated User (waits for profileReadyUid & active Firebase session)
  useEffect(() => {
    if (
      !session?.uid ||
      session.isDuressMode ||
      (session.isOfflineUnlocked && !auth.currentUser) ||
      profileReadyUid !== session.uid
    ) {
      return;
    }
    const uid = session.uid;
    const onSubError = (label: string) => (err: Error) => reportFirestoreError(label, err);

    const unsubMessages = subscribeChatMessages(uid, setChatMessagesMap, onSubError('Chat Sync Error'));
    const unsubWalkie = subscribeWalkieTransmissions(uid, setTransmissions, onSubError('Walkie Sync Error'));
    const unsubContacts = subscribeContacts(uid, setContacts, onSubError('Contacts Sync Error'));
    const unsubConnectRequests = subscribeConnectRequests(
      uid,
      setConnectRequests,
      onSubError('Connect Requests Sync Error')
    );
    const unsubFamily = subscribeFamilyMembers(uid, setFamily, onSubError('Family Sync Error'));
    const unsubGroups = subscribeGroups(uid, setCustomGroups, onSubError('Groups Sync Error'));
    const unsubRooms = subscribeRooms(uid, setRooms, onSubError('Rooms Sync Error'));
    const unsubTags = subscribeTrackingTags(uid, setTrackingTags, onSubError('Tracking Sync Error'));

    return () => {
      unsubMessages();
      unsubWalkie();
      unsubContacts();
      unsubConnectRequests();
      unsubFamily();
      unsubGroups();
      unsubRooms();
      unsubTags();
    };
  }, [session?.uid, session?.isDuressMode, profileReadyUid, reportFirestoreError]);

  // Same-device / local multi-tab BroadcastChannel Mesh Relay + Offline DTN Store-and-Forward Auto-Flush
  useEffect(() => {
    if (!session || session.isDuressMode) return;

    const unsubMesh = subscribeLocalMesh(session.deviceId, (pkt) => {
      const check = sanitizeIncomingContent(pkt.text, raspPolicy);
      if (!check.clean) {
        quarantinePayload('MESH_PACKET', pkt.text, check.quarantinedReason || 'Untrusted local mesh packet');
        return;
      }
      const incomingTx: WalkieTransmission = {
        id: sanitizeDocId(pkt.id || `mesh-${Date.now()}`),
        sender: pkt.senderCallSign || 'Nearby Tab Node',
        channel: pkt.channel || 'Family Alpha',
        mode: 'mesh',
        text: check.sanitizedText,
        timestamp: pkt.timestamp || new Date().toTimeString().slice(0, 5),
        paninianHash: paninianKey.keyId,
        lamportSeq: pkt.lamportSeq,
        meshStage: 'mesh_jump',
        hopJourney: 'Local BroadcastChannel Relay',
      };
      setTransmissions((prev) =>
        prev.some((t) => t.id === incomingTx.id) ? prev : [incomingTx, ...prev]
      );
      appendNotification(
        `Local Mesh Packet from ${incomingTx.sender}`,
        incomingTx.text,
        'info'
      );
    });

    const flushDtnOutbox = async () => {
      if (
        !session.uid ||
        !auth.currentUser ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      ) {
        return;
      }
      const pending = loadDtnOutbox();
      if (pending.length === 0) return;

      const remaining = [];
      let flushedCount = 0;
      for (const item of pending) {
        try {
          const parsed = JSON.parse(item.payloadJson);
          if (item.kind === 'walkie') {
            await saveWalkieTransmissionToFirestore(session.uid, parsed as WalkieTransmission);
            flushedCount++;
          } else if (item.kind === 'chat') {
            await sendChatMessageToFirestore(
              session.uid,
              parsed as Parameters<typeof sendChatMessageToFirestore>[1]
            );
            flushedCount++;
          }
        } catch {
          remaining.push(item);
        }
      }
      saveDtnOutbox(remaining);
      if (flushedCount > 0) {
        appendNotification(
          'Offline DTN Outbox Synced',
          `Forwarded ${flushedCount} queued offline transmission(s) to Firestore.`,
          'info'
        );
      }
    };

    void flushDtnOutbox();
    window.addEventListener('online', flushDtnOutbox);
    return () => {
      unsubMesh();
      window.removeEventListener('online', flushDtnOutbox);
    };
  }, [session?.uid, session?.deviceId, session?.isDuressMode, raspPolicy, paninianKey.keyId, appendNotification]);

  // Real-time Nearby Radar Presence & Peer Connect Request Sync (Online server + Local BroadcastChannel)
  const announceAndScanRadar = useCallback(
    async (withFreshGps = false) => {
      if (!session || session.isDuressMode) return;
      if (withFreshGps) {
        await requestLiveGps(2000);
      }
      const gps = getCachedGps();
      const validGps = gps && gps.source === 'gps' ? gps : null;
      const nowMs = Date.now();

      broadcastLocalRadarBeacon({
        nodeId: session.deviceId,
        callSign: session.callSign,
        mode,
        lat: validGps ? validGps.lat : null,
        lng: validGps ? validGps.lng : null,
        statusText: mode === 'online' ? 'Online · Vaak Nearby' : 'Mesh · Vaak Nearby',
        updatedAtMs: nowMs,
      });

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return;
      }

      setRadarScanning(true);
      try {
        await fetch('/api/radar/announce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: session.deviceId,
            callSign: session.callSign,
            mode,
            lat: validGps ? validGps.lat : undefined,
            lng: validGps ? validGps.lng : undefined,
            statusText: mode === 'online' ? 'Online · Vaak Nearby' : 'Mesh · Vaak Nearby',
          }),
        });

        const params = new URLSearchParams({
          selfId: session.deviceId,
          maxKm: '20',
        });
        if (validGps) {
          params.set('lat', String(validGps.lat));
          params.set('lng', String(validGps.lng));
        }

        const [nearbyRes, reqRes] = await Promise.all([
          fetch(`/api/radar/nearby?${params.toString()}`),
          fetch(`/api/radar/requests?nodeId=${encodeURIComponent(session.deviceId)}`),
        ]);

        if (nearbyRes.ok) {
          const data = (await nearbyRes.json()) as {
            peers?: {
              nodeId: string;
              callSign: string;
              mode: TransportMode;
              distanceKm: number;
              bearingDeg: number;
              signalStrength: number;
              lastSeenSecAgo: number;
              statusText: string;
              gpsExact: boolean;
            }[];
          };
          if (Array.isArray(data.peers)) {
            setNearbyServerPeers(
              data.peers.map((p) => ({
                id: `peer-${p.nodeId}`,
                nodeId: p.nodeId,
                label: p.callSign,
                callSign: p.callSign,
                kind: 'peer',
                mode: p.mode,
                distanceKm: p.distanceKm,
                bearingDeg: p.bearingDeg,
                signalStrength: p.signalStrength,
                lastSeenSecAgo: p.lastSeenSecAgo,
                statusText: p.statusText,
                gpsExact: p.gpsExact,
              }))
            );
          }
        }

        if (reqRes.ok) {
          const reqData = (await reqRes.json()) as {
            incoming?: {
              id: string;
              fromNodeId: string;
              fromCallSign: string;
              toNodeId: string;
              toCallSign: string;
              status: 'pending' | 'accepted' | 'declined';
              note?: string;
            }[];
            outgoing?: {
              id: string;
              fromNodeId: string;
              fromCallSign: string;
              toNodeId: string;
              toCallSign: string;
              status: 'pending' | 'accepted' | 'declined';
              note?: string;
            }[];
          };
          const combined = [...(reqData.incoming || []), ...(reqData.outgoing || [])];
          setRadarPeerRequests((prev) => {
            const merged = new Map<string, (typeof combined)[number]>();
            prev.forEach((item) => {
              if (!item.id.startsWith('rreq-') || item.status === 'accepted') {
                merged.set(item.id, item);
              }
            });
            combined.forEach((item) => {
              merged.set(item.id, item);
            });
            return Array.from(merged.values());
          });

          (reqData.incoming || []).forEach((inc) => {
            if (inc.status === 'pending' && !notifiedRadarReqIdsRef.current.has(inc.id)) {
              notifiedRadarReqIdsRef.current.add(inc.id);
              audioEngine.playNotificationChime();
              appendNotification(
                'Nearby Radar Request',
                `${inc.fromCallSign} wants to connect with you on Vaak Radar.`,
                'info'
              );
            }
          });

          (reqData.outgoing || []).forEach((out) => {
            if (out.status === 'accepted' && !notifiedRadarReqIdsRef.current.has(`acc-${out.id}`)) {
              notifiedRadarReqIdsRef.current.add(`acc-${out.id}`);
              audioEngine.playNotificationChime();
              appendNotification(
                'Radar Request Accepted',
                `${out.toCallSign} accepted your request — now connected in Contacts.`,
                'info'
              );
              const alreadySaved = contacts.some(
                (c) => c.phone === out.toNodeId || c.name === out.toCallSign
              );
              if (!alreadySaved) {
                const newContact: VaakContactUser = {
                  id: sanitizeDocId(`contact-radar-${out.toNodeId}`),
                  name: out.toCallSign,
                  phone: out.toNodeId,
                  regionIso: session.country.iso || 'IN',
                  phonebookLabel: 'Neighbor',
                  onVaak: true,
                  status: 'Online',
                  verified: true,
                  connected: true,
                  lastSeen: 'Connected on Radar',
                };
                if (session.uid && auth.currentUser) {
                  void saveContactToFirestore(session.uid, newContact);
                } else {
                  setContacts((prev) => [newContact, ...prev]);
                }
              }
            }
          });
        }
      } catch {
        // Offline or transient network error — keep BroadcastChannel local peers
      } finally {
        setRadarScanning(false);
      }
    },
    [session, mode, contacts, appendNotification]
  );

  useEffect(() => {
    if (!session || session.isDuressMode) return;

    const unsubBeacons = subscribeLocalRadarBeacons(session.deviceId, (beacon) => {
      setLocalBeaconsMap((prev) => ({
        ...prev,
        [beacon.nodeId]: beacon,
      }));
    });

    const unsubReqs = subscribeLocalRadarRequests(
      session.deviceId,
      (pkt: LocalRadarRequestPacket) => {
        setRadarPeerRequests((prev) => {
          const exists = prev.some((r) => r.id === pkt.requestId);
          if (exists) {
            return prev.map((r) => (r.id === pkt.requestId ? { ...r, status: pkt.status } : r));
          }
          return [
            {
              id: pkt.requestId,
              fromNodeId: pkt.fromNodeId,
              fromCallSign: pkt.fromCallSign,
              toNodeId: pkt.toNodeId,
              toCallSign: pkt.toCallSign,
              status: pkt.status,
            },
            ...prev,
          ];
        });

        if (
          pkt.kind === 'request' &&
          pkt.toNodeId === session.deviceId &&
          pkt.status === 'pending' &&
          !notifiedRadarReqIdsRef.current.has(pkt.requestId)
        ) {
          notifiedRadarReqIdsRef.current.add(pkt.requestId);
          audioEngine.playNotificationChime();
          appendNotification(
            'Nearby Radar Request',
            `${pkt.fromCallSign} wants to connect with you on Vaak Radar.`,
            'info'
          );
        }

        if (
          pkt.kind === 'response' &&
          pkt.fromNodeId === session.deviceId &&
          pkt.status === 'accepted' &&
          !notifiedRadarReqIdsRef.current.has(`acc-${pkt.requestId}`)
        ) {
          notifiedRadarReqIdsRef.current.add(`acc-${pkt.requestId}`);
          audioEngine.playNotificationChime();
          const newContact: VaakContactUser = {
            id: sanitizeDocId(`contact-radar-${pkt.toNodeId}`),
            name: pkt.toCallSign,
            phone: pkt.toNodeId,
            regionIso: session.country.iso || 'IN',
            phonebookLabel: 'Neighbor',
            onVaak: true,
            status: '20km Mesh',
            verified: true,
            connected: true,
            lastSeen: 'Connected on Radar',
          };
          if (session.uid && auth.currentUser) {
            void saveContactToFirestore(session.uid, newContact);
          } else {
            setContacts((prev) =>
              prev.some((c) => c.phone === pkt.toNodeId) ? prev : [newContact, ...prev]
            );
          }
          appendNotification(
            'Radar Request Accepted',
            `${pkt.toCallSign} accepted your connect request!`,
            'info'
          );
        }
      }
    );

    void announceAndScanRadar(false);
    const intervalId = window.setInterval(() => {
      void announceAndScanRadar(false);
    }, 6000);

    return () => {
      unsubBeacons();
      unsubReqs();
      clearInterval(intervalId);
    };
  }, [session, announceAndScanRadar, appendNotification]);

  // Persist Offline Data Snapshot per UID so PIN / Biometric unlock loads saved family, contacts & rooms offline
  useEffect(() => {
    if (!session?.uid || session.isDuressMode || session.isOfflineUnlocked) return;
    saveOfflineDataSnapshot(session.uid, {
      family,
      contacts,
      transmissions,
      rooms,
      chatMessagesMap,
    });
  }, [session?.uid, session?.isDuressMode, session?.isOfflineUnlocked, family, contacts, transmissions, rooms, chatMessagesMap]);

  const hydratedTransmissions = useMemo(
    () =>
      transmissions.map((tx) =>
        voiceNotesById[tx.id] && !tx.voiceNote ? { ...tx, voiceNote: voiceNotesById[tx.id] } : tx
      ),
    [transmissions, voiceNotesById]
  );

  const hydratedChatMessagesMap = useMemo(() => {
    const out: Record<string, ChatMessage[]> = {};
    Object.entries(chatMessagesMap).forEach(([chatKey, msgs]) => {
      out[chatKey] = msgs.map((m) =>
        voiceNotesById[m.id] && !m.voiceNote ? { ...m, voiceNote: voiceNotesById[m.id] } : m
      );
    });
    return out;
  }, [chatMessagesMap, voiceNotesById]);

  const hydratedRooms = useMemo(
    () =>
      rooms.map((r) => ({
        ...r,
        messages: r.messages.map((m) =>
          voiceNotesById[m.id] && !m.voiceNote ? { ...m, voiceNote: voiceNotesById[m.id] } : m
        ),
      })),
    [rooms, voiceNotesById]
  );

  const handleUpdateMedicalId = (next: MedicalIdProfile) => {
    setMedicalId(next);
    try {
      localStorage.setItem(MEDICAL_ID_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  };

  const navigateToGovVault = () => {
    if (stage !== 'gov-vault') {
      setPrevStageBeforeVault(stage);
    }
    window.history.pushState({}, '', '/gov-vault');
    setStage('gov-vault');
  };

  const navigateBackFromVault = () => {
    window.history.pushState({}, '', '/');
    if (session) {
      setStage('dashboard');
    } else {
      setStage(prevStageBeforeVault === 'gov-vault' ? 'onboarding' : prevStageBeforeVault);
    }
  };

  const appendAuditLog = (entry: Omit<GovAuditEntry, 'id' | 'timestamp'>) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    const next: GovAuditEntry = {
      ...entry,
      id: `AUD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: now,
    };
    setAuditLogs((prev) => [next, ...prev]);
  };

  const quarantinePayload = (
    source: QuarantinedPayload['source'],
    raw: string,
    reason: string
  ) => {
    const item: QuarantinedPayload = {
      id: `QUAR-${Date.now()}`,
      source,
      reason,
      neutralizedPreview: raw.slice(0, 48).replace(/[<>]/g, '*'),
      timestamp: new Date().toTimeString().slice(0, 8),
    };
    setQuarantinedItems((prev) => [item, ...prev]);
    appendFounderAlert(`RASP quarantined ${source}: ${reason}`, 'critical');
    appendNotification('Malware Payload Quarantined', `${source}: ${reason}`, 'critical');
  };

  const handleSimulateRaspThreat = (kind: 'overlay_spyware' | 'app_tamper') => {
    setSimulatedThreat(kind);
    const report = runDeviceAndAppIntegrityScan(kind);
    setRaspReport(report);
    setKeysLocked(true);
    appendFounderAlert(`RASP INTEGRITY LOCK: ${report.threats[0]}`, 'critical');
    appendNotification('RASP Integrity Alert', report.threats[0], 'critical');
  };

  const handleRestoreRaspIntegrity = () => {
    setSimulatedThreat('none');
    const report = runDeviceAndAppIntegrityScan('none');
    setRaspReport(report);
    setKeysLocked(false);
    appendNotification(
      'RASP Integrity Restored',
      'Threat quarantined and encryption keys unlocked.',
      'info'
    );
  };

  const handleIncomingMeshPacketTest = (rawPayload: string) => {
    const check = sanitizeIncomingContent(rawPayload, raspPolicy);
    if (!check.clean) {
      quarantinePayload('MESH_PACKET', rawPayload, check.quarantinedReason || 'Malicious mesh script');
    } else {
      appendNotification('Mesh Packet Clean', 'Incoming Jumping Jack packet verified safe.', 'info');
    }
  };

  const handleAcceptPermissions = (granted: string[]) => {
    try {
      localStorage.setItem(ONBOARDING_ACCEPTED_STORAGE_KEY, '1');
    } catch {
      // Ignore storage errors
    }
    void requestLiveGps(3000);
    appendNotification(
      'Hardware Bridge Ready',
      `Permissions active: ${granted.join(', ')}`,
      'info'
    );
    setStage('auth');
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    if (newSession.uid && !newSession.isOfflineUnlocked) {
      setProfileReadyUid(newSession.uid);
      saveBaseVerifiedVault(newSession, newSession.loginId);
    } else if (newSession.uid && newSession.isOfflineUnlocked) {
      const cached = loadOfflineDataSnapshot(newSession.uid);
      if (cached) {
        if (cached.family?.length) setFamily(cached.family);
        if (cached.contacts?.length) setContacts(cached.contacts);
        if (cached.transmissions?.length) setTransmissions(cached.transmissions);
        if (cached.rooms?.length) setRooms(cached.rooms);
        if (cached.chatMessagesMap) setChatMessagesMap(cached.chatMessagesMap);
      }
    }
    setStage('dashboard');

    if (newSession.isDuressMode) {
      setRamRelayCache([]);
      const liveCoords = formatLiveLocationSummary(getCachedGps()).coordsText;
      appendFounderAlert(
        `CRITICAL: Duress PIN triggered on Device ${newSession.deviceId}. Zero-trace RAM cache purged.`,
        'critical'
      );
      appendAuditLog({
        eventType: 'DURESS_ALERT',
        actor: newSession.identifier,
        deviceId: newSession.deviceId,
        countryCode: newSession.country.code,
        coordinates: liveCoords,
        summary:
          'Silent Duress PIN unlock triggered. Zero-trace RAM relay cache wiped; covert threat telemetry dispatched.',
        paninianKeyId: paninianKey.keyId,
        lamportSeq: lamportClock,
        severity: 'CRITICAL',
        payloadHash: `0x${permuteWithPaninianKey('DURESS', paninianKey, lamportClock).slice(0, 12)}`,
      });
    } else if (newSession.isOfflineUnlocked) {
      appendNotification(
        `Unlocked Offline (${newSession.authMethod === 'biometric' ? 'Biometric' : 'PIN'})`,
        `Call-Sign ${newSession.callSign} active in Offline Vault mode.`,
        'info'
      );
    } else {
      appendNotification(
        'Signed In via Firebase Auth',
        `Call-Sign ${newSession.callSign} · Device ${newSession.deviceId} synced with Firestore`,
        'info'
      );
    }
  };

  const handleAddFamilyMember = (member: { name: string; relation: string; phone?: string }) => {
    const gps = getCachedGps();
    const newMember: FamilyMember = {
      id: sanitizeDocId(`fam-${Date.now()}`),
      name: member.name,
      relation: member.relation || 'Family',
      phone: member.phone,
      avatar: '',
      status: 'Active',
      statusType: 'safe',
      distanceKm: 0.1,
      bearingDeg: 0,
      lastPingAgo: 'Just now',
      batteryPct: 100,
      channel: mode,
      lat: gps?.lat ?? 0,
      lng: gps?.lng ?? 0,
    };
    setFamily((prev) => [...prev, newMember]);
    if (session?.uid) {
      saveFamilyMemberToFirestore(session.uid, newMember).catch((err) =>
        reportFirestoreError('Save Family Member Failed', err)
      );
    }
    appendNotification(
      'Added to Chat Circle',
      `${member.name} (${newMember.relation}) saved to your Firestore circle.`,
      'info'
    );
  };

  const handlePingFamily = (memberId: string) => {
    setFamily((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, lastPingAgo: 'Just now' } : m))
    );
    if (session?.uid) {
      updateFamilyMemberPingInFirestore(session.uid, memberId).catch((err) =>
        reportFirestoreError('Ping Family Member Failed', err)
      );
    }
    const target = family.find((f) => f.id === memberId);
    if (target) {
      appendNotification(
        `Pinged ${target.name}`,
        `Sonar check delivered via ${mode.toUpperCase()} (${target.distanceKm} km)`,
        'info'
      );
    }
  };

  const handleSendChatMessage = (
    contactId: string,
    text: string,
    voiceNote?: VoiceNoteAttachment,
    contactName?: string,
    isEmergency?: boolean
  ) => {
    const raspCheck = sanitizeIncomingContent(text, raspPolicy);
    if (!raspCheck.clean) {
      quarantinePayload('ROOM_MESSAGE', text, raspCheck.quarantinedReason || 'Malicious chat message');
      return;
    }
    const nowTime = new Date().toTimeString().slice(0, 5);
    const msgId = sanitizeDocId(`msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    if (voiceNote) {
      setVoiceNotesById((prev) => ({ ...prev, [msgId]: voiceNote }));
    }
    const newMsg: ChatMessage = {
      id: msgId,
      senderId: 'me',
      text: raspCheck.sanitizedText,
      timestamp: nowTime,
      voiceNote,
      delivered: true,
    };

    const normalizedChatId = sanitizeDocId(contactId);
    const firestoreChatPayload = {
      id: msgId,
      chatId: normalizedChatId,
      contactName: contactName || 'Contact',
      senderId: 'me',
      senderName: session?.displayName || session?.callSign || 'You',
      text: raspCheck.sanitizedText,
      timestamp: nowTime,
      isEmergency,
    };

    if (session && !session.isDuressMode && mode !== 'online') {
      broadcastLocalMeshPacket({
        id: msgId,
        senderCallSign: session.callSign,
        deviceId: session.deviceId,
        channel: contactName || normalizedChatId,
        text: raspCheck.sanitizedText,
        timestamp: nowTime,
        lamportSeq: lamportClock,
        transport: 'broadcast_channel',
      });
    }

    const isOffline =
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      Boolean(session?.isOfflineUnlocked && !auth.currentUser);
    if (isOffline && session && !session.isDuressMode) {
      void enqueueDtnOutboxItem('chat', firestoreChatPayload);
    }

    if (session?.uid && auth.currentUser && !isOffline) {
      sendChatMessageToFirestore(session.uid, firestoreChatPayload).catch((err) => {
        if (typeof navigator === 'undefined' || navigator.onLine) {
          reportFirestoreError('Send Message Failed', err);
        }
      });
    } else {
      setChatMessagesMap((prev) => ({
        ...prev,
        [normalizedChatId]: [...(prev[normalizedChatId] || []), newMsg],
      }));
    }
  };

  const handleCreateGroup = (groupName: string, selectedIds: string[]) => {
    const newGroup: ChatContactUser = {
      id: sanitizeDocId(`group-${Date.now()}`),
      name: groupName,
      phone: `Mesh Broadcast Group (${selectedIds.length} members)`,
      status: `Online · ${selectedIds.length + 1} Members`,
      isGroup: true,
      members: [...selectedIds, 'me'],
      groupCategory: 'Team',
    };
    setCustomGroups((prev) => [newGroup, ...prev]);
    if (session?.uid) {
      saveGroupToFirestore(session.uid, newGroup).catch((err) =>
        reportFirestoreError('Create Group Failed', err)
      );
    }
  };

  const handleTriggerSos = () => {
    if (!session) return;
    const nextLamport = lamportClock + 1;
    setLamportClock(nextLamport);
    setSosActive(true);
    const liveCoords = formatLiveLocationSummary(getCachedGps()).coordsText;
    appendFounderAlert(
      `SOS dispatched by ${session.identifier} (${session.deviceId}) -> ${session.country.emergencyNumber}`,
      'critical'
    );
    appendNotification(
      `SOS Broadcast Active (${session.country.emergencyNumber})`,
      `Distress coordinates (${liveCoords}) prepared for your pinned contacts and ${session.country.name} emergency gateway.`,
      'critical'
    );
    appendAuditLog({
      eventType: 'SOS_DISPATCH',
      actor: session.identifier,
      deviceId: session.deviceId,
      countryCode: session.country.code,
      coordinates: liveCoords,
      summary: `Red SOS slider activated. Routed to national emergency ${session.country.emergencyNumber} and 20km mesh relay.`,
      paninianKeyId: paninianKey.keyId,
      lamportSeq: nextLamport,
      severity: 'CRITICAL',
      payloadHash: `0x${permuteWithPaninianKey('SOS-112', paninianKey, nextLamport).slice(0, 12)}`,
    });
  };

  const handleCancelSos = () => {
    setSosActive(false);
    appendNotification('SOS Stand Down', 'Emergency distress beacon marked safe.', 'info');
  };

  const handleSendPriorityMeshBlast = (urgentMessage: string) => {
    if (!session || keysLocked) return;
    const nextLamport = lamportClock + 1;
    setLamportClock(nextLamport);

    const raspCheck = sanitizeIncomingContent(urgentMessage, raspPolicy);
    if (!raspCheck.clean) {
      quarantinePayload(
        'MESH_PACKET',
        urgentMessage,
        raspCheck.quarantinedReason || 'Malicious priority burst'
      );
      return;
    }

    const scan = scanForThreatKeywords(raspCheck.sanitizedText);
    if (scan.flagged && founderControl.enforceStrictThreatSuspension) {
      appendFounderAlert(
        `Priority Mesh Blast blocked prohibited keyword "${scan.matchedKeyword}" on ${session.deviceId}`,
        'critical'
      );
      appendNotification(
        'Priority Blast Blocked',
        `Prohibited keyword "${scan.matchedKeyword}" triggered safety filter.`,
        'critical'
      );
      return;
    }

    const cipherHex = permuteWithPaninianKey(raspCheck.sanitizedText, paninianKey, nextLamport);
    if (founderControl.enforceZeroTraceRamCache) {
      setRamRelayCache((prev) => [
        { id: `ram-${Date.now()}`, lamportSeq: nextLamport, cipherHex: cipherHex.slice(0, 24), ttlSec: 120 },
        ...prev.slice(0, 19),
      ]);
    }

    setFamily((prev) => prev.map((m) => ({ ...m, lastPingAgo: 'Just now' })));

    const priorityTx: WalkieTransmission = {
      id: sanitizeDocId(`wt-prio-${Date.now()}`),
      sender: 'You (60s Priority Mesh)',
      channel: '50-Hop Family Priority',
      mode: 'mesh',
      text: `[PRIORITY 60s BLAST] ${raspCheck.sanitizedText}`,
      timestamp: new Date().toTimeString().slice(0, 5),
      paninianHash: paninianKey.keyId,
      lamportSeq: nextLamport,
    };

    if (session.uid) {
      saveWalkieTransmissionToFirestore(session.uid, priorityTx).catch((err) =>
        reportFirestoreError('Priority Blast Save Failed', err)
      );
    } else {
      setTransmissions((prev) => [priorityTx, ...prev]);
    }

    appendNotification(
      '60-Second Family Priority Mesh Active',
      'Priority alert dispatched and recorded to Firestore.',
      'warning'
    );
  };

  const handleCallEmergencyService = (svc: EmergencyServiceEntry) => {
    if (!session) return;
    const nextLamport = lamportClock + 1;
    setLamportClock(nextLamport);
    const liveCoords = formatLiveLocationSummary(getCachedGps()).coordsText;
    appendNotification(
      `Dialing ${svc.category} (${svc.phone})`,
      `${svc.name} · Radio ${svc.radioChannel}`,
      'critical'
    );
    appendAuditLog({
      eventType: 'SOS_DISPATCH',
      actor: session.callSign,
      deviceId: session.deviceId,
      countryCode: session.country.code,
      coordinates: liveCoords,
      summary: `Flip-cover call initiated to ${svc.category} (${svc.phone})`,
      paninianKeyId: paninianKey.keyId,
      lamportSeq: nextLamport,
      severity: 'HIGH',
      payloadHash: `0x${permuteWithPaninianKey(svc.phone, paninianKey, nextLamport).slice(0, 12)}`,
    });
  };

  const handleSendServiceSosGps = (svc: EmergencyServiceEntry) => {
    if (!session) return;
    const nextLamport = lamportClock + 1;
    setLamportClock(nextLamport);
    setSosActive(true);
    const liveCoords = formatLiveLocationSummary(getCachedGps()).coordsText;
    appendFounderAlert(
      `Emergency GPS + Medical ID (${medicalId.bloodGroup || 'Not set'}) sent to ${svc.category} (${svc.phone}) by ${session.callSign}`,
      'critical'
    );
    appendNotification(
      `SOS GPS Sent to ${svc.category}`,
      `Coordinates (${liveCoords}) + Blood Group (${medicalId.bloodGroup || 'Not set'}) dispatched via ${mode.toUpperCase()}.`,
      'critical'
    );
    appendAuditLog({
      eventType: 'SOS_DISPATCH',
      actor: session.callSign,
      deviceId: session.deviceId,
      countryCode: session.country.code,
      coordinates: liveCoords,
      summary: `SOS GPS + Medical ID (${medicalId.bloodGroup || 'Not set'}, Allergies: ${medicalId.allergies || 'None reported'}) dispatched to ${svc.category} (${svc.phone}).`,
      paninianKeyId: paninianKey.keyId,
      lamportSeq: nextLamport,
      severity: 'CRITICAL',
      payloadHash: `0x${permuteWithPaninianKey(`GPS-${svc.phone}`, paninianKey, nextLamport).slice(0, 12)}`,
    });
  };

  const handleSendServiceCustomMessage = (svc: EmergencyServiceEntry, message: string) => {
    if (!session) return;
    const nextLamport = lamportClock + 1;
    setLamportClock(nextLamport);
    const liveCoords = formatLiveLocationSummary(getCachedGps()).coordsText;
    const raspCheck = sanitizeIncomingContent(message, raspPolicy);
    if (!raspCheck.clean) {
      quarantinePayload('MESH_PACKET', message, raspCheck.quarantinedReason || 'Blocked emergency message');
      return;
    }
    appendNotification(
      `Message Dispatched to ${svc.category}`,
      `"${raspCheck.sanitizedText}"`,
      'warning'
    );
    appendAuditLog({
      eventType: 'SOS_DISPATCH',
      actor: session.callSign,
      deviceId: session.deviceId,
      countryCode: session.country.code,
      coordinates: liveCoords,
      summary: `Custom emergency message sent to ${svc.category} (${svc.phone}): ${raspCheck.sanitizedText}`,
      paninianKeyId: paninianKey.keyId,
      lamportSeq: nextLamport,
      severity: 'HIGH',
      payloadHash: `0x${permuteWithPaninianKey(raspCheck.sanitizedText, paninianKey, nextLamport).slice(0, 12)}`,
    });
  };

  const handleSyncPhonebook = (imported?: { name: string; phone: string }[]) => {
    if (!imported || imported.length === 0) return;

    const newContacts: VaakContactUser[] = [];
    imported.forEach((item, idx) => {
      const normalized = item.phone.replace(/\s+/g, '');
      const exists = contacts.some((c) => c.phone.replace(/\s+/g, '') === normalized);
      if (!exists) {
        const entry: VaakContactUser = {
          id: sanitizeDocId(`vc-sync-${Date.now()}-${idx}`),
          name: item.name,
          phone: item.phone,
          regionIso: session?.country.iso || 'IN',
          phonebookLabel: 'Mobile',
          onVaak: true,
          status: 'Online',
          verified: true,
          connected: true,
          lastSeen: 'Just added',
        };
        newContacts.push(entry);
        if (session?.uid) {
          saveContactToFirestore(session.uid, entry).catch((err) =>
            reportFirestoreError('Save Contact Failed', err)
          );
        }
      }
    });

    if (newContacts.length > 0 && !session?.uid) {
      setContacts((prev) => [...newContacts, ...prev]);
    }

    appendNotification(
      'Contacts Saved',
      newContacts.length > 0
        ? `Saved ${newContacts.length} contact(s) to Firebase Firestore.`
        : 'All selected contacts already exist in your directory.',
      'info'
    );
  };

  const handleSendConnectRequest = (contact: VaakContactUser) => {
    const newReq: ConnectRequestLog = {
      id: sanitizeDocId(`cr-${Date.now()}`),
      contactName: contact.name,
      phone: contact.phone,
      direction: 'outgoing',
      status: 'pending',
      timestamp: 'Just now',
    };
    if (session?.uid) {
      saveConnectRequestToFirestore(session.uid, newReq).catch((err) =>
        reportFirestoreError('Save Connect Request Failed', err)
      );
    } else {
      setConnectRequests((prev) => [newReq, ...prev]);
    }
    appendNotification(
      'Connect Request Sent',
      `Mutual verification handshake dispatched to ${contact.name} (${contact.phone}).`,
      'info'
    );
  };

  const handleSendRadarConnectRequest = async (peer: RadarNode) => {
    if (!session || !peer.nodeId) return;
    const targetNodeId = peer.nodeId;
    const targetCallSign = peer.callSign || peer.label;
    let resolvedReqId = `rreq-local-${Date.now()}`;

    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const res = await fetch('/api/radar/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromNodeId: session.deviceId,
            fromCallSign: session.callSign,
            toNodeId: targetNodeId,
            toCallSign: targetCallSign,
            note: 'Nearby Vaak Radar Connect Request',
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { request?: { id: string } };
          if (data.request?.id) resolvedReqId = data.request.id;
        }
      } catch {
        // Fallback to local BroadcastChannel relay if offline
      }
    }

    setRadarPeerRequests((prev) => {
      if (
        prev.some(
          (r) =>
            r.fromNodeId === session.deviceId &&
            r.toNodeId === targetNodeId &&
            r.status !== 'declined'
        )
      ) {
        return prev;
      }
      return [
        {
          id: resolvedReqId,
          fromNodeId: session.deviceId,
          fromCallSign: session.callSign,
          toNodeId: targetNodeId,
          toCallSign: targetCallSign,
          status: 'pending',
        },
        ...prev,
      ];
    });

    broadcastLocalRadarRequest({
      kind: 'request',
      requestId: resolvedReqId,
      fromNodeId: session.deviceId,
      fromCallSign: session.callSign,
      toNodeId: targetNodeId,
      toCallSign: targetCallSign,
      status: 'pending',
      timestampMs: Date.now(),
    });

    const newReq: ConnectRequestLog = {
      id: sanitizeDocId(resolvedReqId),
      contactName: targetCallSign,
      phone: targetNodeId,
      direction: 'outgoing',
      status: 'pending',
      timestamp: 'Just now',
      peerNodeId: targetNodeId,
      callSign: targetCallSign,
    };
    if (session.uid && auth.currentUser) {
      saveConnectRequestToFirestore(session.uid, newReq).catch((err) =>
        reportFirestoreError('Save Connect Request Failed', err)
      );
    } else {
      setConnectRequests((prev) =>
        prev.some((r) => r.id === newReq.id) ? prev : [newReq, ...prev]
      );
    }

    audioEngine.playSonarPing();
    appendNotification(
      'Radar Connect Request Sent',
      `Sent connect request to nearby user ${targetCallSign}.`,
      'info'
    );
  };

  const handleRespondConnectRequest = async (reqId: string, accept: boolean) => {
    const target = connectRequests.find((r) => r.id === reqId);
    const radarReq = radarPeerRequests.find((r) => r.id === reqId);
    const nextStatus: ConnectRequestLog['status'] = accept ? 'accepted' : 'declined';

    if (radarReq && session) {
      setRadarPeerRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: nextStatus } : r))
      );

      broadcastLocalRadarRequest({
        kind: 'response',
        requestId: reqId,
        fromNodeId: radarReq.fromNodeId,
        fromCallSign: radarReq.fromCallSign,
        toNodeId: session.deviceId,
        toCallSign: session.callSign,
        status: nextStatus,
        timestampMs: Date.now(),
      });

      if (typeof navigator === 'undefined' || navigator.onLine) {
        fetch('/api/radar/request/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: reqId,
            responderNodeId: session.deviceId,
            accept,
          }),
        }).catch(() => {});
      }
    }

    if (target) {
      if (session?.uid && auth.currentUser) {
        updateConnectRequestStatusInFirestore(session.uid, reqId, nextStatus).catch(() => {});
      } else {
        setConnectRequests((prev) =>
          prev.map((r) => (r.id === reqId ? { ...r, status: nextStatus } : r))
        );
      }
    }

    const peerName = radarReq?.fromCallSign || target?.contactName;
    const peerPhoneOrNode = radarReq?.fromNodeId || target?.phone;

    if (accept && peerName && peerPhoneOrNode) {
      const existingContact = contacts.find(
        (c) => c.phone === peerPhoneOrNode || c.name === peerName
      );
      const updatedContact: VaakContactUser = existingContact
        ? { ...existingContact, connected: true, onVaak: true, status: 'Online' }
        : {
            id: sanitizeDocId(`contact-${reqId}`),
            name: peerName,
            phone: peerPhoneOrNode,
            regionIso: session?.country.iso || 'IN',
            lastSeen: 'Just now',
            onVaak: true,
            status: '20km Mesh',
            phonebookLabel: radarReq ? 'Neighbor' : 'Mobile',
            connected: true,
            verified: true,
          };
      if (session?.uid && auth.currentUser) {
        saveContactToFirestore(session.uid, updatedContact).catch((err) =>
          reportFirestoreError('Connect Contact Failed', err)
        );
      } else {
        setContacts((prev) =>
          existingContact
            ? prev.map((c) => (c.phone === peerPhoneOrNode ? updatedContact : c))
            : [updatedContact, ...prev]
        );
      }
      audioEngine.playNotificationChime();
      appendNotification(
        'Mutual Contact Connected',
        `${peerName} added to your verified Vaak circle.`,
        'info'
      );
    }
  };

  const handleSendInviteLink = (phone: string, name?: string) => {
    const inviteLog: ConnectRequestLog = {
      id: sanitizeDocId(`cr-inv-${Date.now()}`),
      contactName: name || `Invite (${phone})`,
      phone,
      direction: 'invite_sms',
      status: 'invited',
      timestamp: 'Just now',
    };
    if (session?.uid) {
      saveConnectRequestToFirestore(session.uid, inviteLog).catch((err) =>
        reportFirestoreError('Save Invite Log Failed', err)
      );
    } else {
      setConnectRequests((prev) => [inviteLog, ...prev]);
    }
    appendNotification(
      '1-Tap Invite Link Ready',
      `Prepared offline-ready invite link for ${name || phone}.`,
      'info'
    );
  };

  const handleSendTransmission = (payload: {
    channel: string;
    text: string;
    durationSec?: number;
    codec?: WalkieCodecMode;
    isAudio?: boolean;
    isQuickIcon?: boolean;
    voiceNote?: VoiceNoteAttachment;
  }) => {
    if (!session || keysLocked) return;
    const nextLamport = lamportClock + 1;
    setLamportClock(nextLamport);

    // Layer A: RASP Malware Sanitizer check BEFORE touching state/storage
    const raspCheck = sanitizeIncomingContent(payload.text, raspPolicy);
    if (!raspCheck.clean) {
      quarantinePayload('WALKIE_TEXT', payload.text, raspCheck.quarantinedReason || 'Malicious payload');
      return;
    }

    // Layer B: Automated Threat Keyword Filter
    const scan = scanForThreatKeywords(raspCheck.sanitizedText);
    const nowTime = new Date().toTimeString().slice(0, 5);

    if (scan.flagged && founderControl.enforceStrictThreatSuspension) {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              isSuspended: true,
              suspendedDeviceId: prev.deviceId,
              strikeCount: prev.strikeCount + 1,
              suspensionReason: `Automated Threat Filter suspended Device ${prev.deviceId} for keyword "${scan.matchedKeyword}". Logged to Dual-Key /gov-vault.`,
            }
          : prev
      );
      setTransmissions((prev) => [
        {
          id: `wt-${Date.now()}`,
          sender: 'AUTOMATED THREAT GUARD',
          channel: payload.channel,
          mode,
          text: `BLOCKED: "${scan.sanitizedPreview}" — Device ${session.deviceId} suspended.`,
          timestamp: nowTime,
          paninianHash: paninianKey.keyId,
          lamportSeq: nextLamport,
          blocked: true,
          meshStage: 'queued',
          hopJourney: 'Blocked by Threat Guard',
        },
        ...prev,
      ]);
      appendFounderAlert(
        `Threat Filter suspended Device ${session.deviceId} (keyword: "${scan.matchedKeyword}")`,
        'critical'
      );
      appendNotification(
        'Device Suspended by Threat Filter',
        `Device ${session.deviceId} suspended after matching "${scan.matchedKeyword}".`,
        'critical'
      );
      appendAuditLog({
        eventType: 'THREAT_KEYWORD_BLOCK',
        actor: session.identifier,
        deviceId: session.deviceId,
        countryCode: session.country.code,
        coordinates: formatLiveLocationSummary(getCachedGps()).coordsText,
        summary: `Automated Threat Filter suspended device ${session.deviceId} for prohibited keyword "${scan.matchedKeyword}" on ${payload.channel}.`,
        paninianKeyId: paninianKey.keyId,
        lamportSeq: nextLamport,
        severity: 'CRITICAL',
        payloadHash: `0x${permuteWithPaninianKey(scan.sanitizedPreview, paninianKey, nextLamport).slice(0, 12)}`,
      });
      return;
    }

    const cipherHex = permuteWithPaninianKey(raspCheck.sanitizedText, paninianKey, nextLamport);
    if (founderControl.enforceZeroTraceRamCache) {
      setRamRelayCache((prev) => [
        { id: `ram-${Date.now()}`, lamportSeq: nextLamport, cipherHex: cipherHex.slice(0, 24), ttlSec: 120 },
        ...prev.slice(0, 19),
      ]);
    }

    const meshStage: MeshDeliveryStage =
      mode === 'online' ? 'delivered' : mode === 'mesh' ? 'mesh_jump' : 'queued';
    const hopJourney =
      mode === 'online'
        ? 'Direct Online · 28ms'
        : mode === 'mesh'
        ? '2 Hops · Jumped 800m'
        : 'Sonic Carrier · 18.5kHz';

    const txId = sanitizeDocId(`wt-${Date.now()}`);
    if (payload.voiceNote) {
      setVoiceNotesById((prev) => ({ ...prev, [txId]: payload.voiceNote! }));
    }

    const newTx: WalkieTransmission = {
      id: txId,
      sender: 'You',
      channel: payload.channel,
      mode,
      text: raspCheck.sanitizedText,
      durationSec: payload.durationSec,
      codec: payload.codec,
      timestamp: nowTime,
      paninianHash: paninianKey.keyId,
      lamportSeq: nextLamport,
      isAudio: payload.isAudio,
      isQuickIcon: payload.isQuickIcon,
      voiceNote: payload.voiceNote,
      meshStage,
      hopJourney,
    };

    if (!session.isDuressMode && mode !== 'online') {
      broadcastLocalMeshPacket({
        id: txId,
        senderCallSign: session.callSign,
        deviceId: session.deviceId,
        channel: payload.channel,
        text: raspCheck.sanitizedText,
        timestamp: nowTime,
        lamportSeq: nextLamport,
        transport: mode === 'sonic' ? 'sonic_modem' : 'broadcast_channel',
      });
    }

    const isOffline =
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      Boolean(session.isOfflineUnlocked && !auth.currentUser);
    if (isOffline && !session.isDuressMode) {
      void enqueueDtnOutboxItem('walkie', newTx);
      appendNotification(
        'Queued in Offline DTN Outbox',
        'Saved locally with SHA-256 checksum; will auto-sync to Firestore when connected.',
        'info'
      );
    }

    if (session.uid && auth.currentUser && !isOffline) {
      saveWalkieTransmissionToFirestore(session.uid, newTx).catch((err) => {
        if (typeof navigator === 'undefined' || navigator.onLine) {
          reportFirestoreError('Save Walkie Transmission Failed', err);
        }
      });
    } else {
      setTransmissions((prev) => [newTx, ...prev]);
    }
  };

  const handleCreateRoom = (name: string, category: ChatRoom['category']): ChatRoom => {
    const nextLamport = lamportClock + 1;
    setLamportClock(nextLamport);
    const cleanName = sanitizeIncomingContent(name, raspPolicy).sanitizedText || 'Mesh Group';
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const roomId = sanitizeDocId(`room-${Date.now()}`);
    const cipherPreview = permuteWithPaninianKey(pin, paninianKey, nextLamport).slice(0, 19);
    const room: ChatRoom = {
      id: roomId,
      pin,
      name: cleanName,
      category,
      memberCount: 1,
      activeMode: mode,
      createdAt: 'Just now',
      messages: [
        {
          id: sanitizeDocId(`rm-${Date.now()}`),
          sender: 'System',
          text: `Room "${cleanName}" created with 6-digit PIN ${pin}. Share PIN to invite members.`,
          timestamp: new Date().toTimeString().slice(0, 5),
          paninianCipherPreview: cipherPreview,
          lamportSeq: nextLamport,
        },
      ],
    };
    if (session?.uid) {
      createRoomInFirestore(session.uid, {
        id: roomId,
        pin,
        name: cleanName,
        category,
        activeMode: mode,
        initialCipherPreview: cipherPreview,
        lamportSeq: nextLamport,
      }).catch((err) => reportFirestoreError('Create Room Failed', err));
    } else {
      setRooms((prev) => [room, ...prev]);
    }
    return room;
  };

  const handleJoinByPin = useCallback(
    async (pin: string): Promise<ChatRoom | null> => {
      const localMatch = rooms.find((r) => r.pin === pin);
      if (localMatch) {
        return localMatch;
      }
      if (session?.uid) {
        return joinRoomByPinInFirestore(session.uid, pin);
      }
      return null;
    },
    [rooms, session?.uid]
  );

  const handleCreateBridgeRoom = (): string | null => {
    const created = handleCreateRoom('Walkie QR Bridge', 'Friend Group');
    return created.pin;
  };

  // Deep-link URL query parameter handling (?roomPin=, ?invitePhone=, ?beacon=)
  useEffect(() => {
    if (!session?.uid || session.isDuressMode || profileReadyUid !== session.uid) return;
    if (typeof window === 'undefined' || !window.location.search) return;

    const search = window.location.search;
    if (handledDeepLinkRef.current === search) return;

    const params = new URLSearchParams(search);
    const roomPin = params.get('roomPin')?.trim();
    const invitePhone = params.get('invitePhone')?.trim();
    const beacon = params.get('beacon')?.trim();

    if (!roomPin && !invitePhone && !beacon) return;
    handledDeepLinkRef.current = search;

    const cleanUrl = () => {
      try {
        window.history.replaceState({}, '', '/');
      } catch {
        // Ignore history restrictions
      }
    };

    if (roomPin && /^\d{6}$/.test(roomPin)) {
      setRequestedTab({ tab: 'rooms', nonce: Date.now() });
      joinRoomByPinInFirestore(session.uid, roomPin)
        .then((joined) => {
          appendNotification(
            joined ? 'Joined PIN Room via Link' : 'PIN Room Lookup',
            joined
              ? `Connected to "${joined.name}" (PIN ${roomPin}).`
              : `No active room found for PIN ${roomPin}. You can create or enter another PIN.`,
            joined ? 'info' : 'warning'
          );
        })
        .catch((err) => reportFirestoreError('Deep-Link Room Join Failed', err))
        .finally(cleanUrl);
      return;
    }

    if (invitePhone) {
      setRequestedTab({ tab: 'contacts', nonce: Date.now() });
      const incomingReq: ConnectRequestLog = {
        id: sanitizeDocId(`cr-link-${Date.now()}`),
        contactName: `Invite (${invitePhone})`,
        phone: invitePhone,
        direction: 'incoming',
        status: 'pending',
        timestamp: 'Via invite link',
      };
      saveConnectRequestToFirestore(session.uid, incomingReq).catch((err) =>
        reportFirestoreError('Save Invite Link Request Failed', err)
      );
      appendNotification(
        'Invite Link Opened',
        `Review and accept connection with ${invitePhone} in Contacts.`,
        'info'
      );
      cleanUrl();
      return;
    }

    if (beacon) {
      setRequestedTab({ tab: 'radar', nonce: Date.now() });
      appendNotification(
        'Tracking Beacon Opened',
        `Focused Radar view for beacon code ${beacon}.`,
        'info'
      );
      cleanUrl();
    }
  }, [session?.uid, session?.isDuressMode, profileReadyUid, appendNotification, reportFirestoreError]);

  const handleSendRoomMessage = (
    roomId: string,
    text: string,
    voiceNote?: VoiceNoteAttachment
  ) => {
    if (!session || keysLocked) return;
    const nextLamport = lamportClock + 1;
    setLamportClock(nextLamport);

    // RASP Sanitizer check before room storage
    const raspCheck = sanitizeIncomingContent(text, raspPolicy);
    if (!raspCheck.clean) {
      quarantinePayload('ROOM_MESSAGE', text, raspCheck.quarantinedReason || 'Malicious script in room');
      return;
    }

    const scan = scanForThreatKeywords(raspCheck.sanitizedText);
    const nowTime = new Date().toTimeString().slice(0, 5);

    if (scan.flagged && founderControl.enforceStrictThreatSuspension) {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              isSuspended: true,
              suspendedDeviceId: prev.deviceId,
              strikeCount: prev.strikeCount + 1,
              suspensionReason: `Room message matched prohibited keyword "${scan.matchedKeyword}". Device ${prev.deviceId} suspended.`,
            }
          : prev
      );
      appendFounderAlert(
        `Room Threat Filter suspended Device ${session.deviceId} (keyword: "${scan.matchedKeyword}")`,
        'critical'
      );
      appendNotification(
        'Room Threat Violation',
        `Keyword "${scan.matchedKeyword}" blocked; Device ${session.deviceId} suspended.`,
        'critical'
      );
      appendAuditLog({
        eventType: 'THREAT_KEYWORD_BLOCK',
        actor: session.identifier,
        deviceId: session.deviceId,
        countryCode: session.country.code,
        coordinates: formatLiveLocationSummary(getCachedGps()).coordsText,
        summary: `Room ${roomId} threat keyword "${scan.matchedKeyword}" blocked; device ${session.deviceId} suspended.`,
        paninianKeyId: paninianKey.keyId,
        lamportSeq: nextLamport,
        severity: 'CRITICAL',
        payloadHash: `0x${permuteWithPaninianKey(scan.sanitizedPreview, paninianKey, nextLamport).slice(0, 12)}`,
      });
      return;
    }

    const cipherPreview = permuteWithPaninianKey(raspCheck.sanitizedText, paninianKey, nextLamport).slice(0, 23);
    const meshStage: MeshDeliveryStage =
      mode === 'online' ? 'delivered' : mode === 'mesh' ? 'mesh_jump' : 'queued';
    const hopJourney =
      mode === 'online'
        ? 'Direct Online · 28ms'
        : mode === 'mesh'
        ? '2 Hops · Jumped 800m'
        : 'Sonic Carrier · 18.5kHz';

    const roomMsgId = sanitizeDocId(`rm-${Date.now()}`);
    if (voiceNote) {
      setVoiceNotesById((prev) => ({ ...prev, [roomMsgId]: voiceNote }));
    }

    const roomMsg = {
      id: roomMsgId,
      sender: session.displayName || session.callSign || 'You',
      text: raspCheck.sanitizedText,
      timestamp: nowTime,
      paninianCipherPreview: cipherPreview,
      lamportSeq: nextLamport,
      voiceNote,
      meshStage,
      hopJourney,
    };

    if (session.uid) {
      sendRoomMessageToFirestore(session.uid, roomId, roomMsg).catch((err) =>
        reportFirestoreError('Send Room Message Failed', err)
      );
    } else {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? {
                ...r,
                messages: [...r.messages, roomMsg],
              }
            : r
        )
      );
    }
  };

  const handleRotatePaninianEpoch = () => {
    if (keysLocked) return;
    const nextEpoch = paninianEpoch + 1;
    const nextLamport = lamportClock + 1;
    setPaninianEpoch(nextEpoch);
    setLamportClock(nextLamport);
    const nextKey = generatePaninianKey(nextEpoch);
    appendAuditLog({
      eventType: 'KEY_ROTATION',
      actor: session?.identifier || 'SYSTEM_PANCHANG_KDF',
      deviceId: session?.deviceId || 'ROOT-KDF',
      countryCode: session?.country.code || '+91',
      coordinates: formatLiveLocationSummary(getCachedGps()).coordsText,
      summary: `X25519 + Paninian Sutra Epoch #${nextEpoch} (${nextKey.sutra.sanskrit}) permutation rotated.`,
      paninianKeyId: nextKey.keyId,
      lamportSeq: nextLamport,
      severity: 'INFO',
      payloadHash: `0x${nextKey.hexDigest.slice(0, 12)}`,
    });
  };

  const handleLogBloomSimulation = (summary: string) => {
    const nextLamport = lamportClock + 1;
    setLamportClock(nextLamport);
    appendAuditLog({
      eventType: 'BLOOM_HOP_TRACE',
      actor: session?.identifier || 'RADAR-RELAY',
      deviceId: session?.deviceId || 'MESH-NODE',
      countryCode: session?.country.code || '+91',
      coordinates: formatLiveLocationSummary(getCachedGps()).coordsText,
      summary,
      paninianKeyId: paninianKey.keyId,
      lamportSeq: nextLamport,
      severity: 'INFO',
      payloadHash: `0x${permuteWithPaninianKey(summary, paninianKey, nextLamport).slice(0, 12)}`,
    });
  };

  const handleDownloadOsmTiles = async () => {
    setDownloadingTiles(true);
    setTileDownloadProgress(5);
    const regionLabel = emergencyDir.regionName || session?.country.name || 'Regional Sector';
    const meta = await downloadLowResOsmTileBundle(regionLabel, (pct) => {
      setTileDownloadProgress(pct);
    });
    setSettings((prev) => ({
      ...prev,
      localTileCacheEnabled: true,
      cachedTileCount: meta.tileCount,
      lastTileCacheAt: meta.cachedAt,
    }));
    setDownloadingTiles(false);
    setTileDownloadProgress(100);
    appendNotification(
      'Offline OSM Tiles Cached',
      `${meta.tileCount} low-res OpenStreetMap tiles (${meta.zoomRange}) saved locally for zero-internet radar navigation.`,
      'info'
    );
  };

  const handleClearOsmTiles = () => {
    clearOfflineTileCache();
    setSettings((prev) => ({
      ...prev,
      localTileCacheEnabled: false,
      cachedTileCount: 0,
      lastTileCacheAt: undefined,
    }));
    setTileDownloadProgress(0);
    appendNotification(
      'Local Tile Cache Cleared',
      'Offline OSM radar tiles removed from browser cache.',
      'info'
    );
  };

  const handleAddTrackingTag = (payload: {
    name: string;
    targetType: RadioTrackingTag['targetType'];
    dutyCycleSec: 30 | 60 | 300;
  }) => {
    const nextLamport = lamportClock + 1;
    setLamportClock(nextLamport);
    const beaconCode = `VK-TAG-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const coordHash = `0x${permuteWithPaninianKey(beaconCode, paninianKey, nextLamport).slice(0, 12)}`;
    const newTag: RadioTrackingTag = {
      id: sanitizeDocId(`tag-${Date.now()}`),
      beaconCode,
      name: payload.name,
      targetType: payload.targetType,
      dutyCycleSec: payload.dutyCycleSec,
      distanceKm: 0.2,
      bearingDeg: 0,
      batteryEstPct: 98,
      lastPulseAt: 'Just now',
      encryptedFootprintHash: coordHash,
      active: true,
    };
    setTrackingTags((prev) => [newTag, ...prev]);
    if (session?.uid) {
      saveTrackingTagToFirestore(session.uid, newTag).catch((err) =>
        reportFirestoreError('Save Tracking Tag Failed', err)
      );
    }
    const fp: RadioTrackingFootprint = {
      id: `fp-${Date.now()}`,
      tagId: newTag.id,
      beaconCode: newTag.beaconCode,
      encryptedCoordHash: coordHash,
      distanceKm: newTag.distanceKm,
      dutyCycleSec: newTag.dutyCycleSec,
      timestamp: new Date().toTimeString().slice(0, 8),
    };
    setTrackingFootprints((prev) => [fp, ...prev.slice(0, 24)]);
    appendNotification(
      'Radio Tracking Beacon Created',
      `${newTag.name} (${newTag.beaconCode}) saved to Firestore.`,
      'info'
    );
  };

  const handleToggleTrackingTag = (tagId: string) => {
    const target = trackingTags.find((tag) => tag.id === tagId);
    const nextActive = target ? !target.active : false;
    setTrackingTags((prev) =>
      prev.map((tag) => (tag.id === tagId ? { ...tag, active: nextActive } : tag))
    );
    if (session?.uid && target) {
      updateTrackingTagInFirestore(session.uid, tagId, { active: nextActive }).catch((err) =>
        reportFirestoreError('Toggle Tracking Tag Failed', err)
      );
    }
  };

  const handlePulseTrackingTag = (tagId: string) => {
    const target = trackingTags.find((tag) => tag.id === tagId);
    if (!target) return;
    const nextLamport = lamportClock + 1;
    setLamportClock(nextLamport);
    audioEngine.playSonarPing();
    void requestLiveGps(2000);
    const liveSummary = formatLiveLocationSummary(getCachedGps()).coordsText;
    const coordHash = `0x${permuteWithPaninianKey(`${target.beaconCode}:${liveSummary}:${nextLamport}`, paninianKey, nextLamport).slice(0, 12)}`;
    const nowTime = new Date().toTimeString().slice(0, 8);

    setTrackingTags((prev) =>
      prev.map((tag) =>
        tag.id === tagId
          ? {
              ...tag,
              lastPulseAt: nowTime,
              encryptedFootprintHash: coordHash,
            }
          : tag
      )
    );

    if (session?.uid) {
      updateTrackingTagInFirestore(session.uid, tagId, {
        lastPulseAt: nowTime,
        encryptedFootprintHash: coordHash,
      }).catch((err) => reportFirestoreError('Pulse Tracking Tag Failed', err));
    }

    const fp: RadioTrackingFootprint = {
      id: `fp-${Date.now()}`,
      tagId: target.id,
      beaconCode: target.beaconCode,
      encryptedCoordHash: coordHash,
      distanceKm: target.distanceKm,
      dutyCycleSec: target.dutyCycleSec,
      timestamp: nowTime,
    };
    setTrackingFootprints((prev) => [fp, ...prev.slice(0, 24)]);
  };

  const liveRadarNodes = useMemo(() => {
    const nowMs = Date.now();
    const gps = getCachedGps();
    const hasSelfGps = Boolean(gps && gps.source === 'gps');
    const mergedByNodeId = new Map<string, RadarNode>();

    nearbyServerPeers.forEach((peer) => {
      if (peer.nodeId) mergedByNodeId.set(peer.nodeId, peer);
    });

    Object.values(localBeaconsMap).forEach((b) => {
      if (nowMs - b.updatedAtMs > 5 * 60 * 1000) return;
      if (session && b.nodeId === session.deviceId) return;
      if (mergedByNodeId.has(b.nodeId)) return;

      let distanceKm: number;
      let bearingDeg: number;
      let gpsExact = false;

      if (hasSelfGps && gps && b.lat !== null && b.lng !== null) {
        distanceKm = computeDistanceKm(gps.lat, gps.lng, b.lat, b.lng);
        bearingDeg = computeBearingDeg(gps.lat, gps.lng, b.lat, b.lng);
        gpsExact = true;
      } else {
        const fb = computeFallbackSector(b.nodeId);
        distanceKm = fb.distanceKm;
        bearingDeg = fb.bearingDeg;
      }

      if (distanceKm <= 20) {
        mergedByNodeId.set(b.nodeId, {
          id: `peer-${b.nodeId}`,
          nodeId: b.nodeId,
          label: b.callSign,
          callSign: b.callSign,
          kind: 'peer',
          mode: b.mode,
          distanceKm,
          bearingDeg,
          signalStrength: Math.max(25, Math.min(99, Math.round(100 - distanceKm * 3.5))),
          lastSeenSecAgo: Math.max(0, Math.round((nowMs - b.updatedAtMs) / 1000)),
          statusText: b.statusText,
          gpsExact,
        });
      }
    });

    const annotatedPeers: RadarNode[] = Array.from(mergedByNodeId.values()).map((peer) => {
      const nodeId = peer.nodeId || peer.id;
      const isConnected = contacts.some(
        (c) => c.connected && (c.phone === nodeId || c.name === peer.callSign)
      );
      const acceptedReq = radarPeerRequests.some(
        (r) =>
          r.status === 'accepted' &&
          ((r.fromNodeId === nodeId && r.toNodeId === session?.deviceId) ||
            (r.toNodeId === nodeId && r.fromNodeId === session?.deviceId))
      );
      const incomingReq = radarPeerRequests.find(
        (r) => r.status === 'pending' && r.fromNodeId === nodeId && r.toNodeId === session?.deviceId
      );
      const outgoingReq = radarPeerRequests.find(
        (r) => r.status === 'pending' && r.fromNodeId === session?.deviceId && r.toNodeId === nodeId
      );

      let requestStatus: RadarNode['requestStatus'] = 'none';
      if (isConnected || acceptedReq) requestStatus = 'accepted';
      else if (incomingReq) requestStatus = 'incoming_pending';
      else if (outgoingReq) requestStatus = 'outgoing_pending';

      return {
        ...peer,
        requestStatus,
        incomingReqId: incomingReq?.id,
      };
    });

    return [...INITIAL_RADAR_NODES, ...annotatedPeers];
  }, [nearbyServerPeers, localBeaconsMap, session, contacts, radarPeerRequests]);

  const mergedConnectRequests = useMemo(() => {
    const seenIds = new Set(connectRequests.map((r) => r.id));
    const extra: ConnectRequestLog[] = [];
    radarPeerRequests.forEach((r) => {
      if (seenIds.has(r.id)) return;
      const isIncoming = session ? r.toNodeId === session.deviceId : false;
      extra.push({
        id: r.id,
        contactName: isIncoming ? r.fromCallSign : r.toCallSign,
        phone: isIncoming ? r.fromNodeId : r.toNodeId,
        direction: isIncoming ? 'incoming' : 'outgoing',
        status: r.status,
        timestamp: 'Nearby Radar',
        peerNodeId: isIncoming ? r.fromNodeId : r.toNodeId,
        callSign: isIncoming ? r.fromCallSign : r.toCallSign,
      });
    });
    return [...extra, ...connectRequests];
  }, [connectRequests, radarPeerRequests, session]);

  const renderStageContent = () => {
    if (stage === 'gov-vault') {
      return (
        <GovVaultPortal
          logs={auditLogs}
          founderControl={founderControl}
          deviceId={session?.deviceId}
          onBackToApp={navigateBackFromVault}
        />
      );
    }

    if (stage === 'onboarding') {
      return (
        <OnboardingGate
          language={language}
          onLanguageChange={setLanguage}
          onAcceptAll={handleAcceptPermissions}
          onOpenGovVault={navigateToGovVault}
        />
      );
    }

    if (stage === 'auth' || !session) {
      return (
        <AuthGate
          language={language}
          onLanguageChange={setLanguage}
          onLoginSuccess={handleLoginSuccess}
          onBackToOnboarding={() => setStage('onboarding')}
          onOpenGovVault={navigateToGovVault}
        />
      );
    }

    if (session.isDuressMode) {
      return (
        <DuressDecoyScreen
          ramPacketCount={ramRelayCache.length}
          onExitDuress={() => {
            setSession(null);
            setStage('auth');
          }}
          onOpenGovVault={navigateToGovVault}
        />
      );
    }

    return (
      <Dashboard
      session={session}
      language={language}
      onLanguageChange={setLanguage}
      mode={mode}
      onModeChange={setMode}
      settings={settings}
      onUpdateSettings={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
      founderControl={founderControl}
      onUpdateFounderControl={(patch) => {
        setFounderControl((prev) => ({ ...prev, ...patch }));
        if (typeof patch.isSubscriptionActive === 'boolean') {
          appendFounderAlert(
            `Founder Master Root updated isSubscriptionActive = ${patch.isSubscriptionActive}`,
            'info'
          );
          appendAuditLog({
            eventType: 'FOUNDER_POLICY_SEAL',
            actor: founderControl.founderAccountId,
            deviceId: session.deviceId,
            countryCode: session.country.code,
            coordinates: 'ROOT-GOVERNANCE',
            summary: `Founder Master Root toggled subscription engine to isSubscriptionActive=${patch.isSubscriptionActive}.`,
            paninianKeyId: paninianKey.keyId,
            lamportSeq: lamportClock,
            severity: 'INFO',
            payloadHash: `0x${permuteWithPaninianKey('FOUNDER-POLICY', paninianKey, lamportClock).slice(0, 12)}`,
          });
        }
      }}
      family={family}
      radarNodes={liveRadarNodes}
      radarScanning={radarScanning}
      onRefreshRadarScan={() => void announceAndScanRadar(true)}
      onSendRadarConnectRequest={(peer) => void handleSendRadarConnectRequest(peer)}
      transmissions={hydratedTransmissions}
      rooms={hydratedRooms}
      notifications={notifications}
      paninianKey={paninianKey}
      lamportClock={lamportClock}
      ramRelayCache={ramRelayCache}
      raspReport={raspReport}
      raspPolicy={raspPolicy}
      quarantinedItems={quarantinedItems}
      keysLocked={keysLocked}
      syncingRaspPolicy={syncingRaspPolicy}
      sosActive={sosActive}
      medicalId={medicalId}
      onUpdateMedicalId={handleUpdateMedicalId}
      firebaseSyncStatus={firebaseSyncStatus}
      onVerifyFirebaseConnection={handleVerifyFirebaseConnection}
      syncError={syncError}
      onDismissSyncError={() => setSyncError(null)}
      onPingFamily={handlePingFamily}
      onTriggerSos={handleTriggerSos}
      onCancelSos={handleCancelSos}
      onCallService={handleCallEmergencyService}
      onSendServiceSosGps={handleSendServiceSosGps}
      onSendServiceCustomMessage={handleSendServiceCustomMessage}
      onSendTransmission={handleSendTransmission}
      onResetSuspension={() =>
        setSession((prev) =>
          prev
            ? { ...prev, isSuspended: false, suspendedDeviceId: undefined, suspensionReason: undefined }
            : prev
        )
      }
      onCreateRoom={handleCreateRoom}
      onJoinByPin={handleJoinByPin}
      onSendRoomMessage={handleSendRoomMessage}
      onSyncRaspPolicyAndScan={() => syncRaspPolicyAndScan()}
      onSimulateRaspThreat={handleSimulateRaspThreat}
      onRestoreRaspIntegrity={handleRestoreRaspIntegrity}
      onIncomingMeshPacketTest={handleIncomingMeshPacketTest}
      onQuarantineQrThreat={(raw, reason) => quarantinePayload('QR_LINK', raw, reason)}
      onPurgeRamCache={() => {
        setRamRelayCache([]);
        appendNotification(
          'Zero-Trace RAM Cache Purged',
          'All volatile relay buffers cleared from memory.',
          'info'
        );
      }}
      onRotatePaninianEpoch={handleRotatePaninianEpoch}
      onLogBloomSimulation={handleLogBloomSimulation}
      onMarkAllNotificationsRead={() =>
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      }
      onPairQrNode={(code) =>
        appendNotification('QR Node Paired', `Linked ${code} into active mesh circle.`, 'info')
      }
      onOpenGovVault={navigateToGovVault}
      onSignOut={async () => {
        try {
          await signOut(auth);
        } catch {
          // Ignore sign-out errors
        }
        setProfileReadyUid(null);
        setSyncError(null);
        setVoiceNotesById({});
        setFamily([]);
        setContacts([]);
        setConnectRequests([]);
        setCustomGroups([]);
        setChatMessagesMap({});
        setTransmissions([]);
        setRooms([]);
        setTrackingTags([]);
        setSession(null);
        setStage('auth');
      }}
      onSendPriorityMeshBlast={handleSendPriorityMeshBlast}
      contacts={contacts}
      connectRequests={mergedConnectRequests}
      emergencyDir={emergencyDir}
      syncingEmergencyDir={syncingEmergencyDir}
      onSyncEmergencyDir={() => syncEmergencyDirectory(session.country)}
      onSyncPhonebook={handleSyncPhonebook}
      onSendConnectRequest={handleSendConnectRequest}
      onRespondConnectRequest={(reqId, accept) => void handleRespondConnectRequest(reqId, accept)}
      onSendInviteLink={handleSendInviteLink}
      trackingTags={trackingTags}
      trackingFootprints={trackingFootprints}
      onAddTrackingTag={handleAddTrackingTag}
      onToggleTrackingTag={handleToggleTrackingTag}
      onPulseTrackingTag={handlePulseTrackingTag}
      downloadingTiles={downloadingTiles}
      tileDownloadProgress={tileDownloadProgress}
      onDownloadOsmTiles={handleDownloadOsmTiles}
      onClearOsmTiles={handleClearOsmTiles}
      customGroups={customGroups}
      chatMessagesMap={hydratedChatMessagesMap}
      onSendChatMessage={handleSendChatMessage}
      onCreateGroup={handleCreateGroup}
      onAddFamilyMember={handleAddFamilyMember}
      requestedTab={requestedTab}
      onCreateBridgeRoom={handleCreateBridgeRoom}
    />
  );
};

return (
  <>
    {showSplash && <InstantSplashScreen onFinish={() => setShowSplash(false)} />}
    {renderStageContent()}
  </>
);
}
