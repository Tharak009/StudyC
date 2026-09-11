import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Terminal } from "lucide-react";

export function CobaltHero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#080D1A] px-4 pt-28 pb-16 transition-colors duration-300">
      {/* ── Ambient Radial Glows & Grid (Light & Dark) ────────────────────── */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[550px] rounded-full bg-blue-200/40 dark:bg-[#2563EB]/15 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 left-1/4 h-80 w-80 rounded-full bg-sky-100/40 dark:bg-[#38BDF8]/10 blur-[100px]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#94A3B812_1px,transparent_1px),linear-gradient(to_bottom,#94A3B812_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1E293B0d_1px,transparent_1px),linear-gradient(to_bottom,#1E293B0d_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="relative z-10 max-w-4xl text-center">
        {/* Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center gap-2.5 rounded-full border border-sky-400/30 dark:border-[#38BDF8]/30 bg-white/90 dark:bg-[#0F1A30]/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0284C7] dark:text-[#38BDF8] backdrop-blur-md shadow-sm shadow-[#2563EB]/15"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0284C7] dark:bg-[#38BDF8] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0284C7] dark:bg-[#38BDF8]" />
          </span>
          Next-Gen UI Architecture
        </motion.div>

        {/* Heading with Gradient Shine */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.08]"
        >
          Design at the speed of thought with{" "}
          <span className="bg-gradient-to-r from-[#2563EB] via-[#0284C7] to-cyan-500 dark:from-[#2563EB] dark:via-[#38BDF8] dark:to-cyan-300 bg-clip-text text-transparent">
            Cobalt Mist
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
        >
          Supercharged with 21st.dev primitives, Framer Motion fluid dynamics, and frictionless developer workflow.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#38BDF8] px-7 py-3.5 text-sm font-bold text-white shadow-[0_0_25px_rgba(37,99,235,0.35)] dark:shadow-[0_0_25px_rgba(37,99,235,0.45)] hover:shadow-[0_0_35px_rgba(56,189,248,0.55)] transition-all cursor-pointer"
          >
            <span>Start Building</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/75 px-7 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-300 hover:border-sky-400/50 dark:hover:border-[#38BDF8]/40 hover:bg-slate-100 dark:hover:bg-[#162544] hover:text-slate-950 dark:hover:text-white transition-all backdrop-blur-xl cursor-pointer shadow-sm"
          >
            <Terminal className="h-4 w-4 text-[#0284C7] dark:text-[#38BDF8]" />
            <span>View Components</span>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
