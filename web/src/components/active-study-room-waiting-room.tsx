import React from "react";
import { Users, Clock, Loader2, LogOut, Check, X, ShieldAlert } from "lucide-react";

interface GuestWaitingScreenProps {
  roomName: string;
  subject: string;
  hostName: string;
  onLeave: () => void;
}

export function GuestWaitingScreen({
  roomName,
  subject,
  hostName,
  onLeave,
}: GuestWaitingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 text-slate-950 dark:bg-ink-950 dark:text-white p-4">
      {/* Blurred background blob visuals */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -left-20 bottom-12 size-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md transform rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl dark:border-white/5 dark:bg-ink-900 transition-all text-center space-y-6 animate-scale-up">
        {/* Verification Icon */}
        <div className="flex justify-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <ShieldAlert size={28} />
          </div>
        </div>

        {/* Room Header */}
        <div className="space-y-2">
          <div className="flex justify-center gap-2">
            <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {subject}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
              <Clock size={12} />
              Pending Entry
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            {roomName}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Host: <span className="font-bold text-slate-700 dark:text-slate-200">{hostName}</span>
          </p>
        </div>

        {/* Spinner Loader & Text */}
        <div className="rounded-2xl bg-slate-50 p-6 dark:bg-white/[0.01] border border-slate-100/50 dark:border-white/5 flex flex-col items-center space-y-3">
          <Loader2 className="animate-spin text-signal-500 dark:text-signal-300" size={32} />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Waiting for host approval...
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            You will join the call automatically as soon as the host grants you access.
          </p>
        </div>

        {/* Info */}
        <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold uppercase tracking-wide">
          Estimated wait: Less than 1 minute
        </p>

        {/* Controls */}
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-500/10 dark:bg-red-500/[0.04] dark:text-red-400 dark:hover:bg-red-500/[0.08] transition"
        >
          <LogOut size={16} />
          Leave Lobby
        </button>
      </div>
    </div>
  );
}

export interface JoinRequest {
  id: string;
  name: string;
  joinTime: string;
  avatarInitials: string;
}

interface HostWaitingPanelProps {
  requests: JoinRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isLoading?: boolean;
}

export function HostWaitingPanel({
  requests,
  onApprove,
  onReject,
  isLoading = false,
}: HostWaitingPanelProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2.5">
        <Loader2 className="animate-spin text-signal-500" size={24} />
        <span className="text-xs text-slate-500">Loading requests...</span>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 dark:border-white/5 dark:bg-white/[0.01] text-center space-y-2">
        <Users className="size-8 mx-auto text-slate-350 dark:text-slate-650" />
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Lobby is Empty</h4>
        <p className="text-[10px] text-slate-500 dark:text-slate-450 max-w-xs mx-auto">
          No guests are currently waiting to enter the study room.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-250/80 bg-amber-50/20 p-4 dark:border-amber-500/10 dark:bg-amber-500/[0.01] space-y-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-white/5 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-amber-600" />
          </span>
          <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
            Lobby Pending ({requests.length})
          </h4>
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-center justify-between rounded-xl bg-white border border-slate-105 p-2.5 dark:bg-ink-950 dark:border-white/5 shadow-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-full text-[10px] font-bold text-white bg-gradient-to-br from-amber-500 to-orange-500">
                {req.avatarInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white leading-none">
                  {req.name}
                </p>
                <span className="text-[9px] text-slate-455 dark:text-slate-500 mt-1 block">
                  Waiting {req.joinTime}
                </span>
              </div>
            </div>

            <div className="flex gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => onReject(req.id)}
                className="grid size-7 place-items-center rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/30 transition focus:outline-none focus:ring-2 focus:ring-rose-500"
                title="Deny entry"
                aria-label={`Deny entry to ${req.name}`}
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={() => onApprove(req.id)}
                className="grid size-7 place-items-center rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30 transition focus:outline-none focus:ring-2 focus:ring-green-500"
                title="Grant entry"
                aria-label={`Grant entry to ${req.name}`}
              >
                <Check size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
