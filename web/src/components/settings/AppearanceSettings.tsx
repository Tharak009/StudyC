import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Palette,
  Moon,
  Sun,
  Sparkles,
  Zap,
  Check
} from "lucide-react";
import { useThemeStore } from "../../store/theme.store";
import { useToastStore } from "../../store/toast.store";

export function AppearanceSettings() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === "dark";
  const { addToast } = useToastStore();

  const [reduceMotion, setReduceMotion] = useState(() => {
    try {
      return localStorage.getItem("studyconnect_reduce_motion") === "true";
    } catch {
      return false;
    }
  });

  const handleToggleReduceMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    try {
      localStorage.setItem("studyconnect_reduce_motion", String(next));
    } catch {}
    addToast(`Reduced motion ${next ? "enabled" : "disabled"}`, "info");
  };

  const handleThemeSelect = (selectedTheme: "dark" | "light") => {
    if ((selectedTheme === "dark" && !isDark) || (selectedTheme === "light" && isDark)) {
      toggleTheme();
      addToast(`Theme switched to ${selectedTheme === "dark" ? "Cobalt Mist (Dark)" : "Frost Glaze (Light)"}`, "info");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── Dual-Theme Visual Cards ───────────────────────────────────── */}
      <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
          <Palette size={16} className="text-[#1E90FF]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
            Interface Theme & Color Palette
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Option 1: Cobalt Mist (Dark) */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => handleThemeSelect("dark")}
            className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              isDark
                ? "border-[#1E90FF] bg-[#1E90FF]/5 shadow-lg shadow-[#1E90FF]/15"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
            }`}
          >
            {/* Visual Mini Mockup */}
            <div className="h-28 w-full rounded-2xl bg-[#080D1A] p-3 border border-slate-800 flex flex-col justify-between mb-3 overflow-hidden shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#1E90FF]" />
                  <div className="h-2 w-12 rounded bg-slate-800" />
                </div>
                <div className="h-2 w-4 rounded bg-[#1E90FF]" />
              </div>
              <div className="space-y-1.5">
                <div className="h-5 w-full rounded-lg bg-[#0F1A30] border border-slate-800/80 flex items-center px-2">
                  <div className="h-1.5 w-16 rounded bg-[#1E90FF]/80" />
                </div>
                <div className="h-4 w-3/4 rounded-lg bg-[#162544] flex items-center px-2">
                  <div className="h-1.5 w-10 rounded bg-slate-600" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Moon size={13} className="text-[#1E90FF]" />
                  <span>Cobalt Mist (Dark)</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  #080D1A deep void with Dodger Blue highlights
                </p>
              </div>
              {isDark && (
                <div className="h-5 w-5 rounded-full bg-[#1E90FF] text-white flex items-center justify-center">
                  <Check size={12} />
                </div>
              )}
            </div>
          </motion.div>

          {/* Option 2: Frost Glaze (Light) */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => handleThemeSelect("light")}
            className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              !isDark
                ? "border-[#1E90FF] bg-[#1E90FF]/5 shadow-lg shadow-[#1E90FF]/15"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-700"
            }`}
          >
            {/* Visual Mini Mockup */}
            <div className="h-28 w-full rounded-2xl bg-slate-50 p-3 border border-slate-200 flex flex-col justify-between mb-3 overflow-hidden shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#1E90FF]" />
                  <div className="h-2 w-12 rounded bg-slate-300" />
                </div>
                <div className="h-2 w-4 rounded bg-[#1E90FF]" />
              </div>
              <div className="space-y-1.5">
                <div className="h-5 w-full rounded-lg bg-white border border-slate-200 flex items-center px-2">
                  <div className="h-1.5 w-16 rounded bg-[#1E90FF]" />
                </div>
                <div className="h-4 w-3/4 rounded-lg bg-slate-100 flex items-center px-2">
                  <div className="h-1.5 w-10 rounded bg-slate-400" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sun size={13} className="text-amber-500" />
                  <span>Frost Glaze (Light)</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Crisp slate with frosted glass accents
                </p>
              </div>
              {!isDark && (
                <div className="h-5 w-5 rounded-full bg-[#1E90FF] text-white flex items-center justify-center">
                  <Check size={12} />
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── Motion & Animation Preferences ────────────────────────────── */}
      <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
          <Zap size={16} className="text-[#1E90FF]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
            Performance & Motion Dynamics
          </h3>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Reduce Motion & Complex Transitions
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Simplifies Framer Motion spring physics for improved battery life on mobile devices.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleReduceMotion}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              reduceMotion ? "bg-[#1E90FF]" : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                reduceMotion ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

    </div>
  );
}

export default AppearanceSettings;
