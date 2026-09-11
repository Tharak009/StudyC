import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Terminal, Sparkles } from "lucide-react";
import { Link } from "react-router";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-4 overflow-hidden text-center">
      {/* ── Ambient Radial Lighting Orbs ─────────────────────────────────── */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-[#1E90FF]/20 dark:bg-[#1E90FF]/15 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-[#1E90FF]/15 dark:bg-[#1E90FF]/10 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-[#1E90FF]/10 dark:bg-[#1E90FF]/5 blur-[120px]" />

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
        {/* ── Verification Chip ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2.5 rounded-full border border-[#1E90FF]/30 bg-white/90 dark:bg-[#0F1A30]/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1E90FF] backdrop-blur-xl shadow-md dark:shadow-[0_0_20px_rgba(30,144,255,0.15)] mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1E90FF] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1E90FF]" />
          </span>
          <ShieldCheck className="h-3.5 w-3.5 text-[#1E90FF]" />
          <span>Exclusive to Verified .edu & Institutional Students</span>
        </motion.div>

        {/* ── Main Headline ────────────────────────────────────────────── */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.08] max-w-4xl"
        >
          The Collaborative Campus OS for{" "}
          <span className="bg-gradient-to-r from-[#1E90FF] via-[#4da6ff] to-[#1E90FF] dark:from-[#1E90FF] dark:via-[#80bfff] dark:to-[#1E90FF] bg-clip-text text-transparent">
            Serious Academics
          </span>
        </motion.h1>

        {/* ── Subtitle ─────────────────────────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed"
        >
          Replace fragmented group chats and lost Drive folders. Real-time multi-channel study circles, syllabus-aware AI Copilot, and peer-reviewed resource vault.
        </motion.p>

        {/* ── CTA Group ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/register">
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="inline-flex items-center gap-2.5 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] px-7 py-4 text-sm font-bold text-white shadow-[0_0_25px_rgba(30,144,255,0.35)] hover:shadow-[0_0_35px_rgba(30,144,255,0.45)] transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Claim Student Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </Link>

          <a href="#demo">
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/75 px-7 py-4 text-sm font-bold text-slate-800 dark:text-slate-200 hover:border-[#1E90FF]/50 hover:bg-slate-100 dark:hover:bg-[#162544] hover:text-slate-950 dark:hover:text-white transition-all backdrop-blur-xl cursor-pointer shadow-sm"
            >
              <Terminal className="h-4 w-4 text-[#1E90FF]" />
              <span>Live Interactive Demo</span>
            </motion.button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
