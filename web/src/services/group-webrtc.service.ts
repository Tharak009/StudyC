import type { NetworkQuality } from "../types/call.types";

/**
 * GroupMediaTransport
 * Abstract media transport interface allowing future drop-in replacement with an SFU
 * without modifying UI or state management layers.
 */
export interface GroupMediaTransportCallbacks {
  onParticipantStream: (participantId: string, stream: MediaStream) => void;
  onParticipantStreamRemoved: (participantId: string) => void;
  onSendSignal: (toParticipantId: string, signalData: any) => void;
  onParticipantVideoState?: (participantId: string, videoEnabled: boolean) => void;
  onNetworkQualityChange?: (quality: NetworkQuality) => void;
}

export interface GroupMediaTransport {
  initialize(iceServers: RTCIceServer[], callbacks: GroupMediaTransportCallbacks): void;
  setLocalStream(stream: MediaStream): void;
  addPeer(participantId: string, isInitiator: boolean): Promise<void>;
  removePeer(participantId: string): void;
  replaceAudioTrack(track: MediaStreamTrack | null): Promise<void>;
  replaceVideoTrack(track: MediaStreamTrack | null): Promise<void>;
  handleSignal(fromParticipantId: string, signalData: any): Promise<void>;
  getRemoteStream(participantId: string): MediaStream | undefined;
  close(): void;
}

/**
 * MeshGroupWebRTCManager
 * Controlled peer-to-peer WebRTC mesh implementation of GroupMediaTransport.
 * Coordinates multi-participant audio/video connections, tracks, and candidate queues.
 */
export class MeshGroupWebRTCManager implements GroupMediaTransport {
  private iceServers: RTCIceServer[] = [];
  private callbacks: GroupMediaTransportCallbacks | null = null;
  private localStream: MediaStream | null = null;
  private statsTimer: number | null = null;

  private peerConnections = new Map<string, RTCPeerConnection>(); // participantId -> RTCPeerConnection
  private remoteStreams = new Map<string, MediaStream>(); // participantId -> MediaStream
  private audioSenders = new Map<string, RTCRtpSender>(); // participantId -> RTCRtpSender
  private videoSenders = new Map<string, RTCRtpSender>(); // participantId -> RTCRtpSender
  private candidateQueues = new Map<string, RTCIceCandidateInit[]>(); // participantId -> queue

  public initialize(iceServers: RTCIceServer[], callbacks: GroupMediaTransportCallbacks): void {
    this.close();
    this.iceServers = iceServers.length > 0 ? iceServers : [{ urls: "stun:stun.l.google.com:19302" }];
    this.callbacks = callbacks;
    this.startStatsMonitoring();
  }

  private startStatsMonitoring(): void {
    this.stopStatsMonitoring();
    this.statsTimer = window.setInterval(async () => {
      if (this.peerConnections.size === 0) return;
      try {
        let maxRtt = 0;
        let totalLost = 0;
        for (const pc of this.peerConnections.values()) {
          if (pc.connectionState === "connected") {
            const stats = await pc.getStats();
            stats.forEach((report) => {
              if (report.type === "candidate-pair" && (report.state === "succeeded" || report.nominated)) {
                if (report.currentRoundTripTime !== undefined && report.currentRoundTripTime > maxRtt) {
                  maxRtt = report.currentRoundTripTime;
                }
              }
              if (report.type === "inbound-rtp" && report.packetsLost !== undefined) {
                totalLost += report.packetsLost;
              }
            });
          }
        }
        if (maxRtt > 0) {
          if (maxRtt < 0.08 && totalLost < 5) {
            this.callbacks?.onNetworkQualityChange?.("excellent");
          } else if (maxRtt < 0.20 && totalLost < 15) {
            this.callbacks?.onNetworkQualityChange?.("good");
          } else if (maxRtt < 0.40 && totalLost < 35) {
            this.callbacks?.onNetworkQualityChange?.("fair");
          } else {
            this.callbacks?.onNetworkQualityChange?.("poor");
          }
        }
      } catch {}
    }, 3000);
  }

  private stopStatsMonitoring(): void {
    if (this.statsTimer !== null) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
  }

  public setLocalStream(stream: MediaStream): void {
    this.localStream = stream;

    // Attach local tracks to any already-created peer connections
    this.peerConnections.forEach((pc, participantId) => {
      this.attachLocalTracksToPeer(pc, participantId, stream);
    });
  }

  private attachLocalTracksToPeer(pc: RTCPeerConnection, participantId: string, stream: MediaStream): void {
    stream.getTracks().forEach((track) => {
      try {
        const sender = pc.addTrack(track, stream);
        if (track.kind === "audio") {
          this.audioSenders.set(participantId, sender);
        } else if (track.kind === "video") {
          this.videoSenders.set(participantId, sender);
        }
      } catch (err) {
        console.warn(`[MeshGroupWebRTC] Failed to add track to peer ${participantId}:`, err);
      }
    });
  }

