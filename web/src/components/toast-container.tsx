import React from "react";
import { useToastStore } from "../store/toast.store";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Sparkles,
  X,
  BellRing
} from "lucide-react";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const toastConfigs = {
    success: {
      icon: CheckCircle2,
      badge: "Success",
      border: "border-emerald-500/30 dark:border-emerald-500/20",
      glow: "shadow-[0_8px_25px_rgba(16,185,129,0.15)]",
      iconBg: "bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-sm shadow-emerald-500/30",
      textColor: "text-emerald-950 dark:text-emerald-100",
      accentBar: "bg-gradient-to-r from-emerald-500 to-teal-400"
    },
    error: {
      icon: AlertOctagon,
      badge: "Error",
      border: "border-rose-500/30 dark:border-rose-500/20",
      glow: "shadow-[0_8px_25px_rgba(244,63,94,0.15)]",
      iconBg: "bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-sm shadow-rose-500/30",
      textColor: "text-rose-950 dark:text-rose-100",
      accentBar: "bg-gradient-to-r from-rose-500 to-pink-500"
    },
    warning: {
      icon: AlertTriangle,
      badge: "Warning",
      border: "border-amber-500/30 dark:border-amber-500/20",
      glow: "shadow-[0_8px_25px_rgba(245,158,11,0.15)]",
      iconBg: "bg-gradient-to-tr from-amber-600 to-yellow-400 text-white shadow-sm shadow-amber-500/30",
      textColor: "text-amber-950 dark:text-amber-100",
      accentBar: "bg-gradient-to-r from-amber-500 to-yellow-400"
    },
    info: {
      icon: Sparkles,
      badge: "Notice",
      border: "border-sky-500/30 dark:border-sky-500/20",
      glow: "shadow-[0_8px_25px_rgba(56,189,248,0.18)]",
      iconBg: "bg-gradient-to-tr from-[#2563EB] to-[#38BDF8] text-white shadow-sm shadow-sky-500/30",
      textColor: "text-slate-900 dark:text-sky-100",
      accentBar: "bg-gradient-to-r from-[#2563EB] to-[#38BDF8]"
    }
  };

  return (
    <aside
      aria-label="Campus alert notification toasts"
      className="fixed top-4 right-4 z-50 flex w-full max-w-[380px] flex-col gap-2.5 pointer-events-none p-2"
    >
      <AnimatePresence mode="sync">
        {toasts.map((toast) => {
          const cfg = toastConfigs[toast.type] || toastConfigs.info;
          const Icon = cfg.icon;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-2xl transition-all
                bg-white/95 dark:bg-[#0c1322]/95 ${cfg.border} ${cfg.glow}
                text-slate-800 dark:text-slate-200`}
            >
              {/* Top ambient color glow */}
              <div className="absolute top-0 left-0 right-0 h-0.5 opacity-80 overflow-hidden">
                <div className={`h-full w-full ${cfg.accentBar}`} />
              </div>

              <div className="flex items-start gap-3">
                {/* Icon Badge */}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
                  <Icon size={16} />
                </div>

                {/* Message Body */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {cfg.badge}
                    </span>
                    <span className="text-[9px] text-slate-400">• Just now</span>
                  </div>
                  <p className={`text-xs font-semibold leading-snug ${cfg.textColor}`}>
                    {toast.message}
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors shrink-0 cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </aside>
  );
}

export default ToastContainer;

