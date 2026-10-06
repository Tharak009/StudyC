/**
 * Call System Centralized Timeouts & Configuration Constants
 */

// Ring timeout: duration callee has to answer an incoming call
export const RING_TIMEOUT_MS = 30_000; // 30 seconds

// Connecting timeout: maximum time allowed for WebRTC to establish connection after acceptance
export const CONNECTING_TIMEOUT_MS = 20_000; // 20 seconds

// Reconnecting timeout: maximum time allowed to recover media connection after temporary drop
export const RECONNECTING_TIMEOUT_MS = 15_000; // 15 seconds

// Socket disconnect grace period: time allowed for a disconnected socket to reconnect before ending active call
export const DISCONNECT_GRACE_PERIOD_MS = 15_000; // 15 seconds

// Auto-reset delay: duration call terminated banner remains visible before resetting to IDLE
export const AUTO_RESET_DELAY_MS = 2_500; // 2.5 seconds

// Group calls: maximum supported participants for peer-to-peer mesh
export const MAX_GROUP_CALL_PARTICIPANTS = 6;

// Group calls: grace period for a temporarily disconnected group participant
export const GROUP_RECONNECT_TIMEOUT_MS = 15_000; // 15 seconds

// Voice Stage: maximum concurrent speakers on stage
export const STAGE_MAX_SPEAKERS = 6;

// Active Speaker Detection: volume threshold and polling interval
export const ACTIVE_SPEAKER_THRESHOLD = 25; // 0-255 RMS volume scale
export const ACTIVE_SPEAKER_POLL_INTERVAL_MS = 250; // 250ms interval

