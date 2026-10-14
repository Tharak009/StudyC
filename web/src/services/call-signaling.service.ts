import { socketService } from "./socket.service";
import { mediaDeviceManager } from "./media-device.service";
import { webrtcService } from "./webrtc.service";
import { groupWebRTCManager } from "./group-webrtc.service";
import { directLiveKitAudioService } from "./direct-livekit-audio.service";
import { audioMonitorService } from "./audio-monitor.service";
import { useCallStore } from "../store/call.store";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { apiClient } from "../api/client";
import { streamChatService } from "./stream-chat.service";
import type { CallSummary, CallType, CallParticipant, RoomSessionMode, ParticipantRole } from "../types/call.types";
import {
  CONNECTING_TIMEOUT_MS,
  RECONNECTING_TIMEOUT_MS,
  AUTO_RESET_DELAY_MS
} from "../constants/call.constants";

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

class CallSignalingService {
  private isInitialized = false;
  private boundSocket: ReturnType<typeof socketService.get> = null;
  private cachedIceServers: RTCIceServer[] = [];
  private durationTimer: number | null = null;
  private connectingTimer: number | null = null;
  private reconnectingTimer: number | null = null;
  private autoResetTimer: number | null = null;
  private ringtoneAudio: HTMLAudioElement | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private iceRestartAttempts = 0;

  public init(): void {
    const socket = socketService.get() || socketService.connect();
    if (!socket) return;

    if (this.boundSocket !== socket) {
      this.boundSocket = socket;
      this.registerSocketListeners();
    }
    if (!this.isInitialized) {
      this.isInitialized = true;
      audioMonitorService.subscribe((speakerId) => {
        useCallStore.getState().setActiveSpeakerId(speakerId);
      });
      this.bindNetworkAndPageListeners();
      this.bindDeviceLifecycleListeners();
      this.fetchIceServers().catch(() => {});
    }
  }

