import React, { useEffect, useRef, useState } from "react";
import { X, Mic, Video, Volume2, Check, RefreshCw } from "lucide-react";
import { mediaDeviceManager } from "../../../services/media-device.service";
import { callSignalingService } from "../../../services/call-signaling.service";
import { useCallStore } from "../../../store/call.store";
import type { MediaDeviceInfo } from "../../../types/call.types";

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeviceSettingsModal({ isOpen, onClose }: DeviceSettingsModalProps) {
  const localStream = useCallStore((s) => s.localStream);
  const isCameraOff = useCallStore((s) => s.isCameraOff);

  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);

  const [selectedAudioInput, setSelectedAudioInput] = useState<string>("");
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("");

  const [isSwitchingAudio, setIsSwitchingAudio] = useState(false);
  const [isSwitchingVideo, setIsSwitchingVideo] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPlayingTestTone, setIsPlayingTestTone] = useState(false);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Load available devices
  const refreshDevices = async () => {
    const devices = await mediaDeviceManager.enumerateDevices();
    setAudioInputs(devices.audioInputs);
    setVideoInputs(devices.videoInputs);
    setAudioOutputs(devices.audioOutputs);

    if (devices.audioInputs.length > 0 && !selectedAudioInput) {
      setSelectedAudioInput(mediaDeviceManager.currentAudioInputId || devices.audioInputs[0].deviceId);
    }
    if (devices.videoInputs.length > 0 && !selectedVideoInput) {
      setSelectedVideoInput(mediaDeviceManager.currentVideoInputId || devices.videoInputs[0].deviceId);
    }
    if (devices.audioOutputs.length > 0 && !selectedAudioOutput) {
      setSelectedAudioOutput(mediaDeviceManager.currentAudioOutputId || devices.audioOutputs[0].deviceId);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshDevices();
    const unsub = mediaDeviceManager.onDeviceChange(() => {
      refreshDevices();
    });
    return () => {
      unsub();
    };
  }, [isOpen]);

  // Attach local stream to preview video
  useEffect(() => {
    if (previewVideoRef.current && localStream && !isCameraOff) {
      previewVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCameraOff, isOpen]);

  // Mic level analyzer for testing microphone input live
  useEffect(() => {
    if (!isOpen || !localStream) {
      setAudioLevel(0);
      return;
    }

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      animFrameRef.current = requestAnimationFrame(updateLevel);
    } catch (err) {
      console.warn("[DeviceSettingsModal] Audio analyzer error:", err);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isOpen, localStream]);

  const handleAudioInputChange = async (deviceId: string) => {
    setSelectedAudioInput(deviceId);
    setIsSwitchingAudio(true);
    try {
      await callSignalingService.switchAudioInput(deviceId);
    } catch (err) {
      console.error("[DeviceSettingsModal] Failed to switch microphone:", err);
    } finally {
      setIsSwitchingAudio(false);
    }
  };

  const handleVideoInputChange = async (deviceId: string) => {
    setSelectedVideoInput(deviceId);
    setIsSwitchingVideo(true);
    try {
      await callSignalingService.switchVideoInput(deviceId);
    } catch (err) {
      console.error("[DeviceSettingsModal] Failed to switch camera:", err);
    } finally {
      setIsSwitchingVideo(false);
    }
  };

  const handleAudioOutputChange = async (sinkId: string) => {
    setSelectedAudioOutput(sinkId);
    if (previewVideoRef.current) {
      await callSignalingService.switchAudioOutput(previewVideoRef.current, sinkId);
    }
  };

  const playSpeakerTestChime = () => {
    if (isPlayingTestTone) return;
    setIsPlayingTestTone(true);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        setIsPlayingTestTone(false);
        return;
      }
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);

      setTimeout(() => {
        setIsPlayingTestTone(false);
        ctx.close().catch(() => {});
      }, 500);
    } catch {
      setIsPlayingTestTone(false);
    }
  };

  if (!isOpen) return null;

  const supportsSinkId = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-settings-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-200 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Volume2 size={20} />
            </div>
            <div>
              <h3 id="device-settings-title" className="text-base font-bold text-white">
                Audio & Video Settings
              </h3>
              <p className="text-xs text-slate-400">Manage hardware devices for active calls</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Microphone */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="mic-select" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Mic size={14} className="text-sky-400" />
              Microphone
            </label>
            {isSwitchingAudio && (
              <span className="text-[11px] text-sky-400 flex items-center gap-1">
                <RefreshCw size={11} className="animate-spin" /> Switching...
              </span>
            )}
          </div>
          <select
            id="mic-select"
            value={selectedAudioInput}
            onChange={(e) => handleAudioInputChange(e.target.value)}
            disabled={audioInputs.length === 0}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
          >
            {audioInputs.length === 0 ? (
              <option value="">No microphone detected</option>
            ) : (
              audioInputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone (${d.deviceId.slice(0, 5)})`}
                </option>
              ))
            )}
          </select>

          {/* Mic Input Level Meter */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-400 w-16 shrink-0">Input Level:</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-500 via-sky-400 to-rose-400"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400 w-7 text-right">{audioLevel}%</span>
          </div>
        </div>

        {/* Section 2: Camera & Preview */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="camera-select" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Video size={14} className="text-sky-400" />
              Camera
            </label>
            {isSwitchingVideo && (
              <span className="text-[11px] text-sky-400 flex items-center gap-1">
                <RefreshCw size={11} className="animate-spin" /> Switching...
              </span>
            )}
          </div>
          <select
            id="camera-select"
            value={selectedVideoInput}
            onChange={(e) => handleVideoInputChange(e.target.value)}
            disabled={videoInputs.length === 0}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
          >
            {videoInputs.length === 0 ? (
              <option value="">No camera detected</option>
            ) : (
              videoInputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera (${d.deviceId.slice(0, 5)})`}
                </option>
              ))
            )}
          </select>

          {/* Video Preview Canvas */}
          <div className="relative w-full h-32 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center mt-1">
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isCameraOff && localStream ? "block" : "hidden"}`}
            />
            {(isCameraOff || !localStream) && (
              <div className="flex flex-col items-center justify-center text-slate-500 text-xs gap-1">
                <Video size={20} className="text-slate-600" />
                <span>Camera preview is inactive</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Speaker / Output */}
        <div className="flex flex-col gap-2">
          <label htmlFor="speaker-select" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Volume2 size={14} className="text-sky-400" />
            Speaker / Audio Output
          </label>
          <div className="flex items-center gap-2">
            <select
              id="speaker-select"
              value={selectedAudioOutput}
              onChange={(e) => handleAudioOutputChange(e.target.value)}
              disabled={!supportsSinkId || audioOutputs.length === 0}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              {!supportsSinkId ? (
                <option value="">System Default Speaker</option>
              ) : audioOutputs.length === 0 ? (
                <option value="">Default Speaker</option>
              ) : (
                audioOutputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Speaker (${d.deviceId.slice(0, 5)})`}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              onClick={playSpeakerTestChime}
              disabled={isPlayingTestTone}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Play test audio tone"
            >
              <Volume2 size={13} className={isPlayingTestTone ? "text-emerald-400 animate-pulse" : ""} />
              <span>{isPlayingTestTone ? "Playing..." : "Test"}</span>
            </button>
          </div>
          {!supportsSinkId && (
            <span className="text-[10px] text-slate-500 italic">
              Custom speaker routing is managed by your OS on this browser.
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
