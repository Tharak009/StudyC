import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Square, Trash2, Send, Play, Pause, AlertCircle, X, Loader2 } from "lucide-react";

interface VoiceMessageRecorderProps {
  onSendVoice: (audioBlob: Blob, durationSeconds: number) => Promise<void>;
  onCancel: () => void;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMessageRecorder({
  onSendVoice,
  onCancel
}: VoiceMessageRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const recordingSecondsRef = useRef<number>(0);

  // Stop media tracks and clear timer
  const stopTracksAndTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  }, []);

  // Full cleanup including revoking object URLs
  const fullCleanup = useCallback(() => {
    stopTracksAndTimer();
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
    setAudioBlob(null);
    audioBlobRef.current = null;
  }, [stopTracksAndTimer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      fullCleanup();
    };
  }, [fullCleanup]);

  // Start recording once on mount
  const startRecording = useCallback(async () => {
    stopTracksAndTimer();
    setPermissionDenied(false);
    setSendError(null);
    setAudioBlob(null);
    audioBlobRef.current = null;
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Select supported audio MIME type
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else {
          mimeType = "";
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      setPermissionDenied(true);
      setIsRecording(false);
    }
  }, [stopTracksAndTimer]);

  // Mount effect: start recording once
  useEffect(() => {
    startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: Stop recorder and produce the final audio Blob
  const stopAndCollectBlob = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      stopTracksAndTimer();

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        if (audioBlobRef.current) {
          resolve(audioBlobRef.current);
        } else {
          const type = recorder?.mimeType || "audio/webm";
          const blob = new Blob(audioChunksRef.current, { type });
          audioBlobRef.current = blob;
          setAudioBlob(blob);
          resolve(blob);
        }
        return;
      }

      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type });
        audioBlobRef.current = blob;
        setAudioBlob(blob);
        resolve(blob);
      };

      try {
        recorder.stop();
      } catch {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type });
        audioBlobRef.current = blob;
        setAudioBlob(blob);
        resolve(blob);
      }
    });
  }, [stopTracksAndTimer]);

  // Transition from active recording to preview mode
  const handleStopToPreview = async () => {
    setIsRecording(false);
    const blob = await stopAndCollectBlob();
    if (blob && blob.size > 0) {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      setAudioUrl(url);
    }
  };

  // Direct send while still recording
  const handleDirectSend = async () => {
    if (isSending) return;
    try {
      setIsSending(true);
      setSendError(null);
      const blob = await stopAndCollectBlob();
      if (!blob || blob.size === 0) {
        setSendError("Recording was empty. Please try again.");
        setIsSending(false);
        return;
      }
      await onSendVoice(blob, Math.max(1, recordingSecondsRef.current));
      fullCleanup();
    } catch (err: any) {
      console.error("Failed to send voice message:", err);
      setSendError(err?.message || "Failed to send voice message. Please try again.");
      setIsSending(false);
    }
  };

  // Send from preview mode
  const handleSendFromPreview = async () => {
    const targetBlob = audioBlobRef.current || audioBlob;
    if (!targetBlob || targetBlob.size === 0 || isSending) return;
    try {
      setIsSending(true);
      setSendError(null);
      await onSendVoice(targetBlob, Math.max(1, recordingSecondsRef.current));
      fullCleanup();
    } catch (err: any) {
      console.error("Failed to send voice message:", err);
      setSendError(err?.message || "Failed to send voice message. Please try again.");
      setIsSending(false);
    }
  };

  // Cancel and discard recording
  const handleCancel = () => {
    fullCleanup();
    onCancel();
  };

  // Preview play/pause
  const togglePreviewPlay = () => {
    const url = audioUrlRef.current || audioUrl;
    if (!url) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => setIsPreviewPlaying(false);
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current
        .play()
        .then(() => setIsPreviewPlaying(true))
        .catch(() => setIsPreviewPlaying(false));
    }
  };

  // Permission denied state
  if (permissionDenied) {
    return (
      <div className="flex items-center justify-between p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            Microphone access is required to record a voice message. Please enable permissions in your browser.
          </span>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shrink-0 cursor-pointer"
          title="Dismiss"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  // Active recording view
  if (isRecording) {
    return (
      <div className="flex flex-col gap-1.5">
        {sendError && (
          <div className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-400">
            {sendError}
          </div>
        )}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              Recording
            </span>
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">
              {formatTimer(recordingSeconds)}
            </span>
          </div>

          {/* Action buttons during recording */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSending}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
              title="Cancel recording"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={handleStopToPreview}
              disabled={isSending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Stop & preview"
            >
              <Square size={12} className="fill-current" />
              <span>Stop</span>
            </button>
            <button
              type="button"
              onClick={handleDirectSend}
              disabled={isSending}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#005FFF] hover:bg-[#0052db] disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Send voice message now"
            >
              {isSending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              <span>{isSending ? "Sending..." : "Send"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Audio preview view
  return (
    <div className="flex flex-col gap-1.5">
      {sendError && (
        <div className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-400">
          {sendError}
        </div>
      )}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#141E30] border border-slate-200 dark:border-slate-700/60 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePreviewPlay}
            disabled={isSending}
            className="w-8 h-8 rounded-full bg-[#005FFF] hover:bg-[#0052db] text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            title={isPreviewPlaying ? "Pause preview" : "Play preview"}
          >
            {isPreviewPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Voice message
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {formatTimer(recordingSeconds)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSending}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Discard recording"
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            onClick={handleSendFromPreview}
            disabled={isSending}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#005FFF] hover:bg-[#0052db] disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Send voice message"
          >
            {isSending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
            <span>{isSending ? "Sending..." : "Send"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
