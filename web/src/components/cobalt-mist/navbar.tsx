import React from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Sun, Moon } from "lucide-react";
import { useThemeStore } from "../../store/theme.store";

export function CobaltNavbar() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggle);
  const isDark = theme === "dark";

  return (
    <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between gap-4 sm:gap-8 rounded-full border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/75 px-6 py-3 backdrop-blur-xl shadow-md dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-all hover:border-sky-400/40 dark:hover:border-[#38BDF8]/30"
      >
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#38BDF8] text-white shadow-sm shadow-[#2563EB]/25 group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-slate-50 tracking-tight">
            Antigravity
          </span>
        </a>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          <a href="#features" className="hover:text-[#0284C7] dark:hover:text-[#38BDF8] transition-colors duration-150">
            Features
          </a>
          <a href="#bento" className="hover:text-[#0284C7] dark:hover:text-[#38BDF8] transition-colors duration-150">
            Showcase
          </a>
          <a href="#cta" className="hover:text-[#0284C7] dark:hover:text-[#38BDF8] transition-colors duration-150">
            Docs
          </a>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-700" />}
          </button>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#38BDF8] px-4 py-1.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] dark:shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] transition-all cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </motion.nav>
    </header>
  );
}
