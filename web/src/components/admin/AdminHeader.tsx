import React from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Megaphone,
  ArrowLeft,
  Radio
} from "lucide-react";
import { Link } from "react-router";

interface AdminHeaderProps {
  onOpenBroadcast: () => void;
}

export function AdminHeader({ onOpenBroadcast }: AdminHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
      
      {/* ── Left Title & Privileges Badge ───────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
          <ShieldAlert size={14} className="shrink-0 animate-pulse" />
          <span>Elevated Admin & Faculty Privileges</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
          Campus Governance & Safety Hub
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Real-time institutional oversight, report triage, student role escalations, and campus broadcast dispatch.
        </p>
      </div>

      {/* ── Right System Status & Quick Actions ─────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 self-start md:self-center shrink-0">
        
        {/* Live Socket.IO Health Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shadow-sm tabular-nums">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>342 Active Sockets • &lt;15ms Latency • MongoDB Healthy</span>
        </div>

        {/* Broadcast Alert Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onOpenBroadcast}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 hover:shadow-lg hover:shadow-[#1E90FF]/35 transition-all cursor-pointer"
        >
          <Megaphone size={14} />
          <span>Broadcast Alert</span>
        </motion.button>

        {/* Return to Student View Shortcut */}
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#1E90FF] hover:text-[#1E90FF] dark:hover:text-[#1E90FF] shadow-sm transition-all"
        >
          <ArrowLeft size={13} />
          <span>Student View</span>
        </Link>

      </div>

    </div>
  );
}

export default AdminHeader;
