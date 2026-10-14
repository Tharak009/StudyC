import { ConnectionQuality, Room, RoomEvent, Track } from "livekit-client";
import type { NetworkQuality } from "../types/call.types";

export interface DirectVoiceMediaCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onRemoteStreamRemoved: () => void;
  onConnectionState: (state: "connecting" | "connected" | "reconnecting" | "failed") => void;
  onNetworkQuality: (quality: NetworkQuality) => void;
  onMediaReady: () => void;
  refreshAuthorization: () => Promise<{ url: string; token: string }>;
}

/** LiveKit transport for one-to-one audio. Direct video continues to use its existing transport. */
export class DirectLiveKitAudioService {
  private room: Room | null = null;
  private remoteStream: MediaStream | null = null;
  private localTrack: MediaStreamTrack | null = null;
  private localPublished = false;
  private mediaReady = false;
  private tokenRecoveryAttempts = 0;
  private recovering = false;
  private callbacks: DirectVoiceMediaCallbacks | null = null;

  public async connect(url: string, token: string, localStream: MediaStream, callbacks: DirectVoiceMediaCallbacks): Promise<void> {
    if (this.room) throw new Error("A voice call media connection is already active");
    const microphone = localStream.getAudioTracks().find((track) => track.readyState === "live");
    if (!microphone) throw new Error("A working microphone is required to join this voice call");
    if (!url || !token) throw new Error("Voice call authorization is missing. Please try again.");

    const room = new Room({ adaptiveStream: true, dynacast: true, stopLocalTrackOnUnpublish: false });
    this.room = room;
    if (this.callbacks !== callbacks) this.tokenRecoveryAttempts = 0;
    this.callbacks = callbacks;
    this.localTrack = microphone;
    this.localPublished = false;
    this.mediaReady = false;
    this.remoteStream = null;
    callbacks.onConnectionState("connecting");

    room.on(RoomEvent.TrackSubscribed, (track, publication) => {
      if (this.room !== room || track.kind !== Track.Kind.Audio || publication.source !== Track.Source.Microphone) return;
      let stream = this.remoteStream;
      if (!stream) stream = this.remoteStream = new MediaStream();
      if (!stream.getTracks().some((existing) => existing.id === track.mediaStreamTrack.id)) {
        stream.addTrack(track.mediaStreamTrack);
      }
      callbacks.onRemoteStream(stream);
      this.notifyMediaReady();
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (this.room !== room || track.kind !== Track.Kind.Audio || !this.remoteStream) return;
      this.remoteStream.getTracks().filter((item) => item.id === track.mediaStreamTrack.id).forEach((item) => this.remoteStream?.removeTrack(item));
      if (this.remoteStream.getAudioTracks().length === 0) {
        this.remoteStream = null;
        this.mediaReady = false;
        callbacks.onRemoteStreamRemoved();
      } else callbacks.onRemoteStream(this.remoteStream);
    });

    room.on(RoomEvent.Reconnecting, () => {
      this.mediaReady = false;
      callbacks.onConnectionState("reconnecting");
    });
    room.on(RoomEvent.Reconnected, () => {
      if (this.room !== room) return;
      this.mediaReady = false;
      callbacks.onConnectionState("connected");
      this.notifyMediaReady();
    });
    room.on(RoomEvent.Disconnected, () => {
      if (this.room === room) void this.recoverWithFreshAuthorization(room, callbacks);
    });
    room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (participant.isLocal) callbacks.onNetworkQuality(this.mapQuality(quality));
    });
    room.on(RoomEvent.TrackSubscriptionFailed, (_trackSid, participant) => {
      if (this.room === room) console.warn("[DirectLiveKitAudio] Could not subscribe to remote audio", participant.identity);
    });

    try {
      await room.connect(url, token, { autoSubscribe: true });
      if (this.room !== room) return;
      const activeMicrophone = this.localTrack?.readyState === "live" ? this.localTrack : microphone;
      const publication = await room.localParticipant.publishTrack(activeMicrophone, { source: Track.Source.Microphone });
      if (this.room !== room) {
        await room.localParticipant.unpublishTrack(microphone, false).catch(() => undefined);
        return;
      }
      this.localPublished = Boolean(publication);
      this.localTrack = activeMicrophone;
      if (!activeMicrophone.enabled) await publication.track?.mute();
      callbacks.onConnectionState("connected");
      this.notifyMediaReady();
    } catch (error) {
      if (this.room === room) this.close();
      callbacks.onConnectionState("failed");
      throw error;
    }
  }

  private notifyMediaReady(): void {
    if (this.mediaReady || !this.localPublished || !this.remoteStream?.getAudioTracks().length) return;
    this.mediaReady = true;
    this.callbacks?.onMediaReady();
  }

  private async recoverWithFreshAuthorization(room: Room, callbacks: DirectVoiceMediaCallbacks): Promise<void> {
    if (this.room !== room || this.recovering) return;
    if (this.tokenRecoveryAttempts >= 2 || !this.localTrack || this.localTrack.readyState !== "live") {
      callbacks.onConnectionState("failed");
      return;
    }

    this.recovering = true;
    this.tokenRecoveryAttempts += 1;
    callbacks.onConnectionState("reconnecting");
    this.mediaReady = false;
    this.localPublished = false;
    this.room = null;
    room.removeAllListeners();
    const remote = this.remoteStream;
    this.remoteStream = null;
    remote?.getTracks().forEach((track) => { track.onended = null; track.stop(); });
    callbacks.onRemoteStreamRemoved();

    try {
      await room.disconnect(false);
      const credentials = await callbacks.refreshAuthorization();
      if (!this.callbacks || this.localTrack?.readyState !== "live") return;
      await this.connect(credentials.url, credentials.token, new MediaStream([this.localTrack]), callbacks);
    } catch (error) {
      console.warn("[DirectLiveKitAudio] Could not restore the voice session:", error);
      callbacks.onConnectionState("failed");
    } finally {
      this.recovering = false;
    }
  }

  public isConnected(): boolean {
    return this.room?.state === "connected" && this.mediaReady;
  }

  public async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    const publication = this.room?.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (!publication?.track) return;
    if (enabled) await publication.track.unmute();
    else await publication.track.mute();
  }

  public async replaceMicrophoneTrack(track: MediaStreamTrack): Promise<void> {
    const room = this.room;
    if (track.readyState !== "live") return;
    if (!room || room.state !== "connected") {
      this.localTrack = track;
      return;
    }
    const previous = this.localTrack;
    if (previous) await room.localParticipant.unpublishTrack(previous, false);
    const publication = await room.localParticipant.publishTrack(track, { source: Track.Source.Microphone });
    if (!track.enabled) await publication.track?.mute();
    this.localTrack = track;
    this.localPublished = true;
    this.mediaReady = false;
    this.notifyMediaReady();
  }

  public close(): void {
    const room = this.room;
    this.room = null;
    const remote = this.remoteStream;
    this.remoteStream = null;
    remote?.getTracks().forEach((track) => { track.onended = null; track.stop(); });
    this.localTrack = null;
    this.localPublished = false;
    this.mediaReady = false;
    this.tokenRecoveryAttempts = 0;
    this.recovering = false;
    this.callbacks?.onRemoteStreamRemoved();
    this.callbacks = null;
    if (room) {
      room.removeAllListeners();
      void room.disconnect(false).catch((error) => console.warn("[DirectLiveKitAudio] Disconnect failed:", error));
    }
  }

  private mapQuality(quality: ConnectionQuality): NetworkQuality {
    if (quality === ConnectionQuality.Excellent) return "excellent";
    if (quality === ConnectionQuality.Good) return "good";
    if (quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost) return "poor";
    return "good";
  }
}

export const directLiveKitAudioService = new DirectLiveKitAudioService();
