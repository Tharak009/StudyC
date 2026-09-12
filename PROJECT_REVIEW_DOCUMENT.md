# StudyConnect — Comprehensive Technical Review & Architecture Master Document

> **Document Purpose**: This document provides an exhaustive, highly detailed technical breakdown of the entire **StudyConnect** codebase, architecture, database schemas, API contracts, real-time protocols, dual-backend implementations, frontend SPA, mobile client, and deployment configurations. It is designed to allow any reviewer or AI system (e.g., ChatGPT) to understand every single feature, data flow, security boundary, and implementation detail without missing any information.

---

## 1. Executive Summary & System Overview

**StudyConnect** is a production-grade, college-exclusive academic collaboration and communication platform designed to unify student communities, real-time chat, direct messaging, academic resource sharing, event management, and administrative moderation into a cohesive digital ecosystem.

### Core Value Propositions & Capability Highlights
- **College Domain Isolation**: Authentication requires an approved institutional email domain (e.g., `@campus.edu`, `@college.edu`).
- **Academic Communities (Study Groups/Channels)**: Public or private student communities with role-based member permissions (`OWNER`, `MODERATOR`, `MEMBER`), slug-based URLs, tag classification, and banner media uploads.
- **Real-Time Community Chat Engine**: Socket.IO room-based messaging supporting text, images, PDFs, document attachments, message replies, inline message editing, soft deletion, typing indicators, and room presence.
- **1-on-1 Direct Messaging & Presence**: Private encrypted-style direct messaging between students with instant read receipts, unread badges, typing indicators, file attachments, and a dedicated presence tracking system.
- **Academic Resource Sharing Hub**: Scoped to communities or public access, with file categorization (`NOTES`, `ASSIGNMENTS`, `PREVIOUS_PAPERS`, `PPTS`, `LAB_RECORDS`, `QUESTION_BANKS`), search/tag filtering, and automated download counting.
- **Real-Time Notification Hub**: Multi-channel notification engine delivering real-time WebSocket updates and persistent REST records for community joins, direct messages, resource uploads, mentions, and administrative alerts.
- **Admin Portal & Content Moderation Suite**: Full administrative dashboard featuring live platform metrics, user management (ban, suspend, unban, delete), community/resource deletion overrides, content report resolution pipeline (`PENDING`, `REVIEWED`, `RESOLVED`, `REJECTED`), and immutable audit logging.
- **Friendship & Social Networking**: Friend requests, acceptance/rejection workflows, connection rosters, and social graph indexing.
- **Student Events & Workshop Calendar**: Creation, discovery, registration, calendar visualizer, and management of campus hackathons, workshops, and tech fests.
- **Automated Academic Text Classifier**: Intelligent taxonomy service for automatic subject mapping and tag recommendations.
- **Dual-Backend Parity Architecture**: Complete, parallel implementations in **TypeScript (Node.js/Express)** and **Java 21 (Spring Boot 3.x)** maintaining 100% route, data model, and real-time protocol parity.
- **Multi-Platform Web & Mobile Clients**: Production **React 19 SPA** (with Vite and Tailwind CSS) and a cross-platform **React Native / Expo** mobile application.

---

## 2. Monorepo Repository Structure

The project is structured as an npm workspace with dedicated sub-applications and documentation repositories:

