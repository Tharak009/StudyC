import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { AdminHeader } from "../components/admin/AdminHeader";
import { AdminTabsNav, type AdminTabKey } from "../components/admin/AdminTabsNav";
import { AdminOverviewTab } from "../components/admin/tabs/AdminOverviewTab";
import { UserManagementTab } from "../components/admin/UserManagementTab";
import { ReportsTriageTab } from "../components/admin/ReportsTriageTab";
import { ResourceModerationTab } from "../components/admin/ResourceModerationTab";
import { CommunityGovernanceTab } from "../components/admin/CommunityGovernanceTab";
import { EventsGovernanceTab } from "../components/admin/tabs/EventsGovernanceTab";
import { AuditLogTab } from "../components/admin/AuditLogTab";
import { BroadcastModal } from "../components/admin/BroadcastModal";
import { AdminProfilePage } from "./admin-profile.page";
import { useAuthStore } from "../store/auth.store";

function getAdminHeaderCounts() {
  let pendingReportsCount = 0;
  let totalUsersCount = "1";

  try {
    const rawReports = localStorage.getItem("studyconnect_content_reports");
    if (rawReports) {
      const reports = JSON.parse(rawReports);
      pendingReportsCount = reports.filter((r: any) => r.status === "PENDING").length;
    }
  } catch {}

  try {
    const rawUsers = localStorage.getItem("studyconnect_managed_users");
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      totalUsersCount = String(users.length);
    }
  } catch {}

  return { pendingReportsCount, totalUsersCount };
}

export function AdminPage() {
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<AdminTabKey>("overview");
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [counts, setCounts] = useState(getAdminHeaderCounts);

  React.useEffect(() => {
    setCounts(getAdminHeaderCounts());
  }, [activeTab, broadcastOpen]);

  // Role Gate: Block regular students with 403 Forbidden screen
  if (user && user.role === "STUDENT") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#080D1A] p-4 text-center">
        <div className="max-w-md p-8 rounded-3xl border border-rose-500/30 bg-white dark:bg-[#0F1A30] shadow-2xl space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">
            403 Forbidden: Admin Access Only
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your verified institutional account is currently enrolled under the <strong>STUDENT</strong> tier. Administrative governance tools are restricted to faculty moderators and platform administrators.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25"
          >
            <ArrowLeft size={14} />
            <span>Return to Student Workspace</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      
      {/* ── 1. Workspace Sidebar ───────────────────────────────────────── */}
      <DashboardSidebar />

      {/* ── 2. Scrollable Admin Content Stream ─────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Admin Header with live Socket pill and broadcast action */}
          <AdminHeader onOpenBroadcast={() => setBroadcastOpen(true)} />

          {/* Sub-Navigation Tabs Bar */}
          <AdminTabsNav
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            pendingReportsCount={counts.pendingReportsCount}
            totalUsersCount={counts.totalUsersCount}
          />

          {/* Tab Views */}
          <div className="min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <AdminOverviewTab onNavigateTab={setActiveTab} />
                </motion.div>
              )}

              {activeTab === "users" && (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <UserManagementTab />
                </motion.div>
              )}

              {activeTab === "events" && (
                <motion.div
                  key="events"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <EventsGovernanceTab />
                </motion.div>
              )}

              {activeTab === "reports" && (
                <motion.div
                  key="reports"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ReportsTriageTab />
                </motion.div>
              )}

              {activeTab === "resources" && (
                <motion.div
                  key="resources"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ResourceModerationTab />
                </motion.div>
              )}

              {activeTab === "communities" && (
                <motion.div
                  key="communities"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <CommunityGovernanceTab />
                </motion.div>
              )}

              {activeTab === "audit" && (
                <motion.div
                  key="audit"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <AuditLogTab />
                </motion.div>
              )}

              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <AdminProfilePage embedded onNavigateTab={setActiveTab} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </main>
      </div>

      {/* ── Broadcast Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {broadcastOpen && (
          <BroadcastModal
            isOpen={broadcastOpen}
            onClose={() => setBroadcastOpen(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default AdminPage;
