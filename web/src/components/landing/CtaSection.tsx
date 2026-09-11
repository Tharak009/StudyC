import React from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, ShieldCheck, Zap, Activity, FileCheck } from "lucide-react";
import { Link } from "react-router";

const metrics = [
  { value: "99.9%", label: "Socket Uptime", icon: Activity },
  { value: "100%", label: "Verified .EDU Users", icon: ShieldCheck },
  { value: "<20ms", label: "WebSocket Latency", icon: Zap },
  { value: "50K+", label: "Shared Study Notes", icon: FileCheck },
];

export function CtaSection() {
  return (
    <section id="cta" className="py-20 px-4 max-w-6xl mx-auto">
      {/* ── 4 KPI Metrics Bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeOut" }}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/75 p-6 backdrop-blur-xl text-center shadow-md dark:shadow-lg"
            >
              <div className="flex justify-center mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E90FF]/10 text-[#1E90FF]">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                {metric.value}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                {metric.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── High-Converting Bottom Card ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-[#1E90FF]/30 bg-gradient-to-b from-white via-slate-50 to-white dark:from-[#0F1A30] dark:via-[#0F1A30]/90 dark:to-[#080D1A] p-8 sm:p-14 text-center backdrop-blur-2xl shadow-2xl"
      >
        {/* Ambient Backlight */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-96 rounded-full bg-[#1E90FF]/20 dark:bg-[#1E90FF]/25 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-[#1E90FF]/15 blur-[80px]" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1E90FF]/30 bg-[#1E90FF]/10 px-3.5 py-1 text-xs font-bold text-[#1E90FF] mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ready for your Next Semester?</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
            Claim your department workspace in 60 seconds
          </h2>

          <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
            Connect with classmates from your batch, access verified exam handouts, and collaborate in low-latency voice and chat study channels.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] px-8 py-4 text-sm font-bold text-white shadow-[0_0_25px_rgba(30,144,255,0.45)] hover:shadow-[0_0_35px_rgba(30,144,255,0.6)] transition-all cursor-pointer"
              >
                <span>Register with .EDU</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>

            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] px-7 py-4 text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#162544] transition-all cursor-pointer"
              >
                <span>Sign In to Workspace</span>
              </motion.button>
            </Link>
          </div>

          <p className="mt-4 text-[11px] text-slate-400 font-medium">
            No credit card required • Institutional domain verification only
          </p>
        </div>
      </motion.div>
    </section>
  );
}

export default CtaSection;
