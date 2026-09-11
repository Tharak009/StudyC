import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  User,
  Clock,
  Camera,
  Check,
  Trash2,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Megaphone,
  ArrowRight,
  ExternalLink,
  Save,
  CheckCircle2,
  Mail,
  Phone,
  Activity,
  Users,
  MessageSquare,
  ScrollText,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { ConfirmationDialog } from "../components/confirmation-dialog";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { ConnectionsTab } from "../components/profile/ConnectionsTab";
import { BroadcastModal } from "../components/admin/BroadcastModal";
import type { AdminTabKey } from "../components/admin/AdminTabsNav";

type ProfileTab = "PERSONAL" | "CONNECTIONS" | "ACTIVITY";

interface AdminProfileData {
  fullName: string;
  designation: string;
  department: string;
  phone: string;
  bio: string;
  profilePicture?: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  relativeTime: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  metadataSummary: string;
}

function loadDynamicAdminStats() {
  let pendingReportsCount = 0;
  let totalUsersCount = 1;
  let totalCirclesCount = 0;
  let totalAuditLogsCount = 0;

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
      totalUsersCount = JSON.parse(rawUsers).length;
    } else {
      const rawPeers = localStorage.getItem("studyconnect_peer_directory");
      totalUsersCount = rawPeers ? JSON.parse(rawPeers).length + 1 : 1;
    }
  } catch {}

  try {
    const rawCircles = localStorage.getItem("studyconnect_user_circles");
    if (rawCircles) {
      totalCirclesCount = JSON.parse(rawCircles).length;
    }
  } catch {}

  try {
    const rawAudit = localStorage.getItem("studyconnect_audit_logs");
    if (rawAudit) {
      totalAuditLogsCount = JSON.parse(rawAudit).length;
    }
  } catch {}

  return {
    pendingReportsCount,
    totalUsersCount,
    totalCirclesCount,
    totalAuditLogsCount
  };
}

function loadSavedAdminProfile(user: any): AdminProfileData {
  let saved: Partial<AdminProfileData> = {};
  try {
    const raw = localStorage.getItem("studyconnect_admin_profile");
    if (raw) saved = JSON.parse(raw);
  } catch {}

  return {
    fullName: saved.fullName || user?.fullName || "Administrator",
    designation:
      saved.designation ||
      (user?.role === "MODERATOR" ? "Faculty Content Moderator" : "Campus Safety & Governance Lead"),
    department: saved.department || user?.department || "Academic Affairs & Platform Safety",
    phone: saved.phone || "",
    bio:
      saved.bio ||
      "Responsible for maintaining campus academic integrity, reviewing content reports, managing student permissions, and coordinating emergency communications.",
    profilePicture: saved.profilePicture || user?.profilePicture
  };
}

function loadAdminAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem("studyconnect_audit_logs");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.slice(0, 15);
    }
  } catch {}
  return [];
}

interface AdminProfilePageProps {
  embedded?: boolean;
  onNavigateTab?: (tab: AdminTabKey) => void;
  onSwitchToStudentView?: () => void;
}

