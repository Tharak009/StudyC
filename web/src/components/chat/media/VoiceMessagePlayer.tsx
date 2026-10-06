import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Volume2, AlertCircle } from "lucide-react";
import { useAudioPlaybackStore } from "../../../store/audio-playback.store";

interface VoiceMessagePlayerProps {
  attachment: {
    asset_url?: string;
    duration?: number | string;
    title?: string;
  };
  messageId: string;
  isSelectMode?: boolean;
  isMine?: boolean;
}

function formatDuration(seconds: number | string): string {
  const num = typeof seconds === "string" ? parseFloat(seconds) : seconds;
  if (isNaN(num) || num < 0) return "00:00";
  const m = Math.floor(num / 60);
  const s = Math.floor(num % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMessagePlayer({
  attachment,
  messageId,
  isSelectMode = false,
  isMine = false
}: VoiceMessagePlayerProps) {
  const audioUrl =
    attachment.asset_url || (attachment as any).url || (attachment as any).file_url;
  const initialDuration =
    typeof attachment.duration === "string"
      ? parseFloat(attachment.duration) || 0
      : attachment.duration || 0;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(initialDuration);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const { activeAudioId, playAudio, stopAudio, playbackSpeed, setPlaybackSpeed } =
    useAudioPlaybackStore();

  // Listen to global audio store: pause if another audio starts playing
  useEffect(() => {
    if (activeAudioId !== messageId && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
  }, [activeAudioId, messageId, isPlaying]);

  // Sync playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Audio setup and event listeners
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.playbackRate = playbackSpeed;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      stopAudio(messageId);
    };

    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
      stopAudio(messageId);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
    };
  }, [audioUrl, messageId, stopAudio]);

  const togglePlay = () => {
    if (isSelectMode || !audioRef.current || hasError) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopAudio(messageId);
    } else {
      playAudio(messageId);
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Audio playback failed:", err);
          setHasError(true);
          stopAudio(messageId);
        });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSelectMode || !audioRef.current || !progressBarRef.current || duration <= 0) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = fraction * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelectMode) return;
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs">
        <AlertCircle size={15} />
        <span>Audio cannot be played</span>
      </div>
    );
  }

  return (
    <div
      className={`my-1 p-2.5 rounded-2xl flex items-center gap-3 w-64 sm:w-72 select-none transition-all ${
        isMine
          ? "bg-white/15 text-white shadow-2xs"
          : "bg-slate-100 dark:bg-[#121B2D] text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs"
      }`}
    >
      {/* Play / Pause button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isSelectMode}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs ${
          isMine
            ? "bg-white text-[#1E90FF] hover:bg-white/90"
            : "bg-[#005FFF] text-white hover:bg-[#0052db]"
        }`}
        title={isPlaying ? "Pause" : "Play"}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      {/* Progress and Scrubber */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          ref={progressBarRef}
          onClick={handleSeek}
          className="relative h-2 rounded-full bg-slate-300/60 dark:bg-slate-700/60 cursor-pointer overflow-hidden"
          title="Click to seek"
        >
          <div
            className={`absolute top-0 bottom-0 left-0 transition-all rounded-full ${
              isMine ? "bg-white" : "bg-[#005FFF]"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Timestamps */}
        <div className="flex items-center justify-between text-[10px] font-mono tracking-tight opacity-75">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Playback speed toggle */}
      <button
        type="button"
        onClick={cycleSpeed}
        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer shrink-0 ${
          isMine
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-slate-200/80 dark:bg-slate-700/60 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
        }`}
        title="Change playback speed"
      >
        {playbackSpeed}x
      </button>
    </div>
  );
}
