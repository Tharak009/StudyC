import React from "react";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  ArrowRight,
  X,
  Sparkles,
  ShieldAlert,
  Clock,
  Copy,
  Check
} from "lucide-react";

export interface RejectionData {
  originalContent: string;
  channelId: string;
  reason?: string;
  confidence?: number;
  matchedKeywords?: string[];
  flaggedViolations?: string[];
  strikes: number;
  strikesRemaining: number;
  isTimedOut?: boolean;
  timeoutSeconds?: number;
}

interface AcademicRejectionBannerProps {
  data: RejectionData;
  onDismiss: () => void;
  onSwitchToLounge?: (content: string) => void;
}

export function AcademicRejectionBanner({
  data,
  onDismiss,
  onSwitchToLounge
}: AcademicRejectionBannerProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyAndSwitch = () => {
    try {
      navigator.clipboard.writeText(data.originalContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}

    onSwitchToLounge?.(data.originalContent);
  };

  const confidencePct = Math.round((data.confidence ?? 0) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mb-2 relative rounded-2xl border border-rose-500/40 bg-[#0F1A30]/95 dark:bg-[#090E1A]/95 p-3.5 backdrop-blur-xl shadow-2xl shadow-rose-950/30 overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3 min-w-0">
          {/* Pulsing Alert Icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-inner">
            <AlertOctagon size={20} className="animate-pulse text-rose-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-extrabold tracking-wide uppercase text-rose-400 flex items-center gap-1">
                <ShieldAlert size={13} />
                Strict Study Mode Interception
              </span>

              {/* Confidence Score Pill */}
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Score: {confidencePct}%
              </span>

              {/* Strikes Pill */}
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  data.isTimedOut
                    ? "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse"
                    : data.strikes >= 2
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-700/50 text-slate-300 border-slate-600/40"
                }`}
              >
                {data.isTimedOut ? (
                  <>
                    <Clock size={11} />
                    Muted ({Math.ceil((data.timeoutSeconds || 300) / 60)}m)
                  </>
                ) : (
                  <>Strike {data.strikes} of 3</>
                )}
              </span>
            </div>

            {/* Explanation Reason */}
            <p className="text-xs text-slate-200 dark:text-slate-300 leading-relaxed line-clamp-2">
              {data.reason ||
                "Strict Study Mode is active. Messages must directly relate to coursework or lab topics."}
            </p>

            {/* Draft recovery reassurance & violations pill */}
            <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Sparkles size={12} />
                Draft restored below — zero text lost
              </span>

              {data.flaggedViolations && data.flaggedViolations.length > 0 && (
                <span className="text-slate-400 text-[10px]">
                  Detected: {data.flaggedViolations.slice(0, 2).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X size={15} />
        </button>
      </div>

      {/* Action Footer: Switch to Social Lounge */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
          Want to chat casually? Take it to the campus social channel.
        </span>

        <button
          type="button"
          onClick={handleCopyAndSwitch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#38BDF8] hover:from-[#187bcd] hover:to-[#0284c7] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 hover:shadow-lg hover:shadow-[#1E90FF]/35 transition-all cursor-pointer ml-auto"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>Copy & Switch to #campus-lounge</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}
export default AcademicRejectionBanner;