```text
StudyC/
├── backend/                             # Primary Node.js / Express / TypeScript Backend
│   ├── src/
│   │   ├── config/                      # Environment variables, database, CORS configuration
│   │   ├── constants/                   # Roles, categories, notification types, system constants
│   │   ├── controllers/                 # HTTP Request Handlers (Auth, User, Community, Chat, DM, etc.)
│   │   ├── middlewares/                 # Auth, RBAC, Admin guard, Rate limit, Upload, Audit, Error, Sanitize
│   │   ├── models/                      # Mongoose Schema definitions & TypeScript Interfaces (14 models)
│   │   ├── repositories/                # Database Access Layer / Abstractions (12 repositories)
│   │   ├── routes/                      # Express Route definitions & mount points
│   │   ├── services/                    # Business Logic, Room Orchestration, Bus services (17 services)
│   │   ├── sockets/                     # Socket.IO Gateway Handlers (Chat, DM, Presence, Voice, Admin)
│   │   ├── types/                       # Global ambient TypeScript definitions & interfaces
│   │   ├── uploads/                     # Local file storage target for development uploads
│   │   ├── utils/                       # JWT helpers, Async wrappers, API Error/Response formatters
│   │   ├── validators/                  # Zod input validation schemas for all requests
│   │   ├── app.ts                       # Express application assembly & global middleware configuration
│   │   └── server.ts                    # HTTP server startup, Socket.IO binding, DB connection
│   ├── tests/                           # Vitest integration test suite (MongoDB Memory Server)
│   └── package.json                     # Backend dependencies & script definitions
│
├── backend-java/                        # Migration Spring Boot 3.x / Java 21 Backend
│   ├── src/main/java/com/studyconnect/backend/
│   │   ├── config/                      # Spring Security, CORS, WebSocket STOMP configuration
│   │   ├── controller/                  # Spring MVC @RestController endpoints
│   │   ├── dto/                         # Request/Response Data Transfer Objects
│   │   ├── entity/                      # JPA / Hibernate Entity models with annotations
│   │   ├── mapper/                      # Entity <-> DTO conversion mappers
│   │   ├── repository/                  # Spring Data JPA Repository interfaces
│   │   ├── security/                    # JWT Authentication Filter, UserDetailsService, Token Provider
│   │   ├── service/                     # Service interface implementations & transaction management
│   │   └── websocket/                   # Spring STOMP WebSocket Message Handlers
│   ├── MIGRATION_REPORT.md              # Overall Java migration status
│   ├── ROUTE_PARITY_CHECKLIST.md        # Route-by-route parity verification document
│   ├── PHASE_2_AUTH_SECURITY_REPORT.md  # Phase 2 migration audit report
│   ├── ...                              # Phase 3 to Phase 10 migration audit reports
│   └── pom.xml                          # Maven build configuration & dependencies
│
├── web/                                 # Production React 19 + Vite Web Application
│   ├── src/
│   │   ├── api/                         # Axios instance, API endpoints, refresh interceptors
│   │   ├── components/                  # Reusable UI components (67+ components across 14 subfolders)
│   │   │   ├── admin/                   # Moderation, User tables, Analytics, Reports components
│   │   │   ├── chat/                    # Chat window, Message bubbles, Input, Online members
│   │   │   ├── dm/                      # Direct Message list, Conversation drawers, Read receipts
│   │   │   ├── events/                  # Calendar view, Event modals, Registration components
│   │   │   ├── notification/            # Notification bell, Dropdown, Hub, List, Cards
│   │   │   └── resources/               # Resource grid, Cards, Upload forms, Category filters
│   │   ├── hooks/                       # Custom React hooks (useAuth, useSocket, useNotifications, etc.)
│   │   ├── layouts/                     # Dashboard Layout, Admin Layout, Auth Layout, Root Layout
│   │   ├── pages/                       # 38 full SPA pages (Dashboard, Admin, Chat, DM, Resources, etc.)
│   │   ├── store/                       # Zustand state management stores (auth, theme, notification, dm)
│   │   ├── styles/                      # Tailwind CSS entrypoint, custom design tokens, global rules
│   │   ├── types/                       # Frontend TypeScript domain interfaces
│   │   ├── app.tsx                      # React Router v7 routes & layout wrapper setup
│   │   └── main.tsx                     # Application entry point, QueryClientProvider, Root mount
│   └── package.json                     # Frontend dependencies (React 19, Vite, Tailwind, Zustand)
│
├── mobile/                              # React Native / Expo Mobile Application
│   ├── src/
│   │   ├── api/                         # Axios client configured with `X-Client-Platform: mobile`
│   │   ├── components/                  # Mobile-optimized UI components & cards
│   │   ├── config/                      # API URLs, Socket host configurations
│   │   ├── features/                    # Redux slices / modular feature logic
│   │   ├── navigation/                  # React Navigation v6 Stack & Tab Navigators
│   │   ├── screens/                     # Mobile screens (Auth, Communities, Chat, DM, Notifications)
│   │   └── services/                    # Socket.IO & Secure storage integration
│   └── package.json                     # React Native dependencies
│
├── StudyConnect Web UI Design/          # UI Design System & Component Reference Showcase
│   ├── default_shadcn_theme.css        # Master design system color variables & CSS tokens
│   └── package.json                     # Showcase application config
│
├── docs/                                # System Architecture & Technical Specifications
│   ├── ARCHITECTURE.md                  # High-level architecture, trust boundaries, system context
│   ├── COMMUNITIES_API.md               # Community REST API specifications
│   ├── COMMUNITY_CHAT.md                # Real-time community chat & Socket.IO contracts
│   ├── direct-messaging.md              # Private 1-on-1 messaging & presence specification
│   ├── notification-admin.md            # Notification engine & Admin moderation spec
│   └── resource-sharing.md              # Academic resource sharing specification
│
├── render.yaml                          # Render Infrastructure-as-Code Blueprint spec
├── package.json                         # Workspace parent package.json
└── README.md                            # Comprehensive developer documentation & runbook
```

---

## 3. Core Database Schemas & Data Models

StudyConnect uses MongoDB with Mongoose ODM (in Node.js) and PostgreSQL/MongoDB with Spring Data JPA/MongoDB (in Java). Below are the full schema definitions, field types, validation constraints, and database indexes across all collections.

### 3.1 `users` Collection
Stores student identity, profile information, authentication credentials, and system roles.
- `_id`: `ObjectId` (Primary Key)
- `email`: `String` (Required, Unique, Lowercase, Trimmed, validated against `APPROVED_EMAIL_DOMAINS`)
- `password`: `String` (Required, Bcrypt hash with 12 rounds, excluded from default queries)
- `fullName`: `String` (Required, Max 100 characters)
- `rollNumber`: `String` (Required, Unique, Uppercase)
- `department`: `String` (Required, e.g., "Computer Science", "Electrical Engineering")
- `yearOfStudy`: `Number` (Required, Range: 1 to 5)
- `bio`: `String` (Optional, Max 500 characters)
- `skills`: `[String]` (Optional, Array of skill tags)
- `socialLinks`: `Object`
  - `github`: `String` (Optional)
  - `linkedin`: `String` (Optional)
  - `website`: `String` (Optional)
- `profilePicture`: `String` (Optional, Relative upload path or cloud URL)
- `role`: `String` (Enum: `STUDENT`, `MODERATOR`, `COMMUNITY_ADMIN`, `ADMIN`; Default: `STUDENT`)
- `status`: `String` (Enum: `ACTIVE`, `DEACTIVATED`, `SUSPENDED`; Default: `ACTIVE`)
- `lastLoginAt`: `Date` (Nullable)
- `passwordResetTokenHash`: `String` (Optional, Excluded from queries)
- `passwordResetExpiresAt`: `Date` (Optional, Excluded from queries)
- `createdAt`, `updatedAt`: `Date` (Timestamps)
- **Indexes**: `{ email: 1 }` (Unique), `{ rollNumber: 1 }` (Unique), `{ role: 1 }`, `{ status: 1 }`

