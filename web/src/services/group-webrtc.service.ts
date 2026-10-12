import {
  ConnectionQuality,
  Room,
  RoomEvent,
  Track,
  type DisconnectReason,
  type RemoteTrackPublication
} from "livekit-client";
import type { NetworkQuality } from "../types/call.types";

/** Provider-neutral callbacks consumed by the existing call store and presentation. */
export interface GroupMediaTransportCallbacks {
  onParticipantStream: (participantId: string, stream: MediaStream) => void;
  onParticipantStreamRemoved: (participantId: string) => void;
  onSendSignal?: (toParticipantId: string, signalData: unknown) => void;
  onParticipantVideoState?: (participantId: string, videoEnabled: boolean) => void;
  onParticipantMediaState?: (participantId: string, audioEnabled: boolean, videoEnabled: boolean) => void;
  onParticipantConnected?: (participantId: string, name: string, role?: string) => void;
  onParticipantDisconnected?: (participantId: string, reason?: DisconnectReason) => void;
  onNetworkQualityChange?: (quality: NetworkQuality) => void;
  onConnectionStateChange?: (state: "connecting" | "connected" | "reconnecting" | "failed") => void;
  onActiveSpeakerChange?: (participantId: string | null) => void;
  onScreenShareChanged?: (participantId: string, participantName: string, stream: MediaStream | null, local: boolean) => void;
}

export interface GroupMediaTransport {
  initialize(iceServers: RTCIceServer[], callbacks: GroupMediaTransportCallbacks): void;
  setLocalStream(stream: MediaStream): void;
  connect(url: string, token: string, canPublish: boolean): Promise<void>;
  setCanPublish(canPublish: boolean): Promise<void>;
  startScreenShare(): Promise<void>;
  stopScreenShare(): Promise<void>;
  addPeer(participantId: string, isInitiator: boolean): Promise<void>;
  removePeer(participantId: string): void;
  replaceAudioTrack(track: MediaStreamTrack | null): Promise<void>;
  replaceVideoTrack(track: MediaStreamTrack | null): Promise<void>;
  handleSignal(fromParticipantId: string, signalData: unknown): Promise<void>;
  getRemoteStream(participantId: string): MediaStream | undefined;
  close(): void;
}

/** LiveKit SFU transport for multi-participant calls. Direct calls use webrtc.service.ts. */
export class LiveKitGroupMediaManager implements GroupMediaTransport {
  private room: Room | null = null;
  private callbacks: GroupMediaTransportCallbacks | null = null;
  private localStream: MediaStream | null = null;
  private canPublish = false;
  private audioTrack: MediaStreamTrack | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private remoteStreams = new Map<string, MediaStream>();
  private remoteScreenStreams = new Map<string, MediaStream>();
  private screenShareStarting = false;
  private screenShareStopping = false;
  private readonly maxVideoSubscriptions = 9;

  public initialize(_iceServers: RTCIceServer[], callbacks: GroupMediaTransportCallbacks): void {
    this.close();
    this.callbacks = callbacks;
  }

