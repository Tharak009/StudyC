import React, { useEffect, useRef, useState } from "react";
import {
  MicOff,
  Crown,
  Shield,
  RefreshCw,
  Hand,
  MoreVertical,
  UserX,
  ArrowDown,
  ArrowUp
} from "lucide-react";
import type { CallParticipant } from "../../../types/call.types";
import { useCallStore } from "../../../store/call.store";
import { callSignalingService } from "../../../services/call-signaling.service";

interface ParticipantTileProps {
  participant: CallParticipant;
  stream?: MediaStream | null;
  isLocal?: boolean;
  canModerate?: boolean;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  stream,
  isLocal = false,
  canModerate = false
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const activeSpeakerId = useCallStore((s) => s.activeSpeakerId);
  const stageMode = useCallStore((s) => s.stageMode);

  const isSpeaking = isLocal
    ? activeSpeakerId === "local"
    : activeSpeakerId === participant.userId;

  const hasVideo = Boolean(participant.videoEnabled && stream && stream.getVideoTracks().length > 0);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, hasVideo]);

  return (
    <div
      className={`relative w-full h-full min-h-[160px] rounded-2xl bg-slate-900/90 border overflow-hidden flex items-center justify-center shadow-lg group select-none transition-all duration-200 ${
        isSpeaking
          ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-500/20"
          : "border-slate-800/80"
      }`}
    >
      {/* 1. Video Canvas */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? "transform -scale-x-100" : ""}`}
        />
      ) : (
        /* 2. Avatar Fallback Canvas */
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="relative mb-3">
            {/* Pulsing ring when active speaker */}
            {isSpeaking && (
              <div className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
            )}
            {participant.audioEnabled && participant.connectionState === "CONNECTED" && !isSpeaking && (
              <div className="absolute -inset-1.5 rounded-full border border-sky-500/40 animate-pulse" />
            )}
            {participant.avatar ? (
              <img
                src={participant.avatar}
                alt={participant.name}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-slate-700 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-2xl font-bold text-white shadow-md ring-2 ring-slate-700">
                {(participant.name || "U").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-xs text-slate-400 font-medium">Camera off</span>
        </div>
      )}

      {/* 3. Status Badges Overlay (Top-Right) */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
        {/* Hand Raised Badge */}
        {participant.handRaised && (
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold animate-bounce shadow-sm"
            title="Hand raised"
          >
            <Hand size={11} />
            <span>Raised Hand</span>
          </div>
        )}

        {/* Mic Muted Badge */}
        {!participant.audioEnabled && (
          <div
            className="p-1 rounded-full bg-red-600/90 text-white shadow-sm"
            title="Microphone muted"
          >
            <MicOff size={13} />
          </div>
        )}

        {/* Role Badges */}
        {participant.role === "host" && (
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-semibold"
            title="Host"
          >
            <Crown size={11} />
            <span>Host</span>
          </div>
        )}
        {participant.role === "moderator" && (
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[10px] font-semibold"
            title="Moderator"
          >
            <Shield size={11} />
            <span>Mod</span>
          </div>
        )}

        {/* Moderator Options Button (remote participants only) */}
        {canModerate && !isLocal && participant.role !== "host" && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              aria-label="Moderator menu"
              className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <MoreVertical size={13} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div
                className="absolute right-0 top-7 w-40 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-1 z-30 flex flex-col text-xs"
                onMouseLeave={() => setShowMenu(false)}
              >
                {participant.audioEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      callSignalingService.muteParticipant(participant.userId);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 text-left cursor-pointer"
                  >
                    <MicOff size={13} className="text-red-400" />
                    <span>Mute</span>
                  </button>
                )}

                {stageMode === "stage" && (
                  <>
                    {participant.role === "speaker" ? (
                      <button
                        type="button"
                        onClick={() => {
                          callSignalingService.setParticipantRole(participant.userId, "listener");
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 text-left cursor-pointer"
                      >
                        <ArrowDown size={13} className="text-amber-400" />
                        <span>Move to Audience</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          callSignalingService.setParticipantRole(participant.userId, "speaker");
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 text-left cursor-pointer"
                      >
                        <ArrowUp size={13} className="text-emerald-400" />
                        <span>Make Speaker</span>
                      </button>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    callSignalingService.removeParticipant(participant.userId);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 text-left cursor-pointer"
                >
                  <UserX size={13} />
                  <span>Remove from Call</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Connection State Notice (Center Overlay if Disconnected/Joining) */}
      {participant.connectionState !== "CONNECTED" && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-20">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 text-slate-200 text-xs border border-slate-700">
            <RefreshCw size={12} className="animate-spin text-sky-400" />
            <span>
              {participant.connectionState === "DISCONNECTED"
                ? "Reconnecting..."
                : "Joining..."}
            </span>
          </div>
        </div>
      )}

      {/* 5. Bottom Name Tag */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
        <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-medium truncate max-w-[85%] border border-white/10 shadow-sm flex items-center gap-1.5">
          <span className="truncate">{participant.name}</span>
          {isLocal && <span className="text-sky-400 font-normal shrink-0">(You)</span>}
          {isSpeaking && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Speaking" />
          )}
        </div>
      </div>
    </div>
  );
};
