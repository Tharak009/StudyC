import { useState, useRef, useMemo } from "react";
import {
  User,
  Key,
  Shield,
  Bell,
  Clock,
  Camera,
  Check,
  X,
  Smartphone,
  Laptop,
  Globe,
  Lock,
  AlertTriangle,
  LogOut,
  Trash2,
  Calendar,
  AlertOctagon,
  UserCheck
} from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { ConfirmationDialog } from "../components/confirmation-dialog";
import { Avatar } from "../components/avatar";

type ProfileTab = "PERSONAL" | "PASSWORD" | "SECURITY" | "NOTIFICATIONS" | "ACTIVITY";

interface SessionEntry {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  loginTime: string;
  isCurrent: boolean;
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  type: string;
}

export function SystemSettingsPage() {
  // Placeholder in case of export name collision or similar,
  // but let's make sure our file exports AdminProfilePage!
}

export function AdminProfilePage() {
  const { addToast } = useToastStore();
  const user = useAuthStore((state) => state.user)!;

  // Active Tab
  const [activeTab, setActiveTab] = useState<ProfileTab>("PERSONAL");

  // Profile Personal Information State
  const [fullName, setFullName] = useState(user.fullName);
  const [designation, setDesignation] = useState("Senior Campus Administrator");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [bio, setBio] = useState("Responsible for managing communities, content moderation, reports resolutions, and global platform security configurations.");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.profilePicture || null);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification Preferences State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(false);
  const [reportAlerts, setReportAlerts] = useState(true);
  const [announcementAlerts, setAnnouncementAlerts] = useState(true);

  // Active Sessions Mock State
  const [sessions, setSessions] = useState<SessionEntry[]>([
    { id: "s1", device: "Desktop", browser: "Chrome 122", os: "Windows 11", ip: "192.168.1.45", loginTime: "2026-06-30 08:30 AM", isCurrent: true },
    { id: "s2", device: "Mobile Phone", browser: "Safari Mobile", os: "iOS 17.2", ip: "10.0.8.19", loginTime: "2026-06-29 09:15 PM", isCurrent: false },
    { id: "s3", device: "Laptop", browser: "Firefox 123", os: "macOS Sonoma", ip: "192.168.1.102", loginTime: "2026-06-28 11:20 AM", isCurrent: false }
  ]);

  // Activity Log Timeline Mock
  const [activities, setActivities] = useState<ActivityLog[]>([
    { id: "a1", action: "Updated System Settings (SMTP config)", timestamp: "2026-06-30 08:45 AM", type: "SETTINGS" },
    { id: "a2", action: "Approved Community: Java Coding Club", timestamp: "2026-06-30 08:12 AM", type: "COMMUNITY" },
    { id: "a3", action: "Suspended User: Forrest Gump (Reason: TOS violation)", timestamp: "2026-06-29 04:30 PM", type: "MODERATION" },
    { id: "a4", action: "Created Announcement: Campus Water Outage", timestamp: "2026-06-29 10:15 AM", type: "ANNOUNCEMENT" },
    { id: "a5", action: "Resolved Report #REP-102 (Hate speech)", timestamp: "2026-06-28 02:45 PM", type: "REPORT" }
  ]);

  // Confirmation Modals State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "SAVE_PROFILE" | "PASSWORD" | "TERMINATE_ALL" | "TERMINATE_SINGLE" | "REMOVE_PHOTO";
    targetId?: string;
    title: string;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      case 3: return { score: 75, label: "Good", color: "bg-indigo-500" };
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

    if (file.size > 2 * 1024 * 1024) {
      addToast("File size exceeds 2MB limit", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
      addToast("Profile photo loaded: Save profile to commit.", "info");
    };
    reader.readAsDataURL(file);
  };

  const executeConfirmAction = () => {
    if (!confirmDialog) return;
    const { type, targetId } = confirmDialog;

    if (type === "SAVE_PROFILE") {
      addToast("Admin Profile Updated Successfully", "success");
    } else if (type === "PASSWORD") {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      addToast("Admin Security Password Changed Successfully", "success");
      // Add password update activity log
      setActivities((prev) => [
        { id: `a-${Date.now()}`, action: "Changed Account Password", timestamp: "Just now", type: "SECURITY" },
        ...prev
      ]);
    } else if (type === "TERMINATE_ALL") {
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      addToast("All other active sessions terminated successfully", "success");
    } else if (type === "TERMINATE_SINGLE" && targetId) {
      setSessions((prev) => prev.filter((s) => s.id !== targetId));
      addToast("Session terminated successfully", "success");
    } else if (type === "REMOVE_PHOTO") {
      setAvatarPreview(null);
      addToast("Profile photo removed successfully", "success");
    }

    setConfirmDialog(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-500 dark:text-slate-400">Profile & Security</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Admin Workspace Profile
          </h2>
        </div>
      </div>

      {/* Main Profile Layout split-pane */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start animate-fade-up">
        {/* Left summary card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 text-center space-y-4">
          {/* Avatar frame */}
          <div className="relative mx-auto size-28 group">
            <Avatar name={fullName} src={avatarPreview || undefined} className="size-full text-2xl" />
            <button
              onClick={handlePhotoUploadClick}
              className="absolute inset-0 bg-black/45 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            >
              <Camera size={20} />
              <span className="text-[9px] font-bold mt-1 uppercase">Change</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
              {fullName}
            </h3>
            <p className="text-[10px] text-slate-455 font-semibold dark:text-slate-450">
              {designation}
            </p>
            <div className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.2 text-[8px] font-bold text-indigo-750 dark:bg-indigo-950/20 dark:text-indigo-400 uppercase tracking-wider mt-1.5 border dark:border-indigo-500/10">
              <UserCheck size={9} /> {user.role}
            </div>
          </div>

          {/* Quick list specs */}
          <dl className="text-left text-xs space-y-2.5 pt-4 border-t border-slate-100 dark:border-white/5">
            <div>
              <dt className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Admin ID</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-250 mt-0.5">ADM-2026-9481</dd>
            </div>
            <div>
              <dt className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Department</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-250 mt-0.5">Computer Science & Engineering</dd>
            </div>
            <div>
              <dt className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Joined Date</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-250 mt-0.5">June 15, 2025</dd>
            </div>
            <div>
              <dt className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Account Status</dt>
              <dd className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                <span className="size-1.5 rounded-full bg-current animate-pulse" />
                Active
              </dd>
            </div>
          </dl>

          {avatarPreview && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  type: "REMOVE_PHOTO",
                  title: "Remove Profile Photo?",
                  message: "Are you sure you want to remove your custom profile avatar and revert to initial initials?"
                })
              }
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/50 px-4 py-2 text-xs font-bold text-rose-700 cursor-pointer shadow-sm dark:border-rose-900/30 dark:bg-rose-950/10 dark:text-rose-400"
            >
              <Trash2 size={13} />
              Remove Photo
            </button>
          )}
        </div>

        {/* Right pane settings tabs contents */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-ink-900 overflow-hidden">
          {/* Tabs bar */}
          <div className="flex border-b border-slate-200 dark:border-white/5 overflow-x-auto scrollbar-none bg-slate-50/50 dark:bg-black/10">
            {[
              { id: "PERSONAL" as ProfileTab, label: "Personal Information", icon: User },
              { id: "PASSWORD" as ProfileTab, label: "Change Password", icon: Key },
              { id: "SECURITY" as ProfileTab, label: "Active Sessions", icon: Shield },
              { id: "NOTIFICATIONS" as ProfileTab, label: "Notifications", icon: Bell },
              { id: "ACTIVITY" as ProfileTab, label: "Activity Log", icon: Clock }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                    activeTab === tab.id
                      ? "border-indigo-600 text-indigo-650 dark:border-indigo-500 dark:text-indigo-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {/* Tab 1: Personal Info */}
            {activeTab === "PERSONAL" && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Email Address (Read-only)
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      readOnly
                      disabled
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-455 outline-none dark:border-white/5 dark:bg-white/[0.01] dark:text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Designation / Job Title
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Biography / Admin Notes
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        type: "SAVE_PROFILE",
                        title: "Update Admin Profile?",
                        message: "Confirm that you wish to update your administrator profile details. These changes will reflect immediately."
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:opacity-95 px-5 py-2 text-xs font-bold text-white shadow shadow-indigo-150 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Change Password */}
            {activeTab === "PASSWORD" && (
              <div className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="space-y-2 max-w-sm border-t border-slate-100 dark:border-white/5 pt-3 animate-fade-down">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-455">
                      <span>Password Strength: <span className="font-bold text-slate-800 dark:text-slate-200">{passwordStrength.label}</span></span>
                      <span>{passwordStrength.score}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                      <div
                        style={{ width: `${passwordStrength.score}%` }}
                        className={`h-full transition-all duration-200 ${passwordStrength.color}`}
                      />
                    </div>
                  </div>
                )}

                {/* Requirements Checklist */}
                <div className="rounded-xl border p-4 bg-slate-50/50 dark:bg-black/10 dark:border-white/5 space-y-2 max-w-sm text-xs text-slate-500 dark:text-slate-450">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">
                    Security Password Criteria
                  </span>
                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.length ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-red-500" />}
                    <span>Minimum 8 characters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.uppercase ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-red-500" />}
                    <span>At least one uppercase character</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.numbers ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-red-500" />}
                    <span>At least one digit (0-9)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.symbols ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-red-500" />}
                    <span>At least one special symbol (@, #, $)</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    onClick={() => {
                      if (!currentPassword || !newPassword || !confirmPassword) {
                        addToast("Please fill in all password fields", "error");
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        addToast("New passwords do not match", "error");
                        return;
                      }
                      if (passwordStrength.score < 75) {
                        addToast("Password does not meet strong criteria", "error");
                        return;
                      }
                      setConfirmDialog({
                        isOpen: true,
                        type: "PASSWORD",
                        title: "Confirm Password Change?",
                        message: "Are you sure you want to change your account password? You will need to use the new credential next login."
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:opacity-95 px-5 py-2 text-xs font-bold text-white shadow shadow-indigo-150 cursor-pointer"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Security & Sessions */}
            {activeTab === "SECURITY" && (
              <div className="space-y-6">
                {/* Security Warnings */}
                <div className="rounded-xl border border-rose-250 bg-rose-50/30 p-4 dark:border-rose-900/30 dark:bg-rose-950/10 flex items-start gap-3">
                  <AlertOctagon size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-800 dark:text-rose-400 space-y-1">
                    <span className="font-bold">Recent security notification alerts</span>
                    <p className="leading-relaxed text-[10px]">
                      No unknown device logins detected this week. Remember to sign out of public terminals.
                    </p>
                  </div>
                </div>

                {/* Active Sessions list */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Active User Sessions
                    </label>
                    {sessions.length > 1 && (
                      <button
                        onClick={() =>
                          setConfirmDialog({
                            isOpen: true,
                            type: "TERMINATE_ALL",
                            title: "Terminate Other Sessions?",
                            message: "Confirm that you want to log out of all other devices currently logged in under your account."
                          })
                        }
                        className="text-[10px] font-bold text-indigo-650 hover:underline cursor-pointer dark:text-indigo-400"
                      >
                        Sign out other sessions
                      </button>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/5">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-black/20 text-slate-500 dark:text-slate-400 border-b dark:border-white/5 font-semibold">
                          <th className="px-4 py-2">Device / Browser</th>
                          <th className="px-4 py-2">IP Address</th>
                          <th className="px-4 py-2">Login Window</th>
                          <th className="px-4 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {sessions.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                            <td className="px-4 py-3 flex items-start gap-3">
                              {s.device === "Desktop" || s.device === "Laptop" ? (
                                <Laptop size={16} className="text-slate-400 shrink-0 mt-0.5" />
                              ) : (
                                <Smartphone size={16} className="text-slate-400 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {s.device} ({s.browser})
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                  <span>{s.os}</span>
                                  {s.isCurrent && (
                                    <span className="rounded bg-indigo-50 px-1 py-0.2 text-[8px] font-bold text-indigo-750 dark:bg-indigo-950/20 dark:text-indigo-400 uppercase">
                                      Current
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{s.ip}</td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{s.loginTime}</td>
                            <td className="px-4 py-3 text-right">
                              {!s.isCurrent && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmDialog({
                                      isOpen: true,
                                      type: "TERMINATE_SINGLE",
                                      targetId: s.id,
                                      title: "Sign Out Device Session?",
                                      message: `Are you sure you want to terminate the active session on ${s.device} (${s.os})?`
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                                >
                                  <LogOut size={10} /> Terminate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Notification Preferences */}
            {activeTab === "NOTIFICATIONS" && (
              <div className="space-y-4">
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Email Alerts Logging</h4>
                      <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-normal">
                        Receive platform notifications, event invitations, and digest reports on mail address.
                      </p>
                    </div>
                    <button
                      onClick={() => setEmailAlerts(!emailAlerts)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out outline-none ${
                        emailAlerts ? "bg-indigo-650" : "bg-slate-200 dark:bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          emailAlerts ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Security Alert Notifications</h4>
                      <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-normal">
                        Get notified immediately about password modifications, lockout events, or unknown login locations.
                      </p>
                    </div>
                    <button
                      onClick={() => setSecurityAlerts(!securityAlerts)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out outline-none ${
                        securityAlerts ? "bg-indigo-650" : "bg-slate-200 dark:bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          securityAlerts ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">General System Updates</h4>
                      <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-normal">
                        Get newsletters about core backend release patches, updates logs, and weekly metrics updates.
                      </p>
                    </div>
                    <button
                      onClick={() => setSystemAlerts(!systemAlerts)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out outline-none ${
                        systemAlerts ? "bg-indigo-650" : "bg-slate-200 dark:bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          systemAlerts ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Student Reports Alerts</h4>
                      <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-normal">
                        Receive instant alerts when reports are filed or community moderators flag inappropriate content.
                      </p>
                    </div>
                    <button
                      onClick={() => setReportAlerts(!reportAlerts)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out outline-none ${
                        reportAlerts ? "bg-indigo-650" : "bg-slate-200 dark:bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          reportAlerts ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Official Announcements Alerts</h4>
                      <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-normal">
                        Receive alerts when notifications or news releases are drafted or scheduled by fellow administrators.
                      </p>
                    </div>
                    <button
                      onClick={() => setAnnouncementAlerts(!announcementAlerts)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out outline-none ${
                        announcementAlerts ? "bg-indigo-650" : "bg-slate-200 dark:bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          announcementAlerts ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
                  <button
                    onClick={() => addToast("Notification preferences updated successfully", "success")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:opacity-95 px-5 py-2 text-xs font-bold text-white shadow shadow-indigo-150 cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* Tab 5: Account Activity log */}
            {activeTab === "ACTIVITY" && (
              <div className="space-y-6">
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Audit Activity Timeline
                </label>

                <div className="relative pl-6 border-l border-slate-200 dark:border-white/5 space-y-5">
                  {activities.map((act) => (
                    <div key={act.id} className="relative">
                      {/* Ring element */}
                      <span className="absolute -left-[30px] top-1 flex size-4 items-center justify-center rounded-full bg-white dark:bg-ink-900">
                        <span className="size-2 rounded-full bg-indigo-500" />
                      </span>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          {act.timestamp}
                        </span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {act.action}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      {confirmDialog && (
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={
            confirmDialog.type === "SAVE_PROFILE"
              ? "Update Profile"
              : confirmDialog.type === "PASSWORD"
              ? "Change Password"
              : confirmDialog.type === "TERMINATE_ALL"
              ? "Sign out others"
              : confirmDialog.type === "TERMINATE_SINGLE"
              ? "Terminate Session"
              : "Remove Photo"
          }
          isDestructive={confirmDialog.type === "TERMINATE_ALL" || confirmDialog.type === "TERMINATE_SINGLE" || confirmDialog.type === "REMOVE_PHOTO"}
          onConfirm={executeConfirmAction}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
