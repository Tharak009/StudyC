import { create } from "zustand";
import type {
  CallStatus,
  CallType,
  NetworkQuality,
  CallMode,
  CallParticipant,
  RoomSessionMode,
  ParticipantRole,
  StageRequest
} from "../types/call.types";
import { isValidCallTransition } from "../types/call.types";

export interface CallStoreState {
  callMode: CallMode;
  status: CallStatus;
  callId: string | null;
  type: CallType;
  peerId: string | null;
  peerName: string | null;
  peerAvatar: string | null;
  peerSocketId: string | null;
  channelId: string | null;
  isCaller: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  remoteCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  duration: number;
  connectedAt: number | null;
  errorMessage: string | null;
  networkQuality: NetworkQuality;

  // Group call specific states
  groupCallId: string | null;
  groupChannelId: string | null;
  groupCommunityName: string | null;
  groupParticipants: Record<string, CallParticipant>;
  groupRemoteStreams: Record<string, MediaStream>;

  // Action guards
  isInitiating: boolean;
  isAccepting: boolean;
  isEnding: boolean;
  setIsInitiating: (val: boolean) => void;
  setIsAccepting: (val: boolean) => void;
  setIsEnding: (val: boolean) => void;

  // 1-to-1 State Transitions
  setCalling: (data: {
    targetUserId: string;
    targetUserName: string;
    targetUserAvatar?: string;
    channelId?: string;
    isVideo: boolean;
  }) => void;
  setRinging: (data: {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    callerSocketId: string;
    channelId?: string;
    isVideo: boolean;
  }) => void;
  setConnecting: (peerSocketId?: string) => void;
  setConnected: (connectedAt?: number) => void;
  setReconnecting: () => void;
  setRejected: (reason?: string) => void;
  setMissed: (message?: string) => void;
  setCancelled: (reason?: string) => void;
  setEnded: (reason?: string) => void;
  setFailed: (error: string) => void;
  reset: () => void;

  // Group Call State Transitions
  setGroupCalling: (data: {
    channelId: string;
    communityName?: string;
    isVideo: boolean;
    mode?: RoomSessionMode;
  }) => void;
  setGroupConnected: (data: {
    callId: string;
    channelId: string;
    communityName?: string;
    participants: CallParticipant[];
    isVideo: boolean;
    connectedAt?: number;
    mode?: RoomSessionMode;
    screenSharerId?: string | null;
    raiseHandQueue?: StageRequest[];
  }) => void;
  addGroupParticipant: (participant: CallParticipant) => void;
  removeGroupParticipant: (userId: string) => void;
  updateGroupParticipantMedia: (
    userId: string,
    audioEnabled: boolean,
    videoEnabled: boolean
  ) => void;
  setGroupParticipantStream: (userId: string, stream: MediaStream | null) => void;

  // Screen Sharing
  isScreenSharing: boolean;
  screenSharerId: string | null;
  localScreenStream: MediaStream | null;
  setScreenSharing: (isSharing: boolean) => void;
  setScreenSharerId: (id: string | null) => void;
  setLocalScreenStream: (stream: MediaStream | null) => void;

  // Voice Stages & Hand Raising
  stageMode: RoomSessionMode;
  handRaised: boolean;
  raiseHandQueue: StageRequest[];
  setStageMode: (mode: RoomSessionMode) => void;
  setHandRaised: (raised: boolean) => void;
  setRaiseHandQueue: (queue: StageRequest[]) => void;
  updateParticipantRole: (userId: string, role: ParticipantRole) => void;
  updateParticipantHandRaise: (userId: string, handRaised: boolean) => void;

  // Active Speaker & Picture-in-Picture
  activeSpeakerId: string | null;
  isMinimized: boolean;
  setActiveSpeakerId: (speakerId: string | null) => void;
  setIsMinimized: (isMinimized: boolean) => void;

