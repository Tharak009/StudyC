import React from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Bot,
  FileText,
  Headphones,
  Sparkles,
  Download,
  Check,
  Send,
  Paperclip,
  Flame,
  ArrowUpRight
} from "lucide-react";

export function AppPreviewCanvas() {
  return (
    <section className="relative px-4 pb-20 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#0F1A30]/90 p-4 sm:p-6 backdrop-blur-2xl shadow-2xl dark:shadow-[0_20px_80px_rgba(0,0,0,0.6)] transition-all"
      >
        {/* ── Window Chrome Header ──────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          {/* Traffic Lights */}
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          {/* Monospace URL Address Bar */}
          <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-[#080D1A]/80 px-4 py-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium tracking-tight shadow-inner">
            <span className="text-[#1E90FF]">https://</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">studyconnect.app</span>
            <span>/workspace/cs-2026</span>
          </div>

          {/* Real-Time Live Presence Pill */}
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>342 Classmates Online</span>
          </div>
        </div>

        {/* ── 3-Column Interactive Workspace Canvas ────────────────────── */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
          
          {/* COLUMN 1: Active Study Room (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#080D1A]/70 p-4 flex flex-col justify-between shadow-sm">
            <div>
              {/* Channel Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    # algorithms-lab-batch-a
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 tabular-nums font-medium">18 active</span>
              </div>

              {/* Voice Stage Notification Banner */}
              <div className="mb-3.5 flex items-center gap-2.5 rounded-xl border border-[#1E90FF]/30 bg-[#1E90FF]/10 p-2.5 text-xs text-[#1E90FF]">
                <Headphones className="h-4 w-4 shrink-0" />
                <span className="text-[11px] font-medium leading-tight">
                  <strong className="font-bold">Ananya P.</strong> joined the Voice Stage 🎧 (Dijkstra Proof Review)
                </span>
              </div>

              {/* Chat Message Stream */}
              <div className="space-y-3 text-xs">
                {/* Message 1 */}
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-xl bg-[#1E90FF] flex items-center justify-center text-white font-bold text-[10px] shrink-0 shadow-sm shadow-[#1E90FF]/25">
                    AS
                  </div>
                  <div className="flex-1 bg-white dark:bg-[#0F1A30] border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-2.5 shadow-sm">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-slate-900 dark:text-slate-200 text-[11px]">Aarav Sharma</span>
                      <span className="text-[9px] text-slate-400 tabular-nums">10:42 AM</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      Has anyone solved Problem 4 from the Dynamic Programming set? The memoization boundary is tricky.
                    </p>
                  </div>
                </div>

                {/* Message 2 with Code Snippet */}
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-xl bg-[#1E90FF]/80 flex items-center justify-center text-white font-bold text-[10px] shrink-0 shadow-sm shadow-[#1E90FF]/20">
                    MR
                  </div>
                  <div className="flex-1 bg-white dark:bg-[#0F1A30] border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-2.5 shadow-sm">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-[#1E90FF] text-[11px]">Meera Rao</span>
                      <span className="text-[9px] text-slate-400 tabular-nums">10:44 AM</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      Here is the <code className="bg-slate-100 dark:bg-[#080D1A] text-[#1E90FF] px-1 py-0.5 rounded font-mono text-[10px]">dp[i][j]</code> recurrence base case:
                    </p>
                    <div className="mt-2 rounded-lg bg-slate-900 text-[#1E90FF] p-2 font-mono text-[10px] overflow-x-auto">
                      dp[i][w] = max(val[i-1] + dp[i-1][w-wt[i-1]], dp[i-1][w]);
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Input Box Mockup */}
            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/60 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] px-3 py-2 text-xs text-slate-400">
                <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                <span>Type in #algorithms-lab...</span>
              </div>
              <button className="h-8 w-8 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] flex items-center justify-center text-white shadow-sm shadow-[#1E90FF]/25 cursor-pointer">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* COLUMN 2: AI Academic Copilot (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#080D1A]/70 p-4 flex flex-col justify-between shadow-sm">
            <div>
              {/* Copilot Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/30">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    AI Study Copilot
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Syllabus Bound
                </span>
              </div>

              {/* Copilot Query */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-3 text-xs shadow-sm mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Active Query
                </span>
                <p className="text-slate-800 dark:text-slate-200 font-medium text-[11px]">
                  "Summarizing 3 key proofs for Graph Theory midsem based on CS301 Lecture Notes"
                </p>
              </div>

              {/* Copilot Output Points */}
              <div className="space-y-2 text-[11px]">
                <div className="flex items-start gap-2 rounded-xl bg-[#1E90FF]/5 border border-[#1E90FF]/20 p-2.5">
                  <Check className="h-3.5 w-3.5 text-[#1E90FF] shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>Euler's Formula:</strong> <code className="text-[#1E90FF]">V - E + F = 2</code> for connected planar graphs.
                  </p>
                </div>

                <div className="flex items-start gap-2 rounded-xl bg-[#1E90FF]/5 border border-[#1E90FF]/20 p-2.5">
                  <Check className="h-3.5 w-3.5 text-[#1E90FF] shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>Handshaking Lemma:</strong> Sum of degrees equals <code className="text-[#1E90FF]">2|E|</code>.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-[#1E90FF] font-bold cursor-pointer hover:underline">
              <span>Generate Flashcards (12 cards)</span>
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* COLUMN 3: Resource Vault Drop (3 cols) */}
          <div className="lg:col-span-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#080D1A]/70 p-4 flex flex-col justify-between shadow-sm">
            <div>
              {/* Vault Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#1E90FF]" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Vault Drops
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Sem 6</span>
              </div>

              {/* Resource Cards */}
              <div className="space-y-2.5">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] p-2.5 shadow-sm hover:border-[#1E90FF]/40 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-[#1E90FF] bg-[#1E90FF]/10 px-1.5 py-0.5 rounded">
                      PDF • 4.2 MB
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 tabular-nums font-semibold">
                      <Download size={10} /> 412
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    DBMS Normalization Handout
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Prof. Ramanujan Notes</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] p-2.5 shadow-sm hover:border-[#1E90FF]/40 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-[#1E90FF] bg-[#1E90FF]/10 px-1.5 py-0.5 rounded">
                      ZIP • 12 MB
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 tabular-nums font-semibold">
                      <Download size={10} /> 628
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    OS Lab Assignment 3 Solutions
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Verified Working Code</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
              <span>View 120+ Vault Files</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#1E90FF]" />
            </div>
          </div>

        </div>
      </motion.div>
    </section>
  );
}

export default AppPreviewCanvas;
