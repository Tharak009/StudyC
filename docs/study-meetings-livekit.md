# Study Meeting Rooms

Study Meeting Rooms use the persisted `StudyMeeting` record for lifecycle, access, capacity, and application membership. LiveKit remains the media transport; the backend issues a short-lived participant token only after checking room access and capacity. One-to-one calls remain on their existing WebRTC path.

## Required configuration

Configure the backend-only `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` described in [group-calls-livekit.md](./group-calls-livekit.md). The existing `GROUP_CALL_MAX_PARTICIPANTS` setting bounds meeting capacity (2–100). Stream Chat credentials are also required because each meeting has one persistent messaging channel.

Meeting calls are unavailable when LiveKit is not configured. Room creation is rejected in that case rather than storing an unusable meeting.

## Access and lifecycle

- Public meetings appear in the authenticated Study Meetings directory.
- Private and invite-only meetings require the generated invitation code in the link.
- The host can end the meeting or remove participants. Removal revokes the LiveKit participant and removes Stream channel membership.
- Leaving a meeting does not delete its Stream channel or history.
- Capacity is checked atomically when adding a new application participant. Rejoining an existing participant is capacity-checked too.
- The host can share the invitation link from the meeting page.
- An admitted meeting participant can publish a screen-share track with LiveKit. The browser's native `getDisplayMedia` picker and permission prompt remain in control; captured content is sent live and is not recorded or stored by StudyConnect.
- Screen share is offered in voice-first and video meetings. Shared screen tracks are subscribed independently of the bounded camera-video subscriptions. Screen audio is not requested.
- The meeting's Stream Chat channel remains available beside the meeting view on desktop and from an overlay on smaller screens.

There is no waiting-room/admission-approval model in this first room implementation. Unexpected LiveKit reconnection is represented as `RECONNECTING`; a participant's app membership remains until they leave, reconnect, or the host removes them. A backend restart or abrupt device loss does not yet use LiveKit webhooks to reconcile persistent room membership automatically.

There is no host-configurable screen-share restriction or single-sharer policy in the current room model. The server-issued LiveKit token permits screen-share publication only for participants admitted through the meeting join service. Host removal and meeting termination revoke active SFU access through the existing LiveKit participant/room operations. A browser or OS may deny or end capture at any time, and StudyConnect cannot prevent screenshots or external recording.

The configured participant maximum is a ceiling, not a performance guarantee. Video subscriptions are bounded by the Phase 3 media adapter; actual capacity depends on the SFU host, bitrate, codecs, and network conditions.