export function AdminProfilePage({
  embedded = false,
  onNavigateTab,
  onSwitchToStudentView
}: AdminProfilePageProps) {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const user = useAuthStore((state) => state.user)!;
  const setUser = useAuthStore((state) => state.setUser);

  // Active Tab
  const [activeTab, setActiveTab] = useState<ProfileTab>("PERSONAL");

  // Profile Information State
  const [profileData, setProfileData] = useState<AdminProfileData>(() => loadSavedAdminProfile(user));
  const [fullName, setFullName] = useState(profileData.fullName);
  const [designation, setDesignation] = useState(profileData.designation);
  const [department, setDepartment] = useState(profileData.department);
  const [phone, setPhone] = useState(profileData.phone);
  const [bio, setBio] = useState(profileData.bio);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profileData.profilePicture || null);

  // Dynamic Live Stats
  const [stats, setStats] = useState(loadDynamicAdminStats);

  // Live Audit Logs from localStorage
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(loadAdminAuditLogs);

  // Broadcast Modal State
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  // Confirmation Modals State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "SAVE_PROFILE" | "REMOVE_PHOTO";
    title: string;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh live data on tab change
  useEffect(() => {
    setStats(loadDynamicAdminStats());
    setAuditLogs(loadAdminAuditLogs());
  }, [activeTab]);

  // Photo handlers
  const handlePhotoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast("Photo size exceeds 5MB limit", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      const updated = { ...profileData, profilePicture: result };
      setProfileData(updated);
      try {
        localStorage.setItem("studyconnect_admin_profile", JSON.stringify(updated));
      } catch {}
      if (user) {
        setUser({ ...user, profilePicture: result });
      }
      addToast("Administrator avatar updated successfully.", "success");
    };
    reader.readAsDataURL(file);
  };

  const executeConfirmAction = () => {
    if (!confirmDialog) return;
    const { type } = confirmDialog;

    if (type === "SAVE_PROFILE") {
      const updated: AdminProfileData = {
        fullName: fullName.trim() || user?.fullName || "Administrator",
        designation: designation.trim() || "Campus Administrator",
        department: department.trim() || "Academic Affairs",
        phone: phone.trim(),
        bio: bio.trim(),
        profilePicture: avatarPreview || undefined
      };
      setProfileData(updated);
      try {
        localStorage.setItem("studyconnect_admin_profile", JSON.stringify(updated));
      } catch {}
      if (user) {
        setUser({
          ...user,
          fullName: updated.fullName,
          department: updated.department,
          bio: updated.bio
        });
      }
      addToast("Administrator profile details saved successfully.", "success");
    } else if (type === "REMOVE_PHOTO") {
      setAvatarPreview(null);
      const updated = { ...profileData, profilePicture: undefined };
      setProfileData(updated);
      try {
        localStorage.setItem("studyconnect_admin_profile", JSON.stringify(updated));
      } catch {}
      if (user) {
        setUser({ ...user, profilePicture: undefined });
      }
      addToast("Custom administrator avatar removed.", "info");
    }

    setConfirmDialog(null);
  };

  const adminIdDisplay = `ADM-${(user?._id || "ROOT01").slice(-6).toUpperCase()}`;

  // Content body
  const content = (
    <div className="space-y-6">
      {/* ── Top Clearance Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1E90FF]/30 bg-[#1E90FF]/10 px-3 py-1 text-xs font-bold text-[#1E90FF]">
            <ShieldCheck size={14} className="shrink-0" />
            <span>Institutional Governance Clearance • Elevated Access</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Administrator Governance Profile
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Manage your verified administrator identity, accept peer and student connections, coordinate campus events, and review institutional compliance logs.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {embedded ? (
            <button
              onClick={() => onNavigateTab?.("overview")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#1E90FF] hover:text-[#1E90FF] transition-all cursor-pointer shadow-sm"
            >
              <Activity size={14} className="text-[#1E90FF]" />
              <span>Safety Hub Overview</span>
            </button>
          ) : (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 hover:shadow-lg transition-all"
            >
              <ShieldAlert size={14} />
              <span>Open Admin Console</span>
              <ArrowRight size={13} />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setBroadcastOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            <Megaphone size={13} />
            <span>Broadcast Alert</span>
          </button>

          {onSwitchToStudentView ? (
            <button
              type="button"
              onClick={onSwitchToStudentView}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#1E90FF] hover:text-[#1E90FF] transition-all cursor-pointer"
            >
              <span>Student Profile Preview</span>
            </button>
          ) : (
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#1E90FF] hover:text-[#1E90FF] transition-all"
            >
              <span>Student Workspace</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── 4 Live Institutional Metrics Cards ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Content Reports */}
        <div
          onClick={() => {
            if (embedded && onNavigateTab) onNavigateTab("reports");
            else navigate("/admin?tab=reports");
          }}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 p-4 shadow-sm backdrop-blur-sm cursor-pointer hover:border-[#1E90FF]/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Reports in Queue</span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                stats.pendingReportsCount > 0
                  ? "bg-rose-500/10 text-rose-500"
                  : "bg-emerald-500/10 text-emerald-500"
              }`}
            >
              <AlertTriangle size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-50 tabular-nums">
              {stats.pendingReportsCount}
            </span>
            <span
              className={`text-[10px] font-bold ${
                stats.pendingReportsCount > 0 ? "text-rose-500" : "text-emerald-500"
              }`}
            >
              {stats.pendingReportsCount > 0 ? "Action Needed" : "Queue Clean"}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 group-hover:text-[#1E90FF] flex items-center gap-1 transition-colors">
            <span>Triage safety reports</span>
            <ExternalLink size={10} />
          </div>
        </div>

        {/* Managed Users */}
        <div
          onClick={() => {
            if (embedded && onNavigateTab) onNavigateTab("users");
            else navigate("/admin?tab=users");
          }}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 p-4 shadow-sm backdrop-blur-sm cursor-pointer hover:border-[#1E90FF]/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Directory Oversight</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1E90FF]/10 text-[#1E90FF]">
              <Users size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-50 tabular-nums">
              {stats.totalUsersCount}
            </span>
            <span className="text-[10px] font-bold text-[#1E90FF]">Campus Accounts</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 group-hover:text-[#1E90FF] flex items-center gap-1 transition-colors">
            <span>Manage user directory</span>
            <ExternalLink size={10} />
          </div>
        </div>

        {/* Circles Monitored */}
        <div
          onClick={() => {
            if (embedded && onNavigateTab) onNavigateTab("communities");
            else navigate("/admin?tab=communities");
          }}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 p-4 shadow-sm backdrop-blur-sm cursor-pointer hover:border-[#1E90FF]/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Study Circles Supervised</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
              <MessageSquare size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-50 tabular-nums">
              {stats.totalCirclesCount}
            </span>
            <span className="text-[10px] font-bold text-violet-500">Active Circles</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 group-hover:text-[#1E90FF] flex items-center gap-1 transition-colors">
            <span>Community governance</span>
            <ExternalLink size={10} />
          </div>
        </div>

        {/* Audit Actions */}
        <div
          onClick={() => {
            if (embedded && onNavigateTab) onNavigateTab("audit");
            else navigate("/admin?tab=audit");
          }}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 p-4 shadow-sm backdrop-blur-sm cursor-pointer hover:border-[#1E90FF]/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Audit Compliance Logs</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <ScrollText size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-50 tabular-nums">
              {stats.totalAuditLogsCount}
            </span>
            <span className="text-[10px] font-bold text-amber-500">Logged Actions</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 group-hover:text-[#1E90FF] flex items-center gap-1 transition-colors">
            <span>90-Day tamper trail</span>
            <ExternalLink size={10} />
          </div>
        </div>
      </div>

      {/* ── Main Split Pane: Left Summary Card + Right Tabs ──────────────── */}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
        {/* ── Left Profile & Clearance Card ─────────────────────────────── */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0F1A30]/90 p-6 shadow-sm backdrop-blur-md space-y-6">
          {/* Avatar frame */}
          <div className="text-center space-y-3">
            <div className="relative mx-auto size-28 group">
              <div className="relative size-full rounded-3xl overflow-hidden bg-[#1E90FF] text-white flex items-center justify-center font-extrabold text-3xl shadow-lg shadow-[#1E90FF]/25 ring-4 ring-slate-100 dark:ring-[#162544]">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={fullName} className="size-full object-cover" />
                ) : (
                  <span>
                    {fullName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "AD"}
                  </span>
                )}

                {/* Camera upload hover */}
                <button
                  type="button"
                  onClick={handlePhotoUploadClick}
                  className="absolute inset-0 bg-black/55 rounded-3xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer backdrop-blur-xs"
                  title="Upload custom photo"
                >
                  <Camera size={22} />
                  <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Change</span>
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
              />

              {/* Status beacon */}
              <div
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1E90FF] text-white shadow-md border-2 border-white dark:border-[#0F1A30]"
                title="Verified Platform Administrator"
              >
                <ShieldCheck size={16} />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-50">
                {fullName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {designation}
              </p>

              <div className="pt-1 flex items-center justify-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#1E90FF]/10 border border-[#1E90FF]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#1E90FF] uppercase tracking-wider">
                  <UserCheck size={11} /> {user?.role || "ADMIN"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Clearance
                </span>
              </div>
            </div>

            {avatarPreview && (
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    type: "REMOVE_PHOTO",
                    title: "Remove Administrator Avatar?",
                    message:
                      "Are you sure you want to remove your custom avatar and revert to initial initials?"
                  })
                }
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Remove Custom Photo</span>
              </button>
            )}
          </div>

          {/* Quick Staff Details */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 block">
                Staff Token ID
              </span>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {adminIdDisplay}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 block">
                Verified Faculty Email
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={user?.email}>
                {user?.email}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 block">
                Department Oversight
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {department}
              </p>
            </div>

            {phone && (
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 block">
                  Contact Line
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {phone}
                </p>
              </div>
            )}
          </div>

          {/* Institutional Authority Matrix */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-2.5">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 block">
              Governance Authority Matrix
            </span>

            <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Check size={13} className="text-emerald-500 shrink-0" />
                <span>User Ban & Suspension Enforcement</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={13} className="text-emerald-500 shrink-0" />
                <span>Content & Report Triage</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={13} className="text-emerald-500 shrink-0" />
                <span>Resource Vault Deletion & Moderation</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={13} className="text-emerald-500 shrink-0" />
                <span>Campus Events Scheduling & Moderation</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={13} className="text-emerald-500 shrink-0" />
                <span>Campus-Wide Emergency Broadcasts</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={13} className="text-emerald-500 shrink-0" />
                <span>90-Day Tamper-Evident Audit Trail</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Right Column: Tabbed Views ─────────────────────────────────── */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0F1A30]/90 shadow-sm backdrop-blur-md overflow-hidden">
          {/* Subtabs Bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none bg-slate-50/50 dark:bg-[#162544]/30">
            {[
              { id: "PERSONAL" as ProfileTab, label: "Staff Profile & Clearance", icon: User },
              { id: "CONNECTIONS" as ProfileTab, label: "Campus Connections & Requests", icon: Users },
              { id: "ACTIVITY" as ProfileTab, label: "90-Day Audit Timeline", icon: Clock }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "border-[#1E90FF] text-[#1E90FF] bg-white dark:bg-[#0F1A30]"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6 sm:p-8">
            {/* ── Tab 1: Staff Profile & Institutional Clearance ─────────── */}
            {activeTab === "PERSONAL" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                    Administrator Identity & Institutional Affiliation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Official administrative contact information and faculty department responsibility.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Full Administrator Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Alex Morgan"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#1E90FF] focus:bg-white dark:border-slate-800 dark:bg-[#162544]/40 dark:text-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Institutional Email Address (Verified)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={user?.email || ""}
                        readOnly
                        disabled
                        className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs text-slate-500 outline-none dark:border-slate-800 dark:bg-[#162544]/20 dark:text-slate-400 cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-2.5 flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                        <CheckCircle2 size={13} />
                        <span>Verified .EDU</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Official Designation / Title
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Campus Safety & Governance Lead"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#1E90FF] focus:bg-white dark:border-slate-800 dark:bg-[#162544]/40 dark:text-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Department Oversight
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Academic Affairs & Platform Safety"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#1E90FF] focus:bg-white dark:border-slate-800 dark:bg-[#162544]/40 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Official Contact Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834"
                    className="w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#1E90FF] focus:bg-white dark:border-slate-800 dark:bg-[#162544]/40 dark:text-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Administrative Notes & Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Brief description of administrative oversight and responsibilities..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-slate-800 outline-none focus:border-[#1E90FF] focus:bg-white dark:border-slate-800 dark:bg-[#162544]/40 dark:text-white transition-all"
                  />
                </div>

                {/* Direct Administrative Quick Action Grid */}
                <div className="pt-2 space-y-2">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 block">
                    Institutional Governance Quick Links
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (embedded && onNavigateTab) onNavigateTab("events");
                        else navigate("/admin?tab=events");
                      }}
                      className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#162544]/30 hover:border-[#1E90FF] hover:bg-[#1E90FF]/5 text-left transition-all cursor-pointer group"
                    >
                      <div className="p-2 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF]">
                        <Calendar size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#1E90FF]">
                          Campus Events
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">Schedules & Deadlines</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (embedded && onNavigateTab) onNavigateTab("reports");
                        else navigate("/admin?tab=reports");
                      }}
                      className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#162544]/30 hover:border-rose-500 hover:bg-rose-500/5 text-left transition-all cursor-pointer group"
                    >
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                        <ShieldAlert size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-500">
                          Content Reports
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{stats.pendingReportsCount} in queue</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBroadcastOpen(true)}
                      className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#162544]/30 hover:border-amber-500 hover:bg-amber-500/5 text-left transition-all cursor-pointer group"
                    >
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                        <Megaphone size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500">
                          Campus Alert
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">Dispatch broadcast</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        type: "SAVE_PROFILE",
                        title: "Save Administrator Profile?",
                        message:
                          "Confirm updating your administrator profile details. These changes will reflect immediately across platform governance modules."
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#1E90FF]/25 cursor-pointer transition-all"
                  >
                    <Save size={14} />
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Tab 2: Campus Connections & Friend Requests ──────────── */}
            {activeTab === "CONNECTIONS" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                      Campus Connections & Friend Requests
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Manage incoming requests from campus peers and students, accept or decline invitations, send new requests, or start direct messaging.
                    </p>
                  </div>
                </div>

                {/* Direct Embed of ConnectionsTab */}
                <ConnectionsTab />
              </div>
            )}

            {/* ── Tab 3: Live Activity Log ───────────────────────────────── */}
            {activeTab === "ACTIVITY" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                      Recent Governance Actions & Audit Entries
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Live audit entries executed by your administrative account and fellow faculty members.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (embedded && onNavigateTab) onNavigateTab("audit");
                      else navigate("/admin?tab=audit");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#1E90FF] hover:bg-[#1E90FF]/10 transition-all cursor-pointer"
                  >
                    <span>Full 90-Day Audit Trail</span>
                    <ExternalLink size={12} />
                  </button>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF]">
                      <Clock size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                        No Recent Moderation Actions Logged Yet
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        Actions taken in the Admin Governance Console (user bans, report resolutions, and campus announcements) are recorded here in real time.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-[#1E90FF]/30 space-y-6">
                    {auditLogs.map((entry) => (
                      <div key={entry.id} className="relative group">
                        <span className="absolute -left-[31px] top-1 flex size-4 items-center justify-center rounded-full bg-white dark:bg-[#0F1A30] ring-2 ring-[#1E90FF]">
                          <span className="size-2 rounded-full bg-[#1E90FF]" />
                        </span>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              {entry.relativeTime || entry.timestamp}
                            </span>
                            <span className="rounded bg-[#1E90FF]/10 border border-[#1E90FF]/20 px-2 py-0.5 text-[9px] font-bold text-[#1E90FF] uppercase">
                              {entry.action}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              by {entry.adminName}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {entry.metadataSummary || `Executed ${entry.action} on ${entry.targetType}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Broadcast Modal ────────────────────────────────────────────── */}
      <BroadcastModal isOpen={broadcastOpen} onClose={() => setBroadcastOpen(false)} />

      {/* ── Confirmation Dialog ────────────────────────────────────────── */}
      {confirmDialog && (
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.type === "SAVE_PROFILE" ? "Save Profile" : "Remove Photo"}
          isDestructive={confirmDialog.type === "REMOVE_PHOTO"}
          onConfirm={executeConfirmAction}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );

  // If embedded within AdminPage tabs, return content without outer DashboardSidebar
  if (embedded) {
    return content;
  }

  // Full standalone page layout with DashboardSidebar
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      <DashboardSidebar currentNav="/profile" />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {content}
        </main>
      </div>
    </div>
  );
}

export default AdminProfilePage;
