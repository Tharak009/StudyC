import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ShieldAlert,
  ShieldX,
  Home,
  Mail,
  ArrowLeft,
  Lock,
  CheckCircle2,
  X,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";

export function Forbidden403Page() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestedRole, setRequestedRole] = useState("TEACHING_ASSISTANT");
  const [justification, setJustification] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract navigation state if redirected from a guard
  const state = location.state as {
    from?: string;
    attemptedRole?: string;
    requiredRoles?: string[];
  } | null;

  const attemptedPath = state?.from || "/admin";
  const userCurrentRole = user?.role || "STUDENT";

  const handleClearanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) {
      addToast("Please provide a brief institutional justification.", "warning");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setRequestModalOpen(false);
      setJustification("");
      addToast(
        "Clearance request submitted to Campus Governance council for review.",
        "success"
      );
    }, 800);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#080D1A] text-slate-100 p-4 sm:p-6 overflow-hidden select-none font-sans">
      
      {/* ── Ambient Red & Crimson Backlight Glow ──────────────────────── */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-[#2563EB]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Subtle background security grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-repeat"
        style={{
          backgroundImage: `radial-gradient(#EF4444 1px, transparent 1px)`,
          backgroundSize: "28px 28px"
        }}
      />

      {/* ── Glassmorphic 403 Error Container ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg rounded-3xl border border-red-500/30 bg-[#0F1A30]/90 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-2xl space-y-6"
      >
        {/* Glowing Red Shield Icon Badge */}
        <div className="relative mx-auto flex items-center justify-center">
          {/* Ambient pulse halo */}
          <div className="absolute h-20 w-20 rounded-3xl bg-red-500/20 blur-xl animate-pulse" />

          {/* Shield Badge Container */}
          <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-br from-red-500/20 via-rose-600/10 to-transparent border border-red-500/40 flex items-center justify-center text-red-400 shadow-xl shadow-red-500/10">
            <ShieldX size={38} className="animate-pulse" />
          </div>
        </div>

        {/* Monospace Error Code Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-[11px] font-bold uppercase tracking-wider">
          <AlertTriangle size={12} />
          <span>HTTP 403 • FORBIDDEN ACCESS</span>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Restricted Administrative Sector
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            This zone is protected by campus governance protocols. Your account credentials lack administrative or moderation clearances.
          </p>
        </div>

        {/* Security Context Details Card */}
        <div className="p-3.5 rounded-2xl border border-slate-800 bg-[#080D1A]/80 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
            <span>Target Resource:</span>
            <span className="text-sky-400 font-bold">{attemptedPath}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
            <span>Current Role:</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 font-bold">
              {userCurrentRole}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Required Clearance:</span>
            <span className="text-rose-400 font-bold">ADMIN / MODERATOR</span>
          </div>
        </div>

        {/* ── Action Buttons ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          
          {/* Primary Action: Return to Dashboard */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#38BDF8] text-white font-bold text-xs shadow-lg shadow-[#2563EB]/25 hover:shadow-[#2563EB]/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Home size={15} />
            <span>Return to Dashboard</span>
          </motion.button>

          {/* Secondary Action: Request Clearance Modal */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setRequestModalOpen(true)}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl border border-slate-700 hover:border-slate-500 bg-slate-800/70 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Mail size={15} />
            <span>Request Clearance</span>
          </motion.button>

        </div>

        {/* Back Link */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Go back to previous page</span>
          </button>
        </div>
      </motion.div>

      {/* ── Faculty / TA Access Request Modal ──────────────────────────── */}
      <AnimatePresence>
        {requestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-[#0F1A30] p-6 text-slate-100 shadow-2xl space-y-4"
            >
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-[#38BDF8] border border-sky-400/20 flex items-center justify-center">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Request Governance Clearance
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Apply for Faculty, TA, or Community Moderator privileges.
                  </p>
                </div>
              </div>

              <form onSubmit={handleClearanceSubmit} className="space-y-3.5 pt-1">
                {/* User Credentials Info */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-400">
                    Applicant: <span className="text-white font-bold">{user?.fullName || "Aarav Sharma"}</span>
                  </div>
                  <div className="text-slate-400">
                    Roll Number: <span className="text-sky-400 tabular-nums font-semibold">{user?.rollNumber || "CS21001"}</span>
                  </div>
                  <div className="text-slate-400">
                    Department: <span className="text-slate-200">{user?.department || "Computer Science"}</span>
                  </div>
                </div>

                {/* Role Designation Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Target Role Clearance
                  </label>
                  <select
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="TEACHING_ASSISTANT">Teaching Assistant (TA)</option>
                    <option value="FACULTY_MENTOR">Faculty Mentor / Lab In-Charge</option>
                    <option value="COMMUNITY_MODERATOR">Department Community Moderator</option>
                    <option value="CAMPUS_ADMIN">Platform Governance Administrator</option>
                  </select>
                </div>

                {/* Institutional Justification Textarea */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Institutional Justification
                  </label>
                  <textarea
                    rows={3}
                    placeholder="E.g. Appointed as TA for CS301 OS Lab, need access to moderate resource vault and triage student reports..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRequestModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#38BDF8] text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <span>Submit Request</span>
                        <ChevronRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default Forbidden403Page;
