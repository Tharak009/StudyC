import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Headphones,
  MonitorUp,
  PhoneOff,
  Volume2,
  Users,
  Sparkles,
  Radio
} from "lucide-react";

export interface VoiceParticipant {
  id: string;
  name: string;
  roll: string;
  avatar?: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
}

interface VoiceStageProps {
  roomName: string;
  participants: VoiceParticipant[];
  onDisconnect: () => void;
}

export function VoiceStage({
  roomName,
  participants,
  onDisconnect
}: VoiceStageProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Dynamic speaking simulator
  const [speakingMap, setSpeakingMap] = useState<Record<string, boolean>>({
    [participants[0]?.id || "p1"]: true
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * participants.length);
      const targetId = participants[randomIdx]?.id;
      if (targetId) {
        setSpeakingMap((prev) => ({
          ...prev,
          [targetId]: !prev[targetId]
        }));
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [participants]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-900/90 text-white p-4 shrink-0 shadow-lg"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* ── Room Information & Waveform Live Pill ───────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Volume2 size={18} className="animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100">{roomName}</span>
              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Radio size={10} className="animate-pulse" />
                LIVE STAGE
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {participants.length} peers connected • WebRTC Voice Channel
            </p>
          </div>
        </div>

        {/* ── Participants Avatars Grid with Pulse Speaking Rings ──────── */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {participants.map((p) => {
            const isSpeaking = speakingMap[p.id] && !p.isMuted;
            return (
              <div
                key={p.id}
                className="relative flex flex-col items-center group shrink-0"
                title={`${p.name} (${p.roll})`}
              >
                <div
                  className={`relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E90FF] text-white font-bold text-xs shadow-md transition-all ${
                    isSpeaking
                      ? "ring-2 ring-[#1E90FF] ring-offset-2 ring-offset-slate-900 animate-pulse scale-105"
                      : "opacity-85"
                  }`}
                >
                  {getInitials(p.name)}

                  {/* Audio Waveform overlay when speaking */}
                  {isSpeaking && (
                    <span className="absolute -bottom-1 flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-[#1E90FF] text-[8px] text-white shadow-sm">
                      <span className="h-1.5 w-0.5 bg-white animate-bounce" />
                      <span className="h-2.5 w-0.5 bg-white animate-bounce delay-100" />
                      <span className="h-1.5 w-0.5 bg-white animate-bounce delay-200" />
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 truncate max-w-[50px] mt-1">
                  {p.name.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Voice Controls Bar ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isMuted
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
          </button>

          {/* Deafen Toggle */}
          <button
            onClick={() => setIsDeafened(!isDeafened)}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isDeafened
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            }`}
            title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}
          >
            <Headphones size={15} />
          </button>

          {/* Screen Share */}
          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isScreenSharing
                ? "bg-[#1E90FF]/20 text-[#1E90FF] border-[#1E90FF]/40"
                : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            }`}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          >
            <MonitorUp size={15} />
          </button>

          {/* Disconnect */}
          <button
            onClick={onDisconnect}
            className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
            title="Leave Voice Stage"
          >
            <PhoneOff size={15} />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>

      </div>
    </motion.div>
  );
}

export default VoiceStage;
