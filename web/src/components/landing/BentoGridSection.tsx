import React from "react";
import { motion } from "framer-motion";
import {
  Zap,
  ShieldCheck,
  FolderLock,
  Bot,
  ArrowUpRight,
  Headphones,
  FileCode,
  Users,
  Sparkles
} from "lucide-react";

export function BentoGridSection() {
  return (
    <section id="features" className="py-24 px-4 max-w-6xl mx-auto">
      {/* ── Section Title ─────────────────────────────────────────────── */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-bold uppercase tracking-widest text-[#1E90FF] mb-2 block">
          Engineered for Deep Work
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
          Everything serious students need to excel together
        </h2>
        <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          Isolated college workspaces with low-latency sockets, verified batch encryption, and syllabus-grounded AI tools.
        </p>
      </div>

      {/* ── 4-Card Asymmetric Bento Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* CARD 1 (2 Cols): Socket.IO Multi-Channel Study Rooms */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          whileHover={{ y: -4 }}
          className="group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 p-8 backdrop-blur-xl md:col-span-2 shadow-lg dark:shadow-xl hover:border-[#1E90FF]/40 transition-all flex flex-col justify-between"
        >
          {/* Hover Glow */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#1E90FF]/15 blur-3xl group-hover:scale-125 transition-transform duration-500" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/30">
                <Zap className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E90FF] bg-[#1E90FF]/10 border border-[#1E90FF]/20 px-3 py-1 rounded-full">
                Sub-15ms WebSocket
              </span>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight mb-2.5">
              Multi-Channel Study Rooms
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Drop into focused voice stages with live audio waveform indicators, rich code sharing with IDE syntax highlighting, real-time typing indicators, and emoji message threads.
            </p>

            {/* Visual Micro Mockup */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]/80 p-3">
                <Headphones className="h-4 w-4 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Voice Stage Active</div>
                  <div className="text-[10px] text-slate-400">8 peers in Graph Algorithms</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]/80 p-3">
                <FileCode className="h-4 w-4 text-[#1E90FF] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Snippet Sync</div>
                  <div className="text-[10px] text-slate-400">C++, Python, Java highlighted</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-200/80 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold text-[#1E90FF]">
            <span>Explore real-time rooms</span>
            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </motion.div>

        {/* CARD 2 (1 Col): Institutional .edu Verification */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          whileHover={{ y: -4 }}
          className="group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 p-8 backdrop-blur-xl md:col-span-1 shadow-lg dark:shadow-xl hover:border-[#1E90FF]/40 transition-all flex flex-col justify-between"
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl group-hover:scale-125 transition-transform duration-500" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                Zero Spam
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight mb-2">
              Institutional .EDU Auth
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every peer is cryptographically validated through institutional email domains. No spammers, no bots, only genuine students from your department and batch.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-200/80 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span>Verified Campus Network</span>
            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </motion.div>

        {/* CARD 3 (1 Col): Peer-Reviewed Resource Repository */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          whileHover={{ y: -4 }}
          className="group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 p-8 backdrop-blur-xl md:col-span-1 shadow-lg dark:shadow-xl hover:border-[#1E90FF]/40 transition-all flex flex-col justify-between"
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl group-hover:scale-125 transition-transform duration-500" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
                <FolderLock className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                Curated Notes
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight mb-2">
              Resource Vault
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Organized by Semester, Subject Code, and Faculty. Star-rated lecture slides, lab manuals, and midterm cheat sheets with instant document preview.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-200/80 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>Browse Vault Drops</span>
            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </motion.div>

        {/* CARD 4 (2 Cols): Curriculum-Aware Study Intelligence */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          whileHover={{ y: -4 }}
          className="group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 p-8 backdrop-blur-xl md:col-span-2 shadow-lg dark:shadow-xl hover:border-[#1E90FF]/40 transition-all flex flex-col justify-between"
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#1E90FF]/15 blur-3xl group-hover:scale-125 transition-transform duration-500" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/30">
                <Bot className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E90FF] bg-[#1E90FF]/10 border border-[#1E90FF]/20 px-3 py-1 rounded-full">
                Syllabus Grounded
              </span>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight mb-2.5">
              Curriculum-Aware Study Intelligence
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Unlike generic AI, StudyConnect Copilot is grounded solely in your uploaded professor handouts and department syllabus. Auto-generate flashcards, step-by-step math derivations, and mock quiz sets.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]/80 px-3 py-1.5 font-medium text-slate-700 dark:text-slate-300">
                ✨ Formula Proof Derivations
              </span>
              <span className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]/80 px-3 py-1.5 font-medium text-slate-700 dark:text-slate-300">
                ⚡ 1-Click Flashcard Decks
              </span>
              <span className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]/80 px-3 py-1.5 font-medium text-slate-700 dark:text-slate-300">
                🎯 Exam Review Summaries
              </span>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-200/80 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold text-[#1E90FF]">
            <span>Try Copilot Intelligence</span>
            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </motion.div>

      </div>
    </section>
  );
}

export default BentoGridSection;
