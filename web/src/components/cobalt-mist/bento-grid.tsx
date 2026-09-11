import React from "react";
import { motion } from "framer-motion";
import { Cpu, Shield, Zap, Sparkles, ArrowUpRight } from "lucide-react";

interface BentoItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  badge?: string;
  span: string;
}

const bentoItems: BentoItem[] = [
  {
    icon: Zap,
    title: "Micro-Interactions",
    desc: "Fluid physics-driven animations configured directly via Framer Motion spring curves with tactile haptic feel.",
    badge: "Framer Motion",
    span: "col-span-1 md:col-span-2",
  },
  {
    icon: Shield,
    title: "Isolated Tokens",
    desc: "Strict WCAG AA contrast compliance and isolated CSS custom variables.",
    badge: "WCAG AA",
    span: "col-span-1",
  },
  {
    icon: Cpu,
    title: "Zero Layout Shift",
    desc: "Optimized component structures engineered for 100/100 web vital scores.",
    badge: "Core Vitals",
    span: "col-span-1",
  },
  {
    icon: Sparkles,
    title: "Misty Glass Blur",
    desc: "Layered backdrop-blur and ambient lighting without rendering overhead or performance bottlenecks.",
    badge: "GPU Accelerated",
    span: "col-span-1 md:col-span-2",
  },
];

export function CobaltBentoGrid() {
  return (
    <section id="bento" className="py-24 bg-slate-50 dark:bg-[#080D1A] px-4 border-t border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0284C7] dark:text-[#38BDF8] mb-2 block">
            Engineered Primitives
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Component Architecture
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
            Every surface is crafted with Misty Cobalt glass depth and precise boundary lighting across light & dark themes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {bentoItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeOut" }}
                whileHover={{ y: -4, scale: 1.01 }}
                className={`group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/75 p-7 backdrop-blur-xl transition-all duration-300 hover:border-sky-400/50 dark:hover:border-[#38BDF8]/40 shadow-lg dark:shadow-xl shadow-slate-200/50 dark:shadow-[#080D1A] flex flex-col justify-between ${item.span}`}
              >
                {/* Dynamic Ambient Hover Glow */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-sky-400/10 dark:bg-[#38BDF8]/10 blur-2xl group-hover:bg-blue-500/15 dark:group-hover:bg-[#2563EB]/25 transition-all duration-500" />

                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/30 dark:border-[#38BDF8]/30 bg-sky-500/10 dark:bg-[#080D1A]/80 text-[#0284C7] dark:text-[#38BDF8] shadow-sm shadow-[#2563EB]/15 group-hover:scale-110 transition-transform duration-200">
                      <Icon className="h-5 w-5" />
                    </div>

                    {item.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0284C7] dark:text-[#38BDF8] bg-sky-500/10 dark:bg-[#38BDF8]/10 border border-sky-500/20 dark:border-[#38BDF8]/20 px-2.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-200/80 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-[#0284C7] dark:text-[#38BDF8] opacity-85 group-hover:opacity-100 transition-opacity">
                  <span>Explore primitive</span>
                  <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