### 3.2 `refreshtokens` Collection
Tracks rotating refresh tokens for multi-device authentication and session revocation.
- `_id`: `ObjectId` (Primary Key)
- `jti`: `String` (Required, Unique JWT Identifier)
- `userId`: `ObjectId` (Ref: `User`, Required)
- `tokenHash`: `String` (Required, SHA-256 hash of refresh token string)
- `expiresAt`: `Date` (Required, Expires in 7 days)
- `isRevoked`: `Boolean` (Default: `false`)
- `replacedByTokenHash`: `String` (Optional, Used for token rotation detection)
- `clientPlatform`: `String` (Enum: `web`, `mobile`; Default: `web`)
- `userAgent`: `String` (Optional)
- `ipAddress`: `String` (Optional)
- `createdAt`, `updatedAt`: `Date` (Timestamps)
- **Indexes**: `{ jti: 1 }` (Unique), `{ tokenHash: 1 }` (Unique), `{ expiresAt: 1 }` (MongoDB TTL Index for auto-cleanup), `{ userId: 1, isRevoked: 1 }`

### 3.3 `communities` Collection
Defines academic groups, channels, and study circles.
- `_id`: `ObjectId` (Primary Key)
- `name`: `String` (Required, Unique, Trimmed, Max 100 characters)
- `slug`: `String` (Required, Unique, Lowercase, Auto-generated from name with unique suffix)
- `description`: `String` (Required, Max 1000 characters)
- `category`: `String` (Enum: `ACADEMIC`, `PROJECT`, `CLUB`, `GENERAL`, `STUDY_GROUP`, `DEPARTMENT`)
- `tags`: `[String]` (Array of tags, max 10 tags)
- `visibility`: `String` (Enum: `PUBLIC`, `PRIVATE`; Default: `PUBLIC`)
- `bannerImage`: `String` (Optional, File path or URL)
- `ownerId`: `ObjectId` (Ref: `User`, Required)
- `memberCount`: `Number` (Default: 1, Automatically updated on join/leave)
- `extensionPoints`: `Object`
  - `chatEnabled`: `Boolean` (Default: `true`)
  - `resourcesEnabled`: `Boolean` (Default: `true`)
  - `notificationsEnabled`: `Boolean` (Default: `true`)
- `createdAt`, `updatedAt`: `Date` (Timestamps)
- **Indexes**: `{ slug: 1 }` (Unique), `{ name: 1 }` (Unique), `{ category: 1 }`, `{ ownerId: 1 }`, Text index on `{ name: "text", description: "text", tags: "text" }`

### 3.4 `communitymembers` Collection
Join table tracking community membership and role assignments.
- `_id`: `ObjectId` (Primary Key)
- `communityId`: `ObjectId` (Ref: `Community`, Required)
- `userId`: `ObjectId` (Ref: `User`, Required)
- `role`: `String` (Enum: `OWNER`, `MODERATOR`, `MEMBER`; Default: `MEMBER`)
- `joinedAt`: `Date` (Default: `Date.now`)
- **Indexes**: `{ communityId: 1, userId: 1 }` (Compound Unique Index), `{ userId: 1 }`, `{ communityId: 1, role: 1 }`

### 3.5 `messages` Collection (Community Chat)
Persists community channel chat messages.
- `_id`: `ObjectId` (Primary Key)
- `communityId`: `ObjectId` (Ref: `Community`, Required)
- `senderId`: `ObjectId` (Ref: `User`, Required)
- `content`: `String` (Required unless attachments exist, Max 2000 characters)
- `messageType`: `String` (Enum: `TEXT`, `IMAGE`, `PDF`, `DOCUMENT`; Default: `TEXT`)
- `attachments`: `[Object]`
  - `key`: `String`
  - `url`: `String`
  - `originalName`: `String`
  - `mimeType`: `String`
  - `size`: `Number`
- `replyTo`: `ObjectId` (Ref: `Message`, Optional parent message ID)
- `edited`: `Boolean` (Default: `false`)
- `editedAt`: `Date` (Nullable)
- `deleted`: `Boolean` (Default: `false`, Soft delete)
- `deletedAt`: `Date` (Nullable)
- `createdAt`, `updatedAt`: `Date` (Timestamps)
- **Indexes**: `{ communityId: 1, createdAt: -1 }` (Paginated chat history), `{ senderId: 1 }`

### 3.6 `conversations` Collection (Direct Messaging)
Tracks 1-on-1 private chat sessions between two users.
- `_id`: `ObjectId` (Primary Key)
- `participants`: `[ObjectId]` (Ref: `User`, Exactly 2 distinct user IDs)
- `lastMessage`: `Object` (Nullable)
  - `content`: `String`
  - `senderId`: `ObjectId`
  - `createdAt`: `Date`
- `lastMessageAt`: `Date` (Used for ordering conversation list)
- `createdAt`, `updatedAt`: `Date` (Timestamps)
- **Indexes**: `{ participants: 1 }` (Unique compound array index), `{ lastMessageAt: -1 }`

### 3.7 `directmessages` Collection (1-on-1 Messages)
Persists individual private direct messages.
- `_id`: `ObjectId` (Primary Key)
- `conversationId`: `ObjectId` (Ref: `Conversation`, Required)
- `senderId`: `ObjectId` (Ref: `User`, Required)
- `content`: `String` (Optional if attachments exist, Max 2000 characters)
- `messageType`: `String` (Enum: `TEXT`, `IMAGE`, `PDF`, `DOCUMENT`; Default: `TEXT`)
- `attachments`: `[Object]` (Same attachment metadata schema as community messages)
- `replyTo`: `ObjectId` (Ref: `DirectMessage`, Optional)
- `edited`: `Boolean` (Default: `false`)
- `editedAt`: `Date` (Nullable)
- `read`: `Boolean` (Default: `false`)
- `readAt`: `Date` (Nullable)
- `deleted`: `Boolean` (Default: `false`)
- `deletedAt`: `Date` (Nullable)
- `createdAt`, `updatedAt`: `Date` (Timestamps)
- **Indexes**: `{ conversationId: 1, createdAt: -1 }`, `{ conversationId: 1, read: 1 }`

