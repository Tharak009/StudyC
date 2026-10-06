import React from "react";
import {
  X,
  Mic,
  MicOff,
  Crown,
  Shield,
  Hand,
  Check,
  UserX,
  ArrowDown,
  ArrowUp
} from "lucide-react";
import { useCallStore } from "../../../store/call.store";
import { useAuthStore } from "../../../store/auth.store";
import { callSignalingService } from "../../../services/call-signaling.service";
import type { CallParticipant, ParticipantRole } from "../../../types/call.types";

interface StageParticipantsListProps {
  isOpen: boolean;
  onClose: () => void;
  isModeratorOrHost: boolean;
}

export const StageParticipantsList: React.FC<StageParticipantsListProps> = ({
  isOpen,
  onClose,
  isModeratorOrHost
}) => {
  const { groupParticipants, raiseHandQueue, activeSpeakerId } = useCallStore();
  const currentUser = useAuthStore((s) => s.user);

  if (!isOpen) return null;

  const participants = Object.values(groupParticipants);
  const speakers = participants.filter(
    (p) => p.role === "host" || p.role === "moderator" || p.role === "speaker"
  );
  const listeners = participants.filter(
    (p) => p.role === "listener" || (!p.role && p.role !== "host" && p.role !== "moderator" && p.role !== "speaker")
  );

  return (
    <div className="absolute inset-y-0 right-0 w-80 sm:w-88 bg-slate-900/95 border-l border-slate-800 backdrop-blur-xl z-30 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white">Stage Participants</h3>
          <span className="text-[11px] text-slate-400">
            {speakers.length} Speakers • {listeners.length} Listeners
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close participant list"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 1. Request to Speak Queue (if any) */}
        {raiseHandQueue.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
              <Hand size={14} />
              <span>Request to Speak ({raiseHandQueue.length})</span>
            </div>
            <div className="space-y-2">
              {raiseHandQueue.map((req) => (
                <div
                  key={req.userId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-amber-500/20 shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {req.avatar ? (
                      <img src={req.avatar} alt={req.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                        {req.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-medium text-white truncate max-w-[110px]">
                      {req.name}
                    </span>
                  </div>

                  {isModeratorOrHost && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => callSignalingService.resolveSpeakRequest(req.userId, true)}
                        aria-label="Approve speaker request"
                        className="p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
                        title="Approve to Speak"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => callSignalingService.resolveSpeakRequest(req.userId, false)}
                        aria-label="Decline speaker request"
                        className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer"
                        title="Decline"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Speakers List */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">
            <Mic size={14} />
            <span>Speakers ({speakers.length})</span>
          </div>
          <div className="space-y-2">
            {speakers.map((p) => {
              const isMe = p.userId === currentUser?._id;
              const isSpeaking = activeSpeakerId === p.userId;

              return (
                <div
                  key={p.userId}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isSpeaking
                      ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                      : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {isSpeaking && (
                        <div className="absolute -inset-0.5 rounded-full border-2 border-emerald-400 animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate max-w-[100px]">
                          {p.name}
                        </span>
                        {isMe && <span className="text-[10px] text-sky-400">(You)</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {p.role === "host" ? (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-semibold">
                            <Crown size={10} /> Host
                          </span>
                        ) : p.role === "moderator" ? (
                          <span className="flex items-center gap-0.5 text-[10px] text-indigo-400 font-semibold">
                            <Shield size={10} /> Mod
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Speaker</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-1.5">
                    {p.audioEnabled ? (
                      <Mic size={14} className={isSpeaking ? "text-emerald-400" : "text-slate-400"} />
                    ) : (
                      <MicOff size={14} className="text-red-400" />
                    )}

                    {/* Host/Mod Controls for Speakers */}
                    {isModeratorOrHost && !isMe && p.role !== "host" && (
                      <div className="flex items-center gap-1 ml-1 border-l border-slate-700 pl-1.5">
                        {p.audioEnabled && (
                          <button
                            type="button"
                            onClick={() => callSignalingService.muteParticipant(p.userId)}
                            aria-label={`Mute ${p.name}`}
                            className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700 cursor-pointer"
                            title="Mute Participant"
                          >
                            <MicOff size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => callSignalingService.setParticipantRole(p.userId, "listener")}
                          aria-label={`Move ${p.name} to audience`}
                          className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-700 cursor-pointer"
                          title="Move to Audience"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => callSignalingService.removeParticipant(p.userId)}
                          aria-label={`Remove ${p.name}`}
                          className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700 cursor-pointer"
                          title="Remove from Call"
                        >
                          <UserX size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Listeners List */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Listeners ({listeners.length})</span>
          </div>
          {listeners.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No listeners yet</p>
          ) : (
            <div className="space-y-2">
              {listeners.map((p) => {
                const isMe = p.userId === currentUser?._id;

                return (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-slate-700/40 hover:bg-slate-800/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-slate-300 truncate max-w-[120px]">
                            {p.name}
                          </span>
                          {isMe && <span className="text-[10px] text-sky-400">(You)</span>}
                        </div>
                        <span className="text-[10px] text-slate-500">Audience</span>
                      </div>
                    </div>

                    {/* Host/Mod Controls for Listeners */}
                    {isModeratorOrHost && !isMe && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => callSignalingService.setParticipantRole(p.userId, "speaker")}
                          aria-label={`Invite ${p.name} to speak`}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-slate-700 cursor-pointer"
                          title="Promote to Speaker"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => callSignalingService.removeParticipant(p.userId)}
                          aria-label={`Remove ${p.name}`}
                          className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700 cursor-pointer"
                          title="Remove from Call"
                        >
                          <UserX size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
