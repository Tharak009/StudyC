# StudyConnect

StudyConnect is a production-oriented foundation for a college-exclusive collaboration platform. Phase 1 delivered identity and profiles, Phase 2 activated academic communities, and Phase 3 adds community-scoped real-time chat with persisted messages and member-only participation.

## 1. Architecture

The repository is an npm workspace with two deployable applications:

- `backend`: TypeScript, Node.js, Express, MongoDB, Mongoose, and Socket.IO.
- `web`: TypeScript, React, Vite, Tailwind CSS, React Router, Axios, Zustand, TanStack Query, and Socket.IO Client.

The backend follows route → controller → service → repository → model boundaries. Business rules live in services. The browser stores access tokens only in memory and persists authentication through rotating `httpOnly` refresh cookies. Future React Native clients can use the same API and request refresh credentials in JSON with `X-Client-Platform: mobile`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for diagrams and trust boundaries.

## 2. Folder Structure

```text
studyconnect/
├── backend/
│   ├── src/
│   │   ├── config/ constants/ controllers/ services/
│   │   ├── repositories/ routes/ validators/ middlewares/
│   │   ├── models/ sockets/ uploads/ utils/ types/
│   │   ├── app.ts
│   │   └── server.ts
│   └── tests/
├── web/
│   └── src/
│       ├── api/ components/ pages/ layouts/ routes/
│       ├── hooks/ store/ services/ utils/ styles/ types/
│       ├── app.tsx
│       └── main.tsx
└── docs/
```

## 3. Database Design

### Active Collections

`users`

- Unique `email` and `rollNumber`
- Profile fields, role, status, last login, password reset metadata
- Password and reset hashes are excluded from normal queries

`refreshtokens`

- Unique JWT ID and SHA-256 token hash
- User reference, expiry, revocation, rotation replacement, client metadata
- MongoDB TTL index removes expired records

`communities`

- Unique `name` and generated unique `slug`
- Description, category, tags, visibility, banner image, owner, moderators, and member count
- `extensionPoints` reserves future chat, resources, and notifications attachment flags

`communitymembers`

- Unique community/user membership pair
- Role-based membership: `OWNER`, `MODERATOR`, `MEMBER`
- `joinedAt` tracks membership history start

`messages`

- Community/user linked persisted chat messages
- `TEXT`, `IMAGE`, `PDF`, and `DOCUMENT` message types
- Attachment metadata, replies, edit state, and soft-delete state
- Indexed by community and creation time for paginated history

### Placeholder Collections

`messages`, `directmessages`, `resources`, `notifications`, and `reports` define future relationships only. No Phase 2 service, controller, or behavior uses them.

## 4. API Design

All responses use `{ success, data, message }`. Errors add `{ code, errors }`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register approved college email |
| POST | `/api/auth/login` | Public | Authenticate and create session |
| POST | `/api/auth/logout` | Public/idempotent | Revoke refresh session |
| POST | `/api/auth/refresh-token` | Refresh credential | Rotate session |
| POST | `/api/auth/change-password` | Access token | Change password and revoke sessions |
| POST | `/api/auth/forgot-password` | Public | Generate reset workflow |
| POST | `/api/auth/reset-password` | Reset token | Set a new password |
| GET | `/api/users/profile` | Access token | Read own profile |
| PUT | `/api/users/profile` | Access token | Update allowed profile fields |
| POST | `/api/users/profile-picture` | Access token | Upload JPEG, PNG, or WebP |
| POST | `/api/communities` | Access token | Create a community |
| GET | `/api/communities` | Access token | Search, filter, and paginate communities |
| GET | `/api/communities/:id` | Access token | View community details |
| PUT | `/api/communities/:id` | Owner | Edit community |
| DELETE | `/api/communities/:id` | Owner | Delete community |
| POST | `/api/communities/:id/join` | Access token | Join community |
| POST | `/api/communities/:id/leave` | Member | Leave community |
| GET | `/api/communities/:id/members` | Member | View members |
| POST | `/api/communities/:id/moderators` | Owner | Add moderator |
| DELETE | `/api/communities/:id/moderators/:userId` | Owner | Remove moderator |
| DELETE | `/api/communities/:id/members/:userId` | Owner/moderator | Remove member |
| GET | `/api/communities/:communityId/messages` | Member | Paginated message history |
| POST | `/api/communities/:communityId/messages` | Member | Create attachment message |
| GET | `/health` | Public | Health probe |