### 3.8 `resources` Collection (Academic Library)
Stores shared notes, question papers, and study material metadata.
- `_id`: `ObjectId` (Primary Key)
- `title`: `String` (Required, Max 200 characters)
- `description`: `String` (Optional, Max 2000 characters)
- `fileName`: `String` (Required)
- `fileUrl`: `String` (Required)
- `fileSize`: `Number` (Required, Bytes, Max 50MB)
- `fileType`: `String` (Required, MIME type)
- `category`: `String` (Enum: `NOTES`, `ASSIGNMENTS`, `PREVIOUS_PAPERS`, `PPTS`, `LAB_RECORDS`, `QUESTION_BANKS`, `OTHER`)
- `tags`: `[String]` (Max 10 tags)
- `uploadedBy`: `ObjectId` (Ref: `User`, Required)
- `communityId`: `ObjectId` (Ref: `Community`, Required)
- `downloadCount`: `Number` (Default: 0)
- `visibility`: `String` (Enum: `COMMUNITY`, `PUBLIC`; Default: `COMMUNITY`)
- `createdAt`, `updatedAt`: `Date` (Timestamps)
- **Indexes**: `{ communityId: 1, createdAt: -1 }`, `{ communityId: 1, category: 1 }`, `{ uploadedBy: 1 }`, Text index on `{ title: "text", description: "text", tags: "text" }`

### 3.9 `notifications` Collection
System-wide and real-time notifications.
- `_id`: `ObjectId` (Primary Key)
- `userId`: `ObjectId` (Ref: `User`, Recipient)
- `type`: `String` (Enum: `COMMUNITY_JOIN`, `COMMUNITY_INVITE`, `COMMUNITY_UPDATE`, `NEW_MESSAGE`, `DIRECT_MESSAGE`, `RESOURCE_UPLOAD`, `MENTION`, `ADMIN_ALERT`, `SYSTEM`)
- `title`: `String` (Required, Max 200 characters)
- `message`: `String` (Required, Max 1000 characters)
- `entityType`: `String` (Nullable, Enum: `USER`, `COMMUNITY`, `MESSAGE`, `RESOURCE`, `REPORT`)
- `entityId`: `ObjectId` (Nullable)
- `isRead`: `Boolean` (Default: `false`)
- `readAt`: `Date` (Nullable)
- `createdAt`, `updatedAt`: `Date` (Timestamps)
- **Indexes**: `{ userId: 1, isRead: 1, createdAt: -1 }`, `{ userId: 1, createdAt: -1 }`

### 3.10 `reports` Collection (Content Moderation Queue)
Flagged users, messages, communities, or resources.
- `_id`: `ObjectId` (Primary Key)
- `reporterId`: `ObjectId` (Ref: `User`, Required)
- `targetType`: `String` (Enum: `USER`, `COMMUNITY`, `MESSAGE`, `RESOURCE`)
- `targetId`: `ObjectId` (Required ID of reported object)
- `reason`: `String` (Required, Max 100 characters)
- `description`: `String` (Required, Max 1000 characters)
- `status`: `String` (Enum: `PENDING`, `REVIEWED`, `RESOLVED`, `REJECTED`; Default: `PENDING`)
- `reviewedBy`: `ObjectId` (Ref: `User`, Nullable)
- `reviewedAt`: `Date` (Nullable)
- `createdAt`, `updatedAt`: `Date` (Timestamps)
- **Indexes**: `{ status: 1, createdAt: -1 }`, `{ targetType: 1, targetId: 1 }`

### 3.11 `adminlogs` Collection (Audit Trail)
Immutable ledger recording every administrative action.
- `_id`: `ObjectId` (Primary Key)
- `adminId`: `ObjectId` (Ref: `User`, Administrator who took action)
- `action`: `String` (e.g., `BAN_USER`, `UNBAN_USER`, `DELETE_COMMUNITY`, `DELETE_RESOURCE`, `RESOLVE_REPORT`)
- `targetType`: `String` (e.g., `User`, `Community`, `Resource`, `Report`)
- `targetId`: `String` (ID of affected record)
- `details`: `Object` (Arbitrary contextual metadata object)
- `ipAddress`: `String` (Optional)
- `createdAt`: `Date` (Default: `Date.now`)
- **Indexes**: `{ adminId: 1, createdAt: -1 }`, `{ action: 1 }`

### 3.12 `friendships` & `events` Collections
- **Friendships**: `{ requesterId, recipientId, status ('PENDING'|'ACCEPTED'|'REJECTED'), createdAt }`
- **Events**: `{ title, description, communityId, organizerId, eventDate, location, maxAttendees, attendees: [userId], createdAt }`

---

## 4. Security & Authentication Architecture

StudyConnect enforces multi-layered defense-in-depth security policies:

```text
Incoming HTTP Request
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Express Security Helmets & CORS Config                      │
│ - Helmet (Security HTTP Headers)                            │
│ - Strict CORS (Allow origin: WEB_URL, credentials: true)    │
│ - Body Parser limit (10MB) & HPP (HTTP Parameter Pollution) │
│ - Rate Limiting: apiLimiter (300 req / 15 min window)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Input Sanitization & Zod Validation Middleware              │
│ - Prevents XSS, NoSQL Injection                             │
│ - Validates Request Body, Params, Query with Zod Schemas    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Authentication Middleware (`authMiddleware`)               │
│ - Extracts Bearer JWT from Authorization header             │
│ - Verifies signature & expiration (15-min Access Token)     │
│ - Checks user status in DB (Rejects DEACTIVATED/SUSPENDED)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Authorization / RBAC Guard (`authorize(...roles)`)          │
│ - Checks user role (`STUDENT`, `MODERATOR`, `ADMIN`, etc.)  │
│ - Admin Guard (`adminGuard`) enforces `ADMIN` access        │
│ - Admin Self Protect prevents admin from banning self       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Controller Handler & Audit Logger                           │
│ - Executes service layer business logic                     │
│ - Logged by `auditMiddleware` for admin actions             │
└─────────────────────────────────────────────────────────────┘
```

