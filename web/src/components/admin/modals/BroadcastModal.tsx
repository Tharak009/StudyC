import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  X,
  AlertTriangle,
  Info,
  Radio,
  Volume2,
  VolumeX,
  Send,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Sparkles
} from "lucide-react";
import { useAuthStore } from "../../../store/auth.store";
import { useToastStore } from "../../../store/toast.store";
import { socketService } from "../../../services/socket.service";
import type { BroadcastPayload } from "../../layout/GlobalBroadcastBanner";

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();

  const [title, setTitle] = useState("");
  const [urgency, setUrgency] = useState<"INFO" | "WARNING" | "EMERGENCY">("INFO");
  const [scope, setScope] = useState("All Campus (All Departments)");
  const [message, setMessage] = useState("");
  const [playAudioChime, setPlayAudioChime] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  const MAX_CHARS = 320;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      addToast("Please provide both an announcement title and message body.", "warning");
      return;
    }

    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    const payload: BroadcastPayload = {
      id: `bc-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      urgency,
      scope,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      senderName: currentUser?.fullName || "Campus Administrator",
      playAudioChime
    };

    // 1. Emit via Socket.IO to backend server
    const socket = socketService.get();
    if (socket?.connected) {
      socket.emit("admin:broadcastAnnouncement", payload);
    }

    // 2. Dispatch cross-component DOM event for local instant banner display
    window.dispatchEvent(
      new CustomEvent("studyconnect:broadcast", {
        detail: payload
      })
    );

    // 3. Dispatch optimistic audit log entry
    window.dispatchEvent(
      new CustomEvent("studyconnect:audit-entry", {
        detail: {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
          relativeTime: "Just now",
          adminName: currentUser?.fullName || "Campus Administrator",
          adminId: currentUser?.rollNumber || currentUser?._id || "admin-root",
          adminIp: "127.0.0.1",
          action: "BROADCAST_SENT",
          targetType: "Broadcast",
          targetId: `Online Sockets (${scope})`,
          metadataSummary: `Urgency: ${urgency} • Subject: ${title.trim()}`,
          fullPayload: {
            action: "BROADCAST_SENT",
            broadcastId: payload.id,
            urgency,
            scope,
            broadcastTitle: title.trim(),
            audioPingDispatched: playAudioChime,
            deliveredAt: payload.timestamp
          }
        }
      })
    );

    addToast(`Global ${urgency} broadcast pushed to all online screens!`, "success");
    setIsConfirming(false);
    onClose();
  };

  const getUrgencyPillStyle = (type: "INFO" | "WARNING" | "EMERGENCY") => {
    const isSelected = urgency === type;
    if (type === "EMERGENCY") {
      return isSelected
        ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/25"
        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-rose-400 hover:text-rose-500";
    }
    if (type === "WARNING") {
      return isSelected
        ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/25"
        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-400 hover:text-amber-500";
    }
    return isSelected
      ? "bg-[#1E90FF] text-white border-[#1E90FF] shadow-md shadow-[#1E90FF]/25"
      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-[#1E90FF] hover:text-[#1E90FF]";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl space-y-4"
      >
        <button
          onClick={() => {
            setIsConfirming(false);
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E90FF] text-white shadow-md shadow-[#1E90FF]/25">
            <Megaphone size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              Real-Time Campus Socket Broadcast
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pushes live floating alert banners to all connected student screens.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          
          {/* 1. Broadcast Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Announcement Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Scheduled Network Upgrade or Midterm Exam Policy Shift"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsConfirming(false);
              }}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] shadow-sm"
            />
          </div>

          {/* 2. Urgency Selector (3-Tier Interactive Pills) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Urgency Severity Tier *
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setUrgency("INFO");
                  setIsConfirming(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border transition-all cursor-pointer ${getUrgencyPillStyle(
                  "INFO"
                )}`}
              >
                <Info size={13} />
                <span>INFO</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUrgency("WARNING");
                  setIsConfirming(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border transition-all cursor-pointer ${getUrgencyPillStyle(
                  "WARNING"
                )}`}
              >
                <AlertTriangle size={13} />
                <span>WARNING</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUrgency("EMERGENCY");
                  setIsConfirming(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border transition-all cursor-pointer ${getUrgencyPillStyle(
                  "EMERGENCY"
                )}`}
              >
                <ShieldAlert size={13} />
                <span>EMERGENCY</span>
              </button>
            </div>
          </div>

          {/* 3. Target Scope & Audio Ping */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Audience Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="All Campus (All Departments)">All Campus (All Verified Students)</option>
                <option value="Computer Science & Engineering">CSE Department Only</option>
                <option value="Artificial Intelligence & Data Science">AI & Data Science Only</option>
                <option value="Batch 2026 Juniors">Batch 2026 Juniors Only</option>
                <option value="Active Voice Stages Only">Active Voice Stages Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Audio Chime Alert
              </label>
              <button
                type="button"
                onClick={() => setPlayAudioChime(!playAudioChime)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  playAudioChime
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] text-slate-500"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {playAudioChime ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <span>{playAudioChime ? "Sound Chime Enabled" : "Silent Notification"}</span>
                </span>
                <span className="text-[10px] uppercase">{playAudioChime ? "ON" : "OFF"}</span>
              </button>
            </div>
          </div>

          {/* 4. Message Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Broadcast Announcement Body *
              </label>
              <span
                className={`text-[10px] tabular-nums ${
                  message.length > MAX_CHARS - 30 ? "text-rose-500 font-bold" : "text-slate-400"
                }`}
              >
                {message.length} / {MAX_CHARS}
              </span>
            </div>
            <textarea
              rows={3}
              required
              maxLength={MAX_CHARS}
              placeholder="Enter precise announcement message. Markdown text supported..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setIsConfirming(false);
              }}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF] leading-relaxed font-sans"
            />
          </div>

          {/* ── 5. Real-Time Student Screen Preview ──────────────────────── */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Live Student Screen Preview
            </span>
            <div
              className={`p-3.5 rounded-2xl border text-xs transition-all ${
                urgency === "EMERGENCY"
                  ? "border-red-500/60 bg-[#160B0E] text-rose-100 shadow-md shadow-red-500/10"
                  : urgency === "WARNING"
                  ? "border-amber-500/60 bg-[#17130A] text-amber-100 shadow-md shadow-amber-500/10"
                  : "border-[#1E90FF]/60 bg-[#0A1220] text-sky-100 shadow-md shadow-[#1E90FF]/10"
              }`}
            >
              <div className="flex items-center gap-2 mb-1 text-[10px] font-bold">
                <Radio size={12} className="animate-pulse text-current" />
                <span className="uppercase font-extrabold">[{urgency} BROADCAST]</span>
                <span className="opacity-75">• Target: {scope}</span>
              </div>
              <h5 className="font-extrabold text-sm text-white mb-0.5">
                {title.trim() || "Announcement Title"}
              </h5>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {message.trim() || "Broadcast body message will appear here in real time across student viewports."}
              </p>
            </div>
          </div>

          {/* ── 6. Actions & 2-Step Confirmation Prompt ─────────────────── */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsConfirming(false);
                onClose();
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] tabular-nums text-rose-500 font-bold animate-pulse">
                    Push live to active subscribers?
                  </span>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-lg shadow-[#1E90FF]/30 cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Yes, Dispatch Now</span>
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 hover:shadow-lg cursor-pointer transition-all"
                >
                  <Megaphone size={14} />
                  <span>Push Live Campus Broadcast</span>
                </button>
              )}
            </div>
          </div>

        </form>
      </motion.div>
    </div>
  );
}

export default BroadcastModal;
