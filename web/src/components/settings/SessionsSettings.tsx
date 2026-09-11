import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Laptop,
  Smartphone,
  Shield,
  LogOut,
  MapPin,
  Clock,
  Trash2
} from "lucide-react";
import { useToastStore } from "../../store/toast.store";

export interface ActiveSession {
  id: string;
  deviceType: "laptop" | "mobile";
  browser: string;
  os: string;
  location: string;
  ipSnippet: string;
  lastActive: string;
  isCurrent: boolean;
}

function getDetectedCurrentSession(): ActiveSession {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let browser = "Web Browser";
  let os = "Desktop";
  let deviceType: "laptop" | "mobile" = "laptop";

  if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
    deviceType = "mobile";
  }

  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
    browser = "Google Chrome";
  } else if (/Edg/i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/Firefox/i.test(ua)) {
    browser = "Mozilla Firefox";
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = "Apple Safari";
  }

  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";

  return {
    id: "sess-current",
    deviceType,
    browser: `${browser} on ${os}`,
    os,
    location: "Current Session (Active Client)",
    ipSnippet: "127.0.0.1",
    lastActive: "Active Now",
    isCurrent: true
  };
}

function loadSavedSessions(): ActiveSession[] {
  const current = getDetectedCurrentSession();
  try {
    const raw = localStorage.getItem("studyconnect_active_sessions");
    if (!raw) return [current];
    const saved = JSON.parse(raw);
    const others = Array.isArray(saved) ? saved.filter((s: ActiveSession) => !s.isCurrent) : [];
    return [current, ...others];
  } catch {
    return [current];
  }
}

export function SessionsSettings() {
  const { addToast } = useToastStore();
  const [sessions, setSessions] = useState<ActiveSession[]>(loadSavedSessions);

  const handleRevoke = (id: string, browser: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem("studyconnect_active_sessions", JSON.stringify(updated.filter(s => !s.isCurrent)));
      } catch {}
      return updated;
    });
    addToast(`Revoked session for "${browser}"`, "info");
  };

  const handleSignOutAllOthers = () => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.isCurrent);
      try {
        localStorage.setItem("studyconnect_active_sessions", JSON.stringify([]));
      } catch {}
      return updated;
    });
    addToast("Successfully signed out of all other devices.", "success");
  };

  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-6">
      
      {/* ── Current Session Card ──────────────────────────────────────── */}
      {currentSession && (
        <div className="p-6 rounded-3xl border border-[#1E90FF]/30 dark:border-[#1E90FF]/20 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/70 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <Laptop size={16} className="text-[#1E90FF]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                Current Active Session
              </h3>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              THIS DEVICE
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {currentSession.browser}
              </h4>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 tabular-nums mt-1">
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {currentSession.location}
                </span>
                <span>•</span>
                <span>IP: {currentSession.ipSnippet}</span>
              </div>
            </div>

            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              Secure WebRTC & Socket.IO Session
            </div>
          </div>
        </div>
      )}

      {/* ── Other Active Devices ──────────────────────────────────────── */}
      <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#1E90FF]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
              Other Connected Devices ({otherSessions.length})
            </h3>
          </div>

          {otherSessions.length > 0 && (
            <button
              onClick={handleSignOutAllOthers}
              className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
            >
              Sign out all other devices
            </button>
          )}
        </div>

        {otherSessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No other active sessions. Your account is only signed in on this device.
          </div>
        ) : (
          <div className="space-y-3">
            {otherSessions.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#080D1A]/50 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                    {s.deviceType === "mobile" ? <Smartphone size={16} /> : <Laptop size={16} />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {s.browser}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 tabular-nums mt-0.5">
                      <span>{s.location}</span>
                      <span>•</span>
                      <span>Last active {s.lastActive}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRevoke(s.id, s.browser)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default SessionsSettings;
