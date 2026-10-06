import { socketService } from "./socket.service";
import { mediaDeviceManager } from "./media-device.service";
import { webrtcService } from "./webrtc.service";
import { groupWebRTCManager } from "./group-webrtc.service";
import { audioMonitorService } from "./audio-monitor.service";
import { useCallStore } from "../store/call.store";
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
  private cachedIceServers: RTCIceServer[] = [];
  private durationTimer: number | null = null;
  private connectingTimer: number | null = null;
  private reconnectingTimer: number | null = null;
  private autoResetTimer: number | null = null;
  private ringtoneAudio: HTMLAudioElement | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;

  public init(): void {
    if (this.isInitialized) return;
    const socket = socketService.get() || socketService.connect();
    if (!socket) return;

    this.isInitialized = true;
    audioMonitorService.subscribe((speakerId) => {
      useCallStore.getState().setActiveSpeakerId(speakerId);
    });
    this.registerSocketListeners();
    this.bindNetworkAndPageListeners();
    this.bindDeviceLifecycleListeners();
    this.fetchIceServers().catch(() => {});
  }

  /**
   * Fetch secure ICE servers from backend
   */
  public async fetchIceServers(): Promise<RTCIceServer[]> {
    if (this.cachedIceServers.length > 0) {
      return this.cachedIceServers;
    }

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

    socket.off("connect");
    socket.off("disconnect");
    socket.off("call:incoming");
    socket.off("call:accepted");
    socket.off("call:rejected");
    socket.off("call:cancelled");
    socket.off("call:missed");
    socket.off("call:ended");
    socket.off("call:signal");
    socket.off("call:peer_reconnecting");
    socket.off("call:peer_reconnected");
    socket.off("call:group:started");
    socket.off("call:group:participant_joined");
    socket.off("call:group:participant_left");
    socket.off("call:group:participant_media");
    socket.off("call:group:signal");
    socket.off("call:group:ended");
    socket.off("call:screen_share");
    socket.off("call:group:screen_share");
    socket.off("call:stage:requests_updated");
    socket.off("call:stage:role_changed");
    socket.off("call:group:force_mute");
    socket.off("call:group:removed");

    // ── 0. Transport Disconnect & Reconnect (Decoupled from WebRTC Media) ─────
    socket.on("disconnect", () => {
      const store = useCallStore.getState();
      // If WebRTC is active and media is flowing, keep media alive!
      if (store.status === "CONNECTED") {
        console.warn("[CallSignalingService] Signaling socket dropped, but WebRTC media remains active.");
        store.setNetworkQuality("fair");
      }
    });

    socket.on("connect", () => {
      const store = useCallStore.getState();
      // If we are in an active 1-to-1 direct call, re-associate with backend session
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
              // If we were waiting to restore media, trigger ICE restart now that signaling is back
              if (store.status === "RECONNECTING") {
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
      async (data: { callId: string; responderSocketId: string; responderId: string }) => {
        const store = useCallStore.getState();
        if (!store.callId || store.callId !== data.callId) return;

        store.setConnecting(data.responderSocketId);
        this.stopRingtone();
        this.startConnectingTimer();

        try {
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
          this.endCall(err.message || "Failed to establish connection");
        }
      }
    );

    // ── 3. Call Rejected ─────────────────────────────────────────────────────
    socket.on("call:rejected", (data: { callId: string; reason?: string; summary?: CallSummary }) => {
      const store = useCallStore.getState();
      if (store.callId && store.callId !== data.callId) return;

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
      if (store.callId && store.callId !== data.callId) return;

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
        if (store.callId && store.callId !== data.callId) return;

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
      (data: { callId: string; endedBy?: string; reason?: string; summary?: CallSummary }) => {
        const store = useCallStore.getState();
        if (store.callId && store.callId !== data.callId) return;

        this.stopRingtone();
        this.clearAllTimers();
        this.cleanupHardware();

        const duration = data.summary?.duration ?? store.duration;
        useCallStore.getState().setEnded("Call ended");

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
        if (!store.callId || store.callId !== data.callId) return;

        const { signalData } = data;
        try {
          if (signalData.type === "offer") {
            // Callee receives offer (initial or ICE restart)
            store.setConnecting(data.fromSocketId);
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
        }
      }
    );

    // ── 8. Peer Reconnecting Notification ────────────────────────────────────
    socket.on("call:peer_reconnecting", (data: { callId: string }) => {
      const store = useCallStore.getState();
      if (store.callId === data.callId) {
        store.setReconnecting();
        this.startReconnectingTimer();
      }
    });

    // ── 9. Peer Reconnected Notification ─────────────────────────────────────
    socket.on("call:peer_reconnected", (data: { callId: string; newSocketId: string }) => {
      const store = useCallStore.getState();
      if (store.callId === data.callId) {
        useCallStore.setState({ peerSocketId: data.newSocketId });
        if (store.status === "RECONNECTING") {
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

    // ── 13. Group Call: WebRTC Signal Relay ──────────────────────────────────
    socket.on(
      "call:group:signal",
      async (data: { callId: string; fromUserId: string; signalData: any }) => {
        const store = useCallStore.getState();
        if (store.callMode !== "group" || store.groupCallId !== data.callId) return;

        await groupWebRTCManager.handleSignal(data.fromUserId, data.signalData);
      }
    );

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
        const myUserId = socketService.getUserId() || "";
        const amInQueue = data.requests.some((r) => r.userId === myUserId);
        store.setHandRaised(amInQueue);
      }
    });

    // ── 18. Stage Role Changed ──────────────────────────────────────────────
    socket.on("call:stage:role_changed", (data: { callId: string; userId: string; role: ParticipantRole }) => {
      const store = useCallStore.getState();
      if (store.groupCallId === data.callId) {
        store.updateParticipantRole(data.userId, data.role);
        const myUserId = socketService.getUserId() || "";
        if (data.userId === myUserId && data.role === "listener") {
          mediaDeviceManager.toggleAudio(false);
          store.toggleMute(false);
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
      if (store.status === "RECONNECTING" || store.status === "CONNECTED") {
        console.log("[CallSignalingService] Browser returned online. Checking connection & triggering recovery.");
        this.triggerIceRestart();
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
        store.setRemoteCameraOff(true);
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
      if (store.status === "CONNECTED") {
        console.log("[CallSignalingService] Microphone recovered, updating WebRTC sender.");
        webrtcService.replaceAudioTrack(newTrack);
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
      // 1. Acquire local media with graceful video-to-audio degradation
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
        socket.emit(
          "call:initiate",
          {
            targetUserId: params.targetUserId,
            channelId: params.channelId,
            isVideo: isVideoActual
          },
          (response: any) => {
            useCallStore.setState({ isInitiating: false });
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
    this.startConnectingTimer();

    const shouldVideo = isVideo !== undefined ? isVideo : store.type === "video";

    try {
      store.setConnecting();
      const mediaResult = await mediaDeviceManager.acquireMedia(true, shouldVideo);
      store.setLocalStream(mediaResult.stream);
      audioMonitorService.trackStream("local", mediaResult.stream);

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
      this.rejectCall("Failed to acquire media devices");
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

  /**
   * Toggle local microphone
   */
  public toggleMute(): void {
    const newState = mediaDeviceManager.toggleAudio();
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

      const iceServers = await this.fetchIceServers();
      groupWebRTCManager.initialize(iceServers, {
        onParticipantStream: (participantId, stream) => {
          useCallStore.getState().setGroupParticipantStream(participantId, stream);
          audioMonitorService.trackStream(participantId, stream);
        },
        onParticipantStreamRemoved: (participantId) => {
          useCallStore.getState().setGroupParticipantStream(participantId, null);
          audioMonitorService.untrackStream(participantId);
        },
        onSendSignal: (toParticipantId, signalData) => {
          const currentCallId = useCallStore.getState().groupCallId;
          if (currentCallId) {
            socket.emit("call:group:signal", {
              callId: currentCallId,
              toUserId: toParticipantId,
              signalData
            });
          }
        },
        onParticipantVideoState: (participantId, videoEnabled) => {
          const p = useCallStore.getState().groupParticipants[participantId];
          if (p) {
            useCallStore.getState().updateGroupParticipantMedia(participantId, p.audioEnabled, videoEnabled);
          }
        },
        onNetworkQualityChange: (quality) => {
          useCallStore.getState().setNetworkQuality(quality);
        }
      });

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
          (res: any) => {
            useCallStore.setState({ isInitiating: false });
            if (res?.success && res.session) {
              useCallStore.getState().setGroupConnected({
                callId: res.callId,
                channelId: params.channelId,
                communityName: params.communityName,
                participants: res.session.participants,
                isVideo: isVideoActual,
                mode: res.session.mode
              });
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

      const iceServers = await this.fetchIceServers();
      groupWebRTCManager.initialize(iceServers, {
        onParticipantStream: (participantId, stream) => {
          useCallStore.getState().setGroupParticipantStream(participantId, stream);
          audioMonitorService.trackStream(participantId, stream);
        },
        onParticipantStreamRemoved: (participantId) => {
          useCallStore.getState().setGroupParticipantStream(participantId, null);
          audioMonitorService.untrackStream(participantId);
        },
        onSendSignal: (toParticipantId, signalData) => {
          socket.emit("call:group:signal", {
            callId: params.callId,
            toUserId: toParticipantId,
            signalData
          });
        },
        onParticipantVideoState: (participantId, videoEnabled) => {
          const p = useCallStore.getState().groupParticipants[participantId];
          if (p) {
            useCallStore.getState().updateGroupParticipantMedia(participantId, p.audioEnabled, videoEnabled);
          }
        },
        onNetworkQualityChange: (quality) => {
          useCallStore.getState().setNetworkQuality(quality);
        }
      });

      groupWebRTCManager.setLocalStream(mediaResult.stream);

      return new Promise((resolve) => {
        socket.emit("call:group:join", { callId: params.callId }, (res: any) => {
          useCallStore.setState({ isInitiating: false });
          if (res?.success && res.session) {
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

            // For each existing participant, ensure peer connection is prepared as answerer
            (res.existingParticipants || []).forEach((p: CallParticipant) => {
              groupWebRTCManager.addPeer(p.userId, false).catch((err) => {
                console.warn("[CallSignalingService] Error preparing peer for", p.userId, err);
              });
            });

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
    const localStream = mediaDeviceManager.getLocalStream();
    if (localStream) {
      store.setLocalStream(localStream);
      audioMonitorService.trackStream("local", localStream);
    }

    if (store.callMode === "group") {
      await groupWebRTCManager.replaceAudioTrack(newTrack);
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
    return mediaDeviceManager.switchAudioOutputDevice(element, sinkId);
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
      const authUserId = socketService.getUserId() || "local";
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
    const socket = socketService.get();
    if (!socket || !store.callId || !store.peerSocketId) return;

    try {
      const offer = await webrtcService.restartIce();
      socket.emit("call:signal", {
        callId: store.callId,
        toSocketId: store.peerSocketId,
        signalData: offer
      });
    } catch (err) {
      console.warn("[CallSignalingService] Failed to trigger ICE restart:", err);
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
    this.remoteAudioElement.play().catch((err) => {
      console.warn("[CallSignalingService] Audio autoplay blocked until user gesture:", err);
    });
  }

  private handleConnectionHealthChange(health: "connecting" | "connected" | "reconnecting" | "failed" | "closed"): void {
    const store = useCallStore.getState();

    if (health === "connected") {
      this.stopConnectingTimer();
      this.stopReconnectingTimer();
      store.setConnected();
      this.startDurationTimer();
    } else if (health === "connecting") {
      store.setConnecting();
    } else if (health === "reconnecting") {
      store.setReconnecting();
      this.startReconnectingTimer();
      // If we are caller, try ICE restart proactively
      if (store.isCaller) {
        this.triggerIceRestart();
      }
    } else if (health === "failed") {
      this.endCall("Connection failed");
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
        this.endCall("Connection timed out");
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
        this.endCall("Reconnection timed out");
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
    webrtcService.close();
    groupWebRTCManager.close();

    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
      this.remoteAudioElement.pause();
    }
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
