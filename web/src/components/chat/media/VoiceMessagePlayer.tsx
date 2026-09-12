import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Loader2, Download, AlertCircle, RotateCcw } from "lucide-react";
import { audioCoordinator } from "../../../utils/audio-coordinator";
import { getMediaUrl } from "../../../utils/media-url";

interface VoiceMessagePlayerProps {
  id: string;
  url: string;
  duration?: number;
  waveform?: number[];
  isMe?: boolean;
}

const DEFAULT_WAVEFORM = [
  35, 60, 40, 80, 55, 90, 70, 45, 100, 65, 30, 85, 45, 95, 60, 40, 75, 50, 85, 35, 65, 90, 55, 40
];

const SPEED_OPTIONS = [1, 1.5, 2] as const;

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  id,
  url,
  duration: initialDuration,
  waveform = DEFAULT_WAVEFORM,
  isMe = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bars = waveform && waveform.length >= 10 ? waveform : DEFAULT_WAVEFORM;

  const currentSpeed = SPEED_OPTIONS[speedIndex];
  const authenticatedUrl = getMediaUrl(url);

  // Setup audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audioCoordinator.stop(id);
    };
    const onError = () => {
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
      audioCoordinator.stop(id);
    };
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audioCoordinator.stop(id);
    };
  }, [id]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (hasError) {
      setHasError(false);
      audio.load();
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      audioCoordinator.stop(id);
    } else {
      audioCoordinator.play(id, () => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      });

      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn("Audio playback failed:", err);
        setIsPlaying(false);
        setHasError(true);
      }
    }
  }, [id, isPlaying, hasError]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = progress * duration;

    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSpeedToggle = () => {
    const nextIndex = (speedIndex + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(nextIndex);
    const nextSpeed = SPEED_OPTIONS[nextIndex];
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const progressFraction = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex items-center gap-3 py-1.5 px-1 max-w-[300px] select-none">
      <audio ref={audioRef} src={authenticatedUrl} preload="metadata" />

      {/* Play / Pause / Retry Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 cursor-pointer ${
          isMe
            ? "bg-white text-[#1E90FF] hover:bg-slate-100"
            : "bg-[#1E90FF] text-white hover:bg-[#187bcd]"
        }`}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : hasError ? (
          <RotateCcw size={16} />
        ) : isPlaying ? (
          <Pause size={16} />
        ) : (
          <Play size={16} className="ml-0.5" />
        )}
      </button>

      {/* Waveform & Timing */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Interactive Waveform Bars */}
        <div
          onClick={handleSeek}
          className="flex items-center gap-0.5 h-6 cursor-pointer py-1"
          role="slider"
          aria-label="Seek voice note"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
        >
          {bars.map((barVal, idx) => {
            const barFraction = idx / bars.length;
            const isPlayed = barFraction <= progressFraction;

            return (
              <div
                key={idx}
                className={`flex-1 rounded-full transition-all ${
                  isPlayed
                    ? isMe
                      ? "bg-white"
                      : "bg-[#1E90FF]"
                    : isMe
                    ? "bg-white/35"
                    : "bg-slate-300 dark:bg-slate-600"
                }`}
                style={{
                  height: `${Math.max(20, Math.min(100, barVal))}%`
                }}
              />
            );
          })}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-[10px] tabular-nums opacity-85">
          <span>{formatTime(isPlaying ? currentTime : duration || initialDuration || 0)}</span>

          <div className="flex items-center gap-1.5">
            {/* Speed Pill */}
            <button
              type="button"
              onClick={handleSpeedToggle}
              className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                isMe
                  ? "bg-white/20 hover:bg-white/30 text-white"
                  : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              }`}
              title="Change playback speed"
              aria-label={`Playback speed ${currentSpeed}x`}
            >
              {currentSpeed}×
            </button>

            {/* Download */}
            <a
              href={authenticatedUrl}
              download="voice-message.webm"
              target="_blank"
              rel="noreferrer"
              className={`p-0.5 rounded transition-colors ${
                isMe ? "text-white/70 hover:text-white" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Download voice note"
              aria-label="Download voice note"
            >
              <Download size={11} />
            </a>
          </div>
        </div>

        {hasError && (
          <div className="flex items-center gap-1 text-[9px] text-rose-300 font-medium">
            <AlertCircle size={10} />
            <span>Unable to play audio. Click to retry.</span>
          </div>
        )}
      </div>
    </div>
  );
};
