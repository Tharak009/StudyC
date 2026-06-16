# Resource Sharing Module

## Overview

The Resource Sharing module allows community members to upload, organize, search, download, and share academic resources. Resources are scoped to communities, with optional public visibility.

---

## Backend Architecture

### Files

| Layer | File |
|-------|------|
| Constants | `backend/src/constants/resource.ts` |
| Model | `backend/src/models/resource.model.ts` |
| Repository | `backend/src/repositories/resource.repository.ts` |
| Service | `backend/src/services/resource.service.ts` |
| Controller | `backend/src/controllers/resource.controller.ts` |
| Validator | `backend/src/validators/resource.validator.ts` |
| Routes | `backend/src/routes/resource.routes.ts` |

### Database Schema

| Field | Type | Description |
|-------|------|-------------|
| `title` | String (max 200) | Resource name |
| `description` | String (max 2000) | Resource description |
| `fileName` | String | Original file name |
| `fileUrl` | String | Storage URL |
| `fileSize` | Number | Bytes |
| `fileType` | String | MIME type |
| `category` | Enum | NOTES, ASSIGNMENTS, PREVIOUS_PAPERS, PPTS, LAB_RECORDS, QUESTION_BANKS, OTHER |
| `tags` | String[] | Max 10 tags |
| `uploadedBy` | ObjectId → User | Uploader |
| `communityId` | ObjectId → Community | Parent community |
| `downloadCount` | Number | Auto-tracked |
| `visibility` | Enum | COMMUNITY, PUBLIC |

Indexes: text index on title/description/tags, compound indexes on category+communityId, communityId+createdAt, communityId+downloadCount, uploadedBy+createdAt.

---

## REST API

All endpoints require `Authorization: Bearer <token>` header.

### Community-scoped

#### `GET /api/communities/:communityId/resources`

List resources in a community. Query params:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page |
| `limit` | number | 20 | Per page (max 50) |
| `search` | string | — | Keyword search (title, description, tags) |
| `category` | enum | — | Filter by category |
| `tag` | string | — | Filter by tag |
| `sort` | recent/downloads/name | recent | Sort order |

#### `POST /api/communities/:communityId/resources`

Upload a resource. Accepts `multipart/form-data`.

| Field | Type | Required |
|-------|------|----------|
| `file` | File | Yes |
| `title` | string | Yes |
| `description` | string | No |
| `category` | enum | Yes |
| `tags` | string[] | No |
| `visibility` | enum | No (default: COMMUNITY) |

### Global

#### `GET /api/resources/:resourceId`

Get resource details (community membership required).

#### `PUT /api/resources/:resourceId`

Update resource. Only uploader can edit. Accepts `multipart/form-data`.

#### `DELETE /api/resources/:resourceId`

Delete resource. Uploader, community owner, and moderators can delete.

#### `POST /api/resources/:resourceId/download`

Track a download. Increments `downloadCount`.

---

## Security

- Authentication required for all endpoints
- Community membership required for create, view, download
- Upload permission: any community member
- Edit permission: only resource uploader
- Delete permission: uploader, community owner, or moderator
- File validation: MIME type check + 50MB size limit

---

## File Storage

- Namespace: `resources`
- Supported types: PDF, PPT, PPTX, DOC, DOCX, ZIP, JPG, PNG
- Max file size: 50 MB
- Uses existing `LocalStorageProvider` (saves to `/uploads/resources/`)

---

## Frontend

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/communities/:id/resources` | CommunityResourcesPage | Grid view with search, filters, sort |
| `/communities/:id/resources/upload` | UploadResourcePage | Upload form (also used for edit with `?edit=:id`) |
| `/communities/:id/resources/:resourceId` | ResourceDetailsPage | Detail view with download, edit, delete |

### Components

| Component | Location |
|-----------|----------|
| `ResourceCard` | `web/src/components/resource-card.tsx` |
| `ResourceGrid` | `web/src/components/resource-grid.tsx` |
| `UploadForm` | `web/src/components/upload-form.tsx` |
| `SearchBar` | `web/src/components/search-bar.tsx` |
| `CategoryFilter` | `web/src/components/category-filter.tsx` |
| `TagFilter` | `web/src/components/tag-filter.tsx` |
| `DownloadButton` | `web/src/components/download-button.tsx` |

---

## Future Extension Points

No schema redesign needed for:

- **Comments**: Add `comments: [{ userId, content, createdAt }]` to resource document
- **Ratings**: Add `ratings: [{ userId, score }]` and `averageRating` to resource document
- **Bookmarks**: Create a lightweight `Bookmark { userId, resourceId }` collection
- **Recommendations**: Algorithm can query by tags/category/community
