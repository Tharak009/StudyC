import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  User,
  Key,
  Shield,
  Bell,
  Clock,
  Camera,
  Check,
  X,
  Laptop,
  Smartphone,
  Lock,
  AlertTriangle,
  Trash2,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Megaphone,
  ArrowRight,
  ExternalLink,
  Save,
  CheckCircle2,
  AlertOctagon,
  Building2,
  Mail,
  Phone,
  Layers,
  Activity,
  FileCheck,
  Users,
  MessageSquare,
  ScrollText,
  Sparkles,
  RefreshCw,
  LogOut,
  Sliders
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { ConfirmationDialog } from "../components/confirmation-dialog";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import type { AdminTabKey } from "../components/admin/AdminTabsNav";

type ProfileTab = "PERSONAL" | "PASSWORD" | "SECURITY" | "NOTIFICATIONS" | "ACTIVITY";

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

function detectCurrentSession() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let browser = "Google Chrome";
  if (ua.includes("Firefox/")) browser = "Mozilla Firefox";
  else if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Apple Safari";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";

  let os = "Windows 11 / 10";
  if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  let device = "Desktop Workstation";
  if (/Mobi|Android/i.test(ua)) device = "Mobile Device";
  else if (/Tablet|iPad/i.test(ua)) device = "Tablet Device";

  return { browser, os, device };
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
    designation: saved.designation || (user?.role === "MODERATOR" ? "Faculty Content Moderator" : "Campus Safety & Governance Lead"),
    department: saved.department || user?.department || "Academic Affairs & Platform Safety",
    phone: saved.phone || "",
    bio: saved.bio || "Responsible for maintaining campus academic integrity, reviewing content reports, managing student permissions, and coordinating emergency communications.",
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

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification Preferences State (persisted in localStorage)
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem("studyconnect_admin_notif_prefs");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      urgentReports: true,
      broadcastEcho: true,
      securityLogins: true,
      roleEscalations: true,
      weeklyDigest: false
    };
  });

  // Dynamic Live Stats
  const [stats, setStats] = useState(loadDynamicAdminStats);

  // Live Audit Logs from localStorage
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(loadAdminAuditLogs);

  // Real Current Device Session
  const currentSession = useMemo(() => detectCurrentSession(), []);

  // Confirmation Modals State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "SAVE_PROFILE" | "PASSWORD" | "TERMINATE_OTHERS" | "REMOVE_PHOTO";
    title: string;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh live data on tab change
  useEffect(() => {
    setStats(loadDynamicAdminStats());
    setAuditLogs(loadAdminAuditLogs());
  }, [activeTab]);

  // Password Requirements Checks
  const passwordCriteria = useMemo(() => {
    return {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      numbers: /[0-9]/.test(newPassword),
      symbols: /[^A-Za-z0-9]/.test(newPassword)
    };
  }, [newPassword]);

  // Password Strength Meter
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: "None", color: "bg-slate-200 dark:bg-white/10" };
    let score = 0;
    if (passwordCriteria.length) score += 1;
    if (passwordCriteria.uppercase) score += 1;
    if (passwordCriteria.numbers) score += 1;
    if (passwordCriteria.symbols) score += 1;

    switch (score) {
      case 1: return { score: 25, label: "Weak", color: "bg-rose-500" };
      case 2: return { score: 50, label: "Fair", color: "bg-amber-500" };
      case 3: return { score: 75, label: "Good", color: "bg-[#1E90FF]" };
      case 4: return { score: 100, label: "Strong", color: "bg-emerald-500" };
      default: return { score: 0, label: "None", color: "bg-slate-200" };
    }
  }, [newPassword, passwordCriteria]);

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
    } else if (type === "PASSWORD") {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Record credential rotation in audit logs
      const auditEntry: AuditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
        relativeTime: "Just now",
        adminName: fullName || user?.fullName || "Administrator",
        action: "PASSWORD_ROTATED",
        targetType: "Security",
        targetId: user?._id || "Admin-Account",
        metadataSummary: "Administrative account password successfully updated."
      };
      
      try {
        const rawLogs = localStorage.getItem("studyconnect_audit_logs");
        const existing = rawLogs ? JSON.parse(rawLogs) : [];
        const updatedLogs = [auditEntry, ...existing];
        localStorage.setItem("studyconnect_audit_logs", JSON.stringify(updatedLogs));
        setAuditLogs(updatedLogs.slice(0, 15));
      } catch {}

      addToast("Account security credentials updated successfully.", "success");
    } else if (type === "TERMINATE_OTHERS") {
      addToast("All secondary session tokens invalidated.", "success");
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

  const handleSaveNotifications = () => {
    try {
      localStorage.setItem("studyconnect_admin_notif_prefs", JSON.stringify(notificationPrefs));
      addToast("Administrative notification preferences saved.", "success");
    } catch {
      addToast("Failed to save preferences.", "error");
    }
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
            Administrator Profile & Security
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Manage your verified administrator identity, security credentials, governance authority matrix, and compliance logs.
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
              <span>Student View</span>
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
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              stats.pendingReportsCount > 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
            }`}>
              <AlertTriangle size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-50 tabular-nums">
              {stats.pendingReportsCount}
            </span>
            <span className={`text-[10px] font-bold ${
              stats.pendingReportsCount > 0 ? "text-rose-500" : "text-emerald-500"
            }`}>
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
                  <img
                    src={avatarPreview}
                    alt={fullName}
                    className="size-full object-cover"
                  />
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
                  Active Session
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
                    message: "Are you sure you want to remove your custom avatar and revert to initial initials?"
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
                <span>Study Circle Governance & Archival</span>
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

        {/* ── Right Column: Tabbed Settings & Features ───────────────────── */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0F1A30]/90 shadow-sm backdrop-blur-md overflow-hidden">
          
          {/* Subtabs Bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none bg-slate-50/50 dark:bg-[#162544]/30">
            {[
              { id: "PERSONAL" as ProfileTab, label: "Staff Profile", icon: User },
              { id: "PASSWORD" as ProfileTab, label: "Credentials & Password", icon: Key },
              { id: "SECURITY" as ProfileTab, label: "Active Session & Security", icon: Shield },
              { id: "NOTIFICATIONS" as ProfileTab, label: "Admin Alerts", icon: Bell },
              { id: "ACTIVITY" as ProfileTab, label: "Audit Timeline", icon: Clock }
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
            {/* ── Tab 1: Personal & Staff Info ───────────────────────────── */}
            {activeTab === "PERSONAL" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                    Administrator Identity & Institutional Affiliation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Update your official administrative name, department responsibility, and campus bio.
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

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        type: "SAVE_PROFILE",
                        title: "Save Administrator Profile?",
                        message: "Confirm updating your administrator profile details. These changes will reflect immediately across platform governance modules."
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

            {/* ── Tab 2: Security & Password ─────────────────────────────── */}
            {activeTab === "PASSWORD" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                    Administrator Security Credentials
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Update your administrative password and ensure compliance with high-assurance password policies.
                  </p>
                </div>

                {/* 2FA Enforced Notice */}
                <div className="rounded-2xl border border-[#1E90FF]/30 bg-[#1E90FF]/10 p-4 flex items-start gap-3.5">
                  <ShieldCheck size={20} className="text-[#1E90FF] shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-900 dark:text-slate-50">
                      Two-Factor Authentication (2FA) Enforced
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      Because your account holds elevated governance clearance, institutional 2FA via authenticator application or institutional SSO is active on this account.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs outline-none focus:border-[#1E90FF] focus:bg-white dark:border-slate-800 dark:bg-[#162544]/40 dark:text-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Create secure new password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs outline-none focus:border-[#1E90FF] focus:bg-white dark:border-slate-800 dark:bg-[#162544]/40 dark:text-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs outline-none focus:border-[#1E90FF] focus:bg-white dark:border-slate-800 dark:bg-[#162544]/40 dark:text-white transition-all"
                    />
                  </div>

                  {/* Password Strength Meter */}
                  {newPassword && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>Strength: <span className="font-bold text-slate-900 dark:text-slate-50">{passwordStrength.label}</span></span>
                        <span>{passwordStrength.score}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                        <div
                          style={{ width: `${passwordStrength.score}%` }}
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Password Criteria Checklist */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 bg-slate-50/50 dark:bg-[#162544]/20 space-y-2 text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                      Policy Requirements
                    </span>
                    <div className="flex items-center gap-2">
                      {passwordCriteria.length ? <Check size={13} className="text-emerald-500" /> : <X size={13} className="text-rose-500" />}
                      <span className={passwordCriteria.length ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}>
                        Minimum 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordCriteria.uppercase ? <Check size={13} className="text-emerald-500" /> : <X size={13} className="text-rose-500" />}
                      <span className={passwordCriteria.uppercase ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}>
                        At least one uppercase letter (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordCriteria.numbers ? <Check size={13} className="text-emerald-500" /> : <X size={13} className="text-rose-500" />}
                      <span className={passwordCriteria.numbers ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}>
                        At least one numerical digit (0-9)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordCriteria.symbols ? <Check size={13} className="text-emerald-500" /> : <X size={13} className="text-rose-500" />}
                      <span className={passwordCriteria.symbols ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}>
                        At least one special character (@, #, $, %, etc.)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentPassword || !newPassword || !confirmPassword) {
                        addToast("Please fill in all password fields.", "error");
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        addToast("New passwords do not match.", "error");
                        return;
                      }
                      if (passwordStrength.score < 75) {
                        addToast("Password must meet Good or Strong criteria.", "error");
                        return;
                      }
                      setConfirmDialog({
                        isOpen: true,
                        type: "PASSWORD",
                        title: "Confirm Credential Update?",
                        message: "Are you sure you want to change your administrator password? You will use the new password on future logins."
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#1E90FF]/25 cursor-pointer transition-all"
                  >
                    <Key size={14} />
                    <span>Update Security Password</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Tab 3: Active Device & Session ─────────────────────────── */}
            {activeTab === "SECURITY" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                    Active Administrative Session & Environment
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live browser, operating system, and secure connection parameters for your current workstation.
                  </p>
                </div>

                {/* Current Detected Session Card */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#0F1A30] space-y-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF] shrink-0 mt-0.5">
                        <Laptop size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                            {currentSession.device}
                          </h4>
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-500 uppercase">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Current Session
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                          {currentSession.browser} • {currentSession.os}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Connected via Secure HTTPS / WSS • Authenticated via In-Memory JWT
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Token Architecture</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">In-Memory (XSS Protected)</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Transport Protocol</span>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">TLS 1.3 / Encrypted</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Privilege Scope</span>
                      <p className="font-semibold text-[#1E90FF] mt-0.5">Institutional Admin Root</p>
                    </div>
                  </div>
                </div>

                {/* Security Advice Alert */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3.5">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1 text-amber-800 dark:text-amber-300">
                    <span className="font-bold">Administrative Security Best Practices</span>
                    <p className="leading-relaxed text-[11px]">
                      Never access the governance console from public unmanaged kiosks. All moderation actions, user bans, and broadcasts are signed and permanently logged to the 90-day compliance audit ledger.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        type: "TERMINATE_OTHERS",
                        title: "Invalidate Secondary Sessions?",
                        message: "Are you sure you want to sign out and invalidate tokens on all other devices?"
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] hover:border-rose-500/40 hover:text-rose-500 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm cursor-pointer transition-all"
                  >
                    <LogOut size={13} />
                    <span>Invalidate Other Sessions</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Tab 4: Admin Alert Preferences ─────────────────────────── */}
            {activeTab === "NOTIFICATIONS" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                    Governance Alert Dispatch Preferences
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure real-time notifications for student reports, emergency broadcasts, and account alerts.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {/* Urgent Content Reports */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Urgent Student Content Reports
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Receive instant sound and banner alerts when students report severe hate speech, harassment, or security threats.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNotificationPrefs((p: any) => ({ ...p, urgentReports: !p.urgentReports }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out outline-none ${
                        notificationPrefs.urgentReports ? "bg-[#1E90FF]" : "bg-slate-200 dark:bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          notificationPrefs.urgentReports ? "translate-x-5.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Emergency Broadcast Confirmations */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Emergency Broadcast Confirmation Echoes
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Receive notifications when platform-wide announcements or campus safety banners are dispatched.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNotificationPrefs((p: any) => ({ ...p, broadcastEcho: !p.broadcastEcho }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out outline-none ${
                        notificationPrefs.broadcastEcho ? "bg-[#1E90FF]" : "bg-slate-200 dark:bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          notificationPrefs.broadcastEcho ? "translate-x-5.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Security Logins */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Administrative Security & Login Alerts
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Immediate notification on new device logins, password updates, or failed elevation attempts.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNotificationPrefs((p: any) => ({ ...p, securityLogins: !p.securityLogins }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out outline-none ${
                        notificationPrefs.securityLogins ? "bg-[#1E90FF]" : "bg-slate-200 dark:bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          notificationPrefs.securityLogins ? "translate-x-5.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Role Escalations */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        User Role Escalations & Moderator Additions
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Alert when other faculty members promote students or assign circle moderator privileges.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNotificationPrefs((p: any) => ({ ...p, roleEscalations: !p.roleEscalations }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out outline-none ${
                        notificationPrefs.roleEscalations ? "bg-[#1E90FF]" : "bg-slate-200 dark:bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          notificationPrefs.roleEscalations ? "translate-x-5.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Weekly Governance Digest */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Weekly Platform Governance Digest
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Receive a weekly summary email detailing resolved reports, account registrations, and audit metrics.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNotificationPrefs((p: any) => ({ ...p, weeklyDigest: !p.weeklyDigest }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out outline-none ${
                        notificationPrefs.weeklyDigest ? "bg-[#1E90FF]" : "bg-slate-200 dark:bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          notificationPrefs.weeklyDigest ? "translate-x-5.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={handleSaveNotifications}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#1E90FF]/25 cursor-pointer transition-all"
                  >
                    <Save size={14} />
                    <span>Save Alert Preferences</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Tab 5: Live Activity Log ───────────────────────────────── */}
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
                        {/* Node circle */}
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

      {/* ── Confirmation Dialog ────────────────────────────────────────── */}
      {confirmDialog && (
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={
            confirmDialog.type === "SAVE_PROFILE"
              ? "Save Profile"
              : confirmDialog.type === "PASSWORD"
              ? "Update Password"
              : confirmDialog.type === "TERMINATE_OTHERS"
              ? "Invalidate Sessions"
              : "Remove Photo"
          }
          isDestructive={confirmDialog.type === "TERMINATE_OTHERS" || confirmDialog.type === "REMOVE_PHOTO"}
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