### Key Auth Protocols & Rotation Details
1. **Access Token**: Short-lived JWT (15-minute TTL) containing `userId`, `email`, and `role`.
2. **Refresh Token**: Long-lived JWT (7-day TTL) with unique `jti`.
3. **Dual Client Token Delivery**:
   - **Web Browser**: Refresh token is written to an `httpOnly`, `SameSite=Strict`, `Secure` (in prod) cookie named `studyconnect_refresh`.
   - **Mobile Client**: Request includes header `X-Client-Platform: mobile`. Backend bypasses cookie setting and returns `{ refreshToken: "..." }` in the JSON response payload.
4. **Token Rotation & Multi-Session Invalidation**:
   - Upon calling `/api/auth/refresh-token`, the presented refresh token is revoked in `refreshtokens`, and a new access + refresh token pair is issued.
   - If an expired, revoked, or previously used refresh token is presented again (potential replay attack), the backend instantly invalidates **ALL** active refresh sessions for that user ID.
5. **Password Change/Reset Protection**: Changing or resetting a password automatically revokes all existing refresh sessions across all devices.

---

## 5. Feature Modules Breakdown & Business Logic

### 5.1 Authentication & Password Recovery
- **Registration**: Enforces email domain matching against `APPROVED_EMAIL_DOMAINS` (e.g. `campus.edu`). Hashes password with bcrypt (12 rounds). Automatically assigns `STUDENT` role and `ACTIVE` status.
- **Login**: Verifies credentials, updates `lastLoginAt`, generates access/refresh tokens, records user agent and client platform.
- **Refresh Session**: Single-flight token rotation.
- **Logout**: Revokes the specific refresh session (idempotent response).
- **Forgot/Reset Password**: Generates cryptographic reset token hash (`passwordResetTokenHash`) with 1-hour expiry (`passwordResetExpiresAt`). Always returns generic success message to prevent user enumeration attacks. Logs reset URL in non-prod environments.

### 5.2 User Profiles & Academic Identity
- **Self Profile**: `GET /api/users/profile` returns authenticated user metadata excluding sensitive hashes.
- **Profile Updates**: `PUT /api/users/profile` allows updating `fullName`, `department`, `yearOfStudy`, `bio`, `skills`, and `socialLinks`. Prevents standard users from modifying `role`, `status`, or `email`.
- **Profile Picture Upload**: `POST /api/users/profile-picture` processes multipart uploads (JPEG, PNG, WebP up to 5MB) using Multer into `StorageService` (Local disk or Cloudinary/S3 provider).

### 5.3 Academic Communities (Groups / Channels)
- **Slug Generation**: Converts community title to URL-friendly slug with unique random suffix (e.g., `computer-science-group-a7b2`).
- **Creation**: Creator automatically assigned `OWNER` role in `communitymembers` collection and community `memberCount` initializes to 1.
- **Discovery**: `GET /api/communities` supports text search, category filtering, tag filtering, and page/limit pagination.
- **Membership Management**:
  - `POST /api/communities/:id/join`: Adds user as `MEMBER`, increments `memberCount`.
  - `POST /api/communities/:id/leave`: Removes member, decrements `memberCount`. Prevents `OWNER` from leaving without transferring ownership.
  - Moderator promotion/demotion: Owners can grant or revoke `MODERATOR` role.
  - Member removal: Owners and Moderators can kick violating members.

### 5.4 Community Real-Time Chat Engine
- **REST Endpoints**:
  - `GET /api/communities/:id/messages`: Returns paginated history sorted by `createdAt` with populated sender info.
  - `POST /api/communities/:id/messages`: Multipart message upload supporting text + attachments (images, PDFs, documents).
- **Socket.IO Room Orchestration**:
  - Socket clients connect with access token in `auth.token`.
  - Room name convention: `community:<communityId>`.
  - Socket events check `CommunityMember` collection before permitting room join or message broadcast.
  - Handles real-time text creation (`sendMessage`), inline edits (`editMessage`), soft deletes (`deleteMessage`), typing states (`typingStart`/`typingStop`), and room roster events (`userJoined`/`userLeft`).

### 5.5 Direct Messaging & Presence System
- **1-on-1 Conversations**: `POST /api/direct-messages/conversations` finds or creates a unique conversation pair between two users.
- **Unread Counter & Read Receipts**: Emitting `markAsRead` updates `read: true` and `readAt` on all unread messages, broadcasting `messageRead` event to sender.
- **Socket Room**: `dm:<conversationId>`.
- **Presence System**: Runs dedicated socket handler on `/ws/presence`. Maintains active socket connection maps, tracks online/offline state with a 60s heart-beat TTL, and broadcasts `userOnline`/`userOffline` events to friends and active DM rooms.

### 5.6 Academic Resource Sharing Hub
- **Scoped Resources**: Files uploaded directly under community context or global public library.
- **Categories**: `NOTES`, `ASSIGNMENTS`, `PREVIOUS_PAPERS`, `PPTS`, `LAB_RECORDS`, `QUESTION_BANKS`, `OTHER`.
- **Download Counter**: `POST /api/resources/:id/download` increments `downloadCount` atomically.
- **Permissions**: Upload allowed by any community member; edit allowed only by uploader; deletion allowed by uploader, community owner, or moderators.

### 5.7 Real-Time Notification Engine
- **Triggers**: Automated notifications created upon community joins, incoming DMs, new resource uploads in joined communities, mentions, and system alerts.
- **Socket Room**: `user:<userId>`.
- **Real-Time Bus**: `notificationBus` broadcasts `notificationCreated`, `notificationUpdated`, `notificationDeleted`, and `unreadCountUpdate` directly to recipient's connected socket.

### 5.8 Admin Portal & Content Moderation Engine
- **Dashboard Metrics**: `GET /api/admin/dashboard` aggregates counts for total users, active users, total communities, uploaded resources, pending reports, and recent system audit events.
- **User Moderation**:
  - Ban user: Sets status to `DEACTIVATED`, revokes all active refresh tokens immediately.
  - Suspend user: Sets status to `SUSPENDED` with temporary restriction.
  - Delete user: Cascades deletion of user's memberships, soft-deletes messages, and scrubs profile data.
