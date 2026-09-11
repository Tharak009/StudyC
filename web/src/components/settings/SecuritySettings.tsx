import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Sparkles,
  Check,
  X
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useToastStore } from "../../store/toast.store";

export function SecuritySettings() {
  const user = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    try {
      return localStorage.getItem("studyconnect_2fa_enabled") === "true";
    } catch {
      return false;
    }
  });
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);

  // Password Strength Entropy Calculation
  const entropy = useMemo(() => {
    let score = 0;
    if (newPassword.length >= 8) score += 25;
    if (/[A-Z]/.test(newPassword)) score += 25;
    if (/[0-9]/.test(newPassword)) score += 25;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 25;
    return score;
  }, [newPassword]);

  const strengthLabel = useMemo(() => {
    if (entropy === 0) return { text: "Too Short", color: "bg-slate-300 dark:bg-slate-700" };
    if (entropy <= 25) return { text: "Weak", color: "bg-rose-500" };
    if (entropy <= 50) return { text: "Fair", color: "bg-amber-500" };
    if (entropy <= 75) return { text: "Good", color: "bg-[#1E90FF]" };
    return { text: "Very Strong", color: "bg-emerald-500" };
  }, [entropy]);

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      addToast("Please enter your current password.", "warning");
      return;
    }
    if (entropy < 50) {
      addToast("New password is too weak.", "warning");
      return;
    }
    if (!passwordsMatch) {
      addToast("New passwords do not match.", "warning");
      return;
    }

    setIsUpdating(true);
    setTimeout(() => {
      setIsUpdating(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      addToast("Account password successfully updated!", "success");
    }, 800);
  };

  return (
    <div className="space-y-6">
      
      {/* ── 1. Verified Institutional Identity Card ───────────────────── */}
      <div className="p-6 rounded-3xl border border-[#1E90FF]/30 dark:border-[#1E90FF]/20 bg-gradient-to-r from-[#1E90FF]/5 via-[#1E90FF]/5 to-transparent dark:from-[#0F1A30] dark:via-[#162544] dark:to-[#0F1A30] backdrop-blur-xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1E90FF] text-white shadow-md shadow-[#1E90FF]/25 shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  {user?.fullName || "Student User"}
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Institutional Verification Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                {user?.email || "student@campus.edu"} • {user?.rollNumber || "STU-001"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#080D1A] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
            <Lock size={12} className="text-emerald-500" />
            <span>Domain Guard Locked</span>
          </div>
        </div>
      </div>

      {/* ── 2. Password Change Form ───────────────────────────────────── */}
      <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md">
        <div className="flex items-center gap-2 pb-3 mb-5 border-b border-slate-200/70 dark:border-slate-800/60">
          <KeyRound size={16} className="text-[#1E90FF]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
            Change Password
          </h3>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
          
          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                required
                placeholder="••••••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] pl-3.5 pr-10 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF] focus:ring-1 focus:ring-[#1E90FF]"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                placeholder="Minimum 8 characters with numbers & symbols"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] pl-3.5 pr-10 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF] focus:ring-1 focus:ring-[#1E90FF]"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Live Entropy Meter */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Password Strength</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {strengthLabel.text}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${entropy}%` }}
                    className={`h-full ${strengthLabel.color} transition-all duration-300`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] pl-3.5 pr-10 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF] focus:ring-1 focus:ring-[#1E90FF]"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {confirmPassword && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                {passwordsMatch ? (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <Check size={12} /> Passwords match
                  </span>
                ) : (
                  <span className="text-rose-500 flex items-center gap-1">
                    <X size={12} /> Passwords do not match
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-5 py-2.5 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 hover:brightness-105 transition-all cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? "Updating Password..." : "Update Password"}
            </button>
          </div>

        </form>
      </div>

      {/* ── 3. Two-Factor Authentication (2FA) ────────────────────────── */}
      <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 shrink-0">
              <Smartphone size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                Two-Factor Authentication (2FA)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Secure your student account with Google Authenticator or hardware security keys.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (twoFactorEnabled) {
                setTwoFactorEnabled(false);
                try {
                  localStorage.setItem("studyconnect_2fa_enabled", "false");
                } catch {}
                addToast("Two-factor authentication disabled", "info");
              } else {
                setTwoFactorModalOpen(true);
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              twoFactorEnabled
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-slate-100 dark:bg-[#162544] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-[#1E90FF]"
            }`}
          >
            {twoFactorEnabled ? "2FA Enabled ✓ (Click to Disable)" : "Configure 2FA"}
          </button>
        </div>
      </div>

      {/* ── 2FA Setup Dialog Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {twoFactorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl"
            >
              <button
                onClick={() => setTwoFactorModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <QrCode size={20} className="text-[#1E90FF]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Scan Authenticator QR Code
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Scan with Google Authenticator or Authy on your mobile device.
              </p>

              {/* QR Simulator Box */}
              <div className="mx-auto w-44 h-44 rounded-2xl bg-white p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-inner mb-4">
                <QrCode size={140} className="text-slate-900" />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 text-center font-semibold tabular-nums tracking-wider text-xs text-slate-600 dark:text-slate-300 mb-4">
                Secret Key: <strong className="text-[#1E90FF]">STUDYCONNECT-SEC-2026</strong>
              </div>

              <button
                onClick={() => {
                  setTwoFactorEnabled(true);
                  try {
                    localStorage.setItem("studyconnect_2fa_enabled", "true");
                  } catch {}
                  setTwoFactorModalOpen(false);
                  addToast("Two-factor authentication enabled!", "success");
                }}
                className="w-full py-2.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 cursor-pointer"
              >
                Confirm & Enable 2FA
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default SecuritySettings;
