export type AppLanguage = string;

export type TransportMode = 'online' | 'mesh' | 'sonic';
export type BaseThemeMode = 'charcoal' | 'pearl' | 'sunlight' | 'amoled';

export type DashboardTab =
  | 'home'
  | 'walkie'
  | 'contacts'
  | 'radar'
  | 'world'
  | 'rooms'
  | 'guest_qr'
  | 'security'
  | 'settings';

export type FontStyleOption = 'sans' | 'serif' | 'mono';
export type FontSizeOption = 'compact' | 'standard' | 'large' | 'xlarge';
export type ThemeAccentOption = 'ocean' | 'emerald' | 'purple' | 'saffron' | 'coral';

export type WalkieListenMode = 'ptt' | 'hands_free';
export type WalkieCodecMode = 'hd_clear' | 'ultra_saver_6kbps';

export interface VoiceNoteAttachment {
  id: string;
  durationSec: number;
  audioUrl?: string;
  codecLabel: string;
  waveform: number[];
}

export interface MedicalIdProfile {
  fullName: string;
  bloodGroup: string;
  allergies: string;
  emergencyNotes: string;
  updatedAt: string;
}

export type MeshDeliveryStage = 'queued' | 'mesh_jump' | 'delivered';

export interface EmergencyServiceEntry {
  id: string;
  category:
    | 'Police'
    | 'Ambulance'
    | 'Nearest Hospitals'
    | 'Disaster Rescue (NDRF)'
    | 'Fire Brigade'
    | 'Govt Helplines';
  name: string;
  phone: string;
  radioChannel: string;
  distanceKm: number;
  availability: string;
}

export interface RadioTrackingTag {
  id: string;
  beaconCode: string;
  name: string;
  targetType: 'Child' | 'Pet' | 'Luggage' | 'Car Screen' | 'Smartwatch';
  dutyCycleSec: 30 | 60 | 300;
  distanceKm: number;
  bearingDeg: number;
  batteryEstPct: number;
  lastPulseAt: string;
  encryptedFootprintHash: string;
  active: boolean;
}

export interface RadioTrackingFootprint {
  id: string;
  tagId: string;
  beaconCode: string;
  encryptedCoordHash: string;
  distanceKm: number;
  dutyCycleSec: number;
  timestamp: string;
}

export interface CachedEmergencyDirectory {
  iso: string;
  regionName: string;
  syncedAt: string;
  services: EmergencyServiceEntry[];
  source: 'live' | 'cached_offline';
}

export interface VaakContactUser {
  id: string;
  name: string;
  phone: string;
  regionIso: string;
  phonebookLabel: 'Family' | 'Mobile' | 'Work' | 'Neighbor';
  onVaak: boolean;
  status: 'Online' | '20km Mesh' | 'Sonic Wave' | 'Offline' | 'Not on Vaak';
  verified: boolean;
  connected: boolean;
  lastSeen: string;
}

export interface ConnectRequestLog {
  id: string;
  contactName: string;
  phone: string;
  direction: 'incoming' | 'outgoing' | 'invite_sms';
  status: 'pending' | 'accepted' | 'declined' | 'invited';
  timestamp: string;
}

export interface CountryOption {
  code: string;
  iso: string;
  name: string;
  emergencyNumber: string;
  policeNumber: string;
  ambulanceNumber: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  phone?: string;
  avatar: string;
  status: string;
  statusType: 'safe' | 'transit' | 'alert';
  distanceKm: number;
  bearingDeg: number;
  lastPingAgo: string;
  batteryPct: number;
  channel: TransportMode;
  lat: number;
  lng: number;
}

export interface RadarNode {
  id: string;
  label: string;
  kind: 'family' | 'relay' | 'shelter' | 'rescue';
  distanceKm: number;
  bearingDeg: number;
  signalStrength: number;
}

export interface WalkieTransmission {
  id: string;
  sender: string;
  channel: string;
  mode: TransportMode;
  text: string;
  translatedText?: string;
  durationSec?: number;
  timestamp: string;
  paninianHash: string;
  lamportSeq?: number;
  codec?: WalkieCodecMode;
  isAudio?: boolean;
  isQuickIcon?: boolean;
  blocked?: boolean;
  voiceNote?: VoiceNoteAttachment;
  meshStage?: MeshDeliveryStage;
  hopJourney?: string;
}

export interface RoomMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  paninianCipherPreview: string;
  lamportSeq?: number;
  voiceNote?: VoiceNoteAttachment;
  meshStage?: MeshDeliveryStage;
  hopJourney?: string;
}

export interface ChatRoom {
  id: string;
  pin: string;
  name: string;
  category: 'Event' | 'Outing' | 'Friend Group' | 'Neighborhood';
  memberCount: number;
  activeMode: TransportMode;
  createdAt: string;
  messages: RoomMessage[];
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
}

export interface GovAuditEntry {
  id: string;
  timestamp: string;
  eventType:
    | 'DURESS_ALERT'
    | 'THREAT_KEYWORD_BLOCK'
    | 'SOS_DISPATCH'
    | 'KEY_ROTATION'
    | 'BLOOM_HOP_TRACE'
    | 'FOUNDER_POLICY_SEAL';
  actor: string;
  deviceId?: string;
  countryCode: string;
  coordinates: string;
  summary: string;
  paninianKeyId: string;
  lamportSeq?: number;
  severity: 'HIGH' | 'CRITICAL' | 'INFO';
  payloadHash: string;
}

export interface FounderFeatureFlags {
  enableGlobalWorldMapAndHubs: boolean; // default false
  enableExtendedHardwareLoRaMesh: boolean; // default false
  enableGovVaultAndWhiteLabel: boolean; // default false
  isSubscriptionActive: boolean; // default false
}

export interface FounderRootControlState extends FounderFeatureFlags {
  founderAccountId: string;
  founderEmail: string;
  whiteLabelPartnerName: string;
  enforceStrictThreatSuspension: boolean;
  enforceZeroTraceRamCache: boolean;
  adminAlerts: {
    id: string;
    message: string;
    timestamp: string;
    level: 'info' | 'critical';
  }[];
}

export interface UserSession {
  uid?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  identifier: string;
  callSign: string;
  deviceId: string;
  x25519PublicKey: string;
  country: CountryOption;
  authMethod: 'google' | 'otp' | 'password' | 'duress';
  isDuressMode: boolean;
  isSuspended: boolean;
  suspendedDeviceId?: string;
  suspensionReason?: string;
  strikeCount: number;
  duressPin: string;
}

export interface AppSettings {
  fontStyle: FontStyleOption;
  fontSize: FontSizeOption;
  themeMode: BaseThemeMode;
  amoledMode: boolean;
  daylightMode: boolean;
  sunlightMode: boolean;
  accentColor: ThemeAccentOption;
  soundEffects: boolean;
  autoRelayMesh: boolean;
  localTileCacheEnabled: boolean;
  cachedTileCount: number;
  lastTileCacheAt?: string;
}

export interface FirebaseSyncStatus {
  projectId: string;
  databaseId: string;
  mode: 'connected' | 'offline' | 'checking';
  lastCheckedAt: string;
  error?: string;
}