- **Community & Resource Override**: Admin can hard-delete any community or resource violating college guidelines.
- **Report Review Pipeline**: Admins view reports (`GET /api/admin/reports`) and set status to `RESOLVED` or `REJECTED` with optional action notes.
- **Immutable Audit Logging**: Every admin action invokes `AuditMiddleware` which inserts a permanent document into `adminlogs`.

---

## 6. Dual Backend Implementations (Node.js & Java 21)

StudyConnect features **complete feature parity** across two backend stack implementations:

| Feature / Aspect | Node.js / Express Backend (`backend/`) | Java 21 / Spring Boot 3.x Backend (`backend-java/`) |
|---|---|---|
| **Language & Runtime** | TypeScript 5.x / Node.js 20+ | Java 21 LTS |
| **Web Framework** | Express.js 4.x | Spring Boot 3.2.x (Spring MVC) |
| **ORM / Database** | Mongoose 8.x (MongoDB) | Spring Data JPA / Hibernate (PostgreSQL / MongoDB) |
| **Security & Auth** | Passport / Custom JWT / Bcrypt.js | Spring Security 6.x / JJWT / BCryptPasswordEncoder |
| **Real-time Server** | Socket.IO Server 4.x | Spring WebSocket + STOMP Broker |
| **Validation** | Zod 3.x Schemas | Jakarta Validation (`@Valid`, `@NotNull`, `@Size`) |
| **File Handling** | Multer memory storage + StorageService | Spring MultipartFile + StorageService |
| **Testing** | Vitest + Supertest + Mongo Memory Server | JUnit 5 + Spring Boot Test + MockMvc |

### Java Migration Parity Verification
The `backend-java/` folder includes 10 dedicated audit reports (`PHASE_2_AUTH_SECURITY_REPORT.md` through `PHASE_10_CUTOVER_REPORT.md`) verifying 100% route, payload, status code, error formatting, and WebSocket event parity between Node.js and Java backends.

---

## 7. Frontend Architecture (React 19 Web SPA)

The web frontend is built using **React 19**, **Vite**, **Tailwind CSS**, **React Router v7**, **Zustand**, **TanStack Query (React Query v5)**, and **Axios**.

### Complete Page Catalog (38 Pages Implemented)
1. `login.page.tsx`: Campus email login form with password visibility toggle and validation.
2. `register.page.tsx`: Registration form with domain validation, roll number, department, year picker.
3. `reset-password.page.tsx`: Forgot password request and token-based password reset.
4. `dashboard.page.tsx`: Student portal home displaying joined communities, recent announcements, activity feed, upcoming events.
5. `home.page.tsx`: Public marketing landing page introducing StudyConnect features and campus onboarding.
6. `profile.page.tsx`: Editable user profile page with bio, skills, social links, and avatar upload modal.
7. `communities-list.page.tsx`: Public/Private community directory with search, category filters, and join buttons.
8. `community-details.page.tsx`: Community header, banner, tabbed navigation (Chat, Resources, Members, Settings).
9. `community-form.page.tsx`: Create / Edit community form with tag input and banner image dropzone.
10. `community-chat.page.tsx`: Dedicated real-time channel chat page.
11. `community-members.page.tsx`: Member roster page with role badges (`OWNER`, `MODERATOR`, `MEMBER`) and owner management tools.
12. `community-resources.page.tsx`: Community resource repository with category filter tabs and file cards.
13. `conversation.page.tsx`: Active 1-on-1 private direct message view.
14. `chat.page.tsx`: Unified master chat workspace combining community channels and direct message conversations.
15. `direct-messages.page.tsx`: Direct message conversation switcher page.
16. `connections-resources.page.tsx`: Combined social connections roster and global academic resource feed.
17. `resource-details.page.tsx`: Resource metadata view with download action and uploader details.
18. `resources-management.page.tsx`: User's uploaded resources management page.
19. `upload-resource.page.tsx`: Drag-and-drop academic file upload form.
20. `events.page.tsx`: Campus events listing page.
21. `student-events.page.tsx`: Student event registration and RSVP page.
22. `events-management.page.tsx`: Organizer event creation and attendee management dashboard.
23. `notifications.page.tsx`: Dedicated notifications hub page with read/unread filtering and bulk actions.
24. `admin.page.tsx`: Admin root wrapper and route guard.
25. `admin-dashboard.page.tsx`: Platform statistics, user counts, server metrics, recent system logs.
26. `admin-profile.page.tsx`: Admin account configuration and elevated settings.
27. `users-management.page.tsx`: Admin user table with search, role filter, ban, suspend, unban, delete actions.
28. `communities-management.page.tsx`: Admin community moderation table with forced deletion.
29. `resources-management.page.tsx` (Admin): Global resource moderation table.
30. `reports.page.tsx`: Content moderation queue table with resolution dialogs.
31. `moderation-management.page.tsx`: Automated content flags and report queue management.
32. `announcements-management.page.tsx`: System-wide banner announcement publisher.
33. `analytics-dashboard.page.tsx`: Platform analytics, engagement charts, and activity graphs.
34. `student-settings.page.tsx`: Student preferences, notification settings, and password update page.
35. `help-faq.page.tsx`: Interactive platform usage guide and FAQ section.
36. `figma-showcase.page.tsx`: UI design system preview page showing buttons, inputs, themes, and badges.
37. `forbidden-403.page.tsx`: 403 Access Denied error page.
38. `not-found.page.tsx`: 404 Route Not Found page.

### Key State Management & Axios Interceptor
- **Single-Flight Axios Refresh Interceptor**: If an API call returns `401 Unauthorized`, Axios pauses outgoing requests, invokes `/api/auth/refresh-token` once, updates memory access token, and retries all queued failed requests seamlessly.
- **Zustand Stores**:
  - `useAuthStore`: Holds current `user`, `accessToken`, authentication status, and login/logout methods.
  - `useThemeStore`: Persists dark mode vs light mode theme in `localStorage`.
  - `useNotificationStore`: Manages unread notification counter and realtime badge updates.
  - `useDMStore`: Tracks active DM conversation state and unread counts.

