import type { AcquireMediaResult, MediaDeviceInfo } from "../types/call.types";

export type VideoUnavailableCallback = () => void;
export type AudioRecoveredCallback = (newTrack: MediaStreamTrack) => void;
export type AudioUnavailableCallback = () => void;

/**
 * MediaDeviceManager
 * Centralized manager strictly responsible for hardware media lifecycle, device enumeration,
 * permission acquisition, graceful degradation, track failure recovery, and guaranteed hardware track teardown.
 */
export class MediaDeviceManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private deviceChangeListeners: Array<() => void> = [];
  private videoUnavailableListeners: VideoUnavailableCallback[] = [];
  private audioRecoveredListeners: AudioRecoveredCallback[] = [];
  private audioUnavailableListeners: AudioUnavailableCallback[] = [];
  private screenShareEndedListeners: Array<() => void> = [];

  constructor() {
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices.ondevicechange = () => {
        this.deviceChangeListeners.forEach((listener) => {
          try {
            listener();
          } catch (err) {
            console.error("[MediaDeviceManager] Device change listener error:", err);
          }
        });
      };
    }
  }

  /**
   * Acquire local microphone and/or camera stream.
   * If video is requested but fails (no webcam or permission denied), degrades gracefully to audio-only.
   * Attaches track lifecycle monitoring for unplug/device failures.
   */
  public async acquireMedia(audio = true, video = false): Promise<AcquireMediaResult> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("WebRTC media devices are not supported by this browser");
    }

    // Stop any existing stream before acquiring a new one to prevent hardware locking
    this.stopLocalMedia();

    // 1. If video is requested, try video + audio first
    if (video) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audio
            ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              }
            : false,
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
            facingMode: "user"
          }
        });
        this.localStream = stream;
        this.bindTrackLifecycleListeners(stream);
        return { stream, videoAvailable: true };
      } catch (videoErr: any) {
        console.warn("[MediaDeviceManager] Camera acquisition failed, attempting audio fallback:", videoErr);

        // Fall back gracefully to voice/audio-only
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            },
            video: false
          });
          this.localStream = audioStream;
          this.bindTrackLifecycleListeners(audioStream);
          return { stream: audioStream, videoAvailable: false, degradedToVoice: true };
        } catch (audioErr: any) {
          if (audioErr.name === "NotAllowedError" || audioErr.name === "PermissionDeniedError") {
            throw new Error(
              "Microphone access was denied. Please allow microphone access in your browser settings to participate in calls."
            );
          }
          if (audioErr.name === "NotFoundError" || audioErr.name === "DevicesNotFoundError") {
            throw new Error("No microphone hardware found on this device.");
          }
          throw new Error(audioErr.message || "Failed to access microphone");
        }
      }
    }

    // 2. Audio-only acquisition
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      this.localStream = stream;
      this.bindTrackLifecycleListeners(stream);
      return { stream, videoAvailable: false };
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error(
          "Microphone access was denied. Please allow microphone access in your browser settings to participate in calls."
        );
      }
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        throw new Error("No microphone hardware found on this device.");
      }
      if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        throw new Error("Your microphone is currently in use by another application.");
      }
      throw new Error(err.message || "Failed to access microphone");
    }
  }

  /**
   * Guaranteed hardware track teardown.
   * Stops all audio and video tracks immediately to turn off hardware LEDs (webcam & mic).
   */
  public stopLocalMedia(): void {
    this.stopScreenMedia();
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.onended = null;
        try {
          track.stop();
        } catch (err) {
          console.warn("[MediaDeviceManager] Failed to stop local track:", err);
        }
      });
      this.localStream = null;
    }
  }

  /**
   * Monitor track ended events (unplugging, hardware removal, OS revocation)
   */
  private bindTrackLifecycleListeners(stream: MediaStream): void {
    stream.getVideoTracks().forEach((track) => {
      track.onended = () => {
        console.warn("[MediaDeviceManager] Video track ended unexpectedly (device unplugged or revoked)");
        if (this.localStream) {
          this.localStream.removeTrack(track);
        }
        this.videoUnavailableListeners.forEach((listener) => {
          try {
            listener();
          } catch (err) {
            console.error("[MediaDeviceManager] Error in videoUnavailable listener:", err);
          }
        });
      };
    });

    stream.getAudioTracks().forEach((track) => {
      track.onended = async () => {
        console.warn("[MediaDeviceManager] Audio track ended unexpectedly (device unplugged), attempting fallback");
        if (this.localStream) {
          this.localStream.removeTrack(track);
        }

        try {
          // Attempt automatic fallback to default microphone
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false
          });
          const newAudioTrack = fallbackStream.getAudioTracks()[0];
          if (newAudioTrack && this.localStream) {
            this.localStream.addTrack(newAudioTrack);
            this.bindTrackLifecycleListeners(this.localStream);
            this.audioRecoveredListeners.forEach((listener) => {
              try {
                listener(newAudioTrack);
              } catch (err) {
                console.error("[MediaDeviceManager] Error in audioRecovered listener:", err);
              }
            });
            return;
          }
        } catch (err) {
          console.error("[MediaDeviceManager] Audio fallback failed after unplug:", err);
        }

        this.audioUnavailableListeners.forEach((listener) => {
          try {
            listener();
          } catch (err) {
            console.error("[MediaDeviceManager] Error in audioUnavailable listener:", err);
          }
        });
      };
    });
  }

  /**
   * Reacquire or replace video track
   */
  public async reacquireVideoTrack(deviceId?: string): Promise<MediaStreamTrack | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 30 },
              facingMode: "user"
            }
      });
      const newVideoTrack = stream.getVideoTracks()[0];
      if (!newVideoTrack) return null;

      if (this.localStream) {
        // Remove old video tracks
        this.localStream.getVideoTracks().forEach((t) => {
          t.onended = null;
          t.stop();
          this.localStream?.removeTrack(t);
        });
        this.localStream.addTrack(newVideoTrack);
        this.bindTrackLifecycleListeners(this.localStream);
      }
      return newVideoTrack;
    } catch (err) {
      console.warn("[MediaDeviceManager] Failed to reacquire video track:", err);
      return null;
    }
  }

  /**
   * Reacquire or replace audio track
   */
  public async reacquireAudioTrack(deviceId?: string): Promise<MediaStreamTrack | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId
          ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      const newAudioTrack = stream.getAudioTracks()[0];
      if (!newAudioTrack) return null;

      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((t) => {
          t.onended = null;
          t.stop();
          this.localStream?.removeTrack(t);
        });
        this.localStream.addTrack(newAudioTrack);
        this.bindTrackLifecycleListeners(this.localStream);
      }
      return newAudioTrack;
    } catch (err) {
      console.warn("[MediaDeviceManager] Failed to reacquire audio track:", err);
      return null;
    }
  }

  public currentAudioInputId: string | null = null;
  public currentVideoInputId: string | null = null;
  public currentAudioOutputId: string | null = null;

  /**
   * Switch live audio input (microphone) to selected device
   */
  public async switchAudioInputDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    const track = await this.reacquireAudioTrack(deviceId);
    if (track) {
      this.currentAudioInputId = deviceId;
    }
    return track;
  }

  /**
   * Switch live video input (webcam) to selected device
   */
  public async switchVideoInputDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    const track = await this.reacquireVideoTrack(deviceId);
    if (track) {
      this.currentVideoInputId = deviceId;
    }
    return track;
  }

  /**
   * Switch audio output (speaker) where supported
   */
  public async switchAudioOutputDevice(element: HTMLMediaElement, sinkId: string): Promise<boolean> {
    const success = await this.setAudioOutputDevice(element, sinkId);
    if (success) {
      this.currentAudioOutputId = sinkId;
    }
    return success;
  }

  /**
   * Toggle local microphone track (mute/unmute) without destroying peer connection
   */
  public toggleAudio(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    const newState = enabled !== undefined ? enabled : !audioTracks[0].enabled;
    audioTracks.forEach((track) => {
      track.enabled = newState;
    });
    return newState;
  }

  /**
   * Toggle local camera track (video on/off) without recreating peer connection
   */
  public toggleVideo(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;

    const newState = enabled !== undefined ? enabled : !videoTracks[0].enabled;
    videoTracks.forEach((track) => {
      track.enabled = newState;
    });
    return newState;
  }

  /**
   * Enumerate available media devices (microphones, cameras, speakers)
   */
  public async enumerateDevices(): Promise<{
    audioInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  }> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return { audioInputs: [], audioOutputs: [], videoInputs: [] };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs: MediaDeviceInfo[] = [];
      const audioOutputs: MediaDeviceInfo[] = [];
      const videoInputs: MediaDeviceInfo[] = [];

      devices.forEach((dev) => {
        const item: MediaDeviceInfo = {
          deviceId: dev.deviceId,
          label: dev.label || `${dev.kind} (${dev.deviceId.slice(0, 5)}...)`,
          kind: dev.kind as MediaDeviceInfo["kind"]
        };

        if (dev.kind === "audioinput") audioInputs.push(item);
        else if (dev.kind === "audiooutput") audioOutputs.push(item);
        else if (dev.kind === "videoinput") videoInputs.push(item);
      });

      return { audioInputs, audioOutputs, videoInputs };
    } catch (err) {
      console.error("[MediaDeviceManager] Device enumeration failed:", err);
      return { audioInputs: [], audioOutputs: [], videoInputs: [] };
    }
  }

  /**
   * Set audio output device (speaker) where setSinkId is supported
   */
  public async setAudioOutputDevice(element: HTMLMediaElement, sinkId: string): Promise<boolean> {
    if ("setSinkId" in element) {
      try {
        await (element as any).setSinkId(sinkId);
        return true;
      } catch (err) {
        console.warn("[MediaDeviceManager] setSinkId failed:", err);
        return false;
      }
    }
    return false;
  }

  /**
   * Subscribe to device change events (hardware plugged in / removed)
   */
  public onDeviceChange(listener: () => void): () => void {
    this.deviceChangeListeners.push(listener);
    return () => {
      this.deviceChangeListeners = this.deviceChangeListeners.filter((l) => l !== listener);
    };
  }

  public onVideoUnavailable(listener: VideoUnavailableCallback): () => void {
    this.videoUnavailableListeners.push(listener);
    return () => {
      this.videoUnavailableListeners = this.videoUnavailableListeners.filter((l) => l !== listener);
    };
  }

  public onAudioRecovered(listener: AudioRecoveredCallback): () => void {
    this.audioRecoveredListeners.push(listener);
    return () => {
      this.audioRecoveredListeners = this.audioRecoveredListeners.filter((l) => l !== listener);
    };
  }

  public onAudioUnavailable(listener: AudioUnavailableCallback): () => void {
    this.audioUnavailableListeners.push(listener);
    return () => {
      this.audioUnavailableListeners = this.audioUnavailableListeners.filter((l) => l !== listener);
    };
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Acquire screen sharing stream via displayMedia
   */
  public async acquireScreenMedia(): Promise<MediaStream> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing is not supported by this browser");
    }

    this.stopScreenMedia();

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always"
        } as any,
        audio: false
      });

      this.screenStream = screenStream;

      screenStream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          console.info("[MediaDeviceManager] Screen sharing stopped by user (browser native stop)");
          this.stopScreenMedia();
          this.screenShareEndedListeners.forEach((listener) => {
            try {
              listener();
            } catch (err) {
              console.error("[MediaDeviceManager] Error in screenShareEnded listener:", err);
            }
          });
        };
      });

      return screenStream;
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("Screen sharing permission was denied or cancelled");
      }
      throw new Error(err.message || "Failed to start screen sharing");
    }
  }

  /**
   * Stop screen sharing stream
   */
  public stopScreenMedia(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        track.onended = null;
        try {
          track.stop();
        } catch (err) {
          console.warn("[MediaDeviceManager] Failed to stop screen track:", err);
        }
      });
      this.screenStream = null;
    }
  }

  public getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  public isScreenSharing(): boolean {
    return !!this.screenStream && this.screenStream.active && this.screenStream.getVideoTracks().length > 0;
  }

  public onScreenShareEnded(listener: () => void): () => void {
    this.screenShareEndedListeners.push(listener);
    return () => {
      this.screenShareEndedListeners = this.screenShareEndedListeners.filter((l) => l !== listener);
    };
  }
}

export const mediaDeviceManager = new MediaDeviceManager();