Use `Authorization: Bearer <accessToken>` for protected endpoints. The web refresh token is read from `studyconnect_refresh`; mobile may send `{ "refreshToken": "..." }`.

See [docs/COMMUNITIES_API.md](docs/COMMUNITIES_API.md) for the Phase 2 community API contract.
See [docs/COMMUNITY_CHAT.md](docs/COMMUNITY_CHAT.md) for the Phase 3 chat architecture and socket event contract.

Socket.IO client events:

- `joinCommunity`
- `leaveCommunity`
- `sendMessage`
- `editMessage`
- `deleteMessage`
- `typingStart`
- `typingStop`

Socket.IO server events:

- `messageCreated`
- `messageUpdated`
- `messageDeleted`
- `userTyping`
- `userStoppedTyping`
- `userJoined`
- `userLeft`

## 5. Backend Code

The API includes:

- Environment validation with Zod
- Helmet, strict CORS, request limits, rate limiting, HPP, and input sanitization
- Strong password validation and bcrypt hashing
- JWT access/refresh separation and refresh-token rotation
- Status-aware authentication and reusable RBAC middleware
- Multer memory uploads through `StorageService`
- Working `LocalStorageProvider` and Cloudinary/AWS provider interfaces
- Community creation, discovery, join/leave, member list, owner edits, moderator promotion, and member removal
- Community chat history, Socket.IO rooms, message persistence, edits, soft deletes, typing, presence, and attachment messages
- Generic forgot-password responses to prevent account enumeration
- Central `ApiResponse`, `ApiError`, `asyncHandler`, and error middleware

The default email service logs reset tokens only outside production. Replace it with a transactional email provider before deploying password reset publicly.

## 6. Frontend Code

The web app includes:

- Login, registration, dashboard, and editable profile pages
- Communities list, details, create, edit, and members pages
- Community chat page with real-time updates, message actions, replies, attachment preview, typing, and online members
- Protected/public route gates and refresh-cookie bootstrap
- A single-flight Axios refresh interceptor
- Zustand session and persisted dark-mode state
- TanStack Query mutations and cache integration
- Profile-picture upload, responsive navigation, loading, empty, and error states
- Community search, pagination, category filters, join/leave controls, banner uploads, and moderation actions
- Socket connection status, infinite-style older-message loading, and member-only chat controls
- Accessible inputs, visible focus states, reduced-motion support, and mobile layouts

## 7. Testing Setup

Backend tests use Vitest, Supertest, Socket.IO Client, and MongoDB Memory Server. Web tests use Vitest, Testing Library, and JSDOM. Community integration tests cover creation, unique names, joining, member listing, and owner-only moderator promotion. Chat integration tests cover REST persistence/history, service membership enforcement, and Socket.IO broadcast.

```bash
npm test
npm run build
npm run lint
```

MongoDB Memory Server may download a MongoDB binary on its first run.

## 8. Environment

Copy the templates:

```bash
cp backend/.env.example backend/.env
cp web/.env.example web/.env
```

On PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item web/.env.example web/.env
```

Use independent, random JWT secrets in production and set `COOKIE_SECURE=true` behind HTTPS. `APPROVED_EMAIL_DOMAINS` accepts a comma-separated allowlist.

For local web development, leave `VITE_API_URL` and `VITE_SOCKET_URL` empty so Vite proxies `/api`, `/uploads`, and `/socket.io` to `http://localhost:5000`. In production, set both values to the deployed API origin unless your reverse proxy serves the API and Socket.IO from the same origin as the web app.

## 9. Runbook

Prerequisites: Node.js 20+ and MongoDB 7+.

```bash
npm install
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:5000`
- Health: `http://localhost:5000/health`

For production:

```bash
npm run build
npm run start -w backend
```

Serve `web/dist` from a static host and route `/api` and `/uploads` to the backend. Local disk uploads are suitable for single-instance development; select an object-storage provider before horizontal deployment.
