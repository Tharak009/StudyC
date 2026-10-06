import React from "react";
import { Phone, Video, PhoneMissed, PhoneOff, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { callSignalingService } from "../../../services/call-signaling.service";

export interface CallEventData {
  type: "voice" | "video";
  status: "completed" | "declined" | "missed" | "cancelled";
  duration?: number;
  timestamp?: number;
}

interface CallEventCardProps {
  callEvent: CallEventData;
  isMine: boolean;
  peerId?: string;
  peerName?: string;
  peerAvatar?: string;
  channelId?: string;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export const CallEventCard: React.FC<CallEventCardProps> = ({
  callEvent,
  isMine,
  peerId,
  peerName,
  peerAvatar,
  channelId
}) => {
  const isVideo = callEvent.type === "video";
  const isMissed = callEvent.status === "missed";
  const isDeclined = callEvent.status === "declined";
  const isCompleted = callEvent.status === "completed";
  const isCancelled = callEvent.status === "cancelled";

  // Pick suitable icon and colors
  let IconComponent = isVideo ? Video : Phone;
  let iconBg = "bg-sky-500/15 text-sky-400 border-sky-500/30";
  let statusText = "Voice Call";

  if (isCompleted) {
    iconBg = isVideo
      ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    statusText = `${isVideo ? "Video call" : "Voice call"} • ${formatDuration(callEvent.duration || 0)}`;
  } else if (isMissed) {
    IconComponent = PhoneMissed;
    iconBg = "bg-rose-500/15 text-rose-400 border-rose-500/30";
    statusText = isMine ? "Unanswered call" : "Missed call";
  } else if (isDeclined) {
    IconComponent = PhoneOff;
    iconBg = "bg-amber-500/15 text-amber-400 border-amber-500/30";
    statusText = "Call declined";
  } else if (isCancelled) {
    IconComponent = PhoneOff;
    iconBg = "bg-slate-500/15 text-slate-400 border-slate-500/30";
    statusText = "Cancelled call";
  }

  const handleCallBack = () => {
    if (!peerId) return;
    callSignalingService.initiateCall({
      targetUserId: peerId,
      targetUserName: peerName || "Classmate",
      targetUserAvatar: peerAvatar,
      channelId,
      isVideo
    });
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3.5 py-2.5 my-1 min-w-[240px] max-w-sm rounded-2xl border transition-all select-none shadow-xs ${
        isMine
          ? "bg-sky-50/80 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/40 text-slate-800 dark:text-slate-200"
          : "bg-slate-50 dark:bg-[#0B1220]/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>
          <IconComponent size={18} />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white truncate">
            <span>{isVideo ? "Video Call" : "Voice Call"}</span>
            {isMine ? (
              <ArrowUpRight size={13} className="text-slate-400 shrink-0" title="Outgoing call" />
            ) : (
              <ArrowDownLeft size={13} className="text-slate-400 shrink-0" title="Incoming call" />
            )}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{statusText}</span>
        </div>
      </div>

      {peerId && (
        <button
          type="button"
          onClick={handleCallBack}
          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 border border-slate-300/60 dark:border-slate-700/60 transition-all cursor-pointer shrink-0"
          aria-label={`Call back ${peerName || ""}`}
        >
          Call back
        </button>
      )}
    </div>
  );
};
