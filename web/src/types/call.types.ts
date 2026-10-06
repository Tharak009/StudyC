export type CallType = "voice" | "video";

export type CallStatus =
  | "IDLE"
  | "CALLING"
  | "RINGING"
  | "ACCEPTED"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "REJECTED"
  | "MISSED"
  | "CANCELLED"
  | "ENDED"
  | "FAILED";

export type NetworkQuality = "excellent" | "good" | "fair" | "poor" | "reconnecting" | "disconnected";

export type CallEndReason =
  | "ended"
  | "declined"
  | "busy"
  | "missed"
  | "cancelled"
  | "connection_failed"
  | "reconnect_timeout"
  | "device_error"
  | "peer_disconnected";

export const VALID_CALL_TRANSITIONS: Record<CallStatus, readonly CallStatus[]> = {
  IDLE: ["CALLING", "RINGING"],
  CALLING: ["CONNECTING", "CANCELLED", "MISSED", "FAILED", "ENDED"],
  RINGING: ["ACCEPTED", "REJECTED", "MISSED", "CANCELLED", "FAILED", "ENDED"],
  ACCEPTED: ["CONNECTING", "FAILED", "ENDED"],
  CONNECTING: ["CONNECTED", "FAILED", "ENDED"],
  CONNECTED: ["RECONNECTING", "FAILED", "ENDED"],
  RECONNECTING: ["CONNECTED", "FAILED", "ENDED"],
  REJECTED: ["IDLE"],
  MISSED: ["IDLE"],
  CANCELLED: ["IDLE"],
  ENDED: ["IDLE"],
  FAILED: ["IDLE"]
} as const;

export function isValidCallTransition(current: CallStatus, next: CallStatus): boolean {
  if (current === next) return true;
  const allowed = VALID_CALL_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput" | "videoinput";
}

export interface CallSessionInfo {
  callId: string;
  type: CallType;
  peerId: string;
  peerName: string;
  peerAvatar?: string;
  peerSocketId?: string;
  channelId?: string;
  isCaller: boolean;
  startedAt?: number;
  connectedAt?: number;
}

export type WebRtcConnectionState =
  | "new"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "closed";

export interface CallSummary {
  callId: string;
  type: CallType;
  callerId: string;
  callerName: string;
  calleeId: string;
  channelId?: string;
  status: CallStatus;
  duration: number;
  startedAt: number;
  connectedAt?: number;
  endedAt: number;
  endReason?: string;
}

export interface AcquireMediaResult {
  stream: MediaStream;
  videoAvailable: boolean;
  degradedToVoice?: boolean;
}

export type CallMode = "direct" | "group";

export type ParticipantRole = "host" | "moderator" | "speaker" | "listener" | "participant";

export type RoomSessionMode = "normal" | "stage";

export interface StageRequest {
  userId: string;
  name: string;
  avatar?: string;
  requestedAt: number;
}

export type ParticipantCallState =
  | "INVITED"
  | "RINGING"
  | "JOINING"
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "LEFT"
  | "FAILED";

export interface CallParticipant {
  userId: string;
  socketId: string;
  name: string;
  avatar?: string;
  role: ParticipantRole;
  joinedAt: number;
  leftAt?: number;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing?: boolean;
  handRaised?: boolean;
  handRaisedAt?: number;
  connectionState: ParticipantCallState;
}

export interface GroupCallSessionInfo {
  callId: string;
  channelId: string;
  communityId?: string;
  communityName?: string;
  type: CallType;
  mode?: RoomSessionMode;
  initiatedBy: string;
  status: CallStatus;
  participants: Record<string, CallParticipant>;
  screenSharerId?: string | null;
  raiseHandQueue?: StageRequest[];
  createdAt: number;
  startedAt: number;
  endedAt?: number;
}

export interface GroupCallSummary {
  callId: string;
  channelId: string;
  communityName?: string;
  type: CallType;
  mode?: RoomSessionMode;
  initiatedBy: string;
  totalParticipants: number;
  duration: number;
  startedAt: number;
  endedAt: number;
  endReason?: string;
}

export interface CallHistoryItem {
  _id: string;
  callId: string;
  direction: "outgoing" | "incoming";
  type: CallType;
  mode: "direct" | "group" | "stage";
  status: "completed" | "missed" | "declined" | "cancelled" | "failed";
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  channelId?: string | null;
  communityId?: string | null;
  communityName?: string | null;
  peer: {
    userId: string;
    name: string;
    avatar?: string;
  };
  totalParticipants?: number;
}

export interface PaginatedCallHistory {
  items: CallHistoryItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}


