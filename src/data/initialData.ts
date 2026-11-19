import {
  ChatRoom,
  FamilyMember,
  GovAuditEntry,
  NotificationItem,
  RadarNode,
  WalkieTransmission,
} from '../types/app';

// Clean production defaults — zero fake/mock demo records; all user data loads from Firebase Firestore
export const INITIAL_FAMILY_MEMBERS: FamilyMember[] = [];
export const INITIAL_RADAR_NODES: RadarNode[] = [];
export const INITIAL_WALKIE_MESSAGES: WalkieTransmission[] = [];
export const INITIAL_ROOMS: ChatRoom[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_AUDIT_LOGS: GovAuditEntry[] = [];