---

## 8. Mobile Application Architecture (React Native)

The `mobile/` app is built using React Native and Expo:
- **Authentication**: Stores refresh token securely via `AsyncStorage` and sends `X-Client-Platform: mobile` header on all API calls.
- **Navigation**: React Navigation v6 Native Stack Navigator + Bottom Tabs (`Dashboard`, `Communities`, `Chat`, `Notifications`, `Profile`).
- **Real-Time Integration**: Socket.IO client configured with mobile transport fallback.

---

## 9. Comprehensive API Endpoint Reference Matrix

All API endpoints return standard JSON response structures:
- **Success**: `{ "success": true, "data": { ... }, "message": "..." }`
- **Error**: `{ "success": false, "code": "ERROR_CODE", "message": "...", "errors": [ ... ] }`

| Category | HTTP Method | Path | Auth Level | Purpose |
|---|---|---|---|---|
| **Auth** | POST | `/api/auth/register` | Public | Register approved college student |
| **Auth** | POST | `/api/auth/login` | Public | Authenticate student and issue session |
| **Auth** | POST | `/api/auth/logout` | Public/Idempotent | Revoke current refresh token session |
| **Auth** | POST | `/api/auth/refresh-token` | Refresh Credential | Rotate refresh token & issue new access token |
| **Auth** | POST | `/api/auth/change-password` | Access Token | Change password & revoke all active sessions |
| **Auth** | POST | `/api/auth/forgot-password` | Public | Initiate password reset workflow |
| **Auth** | POST | `/api/auth/reset-password` | Reset Token | Reset password with token |
| **Users** | GET | `/api/users/profile` | Access Token | Read own user profile |
| **Users** | PUT | `/api/users/profile` | Access Token | Update editable profile fields |
| **Users** | POST | `/api/users/profile-picture` | Access Token | Upload avatar image (JPEG, PNG, WebP) |
| **Communities** | POST | `/api/communities` | Access Token | Create a new community |
| **Communities** | GET | `/api/communities` | Access Token | Search, filter, and paginate communities |
| **Communities** | GET | `/api/communities/:id` | Access Token | View community details |
| **Communities** | PUT | `/api/communities/:id` | Owner | Edit community details |
| **Communities** | DELETE | `/api/communities/:id` | Owner | Delete community |
| **Communities** | POST | `/api/communities/:id/join` | Access Token | Join community |
| **Communities** | POST | `/api/communities/:id/leave` | Member | Leave community |
| **Communities** | GET | `/api/communities/:id/members` | Member | View community roster |
| **Communities** | POST | `/api/communities/:id/moderators` | Owner | Promote user to moderator |
| **Communities** | DELETE | `/api/communities/:id/moderators/:userId` | Owner | Demote moderator |
| **Communities** | DELETE | `/api/communities/:id/members/:userId` | Owner/Moderator | Kick member |
| **Chat** | GET | `/api/communities/:communityId/messages` | Member | Paginated community chat history |
| **Chat** | POST | `/api/communities/:communityId/messages` | Member | Send chat message with file attachments |
| **Direct Msgs** | POST | `/api/direct-messages/conversations` | Access Token | Get or create private 1-on-1 conversation |
| **Direct Msgs** | GET | `/api/direct-messages/conversations` | Access Token | List user's active DM conversations |
| **Direct Msgs** | GET | `/api/direct-messages/conversations/unread` | Access Token | Get total unread DM count |
| **Direct Msgs** | GET | `/api/direct-messages/conversations/:id/messages` | Participant | Paginated DM message history |
| **Direct Msgs** | POST | `/api/direct-messages/conversations/:id/messages` | Participant | Send DM with attachments |
| **Direct Msgs** | PUT | `/api/direct-messages/messages/:id` | Sender | Edit own DM message |
| **Direct Msgs** | DELETE | `/api/direct-messages/messages/:id` | Sender | Soft delete own DM message |
| **Direct Msgs** | POST | `/api/direct-messages/messages/read` | Participant | Mark conversation messages as read |
| **Resources** | GET | `/api/communities/:communityId/resources` | Member | List community resources |
| **Resources** | POST | `/api/communities/:communityId/resources` | Member | Upload academic resource file |
| **Resources** | GET | `/api/resources/:resourceId` | Member | View resource details |
| **Resources** | PUT | `/api/resources/:resourceId` | Uploader | Edit resource metadata |
| **Resources** | DELETE | `/api/resources/:resourceId` | Uploader/Mod/Owner | Delete resource |
| **Resources** | POST | `/api/resources/:resourceId/download` | Member | Track file download |
| **Notifications**| GET | `/api/notifications` | Access Token | List user notifications |
| **Notifications**| GET | `/api/notifications/unread-count` | Access Token | Get unread notification count |
| **Notifications**| PATCH | `/api/notifications/:id/read` | Recipient | Mark notification as read |
| **Notifications**| PATCH | `/api/notifications/read-all` | Access Token | Mark all notifications as read |
| **Notifications**| DELETE | `/api/notifications/:id` | Recipient | Delete single notification |
| **Notifications**| DELETE | `/api/notifications` | Access Token | Clear all notifications |
| **Admin** | GET | `/api/admin/dashboard` | Admin | Fetch platform statistics & system status |
| **Admin** | GET | `/api/admin/users` | Admin | Search & list all users |
| **Admin** | PATCH | `/api/admin/users/:userId/ban` | Admin | Ban user account |
| **Admin** | PATCH | `/api/admin/users/:userId/unban` | Admin | Unban user account |
| **Admin** | PATCH | `/api/admin/users/:userId/suspend` | Admin | Suspend user account |
| **Admin** | DELETE | `/api/admin/users/:userId` | Admin | Delete user & related data |
| **Admin** | GET | `/api/admin/communities` | Admin | Search & list all communities |
| **Admin** | DELETE | `/api/admin/communities/:id` | Admin | Override delete community |
| **Admin** | GET | `/api/admin/resources` | Admin | Search & list all resources |
| **Admin** | DELETE | `/api/admin/resources/:id` | Admin | Override delete resource |
| **Admin** | GET | `/api/admin/reports` | Admin | List content reports |
| **Admin** | PATCH | `/api/admin/reports/:id` | Admin | Resolve or reject content report |
| **Events** | GET | `/api/events` | Access Token | List campus events |
| **Events** | POST | `/api/events` | Access Token | Create student event |
| **Events** | POST | `/api/events/:id/register` | Access Token | Register/RSVP for event |
| **Friends** | GET | `/api/friends` | Access Token | List user's friends & connections |
| **Friends** | POST | `/api/friends/request` | Access Token | Send friend request |
| **Friends** | POST | `/api/friends/accept` | Access Token | Accept friend request |
| **Health** | GET | `/health` | Public | System health check probe |

