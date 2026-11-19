import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  ChatRoom,
  ConnectRequestLog,
  FamilyMember,
  RadioTrackingTag,
  RoomMessage,
  TransportMode,
  VaakContactUser,
  WalkieTransmission,
} from '../types/app';
import { ChatContactUser, ChatMessage } from '../components/WhatsAppChatView';

export function sanitizeDocId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned || `id-${Date.now()}`;
}

function createdAtMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function captureSubscriptionError(
  error: unknown,
  op: OperationType,
  path: string,
  onError?: (err: Error) => void
) {
  try {
    handleFirestoreError(error, op, path);
  } catch (structuredErr) {
    if (onError) {
      onError(structuredErr instanceof Error ? structuredErr : new Error(String(structuredErr)));
    }
  }
}

export interface FirebaseUserProfileInput {
  uid: string;
  email: string;
  displayName: string;
  callSign: string;
  deviceId: string;
  x25519PublicKey: string;
  countryIso: string;
  photoURL?: string;
}

export async function upsertUserProfile(profile: FirebaseUserProfileInput): Promise<void> {
  const path = `users/${profile.uid}`;
  const userRef = doc(db, 'users', profile.uid);
  try {
    const existingSnap = await getDoc(userRef);
    const baseData: Record<string, unknown> = {
      email: profile.email.slice(0, 254),
      displayName: (profile.displayName || 'Vaak User').slice(0, 100),
      callSign: profile.callSign.slice(0, 40),
      deviceId: profile.deviceId.slice(0, 64),
      x25519PublicKey: profile.x25519PublicKey.slice(0, 128),
      countryIso: profile.countryIso.slice(0, 8),
      updatedAt: serverTimestamp(),
    };
    if (profile.photoURL && profile.photoURL.length <= 512) {
      baseData.photoURL = profile.photoURL;
    }

    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        uid: profile.uid,
        ...baseData,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, baseData);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchUserProfile(
  uid: string
): Promise<Partial<FirebaseUserProfileInput> | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as Partial<FirebaseUserProfileInput>;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// --- 1-on-1 & Group Chat Messages ---

export function subscribeChatMessages(
  uid: string,
  onData: (messagesMap: Record<string, ChatMessage[]>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/messages`;
  // Constrain ownerUid == uid to satisfy Firestore allow list rules without needing composite indexes
  const q = query(collection(db, 'users', uid, 'messages'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: Array<{ chatId: string; createdMs: number; msg: ChatMessage }> = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const chatId = String(d.chatId || '');
        if (!chatId) return;
        rows.push({
          chatId,
          createdMs: createdAtMillis(d.createdAt),
          msg: {
            id: String(d.id || docSnap.id),
            senderId: String(d.senderId || 'me'),
            senderName: d.senderName ? String(d.senderName) : undefined,
            text: String(d.text || ''),
            timestamp: String(d.timestamp || ''),
            delivered: Boolean(d.delivered),
          },
        });
      });

      rows.sort((a, b) => a.createdMs - b.createdMs);
      const grouped: Record<string, ChatMessage[]> = {};
      rows.forEach(({ chatId, msg }) => {
        if (!grouped[chatId]) grouped[chatId] = [];
        grouped[chatId].push(msg);
      });
      onData(grouped);
    },
    (error) => {
      captureSubscriptionError(error, OperationType.LIST, path, onError);
    }
  );
}

export async function sendChatMessageToFirestore(
  uid: string,
  params: {
    id?: string;
    chatId: string;
    contactName: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: string;
    isEmergency?: boolean;
  }
): Promise<void> {
  const msgId = sanitizeDocId(
    params.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );
  const path = `users/${uid}/messages/${msgId}`;
  try {
    const payload: Record<string, unknown> = {
      id: msgId,
      ownerUid: uid,
      chatId: sanitizeDocId(params.chatId),
      contactName: (params.contactName || 'Contact').slice(0, 100) || 'Contact',
      senderId: params.senderId.slice(0, 128) || 'me',
      senderName: (params.senderName || 'You').slice(0, 100) || 'You',
      text: params.text.slice(0, 2000) || '(Empty)',
      timestamp: (params.timestamp || new Date().toTimeString().slice(0, 5)).slice(0, 20),
      delivered: true,
      createdAt: serverTimestamp(),
    };
    if (typeof params.isEmergency === 'boolean') {
      payload.isEmergency = params.isEmergency;
    }
    await setDoc(doc(db, 'users', uid, 'messages', msgId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- Walkie-Talkie & SOS Priority Transmissions ---

export function subscribeWalkieTransmissions(
  uid: string,
  onData: (items: WalkieTransmission[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/walkieTransmissions`;
  const q = query(
    collection(db, 'users', uid, 'walkieTransmissions'),
    where('ownerUid', '==', uid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: Array<{ createdMs: number; tx: WalkieTransmission }> = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        rows.push({
          createdMs: createdAtMillis(d.createdAt),
          tx: {
            id: String(d.id || docSnap.id),
            sender: String(d.sender || 'You'),
            channel: String(d.channel || 'Family Alpha'),
            mode: (d.mode as TransportMode) || 'mesh',
            text: String(d.text || ''),
            durationSec: typeof d.durationSec === 'number' ? d.durationSec : undefined,
            timestamp: String(d.timestamp || ''),
            paninianHash: String(d.paninianHash || ''),
            lamportSeq: typeof d.lamportSeq === 'number' ? d.lamportSeq : undefined,
            codec: d.codec ? (String(d.codec) as WalkieTransmission['codec']) : undefined,
            isAudio: typeof d.isAudio === 'boolean' ? d.isAudio : undefined,
            isQuickIcon: typeof d.isQuickIcon === 'boolean' ? d.isQuickIcon : undefined,
            blocked: typeof d.blocked === 'boolean' ? d.blocked : undefined,
            meshStage: d.meshStage ? (String(d.meshStage) as WalkieTransmission['meshStage']) : undefined,
            hopJourney: d.hopJourney ? String(d.hopJourney) : undefined,
          },
        });
      });
      rows.sort((a, b) => b.createdMs - a.createdMs);
      onData(rows.map((r) => r.tx));
    },
    (error) => {
      captureSubscriptionError(error, OperationType.LIST, path, onError);
    }
  );
}

