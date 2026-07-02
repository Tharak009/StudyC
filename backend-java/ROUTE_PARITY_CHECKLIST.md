# StudyConnect Route Parity Checklist

Status legend:

- `Fully mirrored` - Spring Boot exposes the same route and compatible request/response contract.
- `Mirrored with known differences` - The route exists, but Java adds or changes non-breaking behavior.
- `Still missing` - No Spring Boot equivalent existed before the fix in this pass.

## Auth

- `POST /api/auth/register` - Fully mirrored
- `POST /api/auth/login` - Fully mirrored
- `POST /api/auth/logout` - Mirrored with known differences
- `POST /api/auth/refresh-token` - Fully mirrored
- `POST /api/auth/change-password` - Fully mirrored
- `POST /api/auth/forgot-password` - Fully mirrored
- `POST /api/auth/reset-password` - Fully mirrored

Notes:

- Java keeps the same refresh-cookie behavior and mobile token flow.
- Java adds optional all-devices logout support through the same endpoint.

## Users

- `GET /api/users/profile` - Fully mirrored
- `PUT /api/users/profile` - Fully mirrored
- `POST /api/users/profile-picture` - Fully mirrored
- `GET /api/users/search` - Fully mirrored

## Communities

- `POST /api/communities` - Fully mirrored
- `GET /api/communities` - Fully mirrored
- `GET /api/communities/:id` - Fully mirrored
- `PUT /api/communities/:id` - Fully mirrored
- `DELETE /api/communities/:id` - Fully mirrored
- `POST /api/communities/:id/join` - Fully mirrored
- `POST /api/communities/:id/leave` - Fully mirrored
- `GET /api/communities/:id/members` - Fully mirrored
- `DELETE /api/communities/:id/members/:userId` - Fully mirrored
- `POST /api/communities/:id/moderators` - Fully mirrored
- `DELETE /api/communities/:id/moderators/:userId` - Fully mirrored

## Community Chat

- `GET /api/communities/:communityId/messages` - Fully mirrored
- `POST /api/communities/:communityId/messages` - Fully mirrored

Notes:

- Java also exposes `PUT` and `DELETE` for individual community messages.
- Those extra endpoints are additive and not part of the original Express route file.

## Direct Messaging

- `POST /api/direct-messages/conversations` - Fully mirrored
- `GET /api/direct-messages/conversations` - Fully mirrored
- `GET /api/direct-messages/conversations/unread` - Fully mirrored
- `GET /api/direct-messages/conversations/:conversationId` - Fully mirrored
- `GET /api/direct-messages/conversations/:conversationId/messages` - Fully mirrored
- `POST /api/direct-messages/conversations/:conversationId/messages` - Fully mirrored
- `PUT /api/direct-messages/messages/:id` - Fully mirrored
- `DELETE /api/direct-messages/messages/:id` - Fully mirrored
- `POST /api/direct-messages/messages/read` - Fully mirrored

## Resources

- `GET /api/communities/:communityId/resources` - Fully mirrored
- `POST /api/communities/:communityId/resources` - Fully mirrored
- `GET /api/resources` - Fully mirrored
- `GET /api/resources/:resourceId` - Fully mirrored
- `PUT /api/resources/:resourceId` - Fully mirrored
- `DELETE /api/resources/:resourceId` - Fully mirrored
- `POST /api/resources/:resourceId/download` - Fully mirrored

## Notifications

- `GET /api/notifications` - Fully mirrored
- `GET /api/notifications/unread-count` - Fully mirrored
- `PATCH /api/notifications/:notificationId/read` - Fully mirrored
- `PATCH /api/notifications/read-all` - Fully mirrored
- `DELETE /api/notifications/:notificationId` - Fully mirrored
- `DELETE /api/notifications` - Fully mirrored

## Admin

- `GET /api/admin/dashboard` - Fully mirrored
- `GET /api/admin/users` - Fully mirrored
- `GET /api/admin/users/:userId` - Fully mirrored
- `PATCH /api/admin/users/:userId/ban` - Fully mirrored
- `PATCH /api/admin/users/:userId/unban` - Fully mirrored
- `PATCH /api/admin/users/:userId/activate` - Fully mirrored
- `PATCH /api/admin/users/:userId/suspend` - Fully mirrored
- `DELETE /api/admin/users/:userId` - Fully mirrored
- `GET /api/admin/communities` - Fully mirrored
- `DELETE /api/admin/communities/:communityId` - Fully mirrored
- `GET /api/admin/resources` - Fully mirrored
- `DELETE /api/admin/resources/:resourceId` - Fully mirrored
- `GET /api/admin/reports` - Fully mirrored
- `PATCH /api/admin/reports/:reportId` - Fully mirrored
- `DELETE /api/admin/messages/:messageId` - Fully mirrored
- `DELETE /api/admin/direct-messages/:messageId` - Fully mirrored

## Root Contract

- `GET /health` - Fully mirrored
- `GET /api/future-modules` - Fully mirrored

## Summary

- Still missing: none in the current Express route surface after this pass.
- Mirrored with known differences: auth logout behavior and additive community chat message edit/delete routes.
- Everything else in the audited Express route surface has a Spring Boot counterpart.