  /**
   * Fetch secure ICE servers from backend
   */
  public async fetchIceServers(): Promise<RTCIceServer[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { iceServers: RTCIceServer[] } }>(
        "/api/calls/ice-servers"
      );
      if (response.data?.data?.iceServers) {
        this.cachedIceServers = response.data.data.iceServers;
        return this.cachedIceServers;
      }
    } catch (err) {
      console.warn("[CallSignalingService] Failed to fetch ICE servers via HTTP, falling back to STUN:", err);
    }

    // Default fallback STUN servers
    this.cachedIceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ];
    return this.cachedIceServers;
  }

  /**
   * Bind Socket.IO signaling event listeners
   */
  private registerSocketListeners(): void {
    const socket = socketService.get();
    if (!socket) return;

    // ── 0. Transport Disconnect & Reconnect (Decoupled from WebRTC Media) ─────
    socket.on("disconnect", () => {
      const store = useCallStore.getState();
      // Signaling and media are separate; preserve a live media session while signaling recovers.
      if (store.status === "CONNECTED") {
        console.warn("[CallSignalingService] Signaling socket dropped; active media remains in place.");
        store.setNetworkQuality("fair");
      }
    });

    socket.on("connect", () => {
      const store = useCallStore.getState();
      // Re-associate an active direct call after the socket transport recovers.
      if (store.callMode === "direct" && store.callId && (store.status === "CONNECTED" || store.status === "RECONNECTING")) {
        console.log("[CallSignalingService] Socket reconnected. Re-syncing active direct call session:", store.callId);
        socket.emit(
          "call:reconnect",
          { callId: store.callId },
          async (res: any) => {
            if (res?.success) {
              if (res.peerSocketId) {
                useCallStore.setState({ peerSocketId: res.peerSocketId });
              }
              if (store.type === "voice" && directLiveKitAudioService.isConnected()) {
                socket.emit("call:peer_connected", { callId: store.callId });
              }
              // Direct voice media reconnects through LiveKit. Video retains the existing WebRTC ICE recovery.
              if (store.status === "RECONNECTING" && store.type === "video") {
                await this.triggerIceRestart();
              }
            } else {
              console.warn("[CallSignalingService] Session expired while offline:", res?.message);
              this.endCall("Session expired");
            }
          }
        );
      } else if (store.callMode === "group" && store.groupCallId) {
        console.log("[CallSignalingService] Socket reconnected. Re-syncing active group call session:", store.groupCallId);
        socket.emit(
          "call:group:reconnect",
          { callId: store.groupCallId },
          (res: any) => {
            if (!res?.success) {
              console.warn("[CallSignalingService] Group session expired while offline:", res?.message);
              this.leaveGroupCall(false);
            }
          }
        );
      }
    });

    // ── 1. Incoming Call ─────────────────────────────────────────────────────
    socket.on(
      "call:incoming",
      (data: {
        callId: string;
        callerId: string;
        callerName: string;
        callerAvatar?: string;
        channelId?: string;
        isVideo: boolean;
        callerSocketId: string;
      }) => {
        const store = useCallStore.getState();
        if (store.callId === data.callId) return;
        if (store.status !== "IDLE") {
          // Reject busy automatically if recipient is already in a call
          socket.emit("call:reject", {
            callId: data.callId,
            callerSocketId: data.callerSocketId,
            reason: "busy"
          });
          return;
        }

        store.setRinging(data);
        this.playRingtone();
      }
    );

    // ── 2. Call Accepted (Caller receives this) ──────────────────────────────
    socket.on(
      "call:accepted",
      async (data: { callId: string; responderSocketId: string; responderId: string; media?: { url: string; token: string } }) => {
        const store = useCallStore.getState();
        if (store.callId !== data.callId || !store.isCaller || store.status !== "CALLING") return;

        store.setConnecting(data.responderSocketId);
        this.stopRingtone();
        this.startConnectingTimer();

        try {
          if (store.type === "voice") {
            const localStream = mediaDeviceManager.getLocalStream();
            if (!data.media || !localStream) throw new Error("Voice media authorization was not received. Please try again.");
            await this.connectDirectVoiceMedia(data.callId, data.media, localStream);
            return;
          }
          const iceServers = await this.fetchIceServers();
          webrtcService.initializeConnection(
            iceServers,
            (remoteStream) => {
              this.handleRemoteStreamAttached(remoteStream);
            },
            (health) => {
              this.handleConnectionHealthChange(health);
            },
            (candidate) => {
              const currentStore = useCallStore.getState();
              if (currentStore.callId === data.callId) {
                socket.emit("call:signal", {
                  callId: data.callId,
                  toSocketId: data.responderSocketId,
                  signalData: { type: "candidate", candidate }
                });
              }
            },
            (videoEnabled) => {
              useCallStore.getState().setRemoteCameraOff(!videoEnabled);
            },
            (quality) => {
              useCallStore.getState().setNetworkQuality(quality);
            }
          );

          const localStream = mediaDeviceManager.getLocalStream();
          if (localStream) {
            webrtcService.addLocalStream(localStream);
            useCallStore.getState().setLocalStream(localStream);
          }

          const offer = await webrtcService.createOffer();
          socket.emit("call:signal", {
            callId: data.callId,
            toSocketId: data.responderSocketId,
            signalData: offer
          });
        } catch (err: any) {
          console.error("[CallSignalingService] Caller negotiation error:", err);
          this.failCall(err.message || "Failed to establish connection");
        }
      }
    );

    socket.on("call:connected", (data: { callId: string; connectedAt?: number }) => {
      const store = useCallStore.getState();
      if (store.callMode !== "direct" || store.callId !== data.callId) return;
      if (store.type === "voice") {
        if (!directLiveKitAudioService.isConnected()) return;
      } else {
        const connectionState = webrtcService.getConnectionState();
        const iceState = webrtcService.getIceConnectionState();
        if (connectionState !== "connected" || (iceState !== "connected" && iceState !== "completed")) return;
      }
      this.stopConnectingTimer();
      this.stopReconnectingTimer();
      useCallStore.getState().setConnected(data.connectedAt);
      this.startDurationTimer();
    });

    // ── 3. Call Rejected ─────────────────────────────────────────────────────
    socket.on("call:rejected", (data: { callId: string; reason?: string; summary?: CallSummary }) => {
      const store = useCallStore.getState();
      if (store.callId !== data.callId || ["IDLE", "ENDED", "FAILED", "REJECTED", "CANCELLED", "MISSED"].includes(store.status)) return;

      this.stopRingtone();
      this.clearAllTimers();
      this.cleanupHardware();

      const reason =
        data.reason === "busy"
          ? "User is busy on another call"
          : data.reason === "declined"
          ? "Call was declined"
          : data.reason || "Call was rejected";

      store.setRejected(reason);

      if (store.isCaller && store.channelId) {
        this.postCallSummaryToChannel(
          store.channelId,
          store.type,
          data.reason === "busy" ? "declined" : "declined",
          0
        );
      }

      this.scheduleAutoReset();
    });

    // ── 4. Call Cancelled ────────────────────────────────────────────────────
    socket.on("call:cancelled", (data: { callId: string; reason?: string; summary?: CallSummary }) => {
      const store = useCallStore.getState();
      if (store.callId !== data.callId || ["IDLE", "ENDED", "FAILED", "REJECTED", "CANCELLED", "MISSED"].includes(store.status)) return;

      this.stopRingtone();
      this.clearAllTimers();
      this.cleanupHardware();
      store.setCancelled(data.reason || "Call was cancelled by caller");

      if (!store.isCaller && store.channelId) {
        this.postCallSummaryToChannel(store.channelId, store.type, "missed", 0);
      }

      this.scheduleAutoReset();
    });

    // ── 5. Call Missed (Ring Timeout) ────────────────────────────────────────
    socket.on(
      "call:missed",
      (data: { callId: string; reason?: string; message?: string; summary?: CallSummary }) => {
        const store = useCallStore.getState();
        if (store.callId !== data.callId || ["IDLE", "ENDED", "FAILED", "REJECTED", "CANCELLED", "MISSED"].includes(store.status)) return;

        this.stopRingtone();
        this.clearAllTimers();
        this.cleanupHardware();
        store.setMissed(data.message || "Call unanswered");

        if (store.isCaller && store.channelId) {
          this.postCallSummaryToChannel(store.channelId, store.type, "missed", 0);
        }

        this.scheduleAutoReset();
      }
    );

    // ── 6. Call Ended ────────────────────────────────────────────────────────
    socket.on(
      "call:ended",
      (data: { callId: string; endedBy?: string; reason?: string; failed?: boolean; summary?: CallSummary }) => {
        const store = useCallStore.getState();
        if (store.callId !== data.callId || ["IDLE", "ENDED", "FAILED", "REJECTED", "CANCELLED", "MISSED"].includes(store.status)) return;

        this.stopRingtone();
        this.clearAllTimers();
        this.cleanupHardware();

        const duration = data.summary?.duration ?? store.duration;
        if (data.failed || data.summary?.status === "FAILED") {
          useCallStore.getState().setFailed(data.reason || "Call failed");
        } else {
          useCallStore.getState().setEnded(data.reason === "ended" ? "Call ended" : data.reason || "Call ended");
        }

        if (store.isCaller && store.channelId) {
          this.postCallSummaryToChannel(store.channelId, store.type, "completed", duration);
        }

        this.scheduleAutoReset();
      }
    );

    // ── 7. Relay WebRTC Signal (Offer, Answer, ICE Candidate) ───────────────────
    socket.on(
      "call:signal",
      async (data: { callId: string; fromSocketId: string; signalData: any }) => {
        const store = useCallStore.getState();
        if (store.type === "voice") return;
        if (store.callId !== data.callId || !["CALLING", "RINGING", "ACCEPTED", "CONNECTING", "CONNECTED", "RECONNECTING"].includes(store.status)) return;

        const { signalData } = data;
        try {
          if (signalData.type === "offer") {
            // Callee receives offer (initial or ICE restart)
            if (store.status === "CALLING" || store.status === "RINGING" || store.status === "ACCEPTED") {
              store.setConnecting(data.fromSocketId);
            }
            await webrtcService.setRemoteDescription(signalData);

            const answer = await webrtcService.createAnswer();
            socket.emit("call:signal", {
              callId: data.callId,
              toSocketId: data.fromSocketId,
              signalData: answer
            });
          } else if (signalData.type === "answer") {
            // Caller receives answer
            await webrtcService.setRemoteDescription(signalData);
          } else if (signalData.candidate) {
            // ICE Candidate
            await webrtcService.addIceCandidate(signalData.candidate);
          }
        } catch (err) {
          console.error("[CallSignalingService] WebRTC signaling error:", err);
          this.failCall("Failed to negotiate the call connection");
        }
      }
    );

    // ── 8. Peer Reconnecting Notification ────────────────────────────────────
    socket.on("call:peer_reconnecting", (data: { callId: string }) => {
      const store = useCallStore.getState();
      if (store.callId === data.callId) {
        store.setReconnecting();
        this.startReconnectingTimer();
        if (store.type === "voice" && directLiveKitAudioService.isConnected()) {
          socket.emit("call:peer_connected", { callId: data.callId });
        }
      }
    });

    // ── 9. Peer Reconnected Notification ─────────────────────────────────────
    socket.on("call:peer_reconnected", (data: { callId: string; newSocketId: string }) => {
      const store = useCallStore.getState();
      if (store.callId === data.callId) {
        useCallStore.setState({ peerSocketId: data.newSocketId });
        if (store.type === "voice" && directLiveKitAudioService.isConnected()) {
          socket.emit("call:peer_connected", { callId: data.callId });
        } else if (store.status === "RECONNECTING" && store.type === "video") {
          this.triggerIceRestart();
        }
      }
    });

    // ── 10. Group Call: Participant Joined ───────────────────────────────────
    socket.on(
      "call:group:participant_joined",
      async (data: { callId: string; participant: CallParticipant }) => {
        const store = useCallStore.getState();
        if (store.callMode !== "group" || store.groupCallId !== data.callId) return;

        store.addGroupParticipant(data.participant);
        // Existing participants in the mesh initiate WebRTC offer to new participant
        await groupWebRTCManager.addPeer(data.participant.userId, true);
      }
    );

    socket.on(
      "call:group:participant_connected",
      (data: { callId: string; participant: CallParticipant }) => {
        const store = useCallStore.getState();
        if (store.callMode !== "group" || store.groupCallId !== data.callId || !data.participant?.userId) return;
        store.addGroupParticipant({ ...data.participant, connectionState: "CONNECTED" });
      }
    );

    // ── 11. Group Call: Participant Left ─────────────────────────────────────
    socket.on(
      "call:group:participant_left",
      (data: { callId: string; userId: string; reason?: string }) => {
        const store = useCallStore.getState();
        if (store.callMode !== "group" || store.groupCallId !== data.callId) return;

        groupWebRTCManager.removePeer(data.userId);
        store.removeGroupParticipant(data.userId);
      }
    );

    // ── 12. Group Call: Participant Media State Changed ──────────────────────
    socket.on(
      "call:group:participant_media",
      (data: {
        callId: string;
        userId: string;
        audioEnabled: boolean;
        videoEnabled: boolean;
      }) => {
        const store = useCallStore.getState();
        if (store.callMode !== "group" || store.groupCallId !== data.callId) return;

        store.updateGroupParticipantMedia(data.userId, data.audioEnabled, data.videoEnabled);
      }
    );

    // Group media uses LiveKit's SFU transport. Legacy call:group:signal offers are ignored.

    // ── 14. Group Call: Ended ────────────────────────────────────────────────
    socket.on(
      "call:group:ended",
      (data: { callId: string; channelId: string }) => {
        const store = useCallStore.getState();
        if (store.callMode === "group" && store.groupCallId === data.callId) {
          this.leaveGroupCall(false);
          store.setEnded("Group call ended");
          this.scheduleAutoReset();
        }
      }
    );

    // ── 15. Screen Sharing (1-to-1) ─────────────────────────────────────────
    socket.on("call:screen_share", (data: { callId: string; userId: string; isSharing: boolean }) => {
      const store = useCallStore.getState();
      if (store.callId === data.callId) {
        store.setScreenSharerId(data.isSharing ? data.userId : null);
      }
    });

    // ── 16. Screen Sharing (Group) ──────────────────────────────────────────
    socket.on("call:group:screen_share", (data: { callId: string; userId: string; isSharing: boolean }) => {
      const store = useCallStore.getState();
      if (store.groupCallId === data.callId) {
        store.setScreenSharerId(data.isSharing ? data.userId : null);
        const p = store.groupParticipants[data.userId];
        if (p) {
          store.addGroupParticipant({
            ...p,
            isScreenSharing: data.isSharing
          });
        }
      }
    });

    // ── 17. Stage Hand-Raise Requests Updated ───────────────────────────────
    socket.on("call:stage:requests_updated", (data: { callId: string; requests: any[] }) => {
      const store = useCallStore.getState();
      if (store.groupCallId === data.callId) {
        store.setRaiseHandQueue(data.requests);
        const myUserId = useAuthStore.getState().user?._id || "";
        const amInQueue = data.requests.some((r) => r.userId === myUserId);
        store.setHandRaised(amInQueue);
      }
    });

    // ── 18. Stage Role Changed ──────────────────────────────────────────────
    socket.on("call:stage:role_changed", (data: { callId: string; userId: string; role: ParticipantRole }) => {
      const store = useCallStore.getState();
      if (store.groupCallId === data.callId) {
        store.updateParticipantRole(data.userId, data.role);
        const myUserId = useAuthStore.getState().user?._id || "";
        if (data.userId === myUserId) {
          void groupWebRTCManager.setCanPublish(data.role !== "listener");
          if (data.role === "listener") {
            mediaDeviceManager.toggleAudio(false);
            store.toggleMute(false);
          }
        }
      }
    });

    // ── 19. Remote Force Mute ───────────────────────────────────────────────
    socket.on("call:group:force_mute", (data: { callId: string }) => {
      const store = useCallStore.getState();
      if (store.groupCallId === data.callId) {
        console.warn("[CallSignalingService] Muted by moderator");
        mediaDeviceManager.toggleAudio(false);
        store.toggleMute(false);
      }
    });

    // ── 20. Removed from Call by Host ───────────────────────────────────────
    socket.on("call:group:removed", (data: { callId: string; reason?: string }) => {
      const store = useCallStore.getState();
      if (store.groupCallId === data.callId) {
        console.warn("[CallSignalingService] Removed by host:", data.reason);
        this.leaveGroupCall(false);
        store.setFailed("You were removed from the call by the host");
        this.scheduleAutoReset();
      }
    });
  }

  /**
   * Monitor online/offline events and browser page visibility/unload
   */
  private bindNetworkAndPageListeners(): void {
    if (typeof window === "undefined") return;

    window.addEventListener("offline", () => {
      const store = useCallStore.getState();
      if (store.status === "CONNECTED") {
        console.warn("[CallSignalingService] Browser went offline. Entering reconnecting state.");
        store.setReconnecting();
        this.startReconnectingTimer();
      }
    });

    window.addEventListener("online", () => {
      const store = useCallStore.getState();
      if (store.status === "RECONNECTING") {
        console.log("[CallSignalingService] Browser returned online. Checking the active media connection.");
        if (store.type === "voice") {
          if (store.callId) socketService.get()?.emit("call:peer_reconnecting", { callId: store.callId });
          if (directLiveKitAudioService.isConnected() && store.callId) this.reportDirectVoiceMediaReady(store.callId);
        } else {
          this.triggerIceRestart();
        }
      }
    });

    // Before unload / pagehide: ensure hardware is immediately released and server is notified
    const handleUnload = () => {
      const store = useCallStore.getState();
      if (store.callMode === "group" && store.groupCallId) {
        mediaDeviceManager.stopLocalMedia();
        groupWebRTCManager.close();
        const socket = socketService.get();
        if (socket?.connected) {
          socket.emit("call:group:leave", { callId: store.groupCallId });
        }
        return;
      }
      if (store.callId && store.status !== "IDLE" && store.status !== "ENDED") {
        mediaDeviceManager.stopLocalMedia();
        const socket = socketService.get();
        if (socket?.connected) {
          socket.emit("call:end", {
            callId: store.callId,
            toSocketId: store.peerSocketId,
            reason: "page_closed"
          });
        }
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
  }

  /**
   * Monitor device lifecycle changes (e.g. webcam unplugged)
   */
  private bindDeviceLifecycleListeners(): void {
    // If webcam is unplugged, degrade video without ending call
    mediaDeviceManager.onVideoUnavailable(() => {
      const store = useCallStore.getState();
      if (store.callMode === "group") {
        store.toggleCamera(false);
        groupWebRTCManager.replaceVideoTrack(null);
        if (store.groupCallId) {
          socketService.get()?.emit("call:group:media_state", {
            callId: store.groupCallId,
            audioEnabled: !store.isMuted,
            videoEnabled: false
          });
        }
        return;
      }
      if (store.status === "CONNECTED" || store.status === "CONNECTING") {
        console.warn("[CallSignalingService] Camera became unavailable. Degraded to voice.");
        store.toggleCamera(false);
        webrtcService.replaceVideoTrack(null);
      }
    });

    // If microphone fails and recovers on fallback device
    mediaDeviceManager.onAudioRecovered((newTrack) => {
      const store = useCallStore.getState();
      if (store.callMode === "group") {
        groupWebRTCManager.replaceAudioTrack(newTrack);
        return;
      }
      if (store.status === "CONNECTED" || store.status === "CONNECTING" || store.status === "RECONNECTING") {
        console.log("[CallSignalingService] Microphone recovered, updating active media sender.");
        newTrack.enabled = !store.isMuted;
        if (store.type === "voice") {
          void directLiveKitAudioService.replaceMicrophoneTrack(newTrack).catch((error) => {
            console.warn("[CallSignalingService] Could not publish recovered microphone:", error);
            useToastStore.getState().addToast("Your microphone was found, but could not be reconnected. Try selecting it again.", "warning");
          });
        } else {
          void webrtcService.replaceAudioTrack(newTrack);
        }
      }
    });

    mediaDeviceManager.onAudioUnavailable(() => {
      const store = useCallStore.getState();
      if (store.callMode === "direct" && store.status !== "IDLE" && store.status !== "ENDED" && store.status !== "FAILED") {
        if (store.type === "voice" && (store.status === "CONNECTED" || store.status === "RECONNECTING")) {
          mediaDeviceManager.toggleAudio(false);
          void directLiveKitAudioService.setMicrophoneEnabled(false).catch(() => undefined);
          useCallStore.getState().toggleMute(false);
          useToastStore.getState().addToast("Your microphone disconnected. You can still hear the call; reconnect a microphone to speak.", "warning");
        } else {
          this.failCall("Microphone unavailable. Connect a microphone and try again.");
        }
      }
    });
  }

  /**
   * Initiate an outgoing 1-on-1 call with rapid-click debounce
   */
  public async initiateCall(params: {
    targetUserId: string;
    targetUserName: string;
    targetUserAvatar?: string;
    channelId?: string;
    isVideo: boolean;
  }): Promise<{ success: boolean; reason?: string }> {
    this.init();
    const store = useCallStore.getState();

    // Guard against rapid duplicate clicks
    if (store.isInitiating || store.status !== "IDLE") {
      return { success: false, reason: "Call operation already in progress" };
    }

    const socket = socketService.get();
    if (!socket) {
      return { success: false, reason: "Real-time socket disconnected" };
    }

    useCallStore.setState({ isInitiating: true });

    try {
      // Voice calls request the microphone only. Camera access is reserved for the existing video flow.
      const mediaResult = await mediaDeviceManager.acquireMedia(true, params.isVideo);
      const isVideoActual = params.isVideo && mediaResult.videoAvailable;

      store.setCalling({
        ...params,
        isVideo: isVideoActual
      });
      store.setLocalStream(mediaResult.stream);
      audioMonitorService.trackStream("local", mediaResult.stream);

      // 2. Emit call initiation to backend
      return new Promise((resolve) => {
        socket.timeout(12000).emit(
          "call:initiate",
          {
            targetUserId: params.targetUserId,
            channelId: params.channelId,
            isVideo: isVideoActual
          },
          (ackError: Error | null, response: any) => {
            useCallStore.setState({ isInitiating: false });
            if (ackError) {
              this.cleanupHardware();
              useCallStore.getState().setFailed("The call service did not respond. Check your connection and try again.");
              this.scheduleAutoReset();
              resolve({ success: false, reason: "Call service timed out" });
              return;
            }
            if (response?.success && response?.callId) {
              useCallStore.getState().setCallId(response.callId);
              resolve({ success: true });
            } else {
              this.cleanupHardware();
              const reason =
                response?.reason === "USER_BUSY"
                  ? "User is busy on another call"
                  : response?.message || response?.reason || "Failed to connect call";
              useCallStore.getState().setFailed(reason);
              this.scheduleAutoReset();
              resolve({ success: false, reason });
            }
          }
        );
      });
    } catch (err: any) {
      useCallStore.setState({ isInitiating: false });
      this.cleanupHardware();
      store.setFailed(err.message || "Failed to access microphone or camera");
      this.scheduleAutoReset();
      return { success: false, reason: err.message };
    }
  }

  /**
   * Callee accepts incoming call with rapid-click debounce
   */
  public async acceptCall(isVideo?: boolean): Promise<void> {
    const store = useCallStore.getState();
    if (store.isAccepting || store.status !== "RINGING") return;

    const socket = socketService.get();
    if (!socket || !store.callId || !store.peerSocketId) return;

    useCallStore.setState({ isAccepting: true });
    this.stopRingtone();
    const shouldVideo = isVideo !== undefined ? isVideo : store.type === "video";

    try {
      const mediaResult = await mediaDeviceManager.acquireMedia(true, shouldVideo);
      if (shouldVideo && !mediaResult.videoAvailable) {
        store.toggleCamera(false);
      }
      store.setLocalStream(mediaResult.stream);
      audioMonitorService.trackStream("local", mediaResult.stream);

      if (!shouldVideo) {
        this.startConnectingTimer();
        const accepted = await new Promise<any>((resolve, reject) => {
          socket.timeout(12000).emit("call:accept", { callId: store.callId }, (ackError: Error | null, result: any) => {
            if (ackError) reject(new Error("The call service did not respond. Check your connection and try again."));
            else resolve(result);
          });
        });
        if (!accepted?.success || !accepted.media?.url || !accepted.media?.token) {
          throw new Error(accepted?.message || "Voice media authorization was not received. Please try again.");
        }
        const current = useCallStore.getState();
        if (current.callId !== store.callId || current.status === "ENDED" || current.status === "FAILED" || current.status === "REJECTED" || current.status === "CANCELLED" || current.status === "MISSED" || current.status === "IDLE") return;
        useCallStore.getState().setConnecting(store.peerSocketId || undefined);
        await this.connectDirectVoiceMedia(store.callId!, accepted.media, mediaResult.stream);
        return;
      }

      store.setConnecting();
      this.startConnectingTimer();

      const iceServers = await this.fetchIceServers();
      webrtcService.initializeConnection(
        iceServers,
        (remoteStream) => {
          this.handleRemoteStreamAttached(remoteStream);
        },
        (health) => {
          this.handleConnectionHealthChange(health);
        },
        (candidate) => {
          const currentStore = useCallStore.getState();
          if (currentStore.callId === store.callId) {
            socket.emit("call:signal", {
              callId: store.callId,
              toSocketId: store.peerSocketId,
              signalData: { type: "candidate", candidate }
            });
          }
        },
        (videoEnabled) => {
          useCallStore.getState().setRemoteCameraOff(!videoEnabled);
        },
        (quality) => {
          useCallStore.getState().setNetworkQuality(quality);
        }
      );

      webrtcService.addLocalStream(mediaResult.stream);

      socket.emit("call:accept", {
        callId: store.callId,
        callerSocketId: store.peerSocketId
      });
    } catch (err: any) {
      console.error("[CallSignalingService] Error accepting call:", err);
      const reason = err?.message || "Could not join the voice call";
      const current = useCallStore.getState();
      if (current.status === "RINGING") {
        socket.emit("call:reject", { callId: current.callId, reason: "media_unavailable" });
        this.stopRingtone();
        this.clearAllTimers();
        this.cleanupHardware();
        useCallStore.getState().setFailed(reason);
        this.scheduleAutoReset();
      } else this.failCall(reason);
    } finally {
      useCallStore.setState({ isAccepting: false });
    }
  }

  /**
   * Callee rejects incoming call
   */
  public rejectCall(reason = "declined"): void {
    const store = useCallStore.getState();
    if (store.status !== "RINGING") return;

    const socket = socketService.get();
    this.stopRingtone();
    this.clearAllTimers();

    if (socket && store.callId && store.peerSocketId) {
      socket.emit("call:reject", {
        callId: store.callId,
        callerSocketId: store.peerSocketId,
        reason
      });
    }

    this.cleanupHardware();
    store.reset();
  }

  /**
   * Caller cancels outgoing call before it is answered
   */
  public cancelCall(): void {
    const store = useCallStore.getState();
    if (store.status !== "CALLING") return;

    const socket = socketService.get();
    this.clearAllTimers();

    if (socket && store.callId) {
      socket.emit("call:cancel", { callId: store.callId });
    }

    if (store.channelId) {
      this.postCallSummaryToChannel(store.channelId, store.type, "cancelled", 0);
    }

    this.cleanupHardware();
    store.reset();
  }

  /**
   * Either party hangs up / ends call with idempotency
   */
  public endCall(reason = "ended"): void {
    const store = useCallStore.getState();
    if (store.isEnding || store.status === "IDLE" || store.status === "ENDED") return;

    useCallStore.setState({ isEnding: true });
    const duration = store.duration;
    const socket = socketService.get();

    if (socket && store.callId) {
      socket.emit("call:end", {
        callId: store.callId,
        toSocketId: store.peerSocketId,
        reason
      });
    }

    if (store.isCaller && store.channelId) {
      this.postCallSummaryToChannel(store.channelId, store.type, "completed", duration);
    }

    this.stopRingtone();
    this.clearAllTimers();
    this.cleanupHardware();
    store.setEnded(reason);
    this.scheduleAutoReset();
  }

  public failCall(reason = "connection_failed"): void {
    const store = useCallStore.getState();
    if (store.status === "IDLE" || store.status === "ENDED" || store.status === "FAILED" || store.isEnding) return;

    if (store.callMode === "direct" && store.callId) {
      socketService.get()?.emit("call:fail", { callId: store.callId, reason });
    } else if (store.callMode === "group") return;

    this.stopRingtone();
    this.clearAllTimers();
    this.cleanupHardware();
    useCallStore.getState().setFailed(reason);
    this.scheduleAutoReset();
  }

  /**
   * Toggle local microphone
   */
  public toggleMute(): void {
    const newState = mediaDeviceManager.toggleAudio();
    const store = useCallStore.getState();
    if (store.callMode === "direct" && store.type === "voice") {
      void directLiveKitAudioService.setMicrophoneEnabled(newState).catch((error) => {
        console.warn("[CallSignalingService] Could not update LiveKit microphone state:", error);
      });
    }
    useCallStore.getState().toggleMute(newState);
  }

  /**
   * Toggle local camera
   */
  public toggleCamera(): void {
    const newState = mediaDeviceManager.toggleVideo();
    useCallStore.getState().toggleCamera(newState);
  }

  /**
   * Initiate a multi-participant group call
   */
  /**
   * Initiate a multi-participant group call
   */
  private initializeGroupMediaTransport(): void {
    groupWebRTCManager.initialize([], {
      onParticipantStream: (participantId, stream) => {
        useCallStore.getState().setGroupParticipantStream(participantId, stream);
        audioMonitorService.trackStream(participantId, stream);
      },
      onParticipantStreamRemoved: (participantId) => {
        useCallStore.getState().setGroupParticipantStream(participantId, null);
        audioMonitorService.untrackStream(participantId);
      },
      onParticipantMediaState: (participantId, audioEnabled, videoEnabled) => {
        useCallStore.getState().updateGroupParticipantMedia(participantId, audioEnabled, videoEnabled);
      },
      onParticipantVideoState: (participantId, videoEnabled) => {
        const participant = useCallStore.getState().groupParticipants[participantId];
        if (participant) {
          useCallStore.getState().updateGroupParticipantMedia(participantId, participant.audioEnabled, videoEnabled);
        }
      },
      onNetworkQualityChange: (quality) => useCallStore.getState().setNetworkQuality(quality),
      onConnectionStateChange: (state) => {
        const callStore = useCallStore.getState();
        if (callStore.callMode !== "group") return;
        if (state === "reconnecting" && callStore.status === "CONNECTED") callStore.setReconnecting();
        if (state === "connected" && callStore.status === "RECONNECTING") callStore.setConnected();
        if (state === "failed" && callStore.status !== "IDLE" && callStore.status !== "ENDED") {
          callStore.setFailed("The group media connection was lost");
          if (callStore.groupCallId) socketService.get()?.emit("call:group:leave", { callId: callStore.groupCallId });
          this.cleanupHardware();
          this.scheduleAutoReset();
        }
      },
      onActiveSpeakerChange: (participantId) => useCallStore.getState().setActiveSpeakerId(participantId)
    });
  }

  public async initiateGroupCall(params: {
    channelId: string;
    communityName?: string;
    isVideo: boolean;
    mode?: RoomSessionMode;
  }): Promise<{ success: boolean; reason?: string }> {
    this.init();
    const store = useCallStore.getState();

    if (store.isInitiating || store.status !== "IDLE") {
      return { success: false, reason: "Call operation already in progress" };
    }

    const socket = socketService.get();
    if (!socket) {
      return { success: false, reason: "Real-time socket disconnected" };
    }

    useCallStore.setState({ isInitiating: true });

    try {
      const mediaResult = await mediaDeviceManager.acquireMedia(true, params.isVideo);
      const isVideoActual = params.isVideo && mediaResult.videoAvailable;

      store.setGroupCalling({
        channelId: params.channelId,
        communityName: params.communityName,
        isVideo: isVideoActual,
        mode: params.mode
      });
      store.setLocalStream(mediaResult.stream);
      audioMonitorService.trackStream("local", mediaResult.stream);

      this.initializeGroupMediaTransport();
      groupWebRTCManager.setLocalStream(mediaResult.stream);

      return new Promise((resolve) => {
        socket.emit(
          "call:group:initiate",
          {
            channelId: params.channelId,
            communityName: params.communityName,
            isVideo: isVideoActual,
            mode: params.mode
          },
          async (res: any) => {
            useCallStore.setState({ isInitiating: false });
            if (res?.success && res.session) {
              try {
                await groupWebRTCManager.connect(res.media?.url, res.media?.token, Boolean(res.media?.canPublish));
              } catch (mediaError: any) {
                socket.emit("call:group:leave", { callId: res.callId });
                this.cleanupHardware();
                const reason = mediaError?.message || "Could not connect to the group media server";
                useCallStore.getState().setFailed(reason);
                this.scheduleAutoReset();
                resolve({ success: false, reason });
                return;
              }
              useCallStore.getState().setGroupConnected({
                callId: res.callId,
                channelId: params.channelId,
                communityName: params.communityName,
                participants: res.session.participants,
                isVideo: isVideoActual,
                mode: res.session.mode
              });
              socket.emit("call:group:media_joined", { callId: res.callId });
              this.startDurationTimer();
              resolve({ success: true });
            } else {
              this.cleanupHardware();
              const reason = res?.message || res?.reason || "Failed to start group call";
              useCallStore.getState().setFailed(reason);
              this.scheduleAutoReset();
              resolve({ success: false, reason });
            }
          }
        );
      });
    } catch (err: any) {
      useCallStore.setState({ isInitiating: false });
      this.cleanupHardware();
      store.setFailed(err.message || "Failed to access media devices");
      this.scheduleAutoReset();
      return { success: false, reason: err.message };
    }
  }

  /**
   * Join an ongoing group call
   */
  public async joinGroupCall(params: {
    callId: string;
    isVideo?: boolean;
  }): Promise<{ success: boolean; reason?: string }> {
    this.init();
    const store = useCallStore.getState();

    if (store.isInitiating || store.status !== "IDLE") {
      return { success: false, reason: "Call operation already in progress" };
    }

    const socket = socketService.get();
    if (!socket) {
      return { success: false, reason: "Real-time socket disconnected" };
    }

    useCallStore.setState({ isInitiating: true });

    try {
      const isVideoRequested = Boolean(params.isVideo);
      const mediaResult = await mediaDeviceManager.acquireMedia(true, isVideoRequested);
      const isVideoActual = isVideoRequested && mediaResult.videoAvailable;

      store.setGroupCalling({
        channelId: "",
        isVideo: isVideoActual
      });
      store.setLocalStream(mediaResult.stream);
      audioMonitorService.trackStream("local", mediaResult.stream);

      this.initializeGroupMediaTransport();
      groupWebRTCManager.setLocalStream(mediaResult.stream);

      return new Promise((resolve) => {
        socket.emit("call:group:join", { callId: params.callId }, async (res: any) => {
          useCallStore.setState({ isInitiating: false });
          if (res?.success && res.session) {
            try {
              await groupWebRTCManager.connect(res.media?.url, res.media?.token, Boolean(res.media?.canPublish));
            } catch (mediaError: any) {
              socket.emit("call:group:leave", { callId: params.callId });
              this.cleanupHardware();
              const reason = mediaError?.message || "Could not connect to the group media server";
              useCallStore.getState().setFailed(reason);
              this.scheduleAutoReset();
              resolve({ success: false, reason });
              return;
            }
            const allParticipants: CallParticipant[] = [
              res.participant,
              ...(res.existingParticipants || [])
            ];

            useCallStore.getState().setGroupConnected({
              callId: res.callId,
              channelId: res.session.channelId,
              communityName: res.session.communityName,
              participants: allParticipants,
              isVideo: res.session.type === "video",
              mode: res.session.mode,
              screenSharerId: res.session.screenSharerId,
              raiseHandQueue: res.session.raiseHandQueue
            });

            // If joining as listener in stage mode, lock mic to off immediately
            if (res.participant?.role === "listener") {
              mediaDeviceManager.toggleAudio(false);
              useCallStore.getState().toggleMute(false);
            }

            socket.emit("call:group:media_joined", { callId: params.callId });
            this.startDurationTimer();
            resolve({ success: true });
          } else {
            this.cleanupHardware();
            const reason = res?.message || res?.reason || "Failed to join group call";
            useCallStore.getState().setFailed(reason);
            this.scheduleAutoReset();
            resolve({ success: false, reason });
          }
        });
      });
    } catch (err: any) {
      useCallStore.setState({ isInitiating: false });
      this.cleanupHardware();
      store.setFailed(err.message || "Failed to access media devices");
      this.scheduleAutoReset();
      return { success: false, reason: err.message };
    }
  }

  /**
   * Leave an ongoing group call
   */
  public leaveGroupCall(notifyServer = true): void {
    const store = useCallStore.getState();
    if (store.callMode !== "group" || !store.groupCallId) {
      return;
    }

    const socket = socketService.get();
    if (notifyServer && socket?.connected && store.groupCallId) {
      socket.emit("call:group:leave", { callId: store.groupCallId });
    }

    this.stopDurationTimer();
    this.cleanupHardware();
    store.reset();
  }

  /**
   * Toggle microphone for group call
   */
  public toggleGroupMute(): void {
    const newState = mediaDeviceManager.toggleAudio();
    useCallStore.getState().toggleMute(newState);

    const stream = mediaDeviceManager.getLocalStream();
    const audioTrack = stream?.getAudioTracks()[0] || null;
    groupWebRTCManager.replaceAudioTrack(newState ? audioTrack : null);

    const store = useCallStore.getState();
    if (store.groupCallId) {
      socketService.get()?.emit("call:group:media_state", {
        callId: store.groupCallId,
        audioEnabled: !store.isMuted,
        videoEnabled: !store.isCameraOff
      });
    }
  }

  /**
   * Toggle camera for group call
   */
  public toggleGroupCamera(): void {
    const newState = mediaDeviceManager.toggleVideo();
    useCallStore.getState().toggleCamera(newState);

    const stream = mediaDeviceManager.getLocalStream();
    const videoTrack = stream?.getVideoTracks()[0] || null;
    groupWebRTCManager.replaceVideoTrack(newState ? videoTrack : null);

    const store = useCallStore.getState();
    if (store.groupCallId) {
      socketService.get()?.emit("call:group:media_state", {
        callId: store.groupCallId,
        audioEnabled: !store.isMuted,
        videoEnabled: !store.isCameraOff
      });
    }
  }

  /**
   * Switch live audio input (microphone) without terminating call
   */
  public async switchAudioInput(deviceId: string): Promise<boolean> {
    const newTrack = await mediaDeviceManager.switchAudioInputDevice(deviceId);
    if (!newTrack) return false;

    const store = useCallStore.getState();
    newTrack.enabled = !store.isMuted;
    const localStream = mediaDeviceManager.getLocalStream();
    if (localStream) {
      store.setLocalStream(localStream);
      audioMonitorService.trackStream("local", localStream);
    }

    if (store.callMode === "group") {
      await groupWebRTCManager.replaceAudioTrack(newTrack);
    } else if (store.type === "voice" && (store.status === "CONNECTED" || store.status === "CONNECTING" || store.status === "RECONNECTING")) {
      await directLiveKitAudioService.replaceMicrophoneTrack(newTrack);
    } else if (store.status === "CONNECTED" || store.status === "CONNECTING") {
      await webrtcService.replaceAudioTrack(newTrack);
    }
    return true;
  }

  /**
   * Switch live video input (camera) without terminating call
   */
  public async switchVideoInput(deviceId: string): Promise<boolean> {
    const newTrack = await mediaDeviceManager.switchVideoInputDevice(deviceId);
    if (!newTrack) return false;

    const store = useCallStore.getState();
    const localStream = mediaDeviceManager.getLocalStream();
    if (localStream) {
      store.setLocalStream(localStream);
    }

    if (store.callMode === "group") {
      await groupWebRTCManager.replaceVideoTrack(newTrack);
    } else if (store.status === "CONNECTED" || store.status === "CONNECTING") {
      await webrtcService.replaceVideoTrack(newTrack);
    }
    return true;
  }

  /**
   * Switch audio output (speaker) where supported
   */
  public async switchAudioOutput(element: HTMLMediaElement, sinkId: string): Promise<boolean> {
    const previewApplied = await mediaDeviceManager.switchAudioOutputDevice(element, sinkId);
    const store = useCallStore.getState();
    if (store.callMode === "direct" && store.type === "voice" && this.remoteAudioElement) {
      return (await mediaDeviceManager.switchAudioOutputDevice(this.remoteAudioElement, sinkId)) || previewApplied;
    }
    return previewApplied;
  }

  /**
   * Start screen sharing (1-to-1 or Group)
   */
  public async startScreenShare(): Promise<boolean> {
    const store = useCallStore.getState();
    if (store.status !== "CONNECTED") return false;

    try {
      const screenStream = await mediaDeviceManager.acquireScreenMedia();
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return false;

      if (store.callMode === "direct") {
        await webrtcService.replaceVideoTrack(screenTrack);
      } else {
        await groupWebRTCManager.replaceVideoTrack(screenTrack);
      }

      store.setScreenSharing(true);
      store.setLocalScreenStream(screenStream);
      const authUserId = useAuthStore.getState().user?._id || "local";
      store.setScreenSharerId(authUserId);

      // Listen for user stopping via native browser chrome UI
      mediaDeviceManager.onScreenShareEnded(() => {
        this.stopScreenShare();
      });

      // Relay socket notification
      const socket = socketService.get();
      if (store.callMode === "direct" && store.callId) {
        socket?.emit("call:screen_share", {
          callId: store.callId,
          isSharing: true,
          toSocketId: store.peerSocketId
        });
      } else if (store.callMode === "group" && store.groupCallId) {
        socket?.emit("call:group:screen_share", {
          callId: store.groupCallId,
          isSharing: true
        });
      }

      return true;
    } catch (err: any) {
      console.warn("[CallSignalingService] Failed to start screen sharing:", err);
      return false;
    }
  }

  /**
   * Stop screen sharing and restore camera video track
   */
  public async stopScreenShare(): Promise<void> {
    const store = useCallStore.getState();
    mediaDeviceManager.stopScreenMedia();
    store.setScreenSharing(false);
    store.setLocalScreenStream(null);
    store.setScreenSharerId(null);

    const localStream = mediaDeviceManager.getLocalStream();
    const cameraTrack = !store.isCameraOff && localStream ? (localStream.getVideoTracks()[0] || null) : null;

    if (store.callMode === "direct") {
      await webrtcService.replaceVideoTrack(cameraTrack);
    } else {
      await groupWebRTCManager.replaceVideoTrack(cameraTrack);
    }

    const socket = socketService.get();
    if (store.callMode === "direct" && store.callId) {
      socket?.emit("call:screen_share", {
        callId: store.callId,
        isSharing: false,
        toSocketId: store.peerSocketId
      });
    } else if (store.callMode === "group" && store.groupCallId) {
      socket?.emit("call:group:screen_share", {
        callId: store.groupCallId,
        isSharing: false
      });
    }
  }

  /**
   * Voice Stage: Request to speak (Hand raise)
   */
  public requestToSpeak(): void {
    const store = useCallStore.getState();
    if (!store.groupCallId) return;
    socketService.get()?.emit("call:stage:request_speak", { callId: store.groupCallId }, (res: any) => {
      if (res?.success) {
        store.setHandRaised(true);
        if (res.queue) store.setRaiseHandQueue(res.queue);
      }
    });
  }

  /**
   * Voice Stage: Cancel speak request (Lower hand)
   */
  public cancelSpeakRequest(): void {
    const store = useCallStore.getState();
    if (!store.groupCallId) return;
    socketService.get()?.emit("call:stage:cancel_request", { callId: store.groupCallId }, (res: any) => {
      if (res?.success) {
        store.setHandRaised(false);
        if (res.queue) store.setRaiseHandQueue(res.queue);
      }
    });
  }

  /**
   * Moderator: Approve or reject hand raise request
   */
  public resolveSpeakRequest(targetUserId: string, approve: boolean): void {
    const store = useCallStore.getState();
    if (!store.groupCallId) return;
    socketService.get()?.emit(
      "call:stage:resolve_request",
      {
        callId: store.groupCallId,
        targetUserId,
        approve
      },
      (res: any) => {
        if (res?.success) {
          if (res.queue) store.setRaiseHandQueue(res.queue);
          if (approve && res.participant) {
            store.updateParticipantRole(targetUserId, "speaker");
          }
        }
      }
    );
  }

  /**
   * Moderator: Set participant role
   */
  public setParticipantRole(targetUserId: string, role: ParticipantRole): void {
    const store = useCallStore.getState();
    if (!store.groupCallId) return;
    socketService.get()?.emit(
      "call:stage:set_role",
      {
        callId: store.groupCallId,
        targetUserId,
        role
      },
      (res: any) => {
        if (res?.success) {
          store.updateParticipantRole(targetUserId, role);
        }
      }
    );
  }

  /**
   * Moderator: Force mute participant remotely
   */
  public muteParticipant(targetUserId: string): void {
    const store = useCallStore.getState();
    if (!store.groupCallId) return;
    socketService.get()?.emit(
      "call:group:mute_participant",
      {
        callId: store.groupCallId,
        targetUserId
      }
    );
  }

  /**
   * Moderator: Remove (kick & ban) participant from session
   */
  public removeParticipant(targetUserId: string): void {
    const store = useCallStore.getState();
    if (!store.groupCallId) return;
    socketService.get()?.emit(
      "call:group:remove_participant",
      {
        callId: store.groupCallId,
        targetUserId
      }
    );
  }

  /**
   * ICE Restart triggered on network recovery or temporary drop
   */
  private async triggerIceRestart(): Promise<void> {
    const store = useCallStore.getState();
    if (store.type === "voice") return;
    const socket = socketService.get();
    if (!socket || !store.callId || !store.peerSocketId) return;
    if (webrtcService.getIsNegotiating()) return;
    if (this.iceRestartAttempts >= 2) {
      this.failCall("Could not restore the call connection");
      return;
    }

    try {
      this.iceRestartAttempts += 1;
      const offer = await webrtcService.restartIce();
      socket.emit("call:signal", {
        callId: store.callId,
        toSocketId: store.peerSocketId,
        signalData: offer
      });
    } catch (err) {
      console.warn("[CallSignalingService] Failed to trigger ICE restart:", err);
      if (this.iceRestartAttempts >= 2) this.failCall("Could not restore the call connection");
    }
  }

  private handleRemoteStreamAttached(remoteStream: MediaStream): void {
    useCallStore.getState().setRemoteStream(remoteStream);
    audioMonitorService.trackStream("remote", remoteStream);

    if (!this.remoteAudioElement) {
      this.remoteAudioElement = new Audio();
      this.remoteAudioElement.autoplay = true;
    }
    this.remoteAudioElement.srcObject = remoteStream;
    this.remoteAudioElement.play().then(() => {
      useCallStore.getState().setAudioPlaybackBlocked(false);
    }).catch((err) => {
      console.warn("[CallSignalingService] Audio autoplay blocked until user gesture:", err);
      useCallStore.getState().setAudioPlaybackBlocked(true);
    });
  }

  public async resumeRemoteAudio(): Promise<void> {
    if (!this.remoteAudioElement) return;
    try {
      await this.remoteAudioElement.play();
      useCallStore.getState().setAudioPlaybackBlocked(false);
    } catch {
      useCallStore.getState().setAudioPlaybackBlocked(true);
    }
  }

  private async connectDirectVoiceMedia(callId: string, credentials: { url: string; token: string }, localStream: MediaStream): Promise<void> {
    await directLiveKitAudioService.connect(credentials.url, credentials.token, localStream, {
      onRemoteStream: (stream) => this.handleRemoteStreamAttached(stream),
      onRemoteStreamRemoved: () => {
        useCallStore.getState().setRemoteStream(null);
        audioMonitorService.untrackStream("remote");
        if (this.remoteAudioElement) {
          this.remoteAudioElement.pause();
          this.remoteAudioElement.srcObject = null;
        }
      },
      onConnectionState: (state) => {
        const current = useCallStore.getState();
        if (current.callId !== callId) return;
        if (state === "reconnecting") {
          if (current.status === "CONNECTED" || current.status === "CONNECTING") current.setReconnecting();
          this.startReconnectingTimer();
          socketService.get()?.emit("call:peer_reconnecting", { callId });
        } else if (state === "connected") {
          this.stopReconnectingTimer();
        } else if (state === "failed" && current.status !== "ENDED" && current.status !== "FAILED") {
          this.failCall("The voice connection was lost. Please call again.");
        }
      },
      onNetworkQuality: (quality) => useCallStore.getState().setNetworkQuality(quality),
      refreshAuthorization: () => new Promise((resolve, reject) => {
        const activeSocket = socketService.get();
        if (!activeSocket?.connected) {
          reject(new Error("Signaling connection is unavailable"));
          return;
        }
        activeSocket.timeout(10000).emit("call:refreshVoiceMedia", { callId }, (ackError: Error | null, result: any) => {
          if (ackError) {
            reject(new Error("Could not refresh voice authorization"));
          } else if (result?.success && result.media?.url && result.media?.token) {
            resolve(result.media);
          } else {
            reject(new Error(result?.message || "Voice authorization expired"));
          }
        });
      }),
      onMediaReady: () => {
        if (useCallStore.getState().callId === callId) {
          this.reportDirectVoiceMediaReady(callId);
        }
      }
    });
  }

  private reportDirectVoiceMediaReady(callId: string): void {
    if (!directLiveKitAudioService.isConnected()) return;
    socketService.get()?.emit("call:peer_connected", { callId });
  }

  private handleConnectionHealthChange(health: "connecting" | "connected" | "reconnecting" | "failed" | "closed"): void {
    const store = useCallStore.getState();

    if (health === "connected") {
      this.iceRestartAttempts = 0;
      this.stopConnectingTimer();
      this.stopReconnectingTimer();
      if (store.callMode === "direct" && store.callId) {
        socketService.get()?.emit("call:peer_connected", { callId: store.callId });
      }
    } else if (health === "connecting") {
      if (store.status === "CALLING" || store.status === "RINGING" || store.status === "ACCEPTED") {
        store.setConnecting();
      }
    } else if (health === "reconnecting") {
      store.setReconnecting();
      this.startReconnectingTimer();
      if (store.callMode === "direct" && store.callId) {
        socketService.get()?.emit("call:peer_reconnecting", { callId: store.callId });
      }
      // If we are caller, try ICE restart proactively
      if (store.isCaller) {
        this.triggerIceRestart();
      }
    } else if (health === "failed") {
      if ((store.status === "CONNECTED" || store.status === "RECONNECTING" || store.status === "CONNECTING") && this.iceRestartAttempts < 2) {
        store.setReconnecting();
        this.startReconnectingTimer();
        if (store.callMode === "direct" && store.callId) {
          socketService.get()?.emit("call:peer_reconnecting", { callId: store.callId });
        }
        void this.triggerIceRestart();
      } else {
        this.failCall("Connection failed");
      }
    } else if (health === "closed") {
      this.stopDurationTimer();
    }
  }

  private startConnectingTimer(): void {
    this.stopConnectingTimer();
    this.connectingTimer = window.setTimeout(() => {
      const store = useCallStore.getState();
      if (store.status === "CONNECTING" || store.status === "ACCEPTED") {
        console.warn("[CallSignalingService] Connecting timeout reached without WebRTC media connection.");
        this.failCall("Connection timed out");
      }
    }, CONNECTING_TIMEOUT_MS);
  }

  private stopConnectingTimer(): void {
    if (this.connectingTimer !== null) {
      clearTimeout(this.connectingTimer);
      this.connectingTimer = null;
    }
  }

  private startReconnectingTimer(): void {
    if (this.reconnectingTimer !== null) return; // already timing reconnect
    this.reconnectingTimer = window.setTimeout(() => {
      const store = useCallStore.getState();
      if (store.status === "RECONNECTING") {
        console.warn("[CallSignalingService] Reconnection timeout reached. Terminating call.");
        this.failCall("Reconnection timed out");
      }
    }, RECONNECTING_TIMEOUT_MS);
  }

  private stopReconnectingTimer(): void {
    if (this.reconnectingTimer !== null) {
      clearTimeout(this.reconnectingTimer);
      this.reconnectingTimer = null;
    }
  }

  private startDurationTimer(): void {
    this.stopDurationTimer();
    this.durationTimer = window.setInterval(() => {
      useCallStore.getState().tickDuration();
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationTimer !== null) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  private clearAllTimers(): void {
    this.stopDurationTimer();
    this.stopConnectingTimer();
    this.stopReconnectingTimer();
    if (this.autoResetTimer !== null) {
      clearTimeout(this.autoResetTimer);
      this.autoResetTimer = null;
    }
  }

  private cleanupHardware(): void {
    this.clearAllTimers();
    audioMonitorService.clear();
    useCallStore.getState().setActiveSpeakerId(null);
    useCallStore.getState().setScreenSharing(false);
    useCallStore.getState().setLocalScreenStream(null);
    useCallStore.getState().setScreenSharerId(null);
    mediaDeviceManager.stopLocalMedia();
    directLiveKitAudioService.close();
    webrtcService.close();
    groupWebRTCManager.close();

    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
      this.remoteAudioElement.pause();
    }
    this.iceRestartAttempts = 0;
  }

  private scheduleAutoReset(delayMs = AUTO_RESET_DELAY_MS): void {
    if (this.autoResetTimer !== null) {
      clearTimeout(this.autoResetTimer);
    }
    this.autoResetTimer = window.setTimeout(() => {
      useCallStore.getState().reset();
      this.autoResetTimer = null;
    }, delayMs);
  }

  private playRingtone(): void {
    try {
      if (!this.ringtoneAudio) {
        this.ringtoneAudio = new Audio(
          "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
        );
        this.ringtoneAudio.loop = true;
      }
      this.ringtoneAudio.play().catch(() => {});
    } catch {
      // Audio autoplay policy handled
    }
  }

  private stopRingtone(): void {
    if (this.ringtoneAudio) {
      this.ringtoneAudio.pause();
      this.ringtoneAudio.currentTime = 0;
    }
  }

  /**
   * Posts an academic call history card into the Stream Chat DM channel
   */
  private async postCallSummaryToChannel(
    channelId: string,
    type: CallType,
    status: "completed" | "declined" | "missed" | "cancelled",
    duration = 0
  ): Promise<void> {
    try {
      const client = streamChatService.getCurrentClient();
      if (!client) return;

      const channel = client.channel("messaging", channelId);
      const isVideo = type === "video";
      const icon = isVideo ? "📹" : "📞";
      const typeLabel = isVideo ? "Video call" : "Voice call";
      const durationText = duration > 0 ? ` (${formatDuration(duration)})` : "";

      const statusLabel =
        status === "completed"
          ? `Completed${durationText}`
          : status === "declined"
          ? "Declined"
          : status === "cancelled"
          ? "Cancelled"
          : "Missed";

      await channel.sendMessage({
        text: `${icon} ${typeLabel} • ${statusLabel}`,
        call_event: {
          type,
          status,
          duration,
          timestamp: Date.now()
        }
      });
    } catch (err) {
      console.warn("[CallSignalingService] Could not post call summary to channel:", err);
    }
  }
}

export const callSignalingService = new CallSignalingService();
