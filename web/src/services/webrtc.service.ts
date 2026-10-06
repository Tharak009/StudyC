import type { NetworkQuality } from "../types/call.types";
import { STATS_POLL_INTERVAL_MS } from "../constants/call.constants";

export type ConnectionHealth = "connecting" | "connected" | "reconnecting" | "failed" | "closed";

/**
 * WebRTCService
 * Dedicated 1-to-1 WebRTC peer connection manager for voice and video calling.
 * Handles RTCPeerConnection lifecycle, SDP offer/answer exchanges, ICE candidate buffering,
 * ICE restart, track replacement, network quality monitoring, and state synthesis.
 */
export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];
  private remoteStream: MediaStream | null = null;
  private videoSender: RTCRtpSender | null = null;
  private audioSender: RTCRtpSender | null = null;
  private onRemoteVideoStateChange?: (videoEnabled: boolean) => void;
  private onHealthChange?: (health: ConnectionHealth) => void;
  private onNetworkQualityChange?: (quality: NetworkQuality) => void;
  private statsTimer: number | null = null;
  private isNegotiating = false;

  /**
   * Initializes a new RTCPeerConnection with configured ICE servers
   */
  public initializeConnection(
    iceServers: RTCIceServer[],
    onRemoteStream: (stream: MediaStream) => void,
    onHealthChange: (health: ConnectionHealth) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onRemoteVideoChange?: (videoEnabled: boolean) => void,
    onNetworkQualityChange?: (quality: NetworkQuality) => void
  ): RTCPeerConnection {
    this.close();

    const config: RTCConfiguration = {
      iceServers: iceServers.length > 0 ? iceServers : [{ urls: "stun:stun.l.google.com:19302" }],
      iceCandidatePoolSize: 2
    };

    const pc = new RTCPeerConnection(config);
    this.peerConnection = pc;
    this.remoteStream = new MediaStream();
    this.onRemoteVideoStateChange = onRemoteVideoChange;
    this.onHealthChange = onHealthChange;
    this.onNetworkQualityChange = onNetworkQualityChange;
    this.isNegotiating = false;

    // ICE Candidate Generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    // Remote Track Listener
    pc.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }

      // Add track to remote stream if not already present
      const trackExists = this.remoteStream.getTracks().some((t) => t.id === event.track.id);
      if (!trackExists) {
        this.remoteStream.addTrack(event.track);
      }

      // Track mute / unmute / ended events for remote camera state
      if (event.track.kind === "video") {
        this.onRemoteVideoStateChange?.(true);

        event.track.onmute = () => {
          this.onRemoteVideoStateChange?.(false);
        };
        event.track.onunmute = () => {
          this.onRemoteVideoStateChange?.(true);
        };
        event.track.onended = () => {
          this.onRemoteVideoStateChange?.(false);
        };
      }

      onRemoteStream(this.remoteStream);
    };

    // Connection State Changes
    pc.onconnectionstatechange = () => {
      this.evaluateConnectionHealth();
    };

    // ICE Connection State Changes
    pc.oniceconnectionstatechange = () => {
      this.evaluateConnectionHealth();
    };

    // Signaling State Changes
    pc.onsignalingstatechange = () => {
      if (pc.signalingState === "stable") {
        this.isNegotiating = false;
      }
    };

    return pc;
  }

  /**
   * Synthesize overall connection health from RTCPeerConnection and ICE states
   */
  private evaluateConnectionHealth(): void {
    if (!this.peerConnection) return;
    const pc = this.peerConnection;
    const connState = pc.connectionState;
    const iceState = pc.iceConnectionState;

    if (connState === "connected" && (iceState === "connected" || iceState === "completed")) {
      this.onHealthChange?.("connected");
      this.startStatsMonitoring();
    } else if (connState === "connecting" || iceState === "checking") {
      this.onHealthChange?.("connecting");
    } else if (connState === "disconnected" || iceState === "disconnected") {
      // Temporary network interruption -> Reconnecting
      this.onHealthChange?.("reconnecting");
      this.onNetworkQualityChange?.("reconnecting");
    } else if (connState === "failed" || iceState === "failed") {
      // Connection failure -> Attempt recovery or fail
      this.onHealthChange?.("failed");
      this.onNetworkQualityChange?.("poor");
    } else if (connState === "closed" || iceState === "closed") {
      this.onHealthChange?.("closed");
      this.stopStatsMonitoring();
    }
  }

  /**
   * Periodic WebRTC stats polling for network quality metric
   */
  private startStatsMonitoring(): void {
    this.stopStatsMonitoring();
    this.statsTimer = window.setInterval(async () => {
      if (!this.peerConnection || this.peerConnection.connectionState !== "connected") {
        return;
      }

      try {
        const stats = await this.peerConnection.getStats();
        let currentRtt = 0;
        let packetsLost = 0;

        stats.forEach((report) => {
          if (report.type === "candidate-pair" && (report.state === "succeeded" || report.nominated)) {
            if (report.currentRoundTripTime !== undefined) {
              currentRtt = report.currentRoundTripTime;
            }
          }
          if (report.type === "inbound-rtp" && report.packetsLost !== undefined) {
            packetsLost = report.packetsLost;
          }
        });

        if (currentRtt > 0) {
          if (currentRtt < 0.15 && packetsLost < 5) {
            this.onNetworkQualityChange?.("good");
          } else if (currentRtt < 0.35 && packetsLost < 20) {
            this.onNetworkQualityChange?.("fair");
          } else {
            this.onNetworkQualityChange?.("poor");
          }
        }
      } catch {
        // Stats query failure ignored
      }
    }, STATS_POLL_INTERVAL_MS);
  }

  private stopStatsMonitoring(): void {
    if (this.statsTimer !== null) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
  }

  /**
   * Attach local media stream tracks to RTCPeerConnection
   */
  public addLocalStream(stream: MediaStream): void {
    if (!this.peerConnection) return;

    stream.getTracks().forEach((track) => {
      if (!this.peerConnection) return;
      const sender = this.peerConnection.addTrack(track, stream);
      if (track.kind === "video") {
        this.videoSender = sender;
      } else if (track.kind === "audio") {
        this.audioSender = sender;
      }
    });
  }

  /**
   * Generate SDP Offer (Caller)
   */
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized");
    }

    this.isNegotiating = true;
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * ICE Restart: Generates a new SDP offer with iceRestart flag to recover a disrupted call
   */
  public async restartIce(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection || this.peerConnection.signalingState === "closed") {
      throw new Error("Cannot restart ICE: peer connection unavailable or closed");
    }

    console.log("[WebRTCService] Triggering ICE restart to recover disrupted connection...");
    this.isNegotiating = true;
    const offer = await this.peerConnection.createOffer({
      iceRestart: true,
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Generate SDP Answer (Callee)
   */
  public async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized");
    }

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.isNegotiating = false;
    return answer;
  }

  /**
   * Apply Remote Session Description with ICE candidate draining
   */
  public async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized");
    }

    // Glare handling: if offer received while we have local offer and state is not stable
    if (desc.type === "offer" && this.peerConnection.signalingState !== "stable") {
      console.warn("[WebRTCService] Handling glare: rolling back local offer");
      await this.peerConnection.setLocalDescription({ type: "rollback" });
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(desc));

    // Drain queued ICE candidates that arrived before remote description was set
    while (this.iceCandidatesQueue.length > 0) {
      const candidate = this.iceCandidatesQueue.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("[WebRTCService] Failed to add buffered ICE candidate:", err);
        }
      }
    }
  }

  /**
   * Add ICE Candidate with queue buffering if remote description isn't set yet
   */
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.iceCandidatesQueue.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("[WebRTCService] Error adding ICE candidate:", err);
    }
  }

  /**
   * Replace audio track without peer connection renegotiation
   */
  public async replaceAudioTrack(newTrack: MediaStreamTrack | null): Promise<boolean> {
    if (!this.audioSender) return false;
    try {
      await this.audioSender.replaceTrack(newTrack);
      return true;
    } catch (err) {
      console.error("[WebRTCService] Error replacing audio track:", err);
      return false;
    }
  }

  /**
   * Replace video track without peer connection renegotiation
   */
  public async replaceVideoTrack(newTrack: MediaStreamTrack | null): Promise<boolean> {
    if (!this.videoSender) return false;
    try {
      await this.videoSender.replaceTrack(newTrack);
      return true;
    } catch (err) {
      console.error("[WebRTCService] Error replacing video track:", err);
      return false;
    }
  }

  /**
   * Graceful connection teardown and cleanup (Idempotent)
   */
  public close(): void {
    this.stopStatsMonitoring();

    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;

      try {
        if (this.peerConnection.signalingState !== "closed") {
          this.peerConnection.close();
        }
      } catch (err) {
        console.warn("[WebRTCService] Error closing peer connection:", err);
      }
      this.peerConnection = null;
    }

    this.iceCandidatesQueue = [];
    this.remoteStream = null;
    this.videoSender = null;
    this.audioSender = null;
    this.onRemoteVideoStateChange = undefined;
    this.onHealthChange = undefined;
    this.onNetworkQualityChange = undefined;
    this.isNegotiating = false;
  }

  public getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }

  public getIceConnectionState(): RTCIceConnectionState | null {
    return this.peerConnection?.iceConnectionState || null;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
}

export const webrtcService = new WebRTCService();
