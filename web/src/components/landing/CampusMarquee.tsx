import React from "react";
import { motion } from "framer-motion";
import { GraduationCap, Award, Shield } from "lucide-react";

const campuses = [
  { name: "IIT Delhi", code: "iitd.ac.in", icon: GraduationCap },
  { name: "BITS Pilani", code: "pilani.bits-pilani.ac.in", icon: Award },
  { name: "Stanford University", code: "stanford.edu", icon: Shield },
  { name: "NUS Singapore", code: "u.nus.edu", icon: GraduationCap },
  { name: "IIT Bombay", code: "iitb.ac.in", icon: Award },
  { name: "MIT", code: "mit.edu", icon: Shield },
  { name: "NIT Trichy", code: "nitt.edu", icon: GraduationCap },
  { name: "UC Berkeley", code: "berkeley.edu", icon: Award }
];

export function CampusMarquee() {
  return (
    <section id="campuses" className="py-12 border-y border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-[#080D1A]/50 overflow-hidden backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 mb-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Trusted by verified students & study circles across global top campuses
        </p>
      </div>

      <div className="relative flex overflow-x-hidden">
        {/* Infinite CSS / Motion Scrolling Ticker */}
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ ease: "linear", duration: 25, repeat: Infinity }}
          className="flex items-center gap-6 whitespace-nowrap will-change-transform"
        >
          {[...campuses, ...campuses].map((campus, idx) => {
            const Icon = campus.icon;
            return (
              <div
                key={idx}
                className="inline-flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/75 px-5 py-2.5 shadow-sm hover:border-[#1E90FF]/40 transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#1E90FF]/10 text-[#1E90FF]">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {campus.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    @{campus.code}
                  </span>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

export default CampusMarquee;
