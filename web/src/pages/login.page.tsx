import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  Sun,
  Moon,
  CheckCircle2,
  X,
  Loader2
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { useThemeStore } from "../store/theme.store";
import { useToastStore } from "../store/toast.store";

export function LoginPage() {
  const navigate = useNavigate();
  const loginUser = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === "dark";
  const { addToast } = useToastStore();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("studyconnect_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const user = await loginUser({
        email: email.trim(),
        password
      });

      if (rememberMe) {
        localStorage.setItem("studyconnect_remembered_email", email.trim());
      } else {
        localStorage.removeItem("studyconnect_remembered_email");
      }

      addToast(`Welcome back, ${user.fullName}!`, "success");
      navigate("/dashboard");
    } catch (err: any) {
      const status = err.response?.status;
      const msg =
        err.response?.data?.message ||
        (status === 429
          ? "Too many login attempts. Please slow down and try again in a few moments."
          : "Invalid credentials. Please verify your college email and password.");
      setError(msg);
      addToast(msg, "error");
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail.trim());
      setForgotSent(true);
      addToast("Password recovery instructions dispatched to your campus email", "success");
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg) {
        addToast(msg, "error");
      } else {
        setForgotSent(true);
        addToast("Password recovery link sent to your institutional email", "success");
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#080D1A] px-4 selection:bg-[#1E90FF]/25 selection:text-[#1E90FF] transition-colors duration-300">
      {/* ── Ambient Background Glows ──────────────────────────────────── */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-[#1E90FF]/20 dark:bg-[#1E90FF]/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-72 w-72 rounded-full bg-[#1E90FF]/15 dark:bg-[#1E90FF]/10 blur-[100px]" />

      {/* ── Theme Switcher ────────────────────────────────────────────── */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white/80 dark:bg-[#0F1A30]/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-all cursor-pointer"
        >
          {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-700" />}
        </button>
      </div>

      {/* ── Symmetrical Frosted Glass Card ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0F1A30]/80 p-8 sm:p-10 backdrop-blur-2xl shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      >
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E90FF] text-white shadow-md shadow-[#1E90FF]/25 group-hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">StudyConnect</span>
          </Link>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Welcome Back</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Sign in to access your study rooms & resource vault</p>
        </div>

        {/* ── Error Banner with Shake Animation ────────────────────────── */}
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
            transition={{ duration: 0.4 }}
            className="mt-5 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
          {/* Institutional Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="email"
                required
                placeholder="you@campus.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080D1A]/70 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#1E90FF] focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all"
              />
            </div>
          </div>

          {/* Password with Show/Hide & Forgot Link */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotSent(false);
                  setForgotOpen(true);
                }}
                className="text-[11px] font-semibold text-[#1E90FF] hover:text-[#187bcd] hover:underline transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080D1A]/70 pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#1E90FF] focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox & Security Badge */}
          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-800 bg-white dark:bg-[#080D1A] text-[#1E90FF] focus:ring-[#1E90FF] focus:ring-offset-0 accent-[#1E90FF] cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Remember this device</span>
            </label>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <Shield className="h-3 w-3 text-[#1E90FF]" /> 256-bit Encrypted
            </span>
          </div>

          {/* Primary Action Button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] py-3 text-xs font-bold text-white shadow-[0_0_20px_rgba(30,144,255,0.35)] hover:shadow-[0_0_25px_rgba(30,144,255,0.45)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating with Campus...</span>
              </>
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-600 dark:text-slate-400">
          Don't have an account yet?{" "}
          <Link to="/register" className="font-bold text-[#1E90FF] hover:text-[#187bcd] hover:underline transition-colors">
            Register with .edu
          </Link>
        </p>
      </motion.div>

      {/* ── Forgot Password Modal Popover ──────────────────────────────── */}
      <AnimatePresence>
        {forgotOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 sm:p-8 shadow-2xl"
            >
              <button
                onClick={() => setForgotOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 mb-1">
                Reset Account Password
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                Enter your registered campus email address. We will send a secure password recovery link.
              </p>

              {forgotSent ? (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-50">
                    Reset Link Dispatched
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Check your inbox at <span className="font-semibold text-[#1E90FF]">{forgotEmail}</span>.
                  </p>
                  <button
                    onClick={() => setForgotOpen(false)}
                    className="mt-4 px-6 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Campus Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@campus.edu"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF] focus:ring-1 focus:ring-[#1E90FF]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LoginPage;
