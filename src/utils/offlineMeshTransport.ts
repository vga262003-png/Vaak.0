// Real Browser Off-Grid Mesh Transports & Offline DTN Store-and-Forward Outbox:
// 1. Offline DTN Store-and-Forward Outbox persisted in localStorage & flushed when online
// 2. Same-device / local multi-tab BroadcastChannel mesh relay
// 3. Zero-Server WebRTC P2P DataChannel bridge (copy/paste Offer & Answer over hotspot/Wi-Fi Direct)
// 4. Web Bluetooth LE nearby device proximity discovery (where supported by browser)

import { sha256Hex } from './securityEngine';

const DTN_OUTBOX_KEY = 'vaak_dtn_outbox_v1';
const LOCAL_MESH_CHANNEL = 'vaak-local-mesh-v1';

export interface DtnOutboxItem {
  id: string;
  kind: 'walkie' | 'chat';
  createdAt: string;
  payloadJson: string;
  sha256: string;
}

export function loadDtnOutbox(): DtnOutboxItem[] {
  try {
    const raw = localStorage.getItem(DTN_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DtnOutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDtnOutbox(items: DtnOutboxItem[]): void {
  try {
    localStorage.setItem(DTN_OUTBOX_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota errors
  }
}

export async function enqueueDtnOutboxItem(
  kind: 'walkie' | 'chat',
  payload: unknown
): Promise<DtnOutboxItem[]> {
  const payloadJson = JSON.stringify(payload);
  const digest = await sha256Hex(payloadJson);
  const nextItem: DtnOutboxItem = {
    id: `dtn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    createdAt: new Date().toISOString(),
    payloadJson,
    sha256: digest,
  };
  const updated = [nextItem, ...loadDtnOutbox()].slice(0, 60);
  saveDtnOutbox(updated);
  return updated;
}

export interface LocalMeshPacket {
  id: string;
  senderCallSign: string;
  deviceId: string;
  channel: string;
  text: string;
  timestamp: string;
  lamportSeq: number;
  transport: 'broadcast_channel' | 'webrtc_p2p' | 'sonic_modem';
}

export function broadcastLocalMeshPacket(packet: LocalMeshPacket): boolean {
  if (typeof BroadcastChannel === 'undefined') return false;
  try {
    const ch = new BroadcastChannel(LOCAL_MESH_CHANNEL);
    ch.postMessage(packet);
    ch.close();
    return true;
  } catch {
    return false;
  }
}

export function subscribeLocalMesh(
  selfDeviceId: string,
  onPacket: (packet: LocalMeshPacket) => void
): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  try {
    const ch = new BroadcastChannel(LOCAL_MESH_CHANNEL);
    ch.onmessage = (ev) => {
      const pkt = ev.data as LocalMeshPacket | undefined;
      if (pkt && pkt.deviceId !== selfDeviceId && pkt.text) {
        onPacket(pkt);
      }
    };
    return () => ch.close();
  } catch {
    return () => {};
  }
}

const LOCAL_RADAR_PRESENCE_CHANNEL = 'vaak-local-radar-presence-v1';
const LOCAL_RADAR_REQUEST_CHANNEL = 'vaak-local-radar-requests-v1';

export interface LocalRadarBeacon {
  nodeId: string;
  callSign: string;
  mode: 'online' | 'mesh' | 'sonic';
  lat: number | null;
  lng: number | null;
  statusText: string;
  updatedAtMs: number;
}

export interface LocalRadarRequestPacket {
  kind: 'request' | 'response';
  requestId: string;
  fromNodeId: string;
  fromCallSign: string;
  toNodeId: string;
  toCallSign: string;
  status: 'pending' | 'accepted' | 'declined';
  timestampMs: number;
}

export function broadcastLocalRadarBeacon(beacon: LocalRadarBeacon): boolean {
  if (typeof BroadcastChannel === 'undefined') return false;
  try {
    const ch = new BroadcastChannel(LOCAL_RADAR_PRESENCE_CHANNEL);
    ch.postMessage(beacon);
    ch.close();
    return true;
  } catch {
    return false;
  }
}

export function subscribeLocalRadarBeacons(
  selfNodeId: string,
  onBeacon: (beacon: LocalRadarBeacon) => void
): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  try {
    const ch = new BroadcastChannel(LOCAL_RADAR_PRESENCE_CHANNEL);
    ch.onmessage = (ev) => {
      const beacon = ev.data as LocalRadarBeacon | undefined;
      if (beacon && beacon.nodeId && beacon.nodeId !== selfNodeId && beacon.callSign) {
        onBeacon(beacon);
      }
    };
    return () => ch.close();
  } catch {
    return () => {};
  }
}

export function broadcastLocalRadarRequest(packet: LocalRadarRequestPacket): boolean {
  if (typeof BroadcastChannel === 'undefined') return false;
  try {
    const ch = new BroadcastChannel(LOCAL_RADAR_REQUEST_CHANNEL);
    ch.postMessage(packet);
    ch.close();
    return true;
  } catch {
    return false;
  }
}

export function subscribeLocalRadarRequests(
  selfNodeId: string,
  onPacket: (packet: LocalRadarRequestPacket) => void
): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  try {
    const ch = new BroadcastChannel(LOCAL_RADAR_REQUEST_CHANNEL);
    ch.onmessage = (ev) => {
      const pkt = ev.data as LocalRadarRequestPacket | undefined;
      if (pkt && pkt.requestId && (pkt.toNodeId === selfNodeId || pkt.fromNodeId === selfNodeId)) {
        onPacket(pkt);
      }
    };
    return () => ch.close();
  } catch {
    return () => {};
  }
}

// Zero-Server WebRTC DataChannel P2P Bridge (Manual Offer/Answer SDP exchange for offline Wi-Fi Direct / Hotspot)
export class WebRtcMeshBridge {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private onMessageCb: ((pkt: LocalMeshPacket) => void) | null = null;
  private onStateCb: ((state: string) => void) | null = null;

  constructor(
    onMessage: (pkt: LocalMeshPacket) => void,
    onStateChange: (state: string) => void
  ) {
    this.onMessageCb = onMessage;
    this.onStateCb = onStateChange;
  }

  private waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const timeout = window.setTimeout(resolve, 2500);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          resolve();
        }
      };
    });
  }

  private bindChannel(dc: RTCDataChannel) {
    this.dc = dc;
    dc.onopen = () => this.onStateCb?.('connected');
    dc.onclose = () => this.onStateCb?.('closed');
    dc.onerror = () => this.onStateCb?.('error');
    dc.onmessage = (ev) => {
      try {
        const pkt = JSON.parse(String(ev.data)) as LocalMeshPacket;
        if (pkt?.text) this.onMessageCb?.({ ...pkt, transport: 'webrtc_p2p' });
      } catch {
        this.onMessageCb?.({
          id: `p2p-${Date.now()}`,
          senderCallSign: 'P2P Peer',
          deviceId: 'WEBRTC-PEER',
          channel: 'Direct P2P',
          text: String(ev.data),
          timestamp: new Date().toTimeString().slice(0, 5),
          lamportSeq: 1,
          transport: 'webrtc_p2p',
        });
      }
    };
  }

  async createOfferToken(): Promise<string> {
    this.close();
    const pc = new RTCPeerConnection({ iceServers: [] });
    this.pc = pc;
    pc.onconnectionstatechange = () => this.onStateCb?.(pc.connectionState);
    const dc = pc.createDataChannel('vaak-mesh-p2p', { ordered: true });
    this.bindChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await this.waitForIceGathering(pc);
    this.onStateCb?.('awaiting_answer');
    return btoa(unescape(encodeURIComponent(JSON.stringify(pc.localDescription))));
  }

  async acceptOfferAndCreateAnswer(offerToken: string): Promise<string> {
    this.close();
    const pc = new RTCPeerConnection({ iceServers: [] });
    this.pc = pc;
    pc.onconnectionstatechange = () => this.onStateCb?.(pc.connectionState);
    pc.ondatachannel = (ev) => this.bindChannel(ev.channel);

    const offerDesc = JSON.parse(decodeURIComponent(escape(atob(offerToken.trim()))));
    await pc.setRemoteDescription(offerDesc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await this.waitForIceGathering(pc);
    this.onStateCb?.('connecting');
    return btoa(unescape(encodeURIComponent(JSON.stringify(pc.localDescription))));
  }

  async acceptAnswerToken(answerToken: string): Promise<void> {
    if (!this.pc) throw new Error('Create Offer first before pasting Answer.');
    const answerDesc = JSON.parse(decodeURIComponent(escape(atob(answerToken.trim()))));
    await this.pc.setRemoteDescription(answerDesc);
    this.onStateCb?.('connecting');
  }

  sendPacket(pkt: LocalMeshPacket): boolean {
    if (!this.dc || this.dc.readyState !== 'open') return false;
    this.dc.send(JSON.stringify(pkt));
    return true;
  }

  close() {
    try {
      this.dc?.close();
      this.pc?.close();
    } catch {
      // Ignore close warnings
    }
    this.dc = null;
    this.pc = null;
    this.onStateCb?.('idle');
  }
}

export interface BleScanResult {
  supported: boolean;
  deviceName?: string;
  deviceId?: string;
  error?: string;
}

export async function scanNearbyBlePeers(): Promise<BleScanResult> {
  const nav = navigator as unknown as {
    bluetooth?: {
      requestDevice: (opts: { acceptAllDevices: boolean }) => Promise<{ id: string; name?: string }>;
    };
  };
  if (typeof navigator === 'undefined' || !nav.bluetooth?.requestDevice) {
    return {
      supported: false,
      error:
        'Web Bluetooth BLE scanning requires Android Chrome / Desktop Chromium over HTTPS (not exposed inside this sandboxed/iFrame context).',
    };
  }
  try {
    const dev = await nav.bluetooth.requestDevice({ acceptAllDevices: true });
    return {
      supported: true,
      deviceId: dev.id,
      deviceName: dev.name || 'Unnamed BLE Node',
    };
  } catch (err) {
    return {
      supported: true,
      error: err instanceof Error ? err.message : 'BLE scan cancelled.',
    };
  }
}