  /**
   * Add a peer connection for a participant in the group call
   */
  public async addPeer(participantId: string, isInitiator: boolean): Promise<void> {
    if (this.peerConnections.has(participantId)) {
      return;
    }

    const config: RTCConfiguration = {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 2
    };

    const pc = new RTCPeerConnection(config);
    this.peerConnections.set(participantId, pc);
    this.candidateQueues.set(participantId, []);

    // 1. ICE Candidate Generation
    pc.onicecandidate = (event) => {
      if (event.candidate && this.callbacks) {
        this.callbacks.onSendSignal(participantId, {
          type: "candidate",
          candidate: event.candidate
        });
      }
    };

    // 2. Remote Track Delivery
    pc.ontrack = (event) => {
      let remoteStream = this.remoteStreams.get(participantId);
      if (!remoteStream) {
        remoteStream = new MediaStream();
        this.remoteStreams.set(participantId, remoteStream);
      }

      const trackExists = remoteStream.getTracks().some((t) => t.id === event.track.id);
      if (!trackExists) {
        remoteStream.addTrack(event.track);
      }

      if (event.track.kind === "video") {
        this.callbacks?.onParticipantVideoState?.(participantId, true);
        event.track.onmute = () => this.callbacks?.onParticipantVideoState?.(participantId, false);
        event.track.onunmute = () => this.callbacks?.onParticipantVideoState?.(participantId, true);
        event.track.onended = () => this.callbacks?.onParticipantVideoState?.(participantId, false);
      }

      this.callbacks?.onParticipantStream(participantId, remoteStream);
    };

    // 3. Attach local media if already acquired
    if (this.localStream) {
      this.attachLocalTracksToPeer(pc, participantId, this.localStream);
    }

    // 4. Initiator creates offer
    if (isInitiator) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        this.callbacks?.onSendSignal(participantId, offer);
      } catch (err) {
        console.error(`[MeshGroupWebRTC] Error creating offer for peer ${participantId}:`, err);
      }
    }
  }

  /**
   * Remove a participant's peer connection and streams
   */
  public removePeer(participantId: string): void {
    const pc = this.peerConnections.get(participantId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      try {
        if (pc.signalingState !== "closed") {
          pc.close();
        }
      } catch (err) {
        console.warn(`[MeshGroupWebRTC] Error closing pc for ${participantId}:`, err);
      }
      this.peerConnections.delete(participantId);
    }

    const remoteStream = this.remoteStreams.get(participantId);
    if (remoteStream) {
      remoteStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      this.remoteStreams.delete(participantId);
    }

    this.audioSenders.delete(participantId);
    this.videoSenders.delete(participantId);
    this.candidateQueues.delete(participantId);

    this.callbacks?.onParticipantStreamRemoved(participantId);
  }

  /**
   * Handle incoming WebRTC signal for a participant
   */
  public async handleSignal(fromParticipantId: string, signalData: any): Promise<void> {
    if (!signalData) return;

    // If an offer arrives and no peer connection exists yet, create it as answerer
    if (!this.peerConnections.has(fromParticipantId)) {
      await this.addPeer(fromParticipantId, false);
    }

    const pc = this.peerConnections.get(fromParticipantId);
    if (!pc) return;

    try {
      if (signalData.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        this.drainCandidateQueue(fromParticipantId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.callbacks?.onSendSignal(fromParticipantId, answer);
      } else if (signalData.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        this.drainCandidateQueue(fromParticipantId, pc);
      } else if (signalData.candidate) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        } else {
          const queue = this.candidateQueues.get(fromParticipantId) || [];
          queue.push(signalData.candidate);
          this.candidateQueues.set(fromParticipantId, queue);
        }
      }
    } catch (err) {
      console.error(`[MeshGroupWebRTC] Signal handling error from ${fromParticipantId}:`, err);
    }
  }

  private async drainCandidateQueue(participantId: string, pc: RTCPeerConnection): Promise<void> {
    const queue = this.candidateQueues.get(participantId) || [];
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn(`[MeshGroupWebRTC] Error adding buffered candidate for ${participantId}:`, err);
        }
      }
    }
  }

  /**
   * Hot-swap local audio track across all active peers without renegotiation
   */
  public async replaceAudioTrack(track: MediaStreamTrack | null): Promise<void> {
    for (const sender of this.audioSenders.values()) {
      try {
        await sender.replaceTrack(track);
      } catch (err) {
        console.warn("[MeshGroupWebRTC] Error replacing audio track:", err);
      }
    }
  }

  /**
   * Hot-swap local video track across all active peers without renegotiation
   */
  public async replaceVideoTrack(track: MediaStreamTrack | null): Promise<void> {
    for (const sender of this.videoSenders.values()) {
      try {
        await sender.replaceTrack(track);
      } catch (err) {
        console.warn("[MeshGroupWebRTC] Error replacing video track:", err);
      }
    }
  }

  public getRemoteStream(participantId: string): MediaStream | undefined {
    return this.remoteStreams.get(participantId);
  }

  /**
   * Teardown all peer connections and remote streams idempotently
   */
  public close(): void {
    this.stopStatsMonitoring();
    this.peerConnections.forEach((pc) => {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      try {
        if (pc.signalingState !== "closed") {
          pc.close();
        }
      } catch {}
    });

    this.remoteStreams.forEach((stream) => {
      stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
    });

    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.audioSenders.clear();
    this.videoSenders.clear();
    this.candidateQueues.clear();
    this.localStream = null;
    this.callbacks = null;
  }
}

export const groupWebRTCManager = new MeshGroupWebRTCManager();
