# StudyConnect — Stream Chat Architecture & Integration Guide

## 1. Overview & Objectives

StudyConnect is migrating its real-time messaging layer to [GetStream Chat](https://getstream.io/chat/). 
The legacy custom chat infrastructure suffered from synchronization, state inconsistency, and delivery reliability challenges. Stream Chat provides battle-tested infrastructure, offline caching, edge CDN synchronization, and scalable WebSockets.

### Scope & Boundaries (Phase 1: Foundation & Authentication)
- **Primary Goal**: Establish authenticated identity derivation, token generation on the backend, a frontend client singleton, and a global React context provider with connection state management and automatic token renewal.
- **Strict Boundary**: Phase 1 implements foundation and authentication **only**. Messaging, channels, DMs, threads, reactions, pins, and calls are slated for subsequent migration phases.
- **Existing Systems**: Existing Socket.IO infrastructure is preserved for non-chat events and WebRTC signaling. Existing Mongo message models and UI components remain intact during Phase 1.

---

## 2. Credentials & Security Model

Stream Chat uses a two-tier credential model:
1. **Stream API Key (`STREAM_API_KEY` / `VITE_STREAM_API_KEY`)**:
   - Public identifier for the Stream Chat application (`53gz42z8uzan`).
   - Shared between frontend and backend.
2. **Stream API Secret (`STREAM_API_SECRET`)**:
   - Confidential cryptographic private key used to sign user JWTs and perform administrative actions.
   - Stored **strictly** on the backend in `backend/.env`.
   - **Never** exposed to the frontend, browser storage, API response payloads, or Git commits.

### Verification Matrix
| Location | Variable | Purpose | Security Level |
|---|---|---|---|
| `backend/.env` | `STREAM_API_KEY` | Server SDK init | Public |
| `backend/.env` | `STREAM_API_SECRET` | Token signing & user sync | **Confidential** |
| `web/.env` | `VITE_STREAM_API_KEY` | Client SDK connection | Public |
| Browser Storage | *None* | Tokens refreshed in-memory | Secure |

---

## 3. Deterministic User Identity Mapping

Stream Chat user IDs have strict character and length constraints (alphanumeric characters, underscores, and hyphens; maximum 64 characters). StudyConnect user identifiers are 24-character hex MongoDB `ObjectId`s.

To prevent ID namespace collisions and ensure deterministic mapping across the platform:
- **StudyConnect to Stream**: Prefix with `studyconnect_` (`studyconnect_${userId}`).
- **Stream to StudyConnect**: Strip the `studyconnect_` prefix.

### Helper Implementation (`backend/src/utils/stream-id.ts` & `web/src/utils/stream-id.ts`)
```typescript
export const STREAM_USER_ID_PREFIX = "studyconnect_";

export const toStreamUserId = (userId: string): string => {
  if (!userId) return "";
  const cleaned = String(userId).trim();
  if (cleaned.startsWith(STREAM_USER_ID_PREFIX)) return cleaned;
  return `${STREAM_USER_ID_PREFIX}${cleaned}`;
};

export const fromStreamUserId = (streamUserId: string): string => {
  if (!streamUserId) return "";
  const cleaned = String(streamUserId).trim();
  if (cleaned.startsWith(STREAM_USER_ID_PREFIX)) {
    return cleaned.slice(STREAM_USER_ID_PREFIX.length);
  }
  return cleaned;
};
```

---

## 4. Token Generation & Authentication Flow

Stream Chat requires a signed JWT token for every user connection. Tokens are generated strictly server-side upon authenticating the user's StudyConnect session.

```
┌─────────────────┐       1. Authenticate (Bearer Token)       ┌──────────────────────┐
│  React Client   │ ─────────────────────────────────────────> │ StudyConnect Backend │
│                 │                                            │ (/api/stream/token)  │
│                 │ <───────────────────────────────────────── │                      │
│                 │       2. { token, apiKey, user }           └──────────────────────┘
└─────────────────┘                                                        │
         │                                                                 │ 3. upsertUser()
         │ 4. client.connectUser(user, tokenProvider)                      │    createToken()
         ▼                                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                             Stream Chat Cloud Edge Network                          │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Flow Walkthrough
1. **Request**: The frontend sends a `GET /api/stream/token` request with the user's active StudyConnect access token in the `Authorization` header.
2. **Authentication Verification**: The backend `authenticate` middleware decodes the JWT and attaches the authenticated user record to `request.user`. If unauthenticated or suspended, a `401 Unauthorized` is returned.
3. **Identity Derivation**: The user ID is derived **solely from `request.user`**. The client cannot pass an arbitrary user ID.
4. **Profile Sync (Upsert)**: The backend calls `streamService.upsertStreamUser()` to synchronize the student's name, avatar, roll number, department, and role to Stream Chat.
5. **Token Signing**: The backend signs a Stream Chat token using `client.createToken(streamUserId)`.
6. **Response**: The signed token and mapped user metadata are returned to the frontend.

---

## 5. Frontend Architecture & Connection Lifecycle

### 5.1. Client Singleton (`stream-chat.service.ts`)
To prevent memory leaks and redundant WebSocket connections, the frontend uses a managed client singleton via `StreamChat.getInstance(apiKey)`.

### 5.2. `StreamChatProvider` (`web/src/providers/StreamChatProvider.tsx`)
The `StreamChatProvider` manages the complete connection lifecycle:
- **Connection States**:
  - `idle`: Unauthenticated or waiting for session initialization.
  - `connecting`: Establishing Stream connection and fetching token.
  - `connected`: Active WebSocket connection established with Stream edge.
  - `disconnected`: Logged out or explicitly disconnected.
  - `error`: Network or authentication failure.
- **Concurrency Guard (`connectingPromiseRef`)**:
  React 18 / 19 in StrictMode mounts components twice in development. An in-flight promise lock prevents concurrent duplicate calls to `connectUser()`.
- **Automatic Token Expiry Renewal**:
  Instead of passing a static token string to `connectUser()`, the provider passes an async `tokenProvider` function:
  ```typescript
  const tokenProvider = async (): Promise<string> => {
    const res = await streamApi.getStreamToken();
    return res.token;
  };

  await chatClient.connectUser(userData, tokenProvider);
  ```
  Stream's JavaScript SDK automatically invokes this callback before token expiration, refreshing the session seamlessly without user interruption or custom polling timers.
- **Automatic Disconnect on Logout**:
  When `useAuthStore` detects user logout (`user === null`), `StreamChatProvider` immediately invokes `client.disconnectUser()` and resets connection state.

### 5.3. Hook Consumption (`useStreamChat.ts`)
Components throughout the application consume Stream context with:
```tsx
const { client, connectionStatus, streamUser, error, reconnect, disconnect } = useStreamChat();
```

---

## 6. Phase 2 — DM & Community Channel Architecture

### 6.1. Deterministic Channel Identification
Stream Chat channel IDs are limited to 64 characters and must consist only of alphanumeric characters, hyphens, and underscores. StudyConnect guarantees deterministic, collision-free channel IDs:

1. **Direct Messages (DMs)**:
   - Evaluated as `toStreamDmChannelId(userIdA, userIdB)`:
   - Lexicographically sorts the two 24-character hexadecimal IDs: `dm_${sorted[0]}_${sorted[1]}`.
   - Total length is exactly 52 characters (safely below the 64-character limit).
   - Invariant: `toStreamDmChannelId(userA, userB) === toStreamDmChannelId(userB, userA)`.

2. **Community Channels**:
   - Evaluated as `toStreamCommunityChannelId(communityId, channelKey)`:
   - Slugs the channel key (`[a-z0-9-_]`) to a maximum of 30 characters.
   - Format: `comm_${communityId}_${slugKey}` (maximum length 56 characters).

### 6.2. 4-Tier Community Channel Architecture
Every StudyConnect community automatically provisions the 4 core tiers on Stream Chat upon first access or creation:

| Tier | Default Channels | Channel Type | Strict Study Mode | Default Permissions |
|---|---|---|---|---|
| **Announcements** | `announcements` | Announcement | Yes | Read-only for students; Moderated by Owner/Mods |
| **Focus Rooms** | `general-study`, `code-review` | Text | Yes | Open discussion for community members |
| **Campus Watercooler** | `campus-watercooler` | Text | No | Casual social chatter, study break banter |
| **Voice Stages** | `live-study-stage` | Voice | No | Drop-in audio/screen sharing stage metadata |

### 6.3. Role Mapping & Membership Synchronization
StudyConnect community roles map directly to Stream Channel member roles:
- **Community Owner, Moderator, & System Admin** -> Stream `channel_moderator`
- **Community Member (Student)** -> Stream `channel_member`

Whenever a user joins, leaves, or is promoted in a StudyConnect community:
- `community.service.ts` triggers `streamService.addMemberToCommunityChannels()` or `removeMemberFromCommunityChannels()`.
- Stream channels receive real-time membership synchronization without requiring full database crawls.

### 6.4. Direct Message Safety & Moderation
- **Bidirectional Blocking**: Before generating a Stream DM channel, the backend executes `blockService.isBlocked(userA, userB)`. If either user blocked the other, the request is rejected with `403 Forbidden` (`BLOCKED_USER`).
- **Self-DM Prevention**: Attempting to start a DM with oneself returns `422 Unprocessable Entity` (`SELF_DM_FORBIDDEN`).
- **Idempotency**: Calling `POST /api/stream/dms` multiple times for the same pair returns the same deterministic channel.

### 6.5. Frontend Hooks & Navigation Integration
- `useStreamDMs`: Queries user's Stream DMs with `{ studyConnectType: "dm", members: { $in: [userId] } }`, watches for real-time events (`message.new`, `notification.added_to_channel`), and transforms channels to `ConversationItem[]` for `ConversationList`.
- `useStreamCommunityChannels`: Fetches and synchronizes community channels, categorizes channels into the 4 tiers, and provides `createChannel` for privileged community members.
- `chat.page.tsx`: Uses Stream Chat channels as the primary source of truth for both DM and Community views, showing real-time status indicators and active channel metadata.

---

## 7. Verification & Migration Roadmap

### Phase 1 Verification Checklist (Completed)
- [x] Stream credentials properly configured in `.env` files and validated via Zod env schema.
- [x] Stream secret key strictly quarantined to the backend.
- [x] Deterministic `studyconnect_<id>` user mapping implemented and tested.
- [x] `GET /api/stream/token` endpoint verified with integration tests (401 on unauthenticated, 200 with valid JWT on authenticated).
- [x] Frontend `StreamChatProvider` and `useStreamChat` hook initialized.
- [x] In-memory token provider configured for automatic token renewal.
- [x] Lightweight Phase 1 Connection Status Page at `/stream-chat`.
- [x] All 18 backend test suites (179 tests) passing cleanly.

### Phase 2 Verification Checklist (Completed)
- [x] Deterministic channel ID helpers (`toStreamDmChannelId`, `toStreamCommunityChannelId`).
- [x] DM Channel creation/retrieval API (`POST /api/stream/dms`) with bidirectional blocking check and self-DM prevention.
- [x] Community channel provisioning API (`GET /api/stream/communities/:id/channels`) with 4-tier model.
- [x] Privileged community channel creation (`POST /api/stream/communities/:id/channels`).
- [x] Community membership synchronization on join, leave, promote, and remove.
- [x] Role mapping: `channel_moderator` vs `channel_member`.
- [x] Frontend `useStreamDMs` and `useStreamCommunityChannels` hooks.
- [x] Frontend chat navigation wired with Stream DMs and community channels in `chat.page.tsx`.
- [x] 10/10 backend integration tests in `stream-channels.test.ts` passing.
- [x] All 19 backend test suites (189 tests) passing cleanly.

### Subsequent Phases
- **Phase 3 — Core Messaging Experience**: Message sending, delivery states, read receipts, reactions, replies/threads, editing, deletion, stars, pins, media uploads, voice messages.
- **Phase 4 — Advanced Features & Final Deprecation**: Voice stage calling, message search, export, and deprecation of legacy custom chat models.
