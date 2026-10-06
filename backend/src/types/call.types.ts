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

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CallSession {
  callId: string;
  type: CallType;
  callerId: string;
  callerSocketId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeSocketId?: string;
  channelId?: string;
  status: CallStatus;
  startedAt: number;
  connectedAt?: number;
  endedAt?: number;
  endReason?: string;
  ringTimer?: NodeJS.Timeout;
  reconnectGraceTimer?: NodeJS.Timeout;
}

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

export const getCallSummary = (session: CallSession): CallSummary => {
  const endedAt = session.endedAt || Date.now();
  const duration = session.connectedAt
    ? Math.max(0, Math.round((endedAt - session.connectedAt) / 1000))
    : 0;

  return {
    callId: session.callId,
    type: session.type,
    callerId: session.callerId,
    callerName: session.callerName,
    calleeId: session.calleeId,
    channelId: session.channelId,
    status: session.status,
    duration,
    startedAt: session.startedAt,
    connectedAt: session.connectedAt,
    endedAt,
    endReason: session.endReason
  };
};

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
  reconnectGraceTimer?: NodeJS.Timeout;
}

export interface GroupCallSession {
  callId: string;
  channelId: string;
  communityId?: string;
  communityName?: string;
  type: CallType;
  mode: RoomSessionMode;
  initiatedBy: string;
  status: CallStatus;
  participants: Map<string, CallParticipant>;
  screenSharerId?: string | null;
  raiseHandQueue: StageRequest[];
  bannedUserIds: Set<string>;
  maxParticipants: number;
  createdAt: number;
  startedAt: number;
  endedAt?: number;
  endReason?: string;
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

