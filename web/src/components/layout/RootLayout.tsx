import React, { useEffect } from "react";
import { Outlet } from "react-router";
import { Navbar } from "./Navbar";
import { useThemeStore } from "../../store/theme.store";

export interface RootLayoutProps {
  children?: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 selection:bg-sky-500/30 selection:text-[#0284C7] dark:selection:text-sky-200 font-sans overflow-x-hidden antialiased transition-colors duration-300">
      {/* ── Background Ambient Light Orbs & Grid ───────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Top-centered Electric Cobalt Glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[550px] rounded-full bg-blue-300/30 dark:bg-[#2563EB]/15 blur-[140px]" />
        
        {/* Side Mist Cyan Glow */}
        <div className="absolute top-1/3 left-1/4 h-80 w-80 rounded-full bg-sky-200/30 dark:bg-[#38BDF8]/10 blur-[100px]" />

        {/* Secondary Lower Orb */}
        <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-blue-200/20 dark:bg-[#2563EB]/10 blur-[120px]" />

        {/* Subtle Grid Backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#94A3B812_1px,transparent_1px),linear-gradient(to_bottom,#94A3B812_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1E293B0d_1px,transparent_1px),linear-gradient(to_bottom,#1E293B0d_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* ── 21st.dev Frosted Glass Floating Navbar ───────────────────────── */}
      <Navbar />

      {/* ── Dynamic Content Outlet / Children ──────────────────────────── */}
      <main className="relative z-10 min-h-screen">
        {children || <Outlet />}
      </main>
    </div>
  );
}

export default RootLayout;
