import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Trash2, Send, Play, Pause, AlertCircle, Loader2 } from "lucide-react";

interface VoiceRecorderDockProps {
  onSendVoice: (voiceFile: File, duration: number, waveform: number[]) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const VoiceRecorderDock: React.FC<VoiceRecorderDockProps> = ({
  onSendVoice,
  onCancel,
  isOpen
}) => {
  const [mode, setMode] = useState<"RECORDING" | "PREVIEW">("RECORDING");
  const [seconds, setSeconds] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [waveformSamples, setWaveformSamples] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordedDurationRef = useRef<number>(0);

  // Stop media stream tracks cleanly
  const cleanupStream = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  // Determine best supported mime type
  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === "undefined") return "";
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/aac"
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
  };

  // Start recording
  const startRecording = useCallback(async () => {
    setPermissionError(null);
    setSeconds(0);
    setWaveformSamples([]);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError("Voice recording is not supported on this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm"
        });
        setRecordedBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setPreviewUrl(url);
        setMode("PREVIEW");
      };

      recorder.start(250); // Emit chunks every 250ms

      // Start duration timer
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          recordedDurationRef.current = next;
          // Auto-stop at 5 minutes (300 seconds)
          if (next >= 300) {
            stopRecording();
          }
          return next;
        });
      }, 1000);

      // Analyze audio for visual waveform sampling
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const sampleInterval = setInterval(() => {
            if (analyserRef.current && recorder.state === "recording") {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              const avg = Math.round((sum / dataArray.length / 255) * 100);
              setWaveformSamples((prev) => [...prev.slice(-23), Math.max(20, avg)]);
            } else {
              clearInterval(sampleInterval);
            }
          }, 150);
        }
      } catch (err) {
        console.warn("AudioContext waveform sampling unavailable:", err);
      }
    } catch (err: any) {
      console.error("Microphone access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionError(
          "Microphone access was denied. Please enable microphone permission in your browser settings to record voice messages."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setPermissionError("No microphone was detected on your device.");
      } else {
        setPermissionError("Could not start recording. Please check your microphone.");
      }
    }
  }, []);

  // Stop recording and transition to preview
  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    cleanupStream();
  }, [cleanupStream]);

  // Cancel recording and reset
  const handleCancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    cleanupStream();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setMode("RECORDING");
    onCancel();
  }, [cleanupStream, previewUrl, onCancel]);

  // Send recorded voice note
  const handleSend = () => {
    if (!recordedBlob) return;
    const mime = mediaRecorderRef.current?.mimeType || recordedBlob.type || "audio/webm";
    const extension = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
    const fileName = `voice-message-${Date.now()}.${extension}`;
    const file = new File([recordedBlob], fileName, { type: mime });

    const finalDuration = recordedDurationRef.current || seconds || 1;
    const finalWaveform = waveformSamples.length >= 10 ? waveformSamples : [
      30, 50, 75, 90, 60, 40, 80, 55, 30, 65, 85, 45, 95, 60, 70, 40
    ];

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    cleanupStream();
    onSendVoice(file, finalDuration, finalWaveform);
  };

  useEffect(() => {
    if (isOpen) {
      setMode("RECORDING");
      startRecording();
    } else {
      cleanupStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
    return () => {
      cleanupStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [isOpen]);

  // Preview audio handlers
  const togglePreviewPlay = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (isPlayingPreview) {
      audio.pause();
      setIsPlayingPreview(false);
    } else {
      audio.play().then(() => setIsPlayingPreview(true)).catch(() => {});
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!isOpen) return null;

  return (
    <div className="p-3 bg-white dark:bg-[#182229] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg transition-all animate-in fade-in duration-200">
      {permissionError ? (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mb-3">
            {permissionError}
          </p>
          <button
            type="button"
            onClick={handleCancelRecording}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      ) : mode === "RECORDING" ? (
        <div className="flex items-center justify-between gap-3">
          {/* Recording indicator & timer */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
            <span className="font-mono text-xs font-bold text-rose-500 tracking-wider">
              {formatTimer(seconds)}
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Recording voice note...
            </span>
          </div>

          {/* Animated visual waveform pulses */}
          <div className="flex-1 flex items-center justify-center gap-1 h-5 max-w-[140px] overflow-hidden">
            {(waveformSamples.length > 0
              ? waveformSamples
              : [30, 60, 40, 80, 50, 90, 65, 45, 75, 40]
            ).map((h, i) => (
              <div
                key={i}
                className="w-1 bg-[#1E90FF] rounded-full transition-all"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelRecording}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Cancel recording"
              aria-label="Cancel recording"
            >
              <Trash2 size={16} />
            </button>

            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              title="Stop and preview"
              aria-label="Stop recording"
            >
              <Square size={13} className="fill-current" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      ) : (
        /* Preview Mode */
        <div className="flex items-center justify-between gap-3">
          {previewUrl && (
            <audio
              ref={previewAudioRef}
              src={previewUrl}
              onTimeUpdate={() => {
                if (previewAudioRef.current) {
                  setPreviewCurrentTime(previewAudioRef.current.currentTime);
                }
              }}
              onEnded={() => {
                setIsPlayingPreview(false);
                setPreviewCurrentTime(0);
              }}
            />
          )}

          {/* Play / Pause button */}
          <button
            type="button"
            onClick={togglePreviewPlay}
            className="h-8 w-8 rounded-full bg-[#1E90FF] text-white flex items-center justify-center shrink-0 hover:bg-[#187bcd] transition-colors cursor-pointer shadow-xs"
            aria-label={isPlayingPreview ? "Pause preview" : "Play preview"}
          >
            {isPlayingPreview ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>

          {/* Progress bar and time */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#1E90FF] h-full transition-all"
                style={{
                  width: `${
                    seconds > 0 ? Math.min(100, (previewCurrentTime / seconds) * 100) : 0
                  }%`
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono tabular-nums">
              <span>{formatTimer(Math.floor(previewCurrentTime))}</span>
              <span>{formatTimer(seconds)}</span>
            </div>
          </div>

          {/* Discard & Send Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelRecording}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Discard voice note"
              aria-label="Discard recording"
            >
              <Trash2 size={16} />
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Send voice note"
              aria-label="Send voice note"
            >
              <Send size={13} />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