export async function saveWalkieTransmissionToFirestore(
  uid: string,
  tx: WalkieTransmission
): Promise<void> {
  const txId = sanitizeDocId(tx.id || `wt-${Date.now()}`);
  const path = `users/${uid}/walkieTransmissions/${txId}`;
  try {
    const payload: Record<string, unknown> = {
      id: txId,
      ownerUid: uid,
      sender: (tx.sender || 'You').slice(0, 100),
      channel: (tx.channel || 'Family Alpha').slice(0, 100),
      mode: tx.mode,
      text: (tx.text || '(Voice)').slice(0, 2000),
      timestamp: (tx.timestamp || new Date().toTimeString().slice(0, 5)).slice(0, 20),
      paninianHash: (tx.paninianHash || 'PAN').slice(0, 64),
      createdAt: serverTimestamp(),
    };
    if (typeof tx.durationSec === 'number') payload.durationSec = tx.durationSec;
    if (typeof tx.lamportSeq === 'number') payload.lamportSeq = tx.lamportSeq;
    if (tx.codec) payload.codec = tx.codec.slice(0, 32);
    if (typeof tx.isAudio === 'boolean') payload.isAudio = tx.isAudio;
    if (typeof tx.isQuickIcon === 'boolean') payload.isQuickIcon = tx.isQuickIcon;
    if (typeof tx.blocked === 'boolean') payload.blocked = tx.blocked;
    if (tx.meshStage) payload.meshStage = tx.meshStage.slice(0, 32);
    if (tx.hopJourney) payload.hopJourney = tx.hopJourney.slice(0, 120);

    await setDoc(doc(db, 'users', uid, 'walkieTransmissions', txId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- Contacts ---

export function subscribeContacts(
  uid: string,
  onData: (contacts: VaakContactUser[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/contacts`;
  const q = query(collection(db, 'users', uid, 'contacts'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: Array<{ createdMs: number; item: VaakContactUser }> = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        rows.push({
          createdMs: createdAtMillis(d.createdAt),
          item: {
            id: String(d.id || docSnap.id),
            name: String(d.name || ''),
            phone: String(d.phone || ''),
            regionIso: String(d.regionIso || 'IN'),
            phonebookLabel: (d.phonebookLabel as VaakContactUser['phonebookLabel']) || 'Mobile',
            onVaak: Boolean(d.onVaak),
            status: (d.status as VaakContactUser['status']) || 'Offline',
            verified: Boolean(d.verified),
            connected: Boolean(d.connected),
            lastSeen: String(d.lastSeen || 'Recently'),
          },
        });
      });
      rows.sort((a, b) => b.createdMs - a.createdMs);
      onData(rows.map((r) => r.item));
    },
    (error) => {
      captureSubscriptionError(error, OperationType.LIST, path, onError);
    }
  );
}

export async function saveContactToFirestore(uid: string, contact: VaakContactUser): Promise<void> {
  const contactId = sanitizeDocId(contact.id || `vc-${Date.now()}`);
  const path = `users/${uid}/contacts/${contactId}`;
  const ref = doc(db, 'users', uid, 'contacts', contactId);
  try {
    const snap = await getDoc(ref);
    const editableFields = {
      name: (contact.name || 'Contact').slice(0, 100),
      phone: (contact.phone || 'Unknown').slice(0, 40),
      regionIso: (contact.regionIso || 'IN').slice(0, 8),
      phonebookLabel: contact.phonebookLabel,
      onVaak: contact.onVaak,
      status: contact.status,
      verified: contact.verified,
      connected: contact.connected,
      lastSeen: (contact.lastSeen || 'Recently').slice(0, 40),
      updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(ref, {
        id: contactId,
        ownerUid: uid,
        ...editableFields,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, editableFields);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Connect Requests & Invite Logs ---

export function subscribeConnectRequests(
  uid: string,
  onData: (items: ConnectRequestLog[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/connectRequests`;
  const q = query(collection(db, 'users', uid, 'connectRequests'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: Array<{ createdMs: number; item: ConnectRequestLog }> = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        rows.push({
          createdMs: createdAtMillis(d.createdAt),
          item: {
            id: String(d.id || docSnap.id),
            contactName: String(d.contactName || 'Contact'),
            phone: String(d.phone || 'Unknown'),
            direction: (d.direction as ConnectRequestLog['direction']) || 'outgoing',
            status: (d.status as ConnectRequestLog['status']) || 'pending',
            timestamp: String(d.timestamp || 'Just now'),
          },
        });
      });
      rows.sort((a, b) => b.createdMs - a.createdMs);
      onData(rows.map((r) => r.item));
    },
    (error) => {
      captureSubscriptionError(error, OperationType.LIST, path, onError);
    }
  );
}

export async function saveConnectRequestToFirestore(
  uid: string,
  req: ConnectRequestLog
): Promise<void> {
  const requestId = sanitizeDocId(req.id || `cr-${Date.now()}`);
  const path = `users/${uid}/connectRequests/${requestId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'connectRequests', requestId), {
      id: requestId,
      ownerUid: uid,
      contactName: (req.contactName || 'Contact').slice(0, 100),
      phone: (req.phone || 'Unknown').slice(0, 60),
      direction: req.direction,
      status: req.status,
      timestamp: (req.timestamp || 'Just now').slice(0, 40),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateConnectRequestStatusInFirestore(
  uid: string,
  requestId: string,
  status: ConnectRequestLog['status']
): Promise<void> {
  const safeId = sanitizeDocId(requestId);
  const path = `users/${uid}/connectRequests/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'connectRequests', safeId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Pinned Family Members ---

export function subscribeFamilyMembers(
  uid: string,
  onData: (family: FamilyMember[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/family`;
  const q = query(collection(db, 'users', uid, 'family'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: Array<{ createdMs: number; item: FamilyMember }> = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        rows.push({
          createdMs: createdAtMillis(d.createdAt),
          item: {
            id: String(d.id || docSnap.id),
            name: String(d.name || ''),
            relation: String(d.relation || 'Family'),
            phone: d.phone ? String(d.phone) : undefined,
            avatar: String(d.avatar || ''),
            status: String(d.status || 'Active'),
            statusType: (d.statusType as FamilyMember['statusType']) || 'safe',
            distanceKm: typeof d.distanceKm === 'number' ? d.distanceKm : 0,
            bearingDeg: typeof d.bearingDeg === 'number' ? d.bearingDeg : 0,
            lastPingAgo: String(d.lastPingAgo || 'Just now'),
            batteryPct: typeof d.batteryPct === 'number' ? d.batteryPct : 100,
            channel: (d.channel as TransportMode) || 'mesh',
            lat: typeof d.lat === 'number' ? d.lat : 0,
            lng: typeof d.lng === 'number' ? d.lng : 0,
          },
        });
      });
      rows.sort((a, b) => a.createdMs - b.createdMs);
      onData(rows.map((r) => r.item));
    },
    (error) => {
      captureSubscriptionError(error, OperationType.LIST, path, onError);
    }
  );
}

export async function saveFamilyMemberToFirestore(
  uid: string,
  member: FamilyMember & { phone?: string }
): Promise<void> {
  const memberId = sanitizeDocId(member.id || `fam-${Date.now()}`);
  const path = `users/${uid}/family/${memberId}`;
  const ref = doc(db, 'users', uid, 'family', memberId);
  try {
    const payload: Record<string, unknown> = {
      id: memberId,
      ownerUid: uid,
      name: (member.name || 'Family Member').slice(0, 100),
      relation: (member.relation || 'Family').slice(0, 40),
      avatar: (member.avatar || '').slice(0, 512),
      status: (member.status || 'Active').slice(0, 80),
      statusType: member.statusType,
      distanceKm: member.distanceKm,
      bearingDeg: member.bearingDeg,
      lastPingAgo: (member.lastPingAgo || 'Just now').slice(0, 40),
      batteryPct: member.batteryPct,
      channel: member.channel,
      lat: member.lat,
      lng: member.lng,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (member.phone) {
      payload.phone = member.phone.slice(0, 40);
    }
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFamilyMemberPingInFirestore(
  uid: string,
  memberId: string
): Promise<void> {
  const safeId = sanitizeDocId(memberId);
  const path = `users/${uid}/family/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'family', safeId), {
      lastPingAgo: 'Just now',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Custom Groups ---

export function subscribeGroups(
  uid: string,
  onData: (groups: ChatContactUser[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/groups`;
  const q = query(collection(db, 'users', uid, 'groups'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: Array<{ createdMs: number; item: ChatContactUser }> = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        rows.push({
          createdMs: createdAtMillis(d.createdAt),
          item: {
            id: String(d.id || docSnap.id),
            name: String(d.name || ''),
            phone: String(d.phone || 'Group'),
            status: String(d.status || 'Active'),
            isGroup: true,
            members: Array.isArray(d.members) ? d.members.map(String) : ['me'],
            groupCategory: String(d.groupCategory || 'Team'),
          },
        });
      });
      rows.sort((a, b) => b.createdMs - a.createdMs);
      onData(rows.map((r) => r.item));
    },
    (error) => {
      captureSubscriptionError(error, OperationType.LIST, path, onError);
    }
  );
}

export async function saveGroupToFirestore(uid: string, group: ChatContactUser): Promise<void> {
  const groupId = sanitizeDocId(group.id || `group-${Date.now()}`);
  const path = `users/${uid}/groups/${groupId}`;
  try {
    const members = (group.members && group.members.length > 0 ? group.members : ['me']).slice(0, 50);
    await setDoc(doc(db, 'users', uid, 'groups', groupId), {
      id: groupId,
      ownerUid: uid,
      name: (group.name || 'Group').slice(0, 100),
      phone: (group.phone || 'Group').slice(0, 100),
      status: (group.status || 'Active').slice(0, 80),
      isGroup: true,
      members,
      groupCategory: (group.groupCategory || 'Team').slice(0, 40),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- Shared 6-Digit PIN Rooms ---

export function subscribeRooms(
  uid: string,
  onData: (rooms: ChatRoom[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const roomsPath = 'rooms';
  const q = query(collection(db, 'rooms'), where('memberUids', 'array-contains', uid));
  const msgUnsubs: Record<string, Unsubscribe> = {};
  const roomMessagesCache: Record<string, RoomMessage[]> = {};
  let latestRoomsMeta: Omit<ChatRoom, 'messages'>[] = [];

  const emitMerged = () => {
    const merged: ChatRoom[] = latestRoomsMeta.map((meta) => ({
      ...meta,
      messages: roomMessagesCache[meta.id] || [],
    }));
    onData(merged);
  };

  const unsubRooms = onSnapshot(
    q,
    (snapshot) => {
      const nextMeta: Omit<ChatRoom, 'messages'>[] = [];
      const activeIds = new Set<string>();

      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const rId = String(d.id || docSnap.id);
        activeIds.add(rId);
        nextMeta.push({
          id: rId,
          pin: String(d.pin || '000000'),
          name: String(d.name || 'Mesh Room'),
          category: (d.category as ChatRoom['category']) || 'Outing',
          memberCount: typeof d.memberCount === 'number' ? d.memberCount : 1,
          activeMode: (d.activeMode as TransportMode) || 'mesh',
          createdAt: String(d.createdAtLabel || 'Just now'),
        });

        if (!msgUnsubs[rId]) {
          const msgPath = `rooms/${rId}/messages`;
          const mq = query(collection(db, 'rooms', rId, 'messages'), orderBy('createdAt', 'asc'));
          msgUnsubs[rId] = onSnapshot(
            mq,
            (msgSnap) => {
              const msgs: RoomMessage[] = [];
              msgSnap.forEach((mDoc) => {
                const md = mDoc.data();
                msgs.push({
                  id: String(md.id || mDoc.id),
                  sender: String(md.sender || 'Member'),
                  text: String(md.text || ''),
                  timestamp: String(md.timestamp || ''),
                  paninianCipherPreview: String(md.paninianCipherPreview || ''),
                  lamportSeq: typeof md.lamportSeq === 'number' ? md.lamportSeq : undefined,
                  meshStage: md.meshStage
                    ? (String(md.meshStage) as RoomMessage['meshStage'])
                    : undefined,
                  hopJourney: md.hopJourney ? String(md.hopJourney) : undefined,
                });
              });
              roomMessagesCache[rId] = msgs;
              emitMerged();
            },
            (err) => {
              captureSubscriptionError(err, OperationType.LIST, msgPath, onError);
            }
          );
        }
      });

      // Clean up removed room message listeners
      Object.keys(msgUnsubs).forEach((rId) => {
        if (!activeIds.has(rId)) {
          msgUnsubs[rId]();
          delete msgUnsubs[rId];
          delete roomMessagesCache[rId];
        }
      });

      latestRoomsMeta = nextMeta;
      emitMerged();
    },
    (error) => {
      captureSubscriptionError(error, OperationType.LIST, roomsPath, onError);
    }
  );

  return () => {
    unsubRooms();
    Object.values(msgUnsubs).forEach((u) => u());
  };
}

export async function createRoomInFirestore(
  uid: string,
  params: {
    id: string;
    pin: string;
    name: string;
    category: ChatRoom['category'];
    activeMode: TransportMode;
    initialCipherPreview: string;
    lamportSeq: number;
  }
): Promise<void> {
  const roomId = sanitizeDocId(params.id);
  const path = `rooms/${roomId}`;
  try {
    const batch = writeBatch(db);
    const roomRef = doc(db, 'rooms', roomId);
    const pinRef = doc(db, 'room_pins', params.pin);

    batch.set(roomRef, {
      id: roomId,
      pin: params.pin,
      name: (params.name || 'Mesh Room').slice(0, 100),
      category: params.category,
      ownerUid: uid,
      memberUids: [uid],
      memberCount: 1,
      activeMode: params.activeMode,
      createdAtLabel: 'Just now',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(pinRef, {
      pin: params.pin,
      roomId,
      ownerUid: uid,
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    // Add initial system message
    const msgId = sanitizeDocId(`rm-${Date.now()}`);
    await setDoc(doc(db, 'rooms', roomId, 'messages', msgId), {
      id: msgId,
      roomId,
      senderUid: uid,
      sender: 'System',
      text: `Room "${params.name}" created with 6-digit PIN ${params.pin}. Share PIN to invite members.`,
      timestamp: new Date().toTimeString().slice(0, 5),
      paninianCipherPreview: (params.initialCipherPreview || 'PAN-SEALED').slice(0, 64),
      lamportSeq: params.lamportSeq,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function joinRoomByPinInFirestore(uid: string, pin: string): Promise<ChatRoom | null> {
  const pinPath = `room_pins/${pin}`;
  try {
    const pinSnap = await getDoc(doc(db, 'room_pins', pin));
    if (!pinSnap.exists()) return null;
    const { roomId } = pinSnap.data() as { roomId: string };
    const roomRef = doc(db, 'rooms', roomId);

    // Try reading directly first if the user is already a member (avoids spurious failed write)
    let roomSnap;
    try {
      roomSnap = await getDoc(roomRef);
    } catch {
      roomSnap = null;
    }

    if (!roomSnap || !roomSnap.exists()) {
      await updateDoc(roomRef, {
        memberUids: arrayUnion(uid),
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      roomSnap = await getDoc(roomRef);
    }

    if (!roomSnap || !roomSnap.exists()) return null;
    const d = roomSnap.data();
    return {
      id: String(d.id || roomId),
      pin: String(d.pin || pin),
      name: String(d.name || 'Mesh Room'),
      category: (d.category as ChatRoom['category']) || 'Outing',
      memberCount: typeof d.memberCount === 'number' ? d.memberCount : 1,
      activeMode: (d.activeMode as TransportMode) || 'mesh',
      createdAt: String(d.createdAtLabel || 'Just now'),
      messages: [],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pinPath);
  }
}

export async function sendRoomMessageToFirestore(
  uid: string,
  roomId: string,
  msg: RoomMessage
): Promise<void> {
  const safeRoomId = sanitizeDocId(roomId);
  const msgId = sanitizeDocId(msg.id || `rm-${Date.now()}`);
  const path = `rooms/${safeRoomId}/messages/${msgId}`;
  try {
    const payload: Record<string, unknown> = {
      id: msgId,
      roomId: safeRoomId,
      senderUid: uid,
      sender: (msg.sender || 'Member').slice(0, 100),
      text: (msg.text || '(Empty)').slice(0, 2000),
      timestamp: (msg.timestamp || new Date().toTimeString().slice(0, 5)).slice(0, 20),
      paninianCipherPreview: (msg.paninianCipherPreview || 'PAN-SEALED').slice(0, 64),
      createdAt: serverTimestamp(),
    };
    if (typeof msg.lamportSeq === 'number') payload.lamportSeq = msg.lamportSeq;
    if (msg.meshStage) payload.meshStage = msg.meshStage.slice(0, 32);
    if (msg.hopJourney) payload.hopJourney = msg.hopJourney.slice(0, 120);

    await setDoc(doc(db, 'rooms', safeRoomId, 'messages', msgId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- Tracking Tags ---

export function subscribeTrackingTags(
  uid: string,
  onData: (tags: RadioTrackingTag[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/trackingTags`;
  const q = query(collection(db, 'users', uid, 'trackingTags'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: Array<{ createdMs: number; item: RadioTrackingTag }> = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        rows.push({
          createdMs: createdAtMillis(d.createdAt),
          item: {
            id: String(d.id || docSnap.id),
            beaconCode: String(d.beaconCode || ''),
            name: String(d.name || ''),
            targetType: (d.targetType as RadioTrackingTag['targetType']) || 'Child',
            dutyCycleSec: ([30, 60, 300].includes(Number(d.dutyCycleSec))
              ? Number(d.dutyCycleSec)
              : 60) as 30 | 60 | 300,
            distanceKm: typeof d.distanceKm === 'number' ? d.distanceKm : 0,
            bearingDeg: typeof d.bearingDeg === 'number' ? d.bearingDeg : 0,
            batteryEstPct: typeof d.batteryEstPct === 'number' ? d.batteryEstPct : 100,
            lastPulseAt: String(d.lastPulseAt || 'Just now'),
            encryptedFootprintHash: String(d.encryptedFootprintHash || ''),
            active: Boolean(d.active),
          },
        });
      });
      rows.sort((a, b) => b.createdMs - a.createdMs);
      onData(rows.map((r) => r.item));
    },
    (error) => {
      captureSubscriptionError(error, OperationType.LIST, path, onError);
    }
  );
}

export async function saveTrackingTagToFirestore(
  uid: string,
  tag: RadioTrackingTag
): Promise<void> {
  const tagId = sanitizeDocId(tag.id || `tag-${Date.now()}`);
  const path = `users/${uid}/trackingTags/${tagId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'trackingTags', tagId), {
      id: tagId,
      ownerUid: uid,
      beaconCode: (tag.beaconCode || 'VK-TAG').slice(0, 40),
      name: (tag.name || 'Tracking Beacon').slice(0, 100),
      targetType: tag.targetType,
      dutyCycleSec: tag.dutyCycleSec,
      distanceKm: tag.distanceKm,
      bearingDeg: tag.bearingDeg,
      batteryEstPct: tag.batteryEstPct,
      lastPulseAt: (tag.lastPulseAt || 'Just now').slice(0, 40),
      encryptedFootprintHash: (tag.encryptedFootprintHash || '0x00').slice(0, 64),
      active: tag.active,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTrackingTagInFirestore(
  uid: string,
  tagId: string,
  patch: Partial<
    Pick<
      RadioTrackingTag,
      'active' | 'distanceKm' | 'bearingDeg' | 'lastPulseAt' | 'encryptedFootprintHash'
    >
  >
): Promise<void> {
  const safeId = sanitizeDocId(tagId);
  const path = `users/${uid}/trackingTags/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'trackingTags', safeId), patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
