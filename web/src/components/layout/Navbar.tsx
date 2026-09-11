import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Menu, X, Sun, Moon, ShieldCheck, Users, FolderOpen } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useThemeStore } from "../../store/theme.store";

export interface NavbarProps {
  className?: string;
}

export function Navbar({ className = "" }: NavbarProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === "dark";

  const navLinks = [
    { label: "Study Rooms", href: "#features", icon: Users },
    { label: "Resource Vault", href: "#features", icon: FolderOpen },
    { label: "Verified .EDU", href: "#campuses", icon: ShieldCheck }
  ];

  return (
    <header className={`fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none ${className}`}>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-auto w-full max-w-5xl rounded-full border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 px-6 py-3 backdrop-blur-xl shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-all hover:border-[#1E90FF]/40"
      >
        <div className="flex items-center justify-between gap-4">
          {/* ── Brand Logo ────────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E90FF] text-white shadow-md shadow-[#1E90FF]/25 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-1.5">
                StudyConnect
                <span className="h-2 w-2 rounded-full bg-[#1E90FF] inline-block animate-pulse" />
              </span>
              <span className="text-[10px] font-bold text-[#1E90FF] tracking-widest uppercase -mt-0.5">
                Campus OS
              </span>
            </div>
          </Link>

          {/* ── Desktop Navigation Links ──────────────────────────────── */}
          <div className="hidden md:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="hover:text-[#1E90FF] transition-colors duration-150 relative group py-1 flex items-center gap-1.5"
                >
                  <Icon size={13} className="text-slate-400 dark:text-slate-500 group-hover:text-[#1E90FF] transition-colors" />
                  <span>{link.label}</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#1E90FF] group-hover:w-full transition-all duration-200" />
                </a>
              );
            })}
          </div>

          {/* ── Right Actions ─────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-sm"
            >
              {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-700" />}
            </motion.button>

            {user ? (
              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-2 rounded-full bg-[#1E90FF] hover:bg-[#187bcd] px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(30,144,255,0.35)] hover:shadow-[0_0_25px_rgba(30,144,255,0.45)] transition-all cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 px-3 py-1.5 transition-colors"
                >
                  Sign In
                </Link>

                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  onClick={() => navigate("/register")}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1E90FF] hover:bg-[#187bcd] px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(30,144,255,0.35)] hover:shadow-[0_0_25px_rgba(30,144,255,0.45)] transition-all cursor-pointer"
                >
                  <span>Get Campus Access</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </motion.button>
              </>
            )}

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* ── Mobile Responsive Dropdown with Spring Physics ────────── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="md:hidden overflow-hidden pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5"
            >
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/60">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 px-2 py-1"
                >
                  Sign In
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/register");
                  }}
                  className="px-4 py-2 rounded-full bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25"
                >
                  Register with .EDU
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </header>
  );
}

export default Navbar;
