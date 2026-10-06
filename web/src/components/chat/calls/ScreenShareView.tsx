import React, { useEffect, useRef, useState } from "react";
import { Monitor, Maximize2, Minimize2, StopCircle } from "lucide-react";

interface ScreenShareViewProps {
  stream: MediaStream | null;
  presenterName: string;
  isLocal: boolean;
  onStopSharing?: () => void;
}

export const ScreenShareView: React.FC<ScreenShareViewProps> = ({
  stream,
  presenterName,
  isLocal,
  onStopSharing
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("[ScreenShareView] Fullscreen toggle error:", err);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-2xl overflow-hidden flex items-center justify-center group shadow-2xl border border-slate-800"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-contain select-none"
      />

      {/* Top Banner: Presenter Pill & Action Controls */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-none">
        {/* Presenter Name Tag */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-white text-xs font-medium shadow-md pointer-events-auto">
          <Monitor size={14} className="text-sky-400" />
          <span>{isLocal ? "You are presenting" : `Screen: ${presenterName}`}</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* If Local User, prominent Stop Sharing button */}
          {isLocal && onStopSharing && (
            <button
              type="button"
              onClick={onStopSharing}
              aria-label="Stop sharing screen"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <StopCircle size={14} />
              <span>Stop Sharing</span>
            </button>
          )}

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="p-2 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-white/10 backdrop-blur-md shadow-md transition-colors cursor-pointer"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
};
