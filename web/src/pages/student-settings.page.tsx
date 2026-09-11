import React, { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Bell,
  Palette,
  Eye,
  Laptop,
  Sparkles,
  Settings,
  HelpCircle
} from "lucide-react";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { SecuritySettings } from "../components/settings/SecuritySettings";
import { NotificationSettings } from "../components/settings/NotificationSettings";
import { AppearanceSettings } from "../components/settings/AppearanceSettings";
import { PrivacySettings } from "../components/settings/PrivacySettings";
import { SessionsSettings } from "../components/settings/SessionsSettings";
import { DangerZone } from "../components/settings/DangerZone";

export type SettingsTab = "security" | "notifications" | "appearance" | "privacy" | "sessions";

export function StudentSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("security");

  const tabs = [
    { id: "security" as SettingsTab, label: "Security & Credentials", icon: ShieldCheck },
    { id: "notifications" as SettingsTab, label: "Notification Channels", icon: Bell },
    { id: "appearance" as SettingsTab, label: "Theme & Visuals", icon: Palette },
    { id: "privacy" as SettingsTab, label: "Privacy & Campus Visibility", icon: Eye },
    { id: "sessions" as SettingsTab, label: "Active Devices & Sessions", icon: Laptop }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      
      {/* ── 1. Workspace Sidebar ───────────────────────────────────────── */}
      <DashboardSidebar />

      {/* ── 2. Scrollable Settings Content Area ────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="p-4 sm:p-8 space-y-8 max-w-6xl w-full mx-auto">
          
          {/* ── Page Header ───────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#1E90FF]/30 bg-[#1E90FF]/10 px-3 py-1 text-xs font-bold text-[#1E90FF] mb-2">
                <Sparkles size={12} />
                <span>Personal Account Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                Account Settings & Security
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                Configure your personal credentials, notification channels, theme preferences, and active devices.
              </p>
            </div>

            <Link
              to="/help"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold text-[#1E90FF] bg-[#1E90FF]/10 hover:bg-[#1E90FF]/20 border border-[#1E90FF]/25 shadow-sm transition-all self-start sm:self-auto shrink-0 cursor-pointer"
            >
              <HelpCircle size={15} />
              <span>Looking for Help & FAQ? →</span>
            </Link>
          </div>

          {/* ── 2-Column Responsive Layout (Tabs + Form Area) ─────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Vertical Tabs (4 cols) */}
            <div className="lg:col-span-4 p-2 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/85 backdrop-blur-xl shadow-md space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full relative flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer ${
                      isActive
                        ? "text-white shadow-md shadow-[#1E90FF]/25"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#162544]/60"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="settingsActiveTab"
                        className="absolute inset-0 rounded-2xl bg-[#1E90FF]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}

                    <Icon size={16} className="relative z-10 shrink-0" />
                    <span className="relative z-10 truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Dynamic Form Area (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <AnimatePresence mode="wait">
                {activeTab === "security" && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SecuritySettings />
                  </motion.div>
                )}

                {activeTab === "notifications" && (
                  <motion.div
                    key="notifications"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <NotificationSettings />
                  </motion.div>
                )}

                {activeTab === "appearance" && (
                  <motion.div
                    key="appearance"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AppearanceSettings />
                  </motion.div>
                )}

                {activeTab === "privacy" && (
                  <motion.div
                    key="privacy"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PrivacySettings />
                  </motion.div>
                )}

                {activeTab === "sessions" && (
                  <motion.div
                    key="sessions"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SessionsSettings />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Account Danger Zone */}
              <DangerZone />
            </div>

          </div>

        </main>
      </div>

    </div>
  );
}

export default StudentSettingsPage;
