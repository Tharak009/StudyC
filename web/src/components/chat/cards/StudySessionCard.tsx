import React, { useState, useEffect } from "react";
import { Timer, Users, Play, CheckCircle2, Sparkles } from "lucide-react";
import { socketService } from "../../../services/socket.service";
import { useChatStore } from "../../../store/chat.store";
import { useToastStore } from "../../../store/toast.store";

export interface StudySessionData {
  communityId?: string;
  channelId?: string;
  topic: string;
  durationMinutes: number;
  startedBy?: string;
  startedByName?: string;
  endsAt?: string;
}

interface StudySessionCardProps {
  session: StudySessionData;
  isMine?: boolean;
}

export function StudySessionCard({ session, isMine = false }: StudySessionCardProps) {
  const { activeSprint, setActiveSprint, updateSprintParticipants } = useChatStore();
  const { addToast } = useToastStore();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isJoined, setIsJoined] = useState(false);

  const durationMinutes = session.durationMinutes || 25;
  const endsAtTime = session.endsAt ? new Date(session.endsAt).getTime() : null;

  useEffect(() => {
    if (!endsAtTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((endsAtTime - now) / 1000));
      setSecondsRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endsAtTime]);

  const isExpired = endsAtTime ? secondsRemaining === 0 : false;

  const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleJoin = () => {
    const socket = socketService.get() || socketService.connect();
    if (session.communityId) {
      socket?.emit("sprint:join", {
        communityId: session.communityId,
        channelId: session.channelId
      });
    }

    if (activeSprint) {
      updateSprintParticipants([...activeSprint.participants, "me"]);
    } else {
      setActiveSprint({
        communityId: session.communityId || "",
        channelId: session.channelId,
        isActive: true,
        durationMinutes,
        startedAt: new Date().toISOString(),
        endsAt: session.endsAt || new Date(Date.now() + durationMinutes * 60 * 1000).toISOString(),
        topic: session.topic || "Deep Work Sprint",
        startedBy: session.startedBy || "",
        startedByName: session.startedByName,
        participants: ["me"]
      });
    }

    setIsJoined(true);
    addToast("Joined Study Sprint! Let's focus.", "success");
  };

  return (
    <div
      className={`relative my-2 rounded-2xl p-4 border transition-all shadow-sm ${
        isMine
          ? "bg-sky-500/10 border-sky-400/30 text-white"
          : "bg-gradient-to-br from-slate-900 to-[#0F172A] border-slate-800 text-slate-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <Timer size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                Study Sprint
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                {durationMinutes} min
              </span>
            </div>
            {session.startedByName && (
              <p className="text-[11px] text-slate-400">
                Started by {session.startedByName}
              </p>
            )}
          </div>
        </div>

        {endsAtTime && !isExpired && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{formatSeconds(secondsRemaining)}</span>
          </div>
        )}

        {isExpired && (
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            Completed
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-slate-200 mb-3.5 flex items-center gap-1.5">
        <Sparkles size={14} className="text-amber-400 shrink-0" />
        <span>{session.topic || "Deep Work & Focus Session"}</span>
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Users size={14} />
          <span>Synchronous Pomodoro</span>
        </div>

        {!isExpired ? (
          <button
            type="button"
            onClick={handleJoin}
            disabled={isJoined}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isJoined
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                : "bg-[#005FFF] hover:bg-[#004ECC] text-white shadow-sm hover:scale-[1.02] active:scale-95"
            }`}
          >
            {isJoined ? (
              <>
                <CheckCircle2 size={13} />
                <span>Focusing</span>
              </>
            ) : (
              <>
                <Play size={13} />
                <span>Join Sprint</span>
              </>
            )}
          </button>
        ) : (
          <span className="text-xs text-slate-500">Session ended</span>
        )}
      </div>
    </div>
  );
}