---

## 10. Real-Time Socket.IO Protocol Contracts

### 10.1 Connection & Authentication
Clients connect with:
```javascript
const socket = io("http://localhost:5000", {
  auth: { token: "<jwt_access_token>" }
});
```

### 10.2 Community Chat Gateway (`community:<communityId>`)
- **Client Emits**:
  - `joinCommunity`: `{ communityId }`
  - `leaveCommunity`: `{ communityId }`
  - `sendMessage`: `{ communityId, content, replyTo? }`
  - `editMessage`: `{ communityId, messageId, content }`
  - `deleteMessage`: `{ communityId, messageId }`
  - `typingStart`: `{ communityId }`
  - `typingStop`: `{ communityId }`
- **Server Emits**:
  - `messageCreated`: `Message` object
  - `messageUpdated`: `Message` object
  - `messageDeleted`: `{ messageId, communityId }`
  - `userTyping`: `{ communityId, userId, fullName }`
  - `userStoppedTyping`: `{ communityId, userId }`
  - `userJoined`: `{ communityId, userId, fullName }`
  - `userLeft`: `{ communityId, userId }`

### 10.3 Direct Messaging Gateway (`dm:<conversationId>`)
- **Client Emits**:
  - `startConversation`: `{ receiverId }`
  - `joinConversation`: `{ conversationId }`
  - `leaveConversation`: `{ conversationId }`
  - `sendDirectMessage`: `{ conversationId, content, replyTo? }`
  - `editDirectMessage`: `{ conversationId, messageId, content }`
  - `deleteDirectMessage`: `{ conversationId, messageId }`
  - `markAsRead`: `{ conversationId, messageId? }`
  - `typingStart`: `{ conversationId }`
  - `typingStop`: `{ conversationId }`
- **Server Emits**:
  - `conversationCreated`: `Conversation` object
  - `directMessageCreated`: `DirectMessage` object
  - `directMessageUpdated`: `DirectMessage` object
  - `directMessageDeleted`: `{ conversationId, messageId }`
  - `messageRead`: `{ conversationId, readAt }`
  - `userTyping`: `{ conversationId, userId }`
  - `userStoppedTyping`: `{ conversationId, userId }`

### 10.4 Presence Gateway (`/ws/presence`)
- **Server Emits**:
  - `userOnline`: `{ userId }`
  - `userOffline`: `{ userId, lastSeen }`

### 10.5 Notifications Gateway (`user:<userId>`)
- **Server Emits**:
  - `notificationCreated`: `Notification` object
  - `notificationUpdated`: `Notification` object
  - `notificationDeleted`: `{ notificationId }`
  - `unreadCountUpdate`: `{ unreadCount: number }`

---

## 11. Testing & Build Runbook

### Running Automated Test Suite
Backend tests use Vitest, Supertest, Socket.IO Client, and MongoDB Memory Server:

```bash
# Run all tests across workspace
npm test

# Run backend integration tests only
npm run test -w backend

# Run web frontend unit tests
npm run test -w web
```

### Production Build & Launch
```bash
# Build TypeScript backend and Vite web frontend SPA
npm run build

# Start backend production server
npm run start -w backend
```

### Render Deployment Configuration (`render.yaml`)
The project includes a production-tested Render Blueprint:
1. `studyconnect-backend`: Node Web Service running `npm run build && npm run start` on port 10000 with health probe `/health`.
2. `studyconnect-frontend`: Static Web Site serving `web/dist` with SPA rewrite rule (`/* -> /index.html`).

---

## 12. Verification & Summary Checklist

- [x] **Auth & Security**: Domain validation, JWT access/refresh rotation, `httpOnly` cookies, mobile headers, bcrypt 12 rounds.
- [x] **Communities**: Slug generation, categories, tags, membership roles (`OWNER`, `MODERATOR`, `MEMBER`), moderation actions.
- [x] **Community Chat**: Socket rooms, REST fallback, attachments, replies, edits, soft deletes, typing indicators, presence.
- [x] **Direct Messaging**: 1-on-1 private rooms, read receipts, unread counter, file attachments, presence tracking service.
- [x] **Resource Library**: Scoped/Global resources, download counter, file type filters, tag search, 50MB file validation.
- [x] **Notification Hub**: Multi-event triggers, Socket bus, unread badges, mark as read, bulk delete.
- [x] **Admin Suite**: Dashboard metrics, user ban/suspend/delete, community override, resource override, report queue, audit logging.
- [x] **Dual Backend**: Full route & feature parity between Express TypeScript and Spring Boot 3.x Java.
- [x] **Frontend SPA**: 38 pages, single-flight refresh interceptor, Zustand state, TanStack Query, dark mode theme.
- [x] **Mobile Client**: React Native / Expo application with secure storage and mobile API headers.

---
*Document generated for complete technical review and ChatGPT prompt ingestion.*
