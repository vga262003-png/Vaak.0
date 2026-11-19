# Firestore Security Specification (Phase 0 - Payload-First TDD)

## 1. Data Invariants
1. A `UserProfile` at `/users/{userId}` can only be read, created, or updated by the verified authenticated user whose `request.auth.uid == userId`.
2. Every subcollection under `/users/{userId}` (`messages`, `walkieTransmissions`, `contacts`, `family`, `groups`, `trackingTags`) requires `isOwner(userId)` + verified email + `ownerUid == request.auth.uid` on create and immutable `ownerUid` on update.
3. A `RoomRecord` at `/rooms/{roomId}` must have a 6-digit numeric PIN (`^[0-9]{6}$`), `ownerUid == request.auth.uid` on create, `memberUids` bounded `<= 50` containing `request.auth.uid`, and server timestamps (`request.time`).
4. A `RoomMessageRecord` at `/rooms/{roomId}/messages/{messageId}` requires parent `/rooms/{roomId}` membership (`request.auth.uid in get(...).data.memberUids`), `senderUid == request.auth.uid`, and `roomId` matching path `{roomId}`.
5. A `RoomPinIndex` at `/room_pins/{pin}` only permits single-document `get` (never `list` enumeration) by verified signed-in users, and `create` only by the owner of the referenced existing `/rooms/{roomId}`.
6. All string fields enforce explicit `.size()` boundaries; all document IDs match `^[a-zA-Z0-9_-]+$` (`<= 128` chars); all `createdAt`/`updatedAt` timestamps must equal `request.time`.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read/write**: `{ auth: null }` reading `/users/uid1/messages/m1` -> DENIED.
2. **Unverified email write**: `{ auth: { uid: 'uid1', token: { email_verified: false } } }` writing `/users/uid1/messages/m1` -> DENIED.
3. **Cross-user PII read**: `uid2` reading `/users/uid1` -> DENIED.
4. **Identity spoofing on message create**: `uid1` creating `/users/uid1/messages/m1` with `ownerUid: 'uid2'` -> DENIED.
5. **Shadow / ghost field injection**: `uid1` creating `/users/uid1/messages/m1` with extra field `isAdmin: true` -> DENIED (`hasOnly` check).
6. **Oversized text Denial-of-Wallet**: `uid1` creating `/users/uid1/messages/m1` with `text` of length 5000 (`> 2000`) -> DENIED.
7. **Client-spoofed timestamp**: `uid1` creating `/users/uid1/messages/m1` with backdated `createdAt` (`!= request.time`) -> DENIED.
8. **Invalid document ID poisoning**: `uid1` creating `/users/uid1/messages/bad$id..slash` -> DENIED (`isValidId`).
9. **Immutable owner mutation**: `uid1` updating `/users/uid1/contacts/c1` trying to change `ownerUid` or `createdAt` -> DENIED.
10. **Room PIN list scraping**: `uid1` running `list` on `/room_pins` -> DENIED (only `get` allowed).
11. **Non-member room message injection**: `uid2` (not in `rooms/r1.memberUids`) posting to `/rooms/r1/messages/m1` -> DENIED (Master Gate `get()`).
12. **Unbounded array injection on room**: `uid1` creating `/rooms/r1` with `memberUids.size() > 50` -> DENIED.
