import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  MessageSquare,
  AlertTriangle,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Activity,
  Radio,
  Zap,
  HardDrive
} from "lucide-react";
import type { AdminTabKey } from "../AdminTabsNav";

interface AdminOverviewTabProps {
  onNavigateTab: (tabId: AdminTabKey) => void;
}

function loadDynamicAdminOverview() {
  let totalUsers = 1;
  let activeRooms = 0;
  let pendingReports = 0;
  let vaultFilesCount = 0;
  let urgentReports: any[] = [];

  try {
    const rawUsers = localStorage.getItem("studyconnect_managed_users");
    if (rawUsers) {
      totalUsers = JSON.parse(rawUsers).length;
    } else {
      const rawPeers = localStorage.getItem("studyconnect_peer_directory");
      totalUsers = rawPeers ? JSON.parse(rawPeers).length + 1 : 1;
    }
  } catch {}

  try {
    const rawCircles = localStorage.getItem("studyconnect_user_circles");
    if (rawCircles) {
      activeRooms = JSON.parse(rawCircles).length;
    }
  } catch {}

  try {
    const rawReports = localStorage.getItem("studyconnect_content_reports");
    if (rawReports) {
      const allReports = JSON.parse(rawReports);
      const pending = allReports.filter((r: any) => r.status === "PENDING");
      pendingReports = pending.length;
      urgentReports = pending.slice(0, 3).map((r: any) => ({
        id: r.id,
        reason: r.category || "Community Concern",
        reportedUser: `${r.reportedName} (${r.reportedRoll || "Student"})`,
        reporter: `${r.reporterName} (${r.reporterRoll || "Student"})`,
        channel: r.channelOrResource || "Campus Chat",
        time: r.createdAt || "Recently",
        priority: r.severity || "HIGH"
      }));
    }
  } catch {}

  try {
    const rawVault = localStorage.getItem("studyconnect_vault_resources");
    if (rawVault) {
      vaultFilesCount = JSON.parse(rawVault).length;
    }
  } catch {}

  return { totalUsers, activeRooms, pendingReports, vaultFilesCount, urgentReports };
}

export function AdminOverviewTab({ onNavigateTab }: AdminOverviewTabProps) {
  const [stats] = React.useState(loadDynamicAdminOverview);

  const metrics = [
    {
      label: "Total Verified Students",
      value: `${stats.totalUsers}`,
      delta: stats.totalUsers > 1 ? `${stats.totalUsers} registered accounts` : "Initial Administrator",
      icon: Users,
      color: "bg-[#1E90FF]"
    },
    {
      label: "Active Study Rooms",
      value: `${stats.activeRooms} Live`,
      delta: stats.activeRooms > 0 ? "Synchronized circles" : "No active rooms yet",
      icon: MessageSquare,
      color: "bg-[#1E90FF]"
    },
    {
      label: "Flagged Content Reports",
      value: `${stats.pendingReports} Pending`,
      delta: stats.pendingReports > 0 ? "Action required" : "Queue all-clear",
      icon: AlertTriangle,
      color: stats.pendingReports > 0 ? "bg-rose-500" : "bg-emerald-500"
    },
    {
      label: "Resource Vault Storage",
      value: `${stats.vaultFilesCount} Files`,
      delta: stats.vaultFilesCount > 0 ? "Community shared documents" : "Vault empty",
      icon: BookOpen,
      color: "bg-[#1E90FF]"
    }
  ];

  const batchDistribution = [
    { name: "Computer Science & Engineering (CSE)", count: `${stats.totalUsers} Active`, percent: 100, color: "bg-[#1E90FF]" }
  ];

  return (
    <div className="space-y-8">
      
      {/* ── 1. KPI Metric Highlight Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={idx}
              whileHover={{ y: -3 }}
              className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {m.label}
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${m.color} text-white shadow-sm`}
                >
                  <Icon size={16} />
                </div>
              </div>

              <div>
                <div className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-slate-50">
                  {m.value}
                </div>
                <div className="text-[11px] tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <ArrowUpRight size={13} />
                  <span>{m.delta}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── 2. Urgent Moderation Queue & System Health ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Urgent Reports Mini-Feed (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <AlertTriangle size={16} className={stats.urgentReports.length > 0 ? "text-rose-500" : "text-slate-400"} />
              <span>Urgent Moderation Queue</span>
            </h3>
            <button
              onClick={() => onNavigateTab("reports")}
              className="text-xs font-bold text-[#1E90FF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All Flags</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {stats.urgentReports.length === 0 ? (
              <div className="py-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 size={20} />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  All clear! No pending reports or flags requiring triage.
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Any member reports flagged in study circles or the resource vault will appear here for priority review.
                </p>
              </div>
            ) : (
              stats.urgentReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/70 dark:bg-[#080D1A]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          report.priority === "HIGH"
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {report.priority} PRIORITY
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {report.reason}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Target: <strong className="text-slate-700 dark:text-slate-200">{report.reportedUser}</strong> • in {report.channel}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <span className="text-[10px] tabular-nums text-slate-400">{report.time}</span>
                    <button
                      onClick={() => onNavigateTab("reports")}
                      className="px-3.5 py-1.5 rounded-full bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-sm shadow-[#1E90FF]/25 cursor-pointer transition-all"
                    >
                      Quick Triage
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-Time Traffic & Batch Breakdown Snapshot (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Activity size={16} className="text-[#1E90FF]" />
              <span>Campus Enrollment & Load</span>
            </h3>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              OPTIMAL LOAD
            </span>
          </div>

          {/* Department Breakdown Bars */}
          <div className="space-y-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Enrolled Department Distribution
            </span>

            {batchDistribution.map((b, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs tabular-nums">
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">
                    {b.name}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {b.count}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-[#080D1A] overflow-hidden">
                  <div style={{ width: `${b.percent}%` }} className={`h-full ${b.color}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Sockets Activity Footer */}
          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/60 flex items-center justify-between text-xs tabular-nums text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Radio size={13} className="text-emerald-500 animate-pulse" />
              <span>WebSocket Ingress: <strong>1.4k msgs/min</strong></span>
            </span>
            <span className="text-[#1E90FF] font-bold">14.2ms avg</span>
          </div>
        </div>

      </div>

    </div>
  );
}

export default AdminOverviewTab;
