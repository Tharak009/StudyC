# Group-call media deployment

StudyConnect uses self-hosted LiveKit for multi-participant call media. The backend keeps call authorization and issues short-lived, room-scoped participant tokens. Direct one-to-one calls continue to use the existing WebRTC signaling and media path.

## Backend configuration

Set these values on the backend only:

| Variable | Purpose |
| --- | --- |
| `LIVEKIT_URL` | Browser signaling URL, normally `wss://<media-host>` in production. |
| `LIVEKIT_API_URL` | Optional HTTPS URL used by the backend Room Service API. If empty, it is derived from `LIVEKIT_URL`. |
| `LIVEKIT_API_KEY` | LiveKit server API key. |
| `LIVEKIT_API_SECRET` | LiveKit server API secret; never expose it to the web client. |
| `LIVEKIT_TOKEN_TTL_SECONDS` | Participant-token lifetime, bounded to 60–900 seconds; defaults to 300. |
| `GROUP_CALL_MAX_PARTICIPANTS` | Per-call application and LiveKit capacity, bounded to 2–100; defaults to 100. |

Blank LiveKit credentials intentionally leave group calls unavailable. The backend does not fall back to peer-to-peer mesh.

## Infrastructure requirements

Provision a LiveKit server separately from the current Render web backend. The current Render blueprint does not provision an SFU or expose its media UDP range. Terminate TLS for the signaling endpoint and configure the LiveKit server and firewall consistently. LiveKit's self-hosted defaults document signaling on TCP 7880, ICE/TCP on 7881, and ICE/UDP on 50000–60000; optional TURN listeners commonly use UDP 3478 and TLS 5349. Confirm the configured ports against the chosen LiveKit deployment before opening firewall rules.

See the [LiveKit self-hosting overview](https://docs.livekit.io/transport/self-hosting/) and [ports and firewall reference](https://docs.livekit.io/transport/self-hosting/ports-firewall/) for deployment-specific setup. TURN for the existing direct WebRTC flow remains configured separately through the existing `TURN_*` backend settings.

## Capacity and session notes

The application accepts at most 100 participants per group call. The web client subscribes to audio tracks and limits simultaneous remote video subscriptions to nine, prioritizing an active speaker when available. LiveKit simulcast, adaptive stream, and dynacast are enabled, but real capacity still depends on SFU CPU/network resources, publisher bitrate, selected codecs, and participant network quality. This configuration is a foundation for larger calls, not a universal 100-participant capacity guarantee.

Group-call coordination remains process-local in the current Socket.IO backend. Call history lifecycle records are persisted and marked failed after a backend restart, but horizontal scaling or seamless active-call recovery across backend instances requires shared session state and Socket.IO adapter infrastructure in a later phase.
