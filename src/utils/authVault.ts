import {
  ChatRoom,
  FamilyMember,
  UserSession,
  VaakContactUser,
  WalkieTransmission,
} from '../types/app';
import { ChatMessage } from '../components/WhatsAppChatView';

const ID_VAULT_STORAGE_KEY = 'vaak_login_id_vault_v1';
const OFFLINE_VAULT_STORAGE_KEY = 'vaak_offline_unlock_vault_v1';
const OFFLINE_DATA_PREFIX = 'vaak_offline_snapshot_v1_';

export interface LocalIdHandleRecord {
  loginId: string;
  email: string;
  uid?: string;
  updatedAt: string;
}

export interface OfflineQuickUnlockVault {
  uid: string;
  email: string;
  loginId: string;
  displayName: string;
  callSign: string;
  deviceId: string;
  x25519PublicKey: string;
  countryIso: string;
  authMethod: 'google' | 'otp' | 'password';
  pinSalt?: string;
  pinHash?: string;
  biometricCredentialId?: string;
  biometricRegisteredAt?: string;
  verifiedAt: string;
}

export interface OfflineDataSnapshot {
  family: FamilyMember[];
  contacts: VaakContactUser[];
  transmissions: WalkieTransmission[];
  rooms: ChatRoom[];
  chatMessagesMap: Record<string, ChatMessage[]>;
  savedAt: string;
}

export function normalizeLoginId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
}

export function isValidLoginId(raw: string): boolean {
  const cleaned = normalizeLoginId(raw);
  return cleaned.length >= 3 && cleaned.length <= 32;
}

