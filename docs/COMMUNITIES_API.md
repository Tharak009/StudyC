# StudyConnect Communities API

All community routes require `Authorization: Bearer <accessToken>`.

## Community Documents

`communities`

- `name`: unique, 3-50 characters
- `slug`: generated from name and kept unique
- `description`: max 1000 characters
- `bannerImage`: optional uploaded image URL
- `category`: one approved academic category
- `tags`: up to 10 normalized tags
- `visibility`: `public` or `private`
- `owner`: user reference
- `moderators`: user references
- `memberCount`: denormalized membership count
- `extensionPoints`: reserved flags for future chat, resources, and notifications

`communitymembers`

- `communityId`: community reference
- `userId`: user reference
- `role`: `OWNER`, `MODERATOR`, or `MEMBER`
- `joinedAt`: membership creation date

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/communities` | Create a community and owner membership |
| `GET` | `/api/communities` | List communities with `search`, `category`, `page`, and `limit` |
| `GET` | `/api/communities/:id` | View community details |
| `PUT` | `/api/communities/:id` | Owner-only community update |
| `DELETE` | `/api/communities/:id` | Owner-only community deletion |
| `POST` | `/api/communities/:id/join` | Join as a member |
| `POST` | `/api/communities/:id/leave` | Leave as a non-owner member |
| `GET` | `/api/communities/:id/members` | View members as a member |
| `DELETE` | `/api/communities/:id/members/:userId` | Owner/moderator member removal |
| `POST` | `/api/communities/:id/moderators` | Owner-only moderator promotion |
| `DELETE` | `/api/communities/:id/moderators/:userId` | Owner-only moderator demotion |

## Multipart Uploads

Create and update accept `multipart/form-data` with optional `bannerImage`.

Required create fields:

- `name`
- `category`
- `visibility`
- `tags`

Optional create fields:

- `description`
- `bannerImage`

## Authorization

- `OWNER`: edit/delete community, add/remove moderators, remove members.
- `MODERATOR`: view members and remove members.
- `MEMBER`: view, join, leave, and view members.

Owners cannot leave their own community. They must delete it or future ownership-transfer tooling must be added first.
