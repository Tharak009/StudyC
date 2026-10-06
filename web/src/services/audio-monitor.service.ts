import { ACTIVE_SPEAKER_POLL_INTERVAL_MS, ACTIVE_SPEAKER_THRESHOLD } from "../constants/call.constants";

interface MonitoredNode {
  id: string;
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  dataArray: Uint8Array;
}

export type ActiveSpeakerListener = (speakerId: string | null) => void;

/**
 * AudioMonitorService
 * Real-time active speaker detector using the Web Audio API.
 * Computes deterministic RMS volume across local and remote audio streams.
 */
export class AudioMonitorService {
  private audioContext: AudioContext | null = null;
  private nodes: Map<string, MonitoredNode> = new Map();
  private pollTimer: number | null = null;
  private currentActiveSpeakerId: string | null = null;
  private listeners: Set<ActiveSpeakerListener> = new Set();

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch((err) => {
        console.warn("[AudioMonitorService] Failed to resume AudioContext:", err);
      });
    }
    return this.audioContext;
  }

  /**
   * Track an audio stream for active speaking
   */
  public trackStream(id: string, stream: MediaStream): void {
    if (!stream || stream.getAudioTracks().length === 0) {
      this.untrackStream(id);
      return;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Remove existing if any
    this.untrackStream(id);

    try {
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);

      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);

      this.nodes.set(id, {
        id,
        stream,
        source,
        analyser,
        dataArray
      });

      this.ensurePolling();
    } catch (err) {
      console.warn(`[AudioMonitorService] Could not track audio for ${id}:`, err);
    }
  }

  /**
   * Stop tracking an audio stream
   */
  public untrackStream(id: string): void {
    const node = this.nodes.get(id);
    if (node) {
      try {
        node.source.disconnect();
      } catch {
        // ignore
      }
      this.nodes.delete(id);
    }

    if (this.currentActiveSpeakerId === id) {
      this.currentActiveSpeakerId = null;
      this.notifyListeners(null);
    }

    if (this.nodes.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Clear all monitored streams
   */
  public clear(): void {
    this.nodes.forEach((node) => {
      try {
        node.source.disconnect();
      } catch {
        // ignore
      }
    });
    this.nodes.clear();
    this.stopPolling();

    if (this.currentActiveSpeakerId !== null) {
      this.currentActiveSpeakerId = null;
      this.notifyListeners(null);
    }
  }

  /**
   * Cleanup everything and close audio context
   */
  public destroy(): void {
    this.clear();
    this.listeners.clear();
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
  }

  public subscribe(listener: ActiveSpeakerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getActiveSpeakerId(): string | null {
    return this.currentActiveSpeakerId;
  }

  private ensurePolling(): void {
    if (this.pollTimer !== null) return;
    this.pollTimer = window.setInterval(() => {
      this.evaluateSpeakers();
    }, ACTIVE_SPEAKER_POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private evaluateSpeakers(): void {
    let maxVolume = 0;
    let loudestId: string | null = null;

    this.nodes.forEach((node) => {
      const audioTracks = node.stream.getAudioTracks();
      const isEnabled = audioTracks.some((t) => t.enabled && t.readyState === "live");
      if (!isEnabled) return;

      node.analyser.getByteTimeDomainData(node.dataArray);

      let sumSquares = 0;
      const len = node.dataArray.length;
      for (let i = 0; i < len; i++) {
        const norm = (node.dataArray[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / len) * 100;

      if (rms > maxVolume && rms >= ACTIVE_SPEAKER_THRESHOLD) {
        maxVolume = rms;
        loudestId = node.id;
      }
    });

    if (loudestId !== this.currentActiveSpeakerId) {
      this.currentActiveSpeakerId = loudestId;
      this.notifyListeners(loudestId);
    }
  }

  private notifyListeners(speakerId: string | null): void {
    this.listeners.forEach((listener) => {
      try {
        listener(speakerId);
      } catch (err) {
        console.error("[AudioMonitorService] Listener error:", err);
      }
    });
  }
}

export const audioMonitorService = new AudioMonitorService();
