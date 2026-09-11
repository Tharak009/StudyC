import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";

export function ProtectedRoute() {
  const { isAuthenticated, token, isLoading, initialized, user } = useAuthStore();
  const location = useLocation();

  // ── 1. Fullscreen Cobalt Mist Loading State ────────────────────────────────
  // Displayed during session token validation, initialization, or async auth refresh
  if (isLoading || (!initialized && !user)) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center bg-[#080D1A] text-slate-100 overflow-hidden select-none">
        
        {/* Ambient Cyan & Cobalt Glow Mesh */}
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-[#2563EB]/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] bg-[#38BDF8]/15 rounded-full blur-[140px] pointer-events-none" />
        
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none bg-repeat"
          style={{
            backgroundImage: `radial-gradient(#38BDF8 1px, transparent 1px)`,
            backgroundSize: "32px 32px"
          }}
        />

        {/* Central Auth Validation Aura Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 flex flex-col items-center text-center p-8 max-w-sm mx-auto"
        >
          {/* Glowing Aura Ring & Spinner */}
          <div className="relative mb-6 flex items-center justify-center">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#2563EB] to-[#38BDF8] blur-xl opacity-40 animate-pulse" />

            {/* Rotating Outer Gradient Track */}
            <div className="h-20 w-20 rounded-3xl border-2 border-transparent border-t-[#38BDF8] border-r-[#2563EB] animate-spin" />

            {/* Center Brand Badge with Shield */}
            <div className="absolute inset-2 rounded-2xl bg-[#0F1A30]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#38BDF8] text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/30">
                SC
              </div>
            </div>
          </div>

          {/* Validation Status Typography */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold tracking-tight text-slate-100 flex items-center justify-center gap-1.5">
              <span>Authenticating Campus Session</span>
              <Sparkles size={14} className="text-[#38BDF8] animate-pulse" />
            </h3>
            <p className="text-xs text-slate-400">
              Verifying encrypted .edu credentials...
            </p>
          </div>

          {/* Verification Badge */}
          <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-[#38BDF8] text-[11px] font-semibold">
            <ShieldCheck size={13} />
            <span>256-bit Security Protocol</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── 2. Unauthenticated Interception ────────────────────────────────────────
  // If not authenticated or missing valid token/user, redirect to login with from location
  const isAuthValid = (isAuthenticated || Boolean(user)) && Boolean(token || user);

  if (!isAuthValid) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // ── 3. Render Authorized Content ───────────────────────────────────────────
  return <Outlet />;
}

export default ProtectedRoute;
