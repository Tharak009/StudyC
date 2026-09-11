import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Sun,
  Moon,
  CheckCircle2,
  KeyRound,
  Loader2
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { authApi } from "../api/auth.api";
import { useThemeStore } from "../store/theme.store";
import { useToastStore } from "../store/toast.store";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === "dark";
  const { addToast } = useToastStore();

  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = calculateStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError("Password reset security token is required.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify your confirmation password.");
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({
        token: token.trim(),
        newPassword
      });
      setIsSuccess(true);
      addToast("Password reset successfully! Please sign in.", "success");
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Failed to reset password. Your reset token may have expired or is invalid.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setIsLoading(false);
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
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            {isSuccess ? "Password Updated" : "Reset Password"}
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {isSuccess
              ? "Your password has been changed successfully."
              : "Choose a strong password for your university account."}
          </p>
        </div>

        {/* ── Error Banner ────────────────────────────────────────────── */}
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

        {isSuccess ? (
          <div className="mt-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              You can now sign in using your updated password. All your previous active sessions have been securely revoked.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] py-3 text-xs font-bold text-white shadow-[0_0_20px_rgba(30,144,255,0.35)] hover:shadow-[0_0_25px_rgba(30,144,255,0.45)] transition-all cursor-pointer"
            >
              <span>Continue to Sign In</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            {/* Reset Token Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Security Reset Token
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Paste your reset token from email"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080D1A]/70 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#1E90FF] focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all font-mono"
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

              {/* Dynamic Entropy Meter */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strength >= level
                            ? level <= 1
                              ? "bg-rose-500"
                              : level <= 2
                              ? "bg-amber-500"
                              : level <= 3
                              ? "bg-[#1E90FF]"
                              : "bg-emerald-500"
                            : "bg-slate-200 dark:bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {strength <= 1 && "Weak password"}
                    {strength === 2 && "Fair (Include uppercase, numbers & symbols)"}
                    {strength === 3 && "Good (Almost ready)"}
                    {strength === 4 && "Strong password"}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080D1A]/70 pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#1E90FF] focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
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
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Set New Password</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </motion.button>
          </form>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-600 dark:text-slate-400">
          Remember your password?{" "}
          <Link to="/login" className="font-bold text-[#1E90FF] hover:text-[#187bcd] hover:underline transition-colors">
            Return to Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default ResetPasswordPage;