function bytesToHex(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  return bytesToBase64(new Uint8Array(bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return base64ToBytes(padded);
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return bytesToHex(digest);
}

export async function computeHandleHash(loginId: string): Promise<string> {
  return sha256Hex(`VAAK_HANDLE:${normalizeLoginId(loginId)}`);
}

async function deriveHandleAesKey(loginId: string, password: string): Promise<CryptoKey> {
  const norm = normalizeLoginId(loginId);
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`VAAK_HANDLE_SALT:${norm}`),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function sealEmailWithPassword(
  loginId: string,
  email: string,
  password: string
): Promise<{ iv: string; sealedEmail: string }> {
  const key = await deriveHandleAesKey(loginId, password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(email.trim().toLowerCase());
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  return {
    iv: bytesToBase64(iv),
    sealedEmail: bytesToBase64(new Uint8Array(cipher)),
  };
}

export async function unsealEmailWithPassword(
  loginId: string,
  password: string,
  ivB64: string,
  sealedEmailB64: string
): Promise<string> {
  const key = await deriveHandleAesKey(loginId, password);
  const iv = base64ToBytes(ivB64);
  const cipher = base64ToBytes(sealedEmailB64);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(cipher)
  );
  return new TextDecoder().decode(plain);
}

function loadLocalIdMap(): Record<string, LocalIdHandleRecord> {
  try {
    const raw = localStorage.getItem(ID_VAULT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, LocalIdHandleRecord>;
  } catch {}
  return {};
}

function saveLocalIdMap(map: Record<string, LocalIdHandleRecord>): void {
  try {
    localStorage.setItem(ID_VAULT_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function lookupLocalEmailForLoginId(loginId: string): string | null {
  const norm = normalizeLoginId(loginId);
  if (!norm) return null;
  const map = loadLocalIdMap();
  return map[norm]?.email || null;
}

export async function registerLoginHandle(params: {
  loginId: string;
  email: string;
  password: string;
  uid?: string;
}): Promise<void> {
  const norm = normalizeLoginId(params.loginId);
  if (!isValidLoginId(norm)) return;
  const cleanEmail = params.email.trim().toLowerCase();

  const map = loadLocalIdMap();
  map[norm] = {
    loginId: norm,
    email: cleanEmail,
    uid: params.uid,
    updatedAt: new Date().toISOString(),
  };
  saveLocalIdMap(map);

  try {
    const handleHash = await computeHandleHash(norm);
    const { iv, sealedEmail } = await sealEmailWithPassword(norm, cleanEmail, params.password);
    await fetch('/api/auth/handle-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handleHash, iv, sealedEmail }),
    });
  } catch {
    // Non-blocking if offline; local cache already stored
  }
}

export async function resolveEmailFromLoginId(
  loginId: string,
  password: string
): Promise<{ email?: string; source?: 'local' | 'server'; notFound?: boolean; wrongPassword?: boolean }> {
  const norm = normalizeLoginId(loginId);
  if (!isValidLoginId(norm)) {
    return { notFound: true };
  }

  const localEmail = lookupLocalEmailForLoginId(norm);
  if (localEmail) {
    return { email: localEmail, source: 'local' };
  }

  try {
    const handleHash = await computeHandleHash(norm);
    const resp = await fetch('/api/auth/handle-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handleHash }),
    });
    if (!resp.ok) {
      return { notFound: true };
    }
    const data = (await resp.json()) as { iv?: string; sealedEmail?: string };
    if (!data.iv || !data.sealedEmail) {
      return { notFound: true };
    }
    try {
      const email = await unsealEmailWithPassword(norm, password, data.iv, data.sealedEmail);
      const map = loadLocalIdMap();
      map[norm] = { loginId: norm, email, updatedAt: new Date().toISOString() };
      saveLocalIdMap(map);
      return { email, source: 'server' };
    } catch {
      return { wrongPassword: true };
    }
  } catch {
    return { notFound: true };
  }
}

// --- Offline Quick-Unlock PIN & WebAuthn Biometric Vault ---

export function loadOfflineVault(): OfflineQuickUnlockVault | null {
  try {
    const raw = localStorage.getItem(OFFLINE_VAULT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OfflineQuickUnlockVault;
      if (parsed && parsed.uid && parsed.callSign) return parsed;
    }
  } catch {}
  return null;
}

function writeOfflineVault(vault: OfflineQuickUnlockVault): void {
  try {
    localStorage.setItem(OFFLINE_VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch {}
}

export function saveBaseVerifiedVault(session: UserSession, loginId?: string): OfflineQuickUnlockVault | null {
  if (!session.uid || session.isDuressMode) return null;
  const existing = loadOfflineVault();
  const sameUser = existing && existing.uid === session.uid;
  const resolvedLoginId =
    normalizeLoginId(loginId || session.loginId || (sameUser ? existing.loginId : '') || session.displayName || '') ||
    session.callSign.toLowerCase();

  const next: OfflineQuickUnlockVault = {
    uid: session.uid,
    email: session.email || (sameUser ? existing.email : ''),
    loginId: resolvedLoginId,
    displayName: session.displayName || session.callSign,
    callSign: session.callSign,
    deviceId: session.deviceId,
    x25519PublicKey: session.x25519PublicKey,
    countryIso: session.country.iso,
    authMethod:
      session.authMethod === 'google' || session.authMethod === 'otp' || session.authMethod === 'password'
        ? session.authMethod
        : sameUser
        ? existing.authMethod
        : 'password',
    pinSalt: sameUser ? existing.pinSalt : undefined,
    pinHash: sameUser ? existing.pinHash : undefined,
    biometricCredentialId: sameUser ? existing.biometricCredentialId : undefined,
    biometricRegisteredAt: sameUser ? existing.biometricRegisteredAt : undefined,
    verifiedAt: new Date().toISOString(),
  };
  writeOfflineVault(next);

  if (next.email && isValidLoginId(resolvedLoginId)) {
    const map = loadLocalIdMap();
    map[resolvedLoginId] = {
      loginId: resolvedLoginId,
      email: next.email.toLowerCase(),
      uid: next.uid,
      updatedAt: new Date().toISOString(),
    };
    saveLocalIdMap(map);
  }
  return next;
}

export async function setOfflinePinInVault(
  pin: string,
  sessionFallback?: { session: UserSession; loginId?: string }
): Promise<OfflineQuickUnlockVault | null> {
  const cleanPin = pin.replace(/\D/g, '');
  if (cleanPin.length < 4 || cleanPin.length > 6) return null;

  let vault = loadOfflineVault();
  if (!vault && sessionFallback) {
    vault = saveBaseVerifiedVault(sessionFallback.session, sessionFallback.loginId);
  }
  if (!vault) return null;

  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const pinHash = await sha256Hex(`${salt}:${vault.uid}:${cleanPin}`);
  const updated: OfflineQuickUnlockVault = {
    ...vault,
    pinSalt: salt,
    pinHash,
  };
  writeOfflineVault(updated);
  return updated;
}

export async function verifyOfflinePinInVault(pin: string): Promise<OfflineQuickUnlockVault | null> {
  const cleanPin = pin.replace(/\D/g, '');
  const vault = loadOfflineVault();
  if (!vault || !vault.pinSalt || !vault.pinHash) return null;
  const candidate = await sha256Hex(`${vault.pinSalt}:${vault.uid}:${cleanPin}`);
  if (candidate === vault.pinHash) return vault;
  return null;
}

export function removeOfflinePinInVault(): OfflineQuickUnlockVault | null {
  const vault = loadOfflineVault();
  if (!vault) return null;
  const updated: OfflineQuickUnlockVault = {
    ...vault,
    pinSalt: undefined,
    pinHash: undefined,
  };
  writeOfflineVault(updated);
  return updated;
}

export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function isBiometricHardwareAvailable(): Promise<{
  supported: boolean;
  inIframe: boolean;
}> {
  const inIframe = isRunningInIframe();
  if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) {
    return { supported: false, inIframe };
  }
  try {
    const ok = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return { supported: Boolean(ok), inIframe };
  } catch {
    return { supported: false, inIframe };
  }
}

export async function enrollBiometricInVault(
  sessionFallback?: { session: UserSession; loginId?: string }
): Promise<{ ok: boolean; vault?: OfflineQuickUnlockVault; error?: string }> {
  let vault = loadOfflineVault();
  if (!vault && sessionFallback) {
    vault = saveBaseVerifiedVault(sessionFallback.session, sessionFallback.loginId);
  }
  if (!vault) {
    return { ok: false, error: 'Complete online email verification first before enabling Biometric.' };
  }

  if (typeof navigator === 'undefined' || !navigator.credentials?.create || !('PublicKeyCredential' in window)) {
    return { ok: false, error: 'Biometric WebAuthn is not supported in this browser.' };
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(vault.uid.slice(0, 64));

    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Vaak / PingTalk',
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: vault.email || vault.loginId,
          displayName: vault.loginId || vault.callSign,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!cred) {
      return { ok: false, error: 'Biometric setup was cancelled.' };
    }

    const updated: OfflineQuickUnlockVault = {
      ...vault,
      biometricCredentialId: bytesToBase64Url(cred.rawId),
      biometricRegisteredAt: new Date().toISOString(),
    };
    writeOfflineVault(updated);
    return { ok: true, vault: updated };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'SecurityError' || name === 'NotAllowedError') {
      if (isRunningInIframe()) {
        return {
          ok: false,
          error:
            'Browser blocks Fingerprint/Face prompts inside embedded preview frames. Open Vaak in a full browser tab (HTTPS) or installed PWA to enable Biometric.',
        };
      }
      return {
        ok: false,
        error: 'Biometric prompt was cancelled or blocked by browser permissions.',
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to register Biometric on this device.',
    };
  }
}

export async function verifyBiometricUnlock(): Promise<{
  ok: boolean;
  vault?: OfflineQuickUnlockVault;
  error?: string;
}> {
  const vault = loadOfflineVault();
  if (!vault || !vault.biometricCredentialId) {
    return { ok: false, error: 'Biometric is not enrolled on this device yet.' };
  }

  if (typeof navigator === 'undefined' || !navigator.credentials?.get) {
    return { ok: false, error: 'Biometric WebAuthn is unavailable in this browser.' };
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credIdBytes = base64UrlToBytes(vault.biometricCredentialId);
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: new Uint8Array(credIdBytes),
            type: 'public-key',
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (!assertion) {
      return { ok: false, error: 'Biometric verification was cancelled.' };
    }
    return { ok: true, vault };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (isRunningInIframe() && (name === 'SecurityError' || name === 'NotAllowedError')) {
      return {
        ok: false,
        error:
          'Fingerprint/Face unlock is blocked inside preview frames. Open in a full browser tab or use Offline PIN.',
      };
    }
    return {
      ok: false,
      error: 'Biometric verification did not complete. Use your Offline PIN or ID & Password.',
    };
  }
}

export function removeBiometricInVault(): OfflineQuickUnlockVault | null {
  const vault = loadOfflineVault();
  if (!vault) return null;
  const updated: OfflineQuickUnlockVault = {
    ...vault,
    biometricCredentialId: undefined,
    biometricRegisteredAt: undefined,
  };
  writeOfflineVault(updated);
  return updated;
}

export function clearOfflineVault(): void {
  try {
    localStorage.removeItem(OFFLINE_VAULT_STORAGE_KEY);
  } catch {}
}

// --- Per-UID Offline Snapshot Cache for Instant Zero-Network PIN/Biometric Restore ---

export function saveOfflineDataSnapshot(uid: string, snapshot: Omit<OfflineDataSnapshot, 'savedAt'>): void {
  if (!uid) return;
  try {
    const payload: OfflineDataSnapshot = {
      ...snapshot,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${OFFLINE_DATA_PREFIX}${uid}`, JSON.stringify(payload));
  } catch {
    // Ignore storage quota overflow gracefully
  }
}

export function loadOfflineDataSnapshot(uid: string): OfflineDataSnapshot | null {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(`${OFFLINE_DATA_PREFIX}${uid}`);
    if (raw) return JSON.parse(raw) as OfflineDataSnapshot;
  } catch {}
  return null;
}
