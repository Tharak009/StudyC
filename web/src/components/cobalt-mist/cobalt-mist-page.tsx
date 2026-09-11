import React, { useEffect } from "react";
import { CobaltNavbar } from "./navbar";
import { CobaltHero } from "./hero";
import { CobaltBentoGrid } from "./bento-grid";
import { useThemeStore } from "../../store/theme.store";

export function CobaltMistPage() {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 selection:bg-[#38BDF8]/30 selection:text-[#0284C7] dark:selection:text-white font-sans antialiased transition-colors duration-300">
      <CobaltNavbar />
      <CobaltHero />
      <CobaltBentoGrid />
    </main>
  );
}

export default CobaltMistPage;
