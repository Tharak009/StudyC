# Direct Messaging Module

## Architecture

The Direct Messaging module enables private one-to-one real-time communication between authenticated users.

### Backend Layered Architecture

```
Routes → Middleware → Controller → Service → Repository → Mongoose Model
                                    ↕
                              Socket.IO Events
```

### Key Files

| Layer | File |
|-------|------|
| Model | `backend/src/models/conversation.model.ts` |
| Model | `backend/src/models/direct-message.model.ts` |
| Repository | `backend/src/repositories/conversation.repository.ts` |
| Repository | `backend/src/repositories/direct-message.repository.ts` |
| Service | `backend/src/services/direct-message.service.ts` |
| Service | `backend/src/services/presence.service.ts` |
| Service | `backend/src/services/dm-bus.service.ts` |
| Controller | `backend/src/controllers/direct-message.controller.ts` |
| Validator | `backend/src/validators/direct-message.validator.ts` |
| Routes | `backend/src/routes/direct-message.routes.ts` |
| Socket Handlers | `backend/src/sockets/index.ts` |

---

## Database Design

### Conversation

| Field | Type | Description |
|-------|------|-------------|
| `participants` | `ObjectId[]` → User | Exactly 2 users |
| `lastMessage` | `{ content, senderId, createdAt }` | Preview of most recent message |
| `lastMessageAt` | `Date` | Sort key for conversation list |

Index: `{ participants: 1 }`, `{ lastMessageAt: -1 }`

### DirectMessage

| Field | Type | Description |
|-------|------|-------------|
| `conversationId` | `ObjectId` → Conversation | Parent conversation |
| `senderId` | `ObjectId` → User | Message sender |
| `content` | `String` (max 2000) | Text content |
| `messageType` | `TEXT \| IMAGE \| PDF \| DOCUMENT` | Derived from attachments |
| `attachments` | `[{ key, url, originalName, mimeType, size }]` | Uploaded files |
| `replyTo` | `ObjectId` → DirectMessage | Optional parent message |
| `edited` | `Boolean` | Edited flag |
| `read` | `Boolean` | Read receipt |
| `readAt` | `Date` | When message was read |
| `deleted` | `Boolean` | Soft delete |

Indexes: `{ conversationId: 1, createdAt: -1 }`, `{ conversationId: 1, read: 1 }`

---

## REST API

All endpoints require `Authorization: Bearer <token>` header.
Rate limit: 300 requests per 15-minute window.

### Conversations

#### `POST /api/direct-messages/conversations`

Start or retrieve existing conversation.

```json
// Request
{ "receiverId": "507f1f77bcf86cd799439011" }

// Response 201
{ "success": true, "data": { "_id": "...", "participants": [...], "lastMessage": null, "lastMessageAt": null } }
```

#### `GET /api/direct-messages/conversations`

List authenticated user's conversations.

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 50) |
| `search` | string | — | Search by conversation context |

#### `GET /api/direct-messages/conversations/unread`

Get total unread message count.

#### `GET /api/direct-messages/conversations/:conversationId`

Get single conversation with populated participants.

### Messages

#### `GET /api/direct-messages/conversations/:conversationId/messages`

Get paginated message history.

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 30 | Items per page (max 50) |
| `order` | `latest \| oldest` | `latest` | Sort direction |
| `search` | string | — | Search message content (regex) |

#### `POST /api/direct-messages/conversations/:conversationId/messages`

Send a message. Accepts `multipart/form-data`.

| Field | Type | Required |
|-------|------|----------|
| `content` | string | No (required if no attachments) |
| `replyTo` | string (ObjectId) | No |
| `attachments` | File[] | No (max 5, max 5MB each) |

Allowed attachment types: JPEG, PNG, WebP, PDF, DOC, DOCX, TXT

#### `PUT /api/direct-messages/messages/:id`

Edit own message.

```json
// Request
{ "content": "Updated content" }

// Response 200
{ "success": true, "data": { ...message, edited: true, editedAt: "..." } }
```

#### `DELETE /api/direct-messages/messages/:id`

Soft-delete own message.

#### `POST /api/direct-messages/messages/read`

Mark all unread messages in a conversation as read.

```json
// Request
{ "conversationId": "507f1f77bcf86cd799439011" }
```

---

## Socket.IO Events

Namespace: default (same as community chat)
Authentication: `auth: { token: "<access_token>" }`

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `startConversation` | `{ receiverId }` | Find or create conversation and join room |
| `joinConversation` | `{ conversationId }` | Join conversation room for real-time events |
| `leaveConversation` | `{ conversationId }` | Leave conversation room |
| `sendDirectMessage` | `{ conversationId, content, replyTo? }` | Send text message |
| `editDirectMessage` | `{ conversationId, messageId, content }` | Edit own message |
| `deleteDirectMessage` | `{ conversationId, messageId }` | Delete own message |
| `markAsRead` | `{ conversationId, messageId? }` | Mark messages as read |
| `typingStart` | `{ conversationId }` | User started typing |
| `typingStop` | `{ conversationId }` | User stopped typing |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `conversationCreated` | `Conversation` | New conversation created |
| `directMessageCreated` | `DirectMessage` | New message in joined conversation |
| `directMessageUpdated` | `DirectMessage` | Message edited |
| `directMessageDeleted` | `DirectMessage` | Message deleted |
| `messageRead` | `{ conversationId, readAt }` | Messages read by other participant |
| `userOnline` | `{ userId }` | User came online |
| `userOffline` | `{ userId, lastSeen }` | User went offline |
| `userTyping` | `{ conversationId, userId }` | Other user is typing |
| `userStoppedTyping` | `{ conversationId, userId }` | Other user stopped typing |

### Room Naming

- Conversations: `dm:{conversationId}`
- Presence: `user:{userId}`

---

## Presence System

The presence service runs on a separate Socket.IO path `/ws/presence`. It tracks online/offline status with a 60-second TTL and emits `userOnline`/`userOffline` events.

The main Socket.IO server also forwards `friendOnline`/`friendOffline` events so DM pages can show real-time status.

---

## Read Receipts

Messages have three implicit states:
1. **Sent** — Message is persisted to MongoDB
2. **Delivered** — Message reaches the conversation room via Socket.IO
3. **Read** — Recipient emits `markAsRead` which sets `read: true` and `readAt`

---

## WebRTC Future Preparation

The socket architecture includes placeholder entries for voice/video signaling:

```typescript
export const futureSocketModules = [
  "community-chat",
  "direct-message-gateway",
  "voice-signaling-gateway",
  "video-signaling-gateway"
] as const;
```

Planned event contracts (not implemented):
- `client:startCall`, `client:callSignal`, `client:endCall`
- `server:callStarted`, `server:callSignal`, `server:callEnded`
- `CallSession` model with fields: `participants`, `type` (VOICE|VIDEO), `status`, `startedAt`, `endedAt`
