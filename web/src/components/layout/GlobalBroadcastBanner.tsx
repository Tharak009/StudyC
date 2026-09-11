import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  X,
  AlertTriangle,
  Info,
  Radio,
  BellRing,
  Volume2,
  ShieldAlert
} from "lucide-react";
import { socketService } from "../../services/socket.service";

export interface BroadcastPayload {
  id: string;
  title: string;
  message: string;
  urgency: "INFO" | "WARNING" | "EMERGENCY";
  scope: string;
  timestamp: string;
  senderName?: string;
  playAudioChime?: boolean;
}

// Web Audio API synth sound generator for campus alert chime
function playChime(urgency: "INFO" | "WARNING" | "EMERGENCY") {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (urgency === "EMERGENCY") {
      // Urgent double beep
      [0, 0.2, 0.4].forEach((timeOffset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(idx % 2 === 0 ? 880 : 660, ctx.currentTime + timeOffset);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + timeOffset + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.15);
      });
    } else {
      // Pleasant dual-tone bell
      [0, 0.18].forEach((timeOffset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(idx === 0 ? 587.33 : 880, ctx.currentTime + timeOffset); // D5 -> A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.4);
      });
    }
  } catch (err) {
    // AudioContext autoplay restrictions fallback gracefully
    console.debug("Audio alert skipped due to user interaction policy:", err);
  }
}

export function GlobalBroadcastBanner() {
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastPayload | null>(null);

  useEffect(() => {
    // 1. Socket.IO Listener
    const socket = socketService.get();
    const handleSocketBroadcast = (data: BroadcastPayload) => {
      setActiveBroadcast(data);
      if (data.playAudioChime || data.urgency === "EMERGENCY") {
        playChime(data.urgency);
      }
    };

    if (socket) {
      socket.on("globalBroadcastReceived", handleSocketBroadcast);
      socket.on("admin:broadcastAnnouncement", handleSocketBroadcast);
    }

    // 2. Custom DOM event listener for cross-component / local dispatch
    const handleCustomBroadcast = (event: CustomEvent<BroadcastPayload>) => {
      if (event.detail) {
        setActiveBroadcast(event.detail);
        if (event.detail.playAudioChime || event.detail.urgency === "EMERGENCY") {
          playChime(event.detail.urgency);
        }
      }
    };

    window.addEventListener("studyconnect:broadcast" as unknown as keyof WindowEventMap, handleCustomBroadcast as EventListener);

    return () => {
      if (socket) {
        socket.off("globalBroadcastReceived", handleSocketBroadcast);
        socket.off("admin:broadcastAnnouncement", handleSocketBroadcast);
      }
      window.removeEventListener("studyconnect:broadcast" as unknown as keyof WindowEventMap, handleCustomBroadcast as EventListener);
    };
  }, []);

  if (!activeBroadcast) return null;

  const isEmergency = activeBroadcast.urgency === "EMERGENCY";
  const isWarning = activeBroadcast.urgency === "WARNING";

  const getUrgencyStyles = () => {
    if (isEmergency) {
      return {
        container: "border-red-500/80 bg-[#160B0E]/95 shadow-[0_0_35px_rgba(239,68,68,0.4)] text-rose-50",
        badge: "bg-red-500/20 text-rose-300 border-red-500/40",
        icon: <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse shrink-0" />,
        accent: "text-rose-400"
      };
    }
    if (isWarning) {
      return {
        container: "border-amber-500/70 bg-[#17130A]/95 shadow-[0_0_30px_rgba(245,158,11,0.3)] text-amber-50",
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
        accent: "text-amber-400"
      };
    }
    return {
      container: "border-sky-500/60 bg-[#0A1220]/95 shadow-[0_0_30px_rgba(56,189,248,0.25)] text-sky-50",
      badge: "bg-sky-500/20 text-sky-300 border-sky-500/40",
      icon: <Megaphone className="w-5 h-5 text-sky-400 shrink-0" />,
      accent: "text-sky-400"
    };
  };

  const style = getUrgencyStyles();

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Campus-wide broadcast announcement"
        initial={{ y: -100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -100, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="fixed top-5 inset-x-0 mx-auto z-50 px-4 w-full max-w-2xl pointer-events-none"
      >
        <div
          className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 sm:p-5 backdrop-blur-2xl shadow-2xl transition-all ${style.container}`}
        >
          {/* Subtle Ambient Light Leak Header */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-16 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start gap-3.5">
            {/* Urgency Icon */}
            <div className="mt-0.5">{style.icon}</div>

            {/* Broadcast Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border ${style.badge}`}
                >
                  <Radio size={10} className="animate-ping" />
                  <span>{activeBroadcast.urgency} BROADCAST</span>
                </span>

                <span className="text-[11px] text-slate-400 opacity-90 font-medium">
                  Target: {activeBroadcast.scope}
                </span>

                <span className="text-[10px] tabular-nums text-slate-500 ml-auto">
                  {activeBroadcast.timestamp}
                </span>
              </div>

              <h4 className="text-sm font-extrabold tracking-tight text-white line-clamp-1">
                {activeBroadcast.title}
              </h4>

              <p className="text-xs leading-relaxed text-slate-200/90 whitespace-pre-line font-sans">
                {activeBroadcast.message}
              </p>

              {activeBroadcast.senderName && (
                <p className="text-[10px] text-slate-400 pt-0.5">
                  Dispatched by: <span className={style.accent}>{activeBroadcast.senderName}</span> (Campus Administration)
                </p>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => setActiveBroadcast(null)}
              className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Dismiss Announcement"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

export default GlobalBroadcastBanner;
