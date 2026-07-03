import React from "react";
import { Loader2, Calendar, AlertTriangle, LogOut, RefreshCw } from "lucide-react";

// --- RECONNECTING OVERLAY ---
export function ReconnectingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md text-white animate-fade-in">
      <div className="space-y-4 text-center">
        <div className="relative mx-auto size-16 flex items-center justify-center">
          <Loader2 className="animate-spin text-signal-500" size={36} />
          <RefreshCw className="absolute size-4 text-white animate-pulse" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold tracking-wide uppercase text-slate-100">
            Connection Interrupted
          </p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto px-4 leading-relaxed">
            Reconnecting to server... Please do not close your browser tab.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- SESSION ENDED SCREEN ---
interface RoomEndedScreenProps {
  roomName: string;
  onExit: () => void;
}

export function RoomEndedScreen({ roomName, onExit }: RoomEndedScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 text-slate-950 dark:bg-ink-950 dark:text-white p-4">
      <div className="relative w-full max-w-md transform rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl dark:border-white/5 dark:bg-ink-900 transition-all text-center space-y-6 animate-scale-up">
        {/* Calendar Ended Icon */}
        <div className="flex justify-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-655 dark:bg-indigo-500/20 dark:text-indigo-400">
            <Calendar size={28} />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-550 dark:bg-white/[0.04] dark:text-slate-400 uppercase tracking-wide">
            Session Ended
          </span>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            {roomName}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            This study session has been concluded by the host. Thank you for studying with us!
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-slate-100 dark:bg-white/5" />

        {/* Back control */}
        <button
          type="button"
          onClick={onExit}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-ink-950 dark:hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-signal-500"
        >
          <LogOut size={14} />
          Exit to Dashboard
        </button>
      </div>
    </div>
  );
}

// --- REMOVED / KICKED / BANNED SCREEN ---
interface RemovedScreenProps {
  isBanned?: boolean;
  onExit: () => void;
}

export function RemovedScreen({ isBanned = false, onExit }: RemovedScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 text-slate-950 dark:bg-ink-950 dark:text-white p-4">
      <div className="relative w-full max-w-md transform rounded-[2rem] border border-red-200 bg-white p-8 shadow-2xl dark:border-red-500/10 dark:bg-ink-900 transition-all text-center space-y-6 animate-scale-up">
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
            <AlertTriangle size={28} />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-650 dark:bg-red-500/10 dark:text-red-400 uppercase tracking-wide">
            {isBanned ? "Session Banned" : "Session Removed"}
          </span>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            {isBanned ? "Access Prohibited" : "Removed from Lobby"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            {isBanned
              ? "You have been banned from this study room and cannot rejoin this session."
              : "You have been removed from the call by the moderator."}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-slate-100 dark:bg-white/5" />

        {/* Back button */}
        <button
          type="button"
          onClick={onExit}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-ink-950 dark:hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-signal-500"
        >
          <LogOut size={14} />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
