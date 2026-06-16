# Notification System & Admin Panel

## Overview

Two new modules built on top of existing StudyConnect infrastructure:
1. **Notification System** — keeps users informed about important activities
2. **Admin Panel** — provides administrators with moderation tools

---

## Notification System

### Schema

```typescript
interface INotification {
  userId: ObjectId;           // ref -> User
  type: NotificationType;     // COMMUNITY_JOIN, COMMUNITY_INVITE, COMMUNITY_UPDATE,
                              // NEW_MESSAGE, DIRECT_MESSAGE, RESOURCE_UPLOAD,
                              // MENTION, ADMIN_ALERT, SYSTEM
  title: string;              // max 200 chars
  message: string;            // max 1000 chars
  entityType: EntityType | null;  // USER, COMMUNITY, MESSAGE, RESOURCE, REPORT
  entityId: ObjectId | null;
  isRead: boolean;            // default false
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Indexes
- `{ userId: 1, isRead: 1, createdAt: -1 }` — filtered list queries
- `{ userId: 1, createdAt: -1 }` — general list
- `{ isRead: 1, createdAt: -1 }` — admin queries

### Generated Notifications
Notifications are generated through `NotificationService.createNotification()` and are intended to be called from existing service methods (e.g., when a DM is sent, when a resource is uploaded). The notification bus (`notificationBus`) broadcasts them in real-time via Socket.IO.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | List notifications (paginated, filterable by `unreadOnly`) |
| GET | `/api/notifications/unread-count` | Get unread notification count |
| PATCH | `/api/notifications/:notificationId/read` | Mark single notification as read |
| PATCH | `/api/notifications/read-all` | Mark all notifications as read |
| DELETE | `/api/notifications/:notificationId` | Delete single notification |
| DELETE | `/api/notifications` | Clear all notifications |

All endpoints require authentication.

### Socket.IO Events

**Client → Server:**
- `subscribeNotifications` — Join user notification room
- `markNotificationRead` — Mark notification read via socket

**Server → Client:**
- `notificationCreated` — New notification
- `notificationUpdated` — Notification updated (read status)
- `notificationDeleted` — Notification removed
- `unreadCountUpdate` — Unread count change

### Room Naming
- User notification room: `user:<userId>`

---

## Admin Panel

### Roles
- `ADMIN` — full access to all admin routes

### API Endpoints

#### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Platform stats (user/community/resource/report counts, active users, recent activity) |

#### User Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List users (search, filter by role/status) |
| GET | `/api/admin/users/:userId` | Get user details |
| PATCH | `/api/admin/users/:userId/ban` | Ban user (status → DEACTIVATED) |
| PATCH | `/api/admin/users/:userId/unban` | Unban user (status → ACTIVE) |
| PATCH | `/api/admin/users/:userId/suspend` | Suspend user (status → SUSPENDED) |
| DELETE | `/api/admin/users/:userId` | Delete user + related data |

#### Community Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/communities` | List communities (searchable) |
| DELETE | `/api/admin/communities/:communityId` | Delete community + members + messages + resources |

#### Resource Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/resources` | List resources (searchable) |
| DELETE | `/api/admin/resources/:resourceId` | Delete resource |

#### Report Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/reports` | List reports (filter by status, targetType) |
| PATCH | `/api/admin/reports/:reportId` | Review report (set status: RESOLVED/REJECTED) |

All admin endpoints require authentication + ADMIN role.

### Audit Logging
All admin actions are logged to the `AdminLog` collection with:
- `adminId` — who performed the action
- `action` — what was done
- `targetType` / `targetId` — what it was done to
- `details` — arbitrary metadata

---

## Report Model

```typescript
interface IReport {
  reporterId: ObjectId;       // ref -> User
  targetType: ReportTargetType;  // USER, COMMUNITY, MESSAGE, RESOURCE
  targetId: ObjectId;
  reason: string;              // max 100 chars
  description: string;         // max 1000 chars
  status: ReportStatus;        // PENDING, REVIEWED, RESOLVED, REJECTED
  reviewedBy: ObjectId | null; // ref -> User
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Indexes
- `{ status: 1, createdAt: -1 }` — admin report listing
- `{ targetType: 1, targetId: 1 }` — lookup by target

---

## AdminLog Model

```typescript
interface IAdminLog {
  adminId: ObjectId;           // ref -> User
  action: string;              // e.g. "BAN_USER", "DELETE_COMMUNITY"
  targetType: string;          // "User", "Community", etc.
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: Date;
}
```

---

## Frontend

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/notifications` | `NotificationsPage` | Full notification list with read/delete actions |
| `/admin` | `AdminDashboard` | Platform stats + recent activity |
| `/admin/users` | `UsersManagementPage` | User table with ban/suspend/delete |
| `/admin/communities` | `CommunitiesManagementPage` | Community table with delete |
| `/admin/resources` | `ResourcesManagementPage` | Resource table with delete |
| `/admin/reports` | `ReportsPage` | Report table with resolve/reject |

### Components

| Component | File | Description |
|-----------|------|-------------|
| `NotificationBell` | `notification-bell.tsx` | Bell icon with unread badge |
| `NotificationDropdown` | `notification-dropdown.tsx` | Dropdown panel with recent notifications |
| `NotificationList` | `notification-list.tsx` | List of notification cards |
| `NotificationCard` | `notification-card.tsx` | Individual notification with icon, text, actions |
| `AdminSidebar` | `admin-sidebar.tsx` | Admin navigation sidebar |
| `StatisticsCards` | `statistics-cards.tsx` | Dashboard stat cards |
| `SearchBar` | `search-bar.tsx` | (existing) Search input |

### Real-time Notification Flow
1. User connects to Socket.IO → joins `user:<userId>` room
2. Backend creates notification → `notificationBus.notificationCreated(userId, notification)`
3. Socket server emits `notificationCreated` to `user:<userId>` room
4. Client `useSocketNotifications` hook listens → increments unread count
5. Bell badge updates automatically

### Store
- `notification.store.ts` — Zustand store for unread count

---

## Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | JWT Bearer token on all endpoints |
| Admin-only routes | `authorize(ROLES.ADMIN)` middleware |
| Ownership checks | Notification endpoints verify `userId` matches |
| Input validation | Zod schemas on all endpoints |
| Rate limiting | `apiLimiter` (300 req/15min) on all routes |

---

## Build Status
- **Backend**: `tsc --noEmit` compiles clean
- **Frontend**: `tsc -b && vite build` compiles clean (+90 KB from notification/admin code)
- **Tests**: 21 tests (10 notification + 11 admin)

---

## Future Preparation

The following extension points are available without major refactoring:

### Push Notifications
- `NotificationService.send()`, `notificationBus` → easily add Firebase/APNs transport
- Add a `pushToken` field to User model

### Email Notifications
- Subscribe to `notificationBus.onCreated` in an email sender
- Reuse existing `IEmailService` interface

### SMS Notifications
- Add transport to `notificationBus` handler

### Notifications in Resources
- Call `notificationService.createNotification()` from `resource.service.ts` upload handler
- Call from `chat.service.ts` for mentions
- Call from `direct-message.service.ts` for new DMs

### Community Notifications
- `community.model.ts` already has `extensionPoints.notificationsEnabled: boolean`