  // Media & Controls
  setStreams: (local: MediaStream | null, remote: MediaStream | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setCallId: (callId: string) => void;
  toggleMute: (enabled?: boolean) => void;
  toggleCamera: (enabled?: boolean) => void;
  setRemoteCameraOff: (isOff: boolean) => void;
  setNetworkQuality: (quality: NetworkQuality) => void;
  tickDuration: () => void;
}

export const useCallStore = create<CallStoreState>((set) => ({
  callMode: "direct",
  status: "IDLE",
  callId: null,
  type: "voice",
  peerId: null,
  peerName: null,
  peerAvatar: null,
  peerSocketId: null,
  channelId: null,
  isCaller: false,
  isMuted: false,
  isCameraOff: false,
  remoteCameraOff: false,
  localStream: null,
  remoteStream: null,
  duration: 0,
  connectedAt: null,
  errorMessage: null,
  networkQuality: "good",

  // Group states
  groupCallId: null,
  groupChannelId: null,
  groupCommunityName: null,
  groupParticipants: {},
  groupRemoteStreams: {},

  // Screen Sharing
  isScreenSharing: false,
  screenSharerId: null,
  localScreenStream: null,

  // Voice Stages
  stageMode: "normal",
  handRaised: false,
  raiseHandQueue: [],

  // Active Speaker & Picture-in-Picture
  activeSpeakerId: null,
  isMinimized: false,

  isInitiating: false,
  isAccepting: false,
  isEnding: false,
  setIsInitiating: (isInitiating) => set({ isInitiating }),
  setIsAccepting: (isAccepting) => set({ isAccepting }),
  setIsEnding: (isEnding) => set({ isEnding }),

  // 1-to-1 Transitions
  setCalling: (data) =>
    set((state) => {
      if (!isValidCallTransition(state.status, "CALLING")) {
        console.warn(`[CallStore] Invalid transition: ${state.status} -> CALLING rejected`);
        return state;
      }
      return {
        callMode: "direct",
        status: "CALLING",
        type: data.isVideo ? "video" : "voice",
        peerId: data.targetUserId,
        peerName: data.targetUserName,
        peerAvatar: data.targetUserAvatar || null,
        channelId: data.channelId || null,
        isCaller: true,
        isMuted: false,
        isCameraOff: !data.isVideo,
        remoteCameraOff: false,
        duration: 0,
        connectedAt: null,
        errorMessage: null,
        networkQuality: "good"
      };
    }),

  setRinging: (data) =>
    set((state) => {
      if (!isValidCallTransition(state.status, "RINGING")) {
        console.warn(`[CallStore] Invalid transition: ${state.status} -> RINGING rejected`);
        return state;
      }
      return {
        callMode: "direct",
        status: "RINGING",
        callId: data.callId,
        type: data.isVideo ? "video" : "voice",
        peerId: data.callerId,
        peerName: data.callerName,
        peerAvatar: data.callerAvatar || null,
        peerSocketId: data.callerSocketId,
        channelId: data.channelId || null,
        isCaller: false,
        isMuted: false,
        isCameraOff: !data.isVideo,
        remoteCameraOff: false,
        duration: 0,
        connectedAt: null,
        errorMessage: null,
        networkQuality: "good"
      };
    }),

  setConnecting: (peerSocketId) =>
    set((state) => {
      if (!isValidCallTransition(state.status, "CONNECTING")) {
        console.warn(`[CallStore] Invalid transition: ${state.status} -> CONNECTING rejected`);
        return state;
      }
      return {
        status: "CONNECTING",
        peerSocketId: peerSocketId || state.peerSocketId,
        errorMessage: null
      };
    }),

  setConnected: (connectedAt) =>
    set((state) => {
      if (!isValidCallTransition(state.status, "CONNECTED")) {
        console.warn(`[CallStore] Invalid transition: ${state.status} -> CONNECTED rejected`);
        return state;
      }
      return {
        status: "CONNECTED",
        connectedAt: connectedAt || state.connectedAt || Date.now(),
        errorMessage: null,
        networkQuality: "good"
      };
    }),

  setReconnecting: () =>
    set((state) => {
      if (!isValidCallTransition(state.status, "RECONNECTING")) {
        console.warn(`[CallStore] Invalid transition: ${state.status} -> RECONNECTING rejected`);
        return state;
      }
      return {
        status: "RECONNECTING",
        networkQuality: "reconnecting"
      };
    }),

  setRejected: (reason) =>
    set((state) => {
      if (!isValidCallTransition(state.status, "REJECTED")) {
        console.warn(`[CallStore] Invalid transition: ${state.status} -> REJECTED rejected`);
        return state;
      }
      return {
        status: "REJECTED",
        errorMessage: reason || "Call was declined",
        isInitiating: false,
        isAccepting: false,
        isEnding: false
      };
    }),

  setMissed: (message) =>
    set((state) => {
      if (!isValidCallTransition(state.status, "MISSED")) {
        console.warn(`[CallStore] Invalid transition: ${state.status} -> MISSED rejected`);
        return state;
      }
      return {
        status: "MISSED",
        errorMessage: message || "Missed call",
        isInitiating: false,
        isAccepting: false,
        isEnding: false
      };
    }),

  setCancelled: (reason) =>
    set((state) => {
      if (!isValidCallTransition(state.status, "CANCELLED")) {
        console.warn(`[CallStore] Invalid transition: ${state.status} -> CANCELLED rejected`);
        return state;
      }
      return {
        status: "CANCELLED",
        errorMessage: reason || "Call was cancelled",
        isInitiating: false,
        isAccepting: false,
        isEnding: false
      };
    }),

  setEnded: (reason) =>
    set((state) => {
      if (!isValidCallTransition(state.status, "ENDED")) {
        console.warn(`[CallStore] Invalid transition: ${state.status} -> ENDED rejected`);
        return state;
      }
      return {
        status: "ENDED",
        errorMessage: reason || null,
        isInitiating: false,
        isAccepting: false,
        isEnding: false
      };
    }),

  setFailed: (error) =>
    set((state) => {
      if (!isValidCallTransition(state.status, "FAILED")) {
        console.warn(`[CallStore] Invalid transition: ${state.status} -> FAILED rejected`);
        return state;
      }
      return {
        status: "FAILED",
        errorMessage: error,
        isInitiating: false,
        isAccepting: false,
        isEnding: false
      };
    }),

  reset: () =>
    set({
      callMode: "direct",
      status: "IDLE",
      callId: null,
      type: "voice",
      peerId: null,
      peerName: null,
      peerAvatar: null,
      peerSocketId: null,
      channelId: null,
      isCaller: false,
      isMuted: false,
      isCameraOff: false,
      remoteCameraOff: false,
      localStream: null,
      remoteStream: null,
      duration: 0,
      connectedAt: null,
      errorMessage: null,
      networkQuality: "good",
      isInitiating: false,
      isAccepting: false,
      isEnding: false,

      // Reset group states
      groupCallId: null,
      groupChannelId: null,
      groupCommunityName: null,
      groupParticipants: {},
      groupRemoteStreams: {},

      // Screen Sharing
      isScreenSharing: false,
      screenSharerId: null,
      localScreenStream: null,

      // Voice Stages
      stageMode: "normal",
      handRaised: false,
      raiseHandQueue: [],

      // Active Speaker & Picture-in-Picture
      activeSpeakerId: null,
      isMinimized: false
    }),

  // Group Call Actions
  setGroupCalling: (data) =>
    set(() => ({
      callMode: "group",
      status: "CONNECTING",
      type: data.isVideo ? "video" : "voice",
      groupChannelId: data.channelId,
      groupCommunityName: data.communityName || null,
      stageMode: data.mode || "normal",
      isCaller: true,
      isMuted: false,
      isCameraOff: !data.isVideo,
      duration: 0,
      connectedAt: null,
      errorMessage: null,
      networkQuality: "good"
    })),

  setGroupConnected: (data) =>
    set(() => {
      const participantsRecord: Record<string, CallParticipant> = {};
      data.participants.forEach((p) => {
        participantsRecord[p.userId] = p;
      });

      return {
        callMode: "group",
        status: "CONNECTED",
        callId: data.callId,
        groupCallId: data.callId,
        groupChannelId: data.channelId,
        groupCommunityName: data.communityName || null,
        type: data.isVideo ? "video" : "voice",
        stageMode: data.mode || "normal",
        screenSharerId: data.screenSharerId || null,
        raiseHandQueue: data.raiseHandQueue || [],
        groupParticipants: participantsRecord,
        connectedAt: data.connectedAt || Date.now(),
        errorMessage: null,
        networkQuality: "good"
      };
    }),

  addGroupParticipant: (participant) =>
    set((state) => ({
      groupParticipants: {
        ...state.groupParticipants,
        [participant.userId]: participant
      }
    })),

  removeGroupParticipant: (userId) =>
    set((state) => {
      const updatedParticipants = { ...state.groupParticipants };
      delete updatedParticipants[userId];
      const updatedStreams = { ...state.groupRemoteStreams };
      delete updatedStreams[userId];

      return {
        groupParticipants: updatedParticipants,
        groupRemoteStreams: updatedStreams
      };
    }),

  updateGroupParticipantMedia: (userId, audioEnabled, videoEnabled) =>
    set((state) => {
      const existing = state.groupParticipants[userId];
      if (!existing) return state;

      return {
        groupParticipants: {
          ...state.groupParticipants,
          [userId]: {
            ...existing,
            audioEnabled,
            videoEnabled
          }
        }
      };
    }),

  setGroupParticipantStream: (userId, stream) =>
    set((state) => {
      if (!stream) {
        const updated = { ...state.groupRemoteStreams };
        delete updated[userId];
        return { groupRemoteStreams: updated };
      }
      return {
        groupRemoteStreams: {
          ...state.groupRemoteStreams,
          [userId]: stream
        }
      };
    }),

  // Screen Sharing
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  setScreenSharerId: (screenSharerId) => set({ screenSharerId }),
  setLocalScreenStream: (localScreenStream) => set({ localScreenStream }),

  // Voice Stages
  setStageMode: (stageMode) => set({ stageMode }),
  setHandRaised: (handRaised) => set({ handRaised }),
  setRaiseHandQueue: (raiseHandQueue) => set({ raiseHandQueue }),
  updateParticipantRole: (userId, role) =>
    set((state) => {
      const existing = state.groupParticipants[userId];
      if (!existing) return state;
      return {
        groupParticipants: {
          ...state.groupParticipants,
          [userId]: { ...existing, role }
        }
      };
    }),
  updateParticipantHandRaise: (userId, handRaised) =>
    set((state) => {
      const existing = state.groupParticipants[userId];
      if (!existing) return state;
      return {
        groupParticipants: {
          ...state.groupParticipants,
          [userId]: { ...existing, handRaised }
        }
      };
    }),

  // Active Speaker & Picture-in-Picture
  setActiveSpeakerId: (activeSpeakerId) => set({ activeSpeakerId }),
  setIsMinimized: (isMinimized) => set({ isMinimized }),

  setStreams: (local, remote) =>
    set({
      localStream: local,
      remoteStream: remote
    }),

  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setCallId: (callId) => set({ callId }),

  toggleMute: (enabled) =>
    set((state) => ({
      isMuted: enabled !== undefined ? !enabled : !state.isMuted
    })),

  toggleCamera: (enabled) =>
    set((state) => ({
      isCameraOff: enabled !== undefined ? !enabled : !state.isCameraOff
    })),

  setRemoteCameraOff: (isOff) => set({ remoteCameraOff: isOff }),
  setNetworkQuality: (networkQuality) => set({ networkQuality }),

  tickDuration: () =>
    set((state) => {
      if (state.connectedAt) {
        const elapsed = Math.max(0, Math.floor((Date.now() - state.connectedAt) / 1000));
        return { duration: elapsed };
      }
      return { duration: state.duration + 1 };
    })
}));
