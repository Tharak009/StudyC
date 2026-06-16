# StudyConnect Phase 3 Community Chat

## 1. Chat Architecture

Community Chat is split into three boundaries:

- REST API for message history and multipart attachment messages.
- Socket.IO gateway for real-time text messages, edits, deletes, typing, presence, and room lifecycle.
- `chatBus` broadcaster so REST-created attachment messages can publish into the same community socket room.

Only community members can read or participate in chat. The gateway authenticates with the existing JWT access token and checks membership before joining rooms or accepting chat events.

Future socket modules are reserved as separate gateways:

- `direct-message-gateway`
- `voice-signaling-gateway`
- `video-signaling-gateway`

## 2. Socket Event Design

Client to server:

| Event | Payload | Purpose |
|---|---|---|
| `joinCommunity` | `{ communityId }` | Join `community:<id>` room after membership check |
| `leaveCommunity` | `{ communityId }` | Leave room and update presence |
| `sendMessage` | `{ communityId, content, replyTo? }` | Persist and broadcast a text message |
| `editMessage` | `{ communityId, messageId, content }` | Edit sender-owned message |
| `deleteMessage` | `{ communityId, messageId }` | Delete own message, or any message as owner/moderator |
| `typingStart` | `{ communityId }` | Broadcast typing state |
| `typingStop` | `{ communityId }` | Clear typing state |

Server to client:

| Event | Purpose |
|---|---|
| `messageCreated` | New persisted message |
| `messageUpdated` | Edited message |
| `messageDeleted` | Soft-deleted message |
| `userTyping` | Member typing indicator |
| `userStoppedTyping` | Typing indicator cleared |
| `userJoined` | Presence update |
| `userLeft` | Presence update |
| `chatError` | Socket event failure |

## 3. Database Design

`messages`

- `communityId`: community reference
- `senderId`: user reference
- `content`: max 2000 characters
- `messageType`: `TEXT`, `IMAGE`, `PDF`, `DOCUMENT`
- `attachments`: stored file metadata
- `replyTo`: optional message reference
- `edited`, `editedAt`
- `deleted`, `deletedAt`
- `createdAt`, `updatedAt`

Indexes:

- `{ communityId: 1, createdAt: -1, _id: -1 }` for paginated history.
- `{ replyTo: 1 }` for reply lookups.

## 4. Backend Implementation

REST:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/communities/:communityId/messages` | Paginated history |
| `POST` | `/api/communities/:communityId/messages` | Multipart message with attachments |

History query:

- `page`: default `1`
- `limit`: default `30`, max `50`
- `order`: `latest` or `oldest`

Attachment support uses `StorageService.uploadChatAttachment()` and accepts images, PDFs, Word documents, and text files. Video uploads are intentionally not supported.

## 5. Frontend Implementation

The web app includes:

- Community Chat page at `/communities/:id/chat`
- Chat window with paginated older-message loading
- Message bubbles with reply, edit, delete, edited/deleted states, and attachments
- Message input with attachment selection and reply/edit context
- Typing indicator
- Online members panel
- Connection status indicator

## 6. Testing Strategy

Backend tests cover:

- REST message persistence and latest-first history
- Service-level membership enforcement
- Socket.IO authentication, room join, send, and real-time broadcast

Frontend tests keep route/auth behavior covered. The chat UI is build-verified and linted; future UI tests should mock `socket.io-client` and assert event-driven message insertion, edit, delete, typing, and presence states.

## 7. README Updates

The main README now lists Phase 3 routes, socket events, message storage, and run commands.