  public setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    if (this.room?.state === "connected") {
      void this.publishInitialTracks();
    }
  }

  public async connect(url: string, token: string, canPublish: boolean): Promise<void> {
    if (!url || !token) throw new Error("The group media authorization token is missing");
    if (this.room) throw new Error("A group media session is already connected");

    this.canPublish = canPublish;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      stopLocalTrackOnUnpublish: false
    });
    this.room = room;
    this.bindRoomEvents(room);
    this.callbacks?.onConnectionStateChange?.("connecting");

    try {
      await room.connect(url, token, { autoSubscribe: false });
      if (this.room !== room) return;
      this.callbacks?.onConnectionStateChange?.("connected");
      room.remoteParticipants.forEach((participant) => this.callbacks?.onParticipantConnected?.(
        participant.identity,
        participant.name || "StudyConnect member",
        participant.attributes?.role
      ));
      await this.publishInitialTracks();
      this.refreshVideoSubscriptions();
    } catch (error) {
      if (this.room === room) this.close();
      this.callbacks?.onConnectionStateChange?.("failed");
      throw error;
    }
  }

  public async setCanPublish(canPublish: boolean): Promise<void> {
    this.canPublish = canPublish;
    const room = this.room;
    if (!room || room.state !== "connected") return;
    if (canPublish) {
      await this.publishInitialTracks();
      return;
    }
    if (this.audioTrack) await room.localParticipant.unpublishTrack(this.audioTrack, false);
    if (this.videoTrack) await room.localParticipant.unpublishTrack(this.videoTrack, false);
    await this.stopScreenShare();
    this.audioTrack = null;
    this.videoTrack = null;
  }

  /** Uses LiveKit's browser capture flow; the browser owns the source picker and consent. */
  public async startScreenShare(): Promise<void> {
    const room = this.room;
    if (!room || room.state !== "connected") throw new Error("Join the meeting before sharing your screen.");
    if (!this.canPublish) throw new Error("You do not have permission to share in this meeting.");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing is not supported by this browser.");
    }
    if (room.localParticipant.getTrackPublication(Track.Source.ScreenShare) || this.screenShareStarting) return;
    this.screenShareStarting = true;
    try {
      await room.localParticipant.setScreenShareEnabled(true, {
        audio: false,
        video: true,
        contentHint: "detail",
        surfaceSwitching: "include"
      });
      // The user may keep the native picker open while leaving the meeting.
      // If capture resolves after that connection has closed, immediately unpublish
      // and stop the newly acquired track instead of leaking desktop capture.
      if (this.room !== room || room.state !== "connected" || !this.canPublish) {
        const publication = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        if (publication?.track) {
          const captureTrack = publication.track.mediaStreamTrack;
          await room.localParticipant.unpublishTrack(publication.track, true).catch(() => undefined);
          if (captureTrack.readyState !== "ended") captureTrack.stop();
        }
      }
    } finally {
      this.screenShareStarting = false;
    }
  }

  public async stopScreenShare(): Promise<void> {
    const room = this.room;
    if (!room || room.state === "disconnected" || this.screenShareStopping) return;
    this.screenShareStopping = true;
    try {
      await room.localParticipant.setScreenShareEnabled(false);
    } finally {
      this.screenShareStopping = false;
    }
  }

  public async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    const publication = Array.from(this.room?.localParticipant.audioTrackPublications.values() || [])
      .find((item) => item.source === Track.Source.Microphone);
    if (!publication?.track) return;
    if (enabled) await publication.track.unmute();
    else await publication.track.mute();
  }

  public async setCameraEnabled(enabled: boolean): Promise<void> {
    const publication = Array.from(this.room?.localParticipant.videoTrackPublications.values() || [])
      .find((item) => item.source === Track.Source.Camera);
    if (!publication?.track) return;
    if (enabled) await publication.track.unmute();
    else await publication.track.mute();
  }

  private bindRoomEvents(room: Room): void {
    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      const id = participant.identity;
      const publication = _publication;
      if (publication.source === Track.Source.ScreenShare) {
        let screenStream = this.remoteScreenStreams.get(id);
        if (!screenStream) {
          screenStream = new MediaStream();
          this.remoteScreenStreams.set(id, screenStream);
        }
        if (!screenStream.getTracks().some((existing) => existing.id === track.mediaStreamTrack.id)) {
          screenStream.addTrack(track.mediaStreamTrack);
        }
        track.mediaStreamTrack.onended = () => this.removeRemoteScreenTrack(id, track.mediaStreamTrack);
        this.callbacks?.onScreenShareChanged?.(id, participant.name || "StudyConnect member", screenStream, false);
        return;
      }
      if (publication.source === Track.Source.ScreenShareAudio) return;
      let stream = this.remoteStreams.get(id);
      if (!stream) {
        stream = new MediaStream();
        this.remoteStreams.set(id, stream);
      }
      if (!stream.getTracks().some((existing) => existing.id === track.mediaStreamTrack.id)) {
        stream.addTrack(track.mediaStreamTrack);
      }
      track.mediaStreamTrack.onended = () => this.removeRemoteTrack(id, track.mediaStreamTrack);
      this.callbacks?.onParticipantStream(id, stream);
      this.emitParticipantMediaState(participant);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      if (publication.source === Track.Source.ScreenShare) {
        this.removeRemoteScreenTrack(participant.identity, track.mediaStreamTrack);
        return;
      }
      if (publication.source === Track.Source.ScreenShareAudio) return;
      this.removeRemoteTrack(participant.identity, track.mediaStreamTrack);
      if (track.kind === Track.Kind.Video) this.callbacks?.onParticipantVideoState?.(participant.identity, false);
      this.emitParticipantMediaState(participant);
    });

    room.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
      if (publication.source !== Track.Source.ScreenShare || !publication.track) return;
      const stream = new MediaStream([publication.track.mediaStreamTrack]);
      this.callbacks?.onScreenShareChanged?.(participant.identity, participant.name || "You", stream, true);
    });
    room.on(RoomEvent.LocalTrackUnpublished, (publication, participant) => {
      if (publication.source === Track.Source.ScreenShare) {
        // This Room uses stopLocalTrackOnUnpublish:false to retain the meeting's
        // microphone/camera tracks; screen capture is owned by this share and must stop.
        publication.track?.mediaStreamTrack.stop();
        this.callbacks?.onScreenShareChanged?.(participant.identity, participant.name || "You", null, true);
      }
    });

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      this.callbacks?.onParticipantConnected?.(participant.identity, participant.name || "StudyConnect member", participant.attributes?.role);
      this.refreshVideoSubscriptions();
    });
    room.on(RoomEvent.ParticipantDisconnected, (participant, reason) => {
      this.removeRemoteParticipant(participant.identity);
      this.callbacks?.onParticipantDisconnected?.(participant.identity, reason);
      this.refreshVideoSubscriptions();
    });

    room.on(RoomEvent.TrackPublished, () => this.refreshVideoSubscriptions());
    room.on(RoomEvent.TrackUnpublished, () => this.refreshVideoSubscriptions());
    room.on(RoomEvent.TrackMuted, (_publication, participant) => this.emitParticipantMediaState(participant));
    room.on(RoomEvent.TrackUnmuted, (_publication, participant) => this.emitParticipantMediaState(participant));

    room.on(RoomEvent.Reconnecting, () => this.callbacks?.onConnectionStateChange?.("reconnecting"));
    room.on(RoomEvent.Reconnected, () => {
      this.callbacks?.onConnectionStateChange?.("connected");
      this.refreshVideoSubscriptions();
    });
    room.on(RoomEvent.Disconnected, () => {
      if (this.room === room) this.callbacks?.onConnectionStateChange?.("failed");
    });
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const remoteSpeaker = speakers.find((speaker) => !speaker.isLocal);
      this.callbacks?.onActiveSpeakerChange?.(remoteSpeaker?.identity || null);
      this.refreshVideoSubscriptions(remoteSpeaker?.identity);
    });
    room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (participant.isLocal) this.callbacks?.onNetworkQualityChange?.(this.mapQuality(quality));
    });
  }

  private async publishInitialTracks(): Promise<void> {
    const room = this.room;
    if (!room || !this.canPublish || room.state !== "connected" || !this.localStream) return;
    const audio = this.localStream.getAudioTracks()[0];
    const video = this.localStream.getVideoTracks()[0];
    if (audio && audio.readyState === "live" && !this.audioTrack) {
      await room.localParticipant.publishTrack(audio, { source: Track.Source.Microphone });
      this.audioTrack = audio;
    }
    if (video && video.readyState === "live" && !this.videoTrack) {
      await room.localParticipant.publishTrack(video, { source: Track.Source.Camera });
      this.videoTrack = video;
    }
  }

  /** Keep audio subscribed, while bounding simultaneous remote video decodes for larger calls. */
  private refreshVideoSubscriptions(activeSpeakerId?: string): void {
    const room = this.room;
    if (!room) return;
    const participants = Array.from(room.remoteParticipants.values());
    participants.forEach((participant) => participant.audioTrackPublications.forEach((publication) => {
      (publication as RemoteTrackPublication).setSubscribed(true);
    }));
    // Screen content is the primary shared surface and must not be starved by the camera cap.
    participants.forEach((participant) => {
      participant.getTrackPublications().forEach((publication) => {
        if (publication.source === Track.Source.ScreenShare || publication.source === Track.Source.ScreenShareAudio) {
          (publication as RemoteTrackPublication).setSubscribed(true);
        }
      });
    });
    const publications = participants.flatMap((participant) =>
      Array.from(participant.videoTrackPublications.values())
        .filter((publication) => publication.source === Track.Source.Camera)
        .map((publication) => ({ participant, publication }))
    );
    publications.sort((a, b) => {
      if (a.participant.identity === activeSpeakerId) return -1;
      if (b.participant.identity === activeSpeakerId) return 1;
      return 0;
    });
    publications.forEach(({ publication }, index) => {
      (publication as RemoteTrackPublication).setSubscribed(index < this.maxVideoSubscriptions);
    });
  }

  private removeRemoteScreenTrack(participantId: string, track: MediaStreamTrack): void {
    const stream = this.remoteScreenStreams.get(participantId);
    if (!stream) return;
    track.onended = null;
    stream.getTracks().filter((item) => item.id === track.id).forEach((item) => stream.removeTrack(item));
    if (stream.getTracks().length === 0) {
      this.remoteScreenStreams.delete(participantId);
      this.callbacks?.onScreenShareChanged?.(participantId, "", null, false);
    } else {
      const participant = this.room?.remoteParticipants.get(participantId);
      this.callbacks?.onScreenShareChanged?.(participantId, participant?.name || "StudyConnect member", stream, false);
    }
  }

  private removeRemoteTrack(participantId: string, track: MediaStreamTrack): void {
    const stream = this.remoteStreams.get(participantId);
    if (!stream) return;
    stream.getTracks().filter((item) => item.id === track.id).forEach((item) => stream.removeTrack(item));
    if (stream.getTracks().length === 0) {
      this.remoteStreams.delete(participantId);
      this.callbacks?.onParticipantStreamRemoved(participantId);
    } else {
      this.callbacks?.onParticipantStream(participantId, stream);
    }
  }

  private removeRemoteParticipant(participantId: string): void {
    const stream = this.remoteStreams.get(participantId);
    stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    this.remoteStreams.delete(participantId);
    this.callbacks?.onParticipantStreamRemoved(participantId);
    const screenStream = this.remoteScreenStreams.get(participantId);
    screenStream?.getTracks().forEach((track) => { track.onended = null; track.stop(); });
    this.remoteScreenStreams.delete(participantId);
    this.callbacks?.onScreenShareChanged?.(participantId, "", null, false);
  }

  private emitParticipantMediaState(participant: { identity: string; isMicrophoneEnabled: boolean; isCameraEnabled: boolean }): void {
    this.callbacks?.onParticipantMediaState?.(
      participant.identity,
      participant.isMicrophoneEnabled,
      participant.isCameraEnabled
    );
    this.callbacks?.onParticipantVideoState?.(participant.identity, participant.isCameraEnabled);
  }

  private mapQuality(quality: ConnectionQuality): NetworkQuality {
    if (quality === ConnectionQuality.Excellent) return "excellent";
    if (quality === ConnectionQuality.Good) return "good";
    if (quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost) return "poor";
    return "good";
  }

  public async addPeer(_participantId: string, _isInitiator: boolean): Promise<void> {
    // SFU subscriptions are managed by LiveKit; participants do not get peer connections.
  }

  public removePeer(participantId: string): void {
    this.removeRemoteParticipant(participantId);
  }

  public async replaceAudioTrack(track: MediaStreamTrack | null): Promise<void> {
    const room = this.room;
    if (!room || !this.canPublish) return;
    if (this.audioTrack) {
      await room.localParticipant.unpublishTrack(this.audioTrack, false);
      this.audioTrack = null;
    }
    if (track && track.readyState === "live") {
      await room.localParticipant.publishTrack(track, { source: Track.Source.Microphone });
      this.audioTrack = track;
    }
  }

  public async replaceVideoTrack(track: MediaStreamTrack | null): Promise<void> {
    const room = this.room;
    if (!room || !this.canPublish) return;
    if (this.videoTrack) {
      await room.localParticipant.unpublishTrack(this.videoTrack, false);
      this.videoTrack = null;
    }
    if (track && track.readyState === "live") {
      await room.localParticipant.publishTrack(track, { source: Track.Source.Camera });
      this.videoTrack = track;
    }
  }

  public async handleSignal(_fromParticipantId: string, _signalData: unknown): Promise<void> {
    // Legacy mesh offers and ICE candidates are intentionally not used by group calls.
  }

  public getRemoteStream(participantId: string): MediaStream | undefined {
    return this.remoteStreams.get(participantId);
  }

  public close(): void {
    const room = this.room;
    this.room = null;
    this.audioTrack = null;
    this.videoTrack = null;
    this.remoteStreams.forEach((stream) => stream.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    }));
    this.remoteStreams.clear();
    this.remoteScreenStreams.forEach((stream) => stream.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    }));
    this.remoteScreenStreams.clear();
    this.screenShareStarting = false;
    this.screenShareStopping = false;
    if (room) {
      const screenCaptureTracks = [
        room.localParticipant.getTrackPublication(Track.Source.ScreenShare)?.track?.mediaStreamTrack,
        room.localParticipant.getTrackPublication(Track.Source.ScreenShareAudio)?.track?.mediaStreamTrack
      ].filter((track): track is MediaStreamTrack => Boolean(track));
      void (async () => {
        try { await room.localParticipant.setScreenShareEnabled(false); } catch { /* Screen capture may already have ended. */ }
        screenCaptureTracks.forEach((track) => { if (track.readyState !== "ended") track.stop(); });
        room.removeAllListeners();
        await room.disconnect(false);
      })().catch((error) => {
        console.warn("[LiveKitGroupMedia] Error disconnecting room:", error);
      });
    }
    this.localStream = null;
    this.canPublish = false;
    this.callbacks = null;
  }
}

export const groupWebRTCManager = new LiveKitGroupMediaManager();
