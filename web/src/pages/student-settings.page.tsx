import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye, Bell, Shield, User, Key, Monitor, Mail, Trash2, Globe, Check, AlertTriangle, ToggleLeft, ToggleRight, Laptop, Smartphone, HelpCircle } from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { useThemeStore } from "../store/theme.store";
import { useToastStore } from "../store/toast.store";
import { useLogout } from "../hooks/use-auth";
import { authApi } from "../api/auth.api";

type SettingsTab = "appearance" | "notifications" | "privacy" | "security" | "account";

export function StudentSettingsPage() {
  const user = useAuthStore((state) => state.user)!;
  const logout = useLogout();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  // Persistent settings state key
  const storageKey = `settings-student-${user._id}`;

  // Default states for student preferences
  const [accentColor, setAccentColor] = useState("indigo");
  const [language, setLanguage] = useState("en");
  
  // Notification states
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [communityNotifs, setCommunityNotifs] = useState(true);
  const [eventNotifs, setEventNotifs] = useState(true);
  const [mentionNotifs, setMentionNotifs] = useState(true);

  // Privacy states
  const [profileVisibility, setProfileVisibility] = useState("PUBLIC");
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 2FA state placeholder
  const [mfaEnabled, setMfaEnabled] = useState(false);

  // Load preferences from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.accentColor) setAccentColor(parsed.accentColor);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.emailNotifs !== undefined) setEmailNotifs(parsed.emailNotifs);
        if (parsed.pushNotifs !== undefined) setPushNotifs(parsed.pushNotifs);
        if (parsed.communityNotifs !== undefined) setCommunityNotifs(parsed.communityNotifs);
        if (parsed.eventNotifs !== undefined) setEventNotifs(parsed.eventNotifs);
        if (parsed.mentionNotifs !== undefined) setMentionNotifs(parsed.mentionNotifs);
        if (parsed.profileVisibility) setProfileVisibility(parsed.profileVisibility);
        if (parsed.showOnlineStatus !== undefined) setShowOnlineStatus(parsed.showOnlineStatus);
      }
    } catch (e) {
      console.error(e);
    }
  }, [storageKey]);

  // Save utility helper
  const savePreferences = (updatedFields: any) => {
    try {
      const stored = localStorage.getItem(storageKey);
      const current = stored ? JSON.parse(stored) : {};
      const merged = { ...current, ...updatedFields };
      localStorage.setItem(storageKey, JSON.stringify(merged));
      addToast("Preferences updated successfully!", "success");
    } catch (e) {
      console.error(e);
      addToast("Failed to save preference settings.", "error");
    }
  };

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      addToast("Password changed successfully!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || err?.message || "Failed to change password.", "error");
    }
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast("All password fields are required.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast("New password and confirmation do not match.", "error");
      return;
    }
    changePasswordMutation.mutate();
  };

  // Account deletion simulation
  const handleDeleteAccount = () => {
    const confirmation = window.prompt("WARNING: Deleting your account will remove all joined communities, shared resource uploads, and messages. This action cannot be undone.\n\nPlease type your account email to confirm account deletion:");
    if (confirmation === user.email) {
      addToast("Account successfully deactivated. Logging out...", "info");
      setTimeout(() => {
        logout.mutate();
      }, 1500);
    } else if (confirmation !== null) {
      addToast("Email confirmation mismatched. Deletion canceled.", "error");
    }
  };

  return (
    <div className="animate-fade-up space-y-8">
      {/* Page Header */}
      <header className="border-b border-slate-200 pb-5 dark:border-white/5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
          Preferences
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white sm:text-5xl">
          Account Settings.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Configure security, visual theme defaults, alert notifications parameters, and connected system sessions.
        </p>
      </header>

      {/* Settings Panel Grid */}
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        
        {/* Left Side-bar selection tabs */}
        <aside className="flex flex-row overflow-x-auto lg:flex-col gap-1 pb-2 lg:pb-0 border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-white/5 pr-0 lg:pr-4 shrink-0">
          {[
            { id: "appearance", label: "Appearance & Theme", icon: Eye },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "privacy", label: "Privacy Toggles", icon: Shield },
            { id: "security", label: "Security & MFA", icon: Key },
            { id: "account", label: "Account & Devices", icon: User }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-slate-950 text-white dark:bg-white dark:text-ink-950"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Right Settings Form Box */}
        <main className="bg-white rounded-3xl border border-slate-200 p-6 dark:bg-ink-900 dark:border-white/5">
          
          {/* TAB 1: APPEARANCE & THEME */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight border-b border-slate-100 pb-3 dark:border-white/5">Appearance Preferences</h3>
              
              {/* Theme preference */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Dark Mode Color Scheme</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Switch between clean light styles and rich premium dark modes.</p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="text-slate-650 hover:text-indigo-650 cursor-pointer"
                >
                  {theme === "dark" ? (
                    <ToggleRight size={38} className="text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <ToggleLeft size={38} className="text-slate-400" />
                  )}
                </button>
              </div>

              {/* Theme accent colors list */}
              <div className="border-b border-slate-100 pb-5 dark:border-white/5 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Primary Color Accent</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Personalize primary dashboard buttons and focus borders.</p>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: "indigo", bg: "bg-indigo-600" },
                    { id: "blue", bg: "bg-blue-600" },
                    { id: "emerald", bg: "bg-emerald-600" },
                    { id: "rose", bg: "bg-rose-600" },
                    { id: "amber", bg: "bg-amber-500" }
                  ].map((color) => (
                    <button
                      key={color.id}
                      onClick={() => {
                        setAccentColor(color.id);
                        savePreferences({ accentColor: color.id });
                      }}
                      className={`size-6 rounded-full ${color.bg} border-2 transition cursor-pointer flex items-center justify-center ${
                        accentColor === color.id ? "border-slate-950 dark:border-white scale-110" : "border-transparent"
                      }`}
                    >
                      {accentColor === color.id && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language selections */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Display Language</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Select your preferred localization charset and language translations.</p>
                </div>
                <div className="relative max-w-xs">
                  <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      savePreferences({ language: e.target.value });
                    }}
                    className="field pl-9 text-xs py-2.5 bg-slate-50 border-0"
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español (Spanish)</option>
                    <option value="fr">Français (French)</option>
                    <option value="de">Deutsch (German)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Notification Channels</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Alert settings</span>
              </div>

              <div className="space-y-4">
                {[
                  { state: emailNotifs, setter: setEmailNotifs, key: "emailNotifs", label: "Email Alerts Preferences", desc: "Send daily activity digests and direct messaging updates to your college inbox." },
                  { state: pushNotifs, setter: setPushNotifs, key: "pushNotifs", label: "Browser Push Alerts", desc: "Receive immediate notifications for mentions and alerts on the dashboard." },
                  { state: communityNotifs, setter: setCommunityNotifs, key: "communityNotifs", label: "Community Circles Activity", desc: "Trigger notifications when new threads or polls are uploaded in your communities." },
                  { state: eventNotifs, setter: setEventNotifs, key: "eventNotifs", label: "Registered Event Updates", desc: "Receive schedule warnings and registration alerts for upcoming events." },
                  { state: mentionNotifs, setter: setMentionNotifs, key: "mentionNotifs", label: "Likes, Comments & Mentions", desc: "Notify when another student tags you in comments or likes your posts." }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 dark:border-white/[0.02]">
                    <div className="max-w-xl">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !item.state;
                        item.setter(next);
                        savePreferences({ [item.key]: next });
                      }}
                      className="cursor-pointer"
                    >
                      {item.state ? (
                        <ToggleRight size={38} className="text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ToggleLeft size={38} className="text-slate-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight border-b border-slate-100 pb-3 dark:border-white/5">Privacy Configurations</h3>
              
              {/* Profile visibility selection */}
              <div className="border-b border-slate-100 pb-5 dark:border-white/5 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Profile Directory Visibility</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Control who can locate your academic profile on the student search directories.</p>
                </div>
                <div className="relative max-w-xs">
                  <select
                    value={profileVisibility}
                    onChange={(e) => {
                      setProfileVisibility(e.target.value);
                      savePreferences({ profileVisibility: e.target.value });
                    }}
                    className="field text-xs py-2.5 bg-slate-50 border-0 font-semibold text-slate-750"
                  >
                    <option value="PUBLIC">Public (All Students)</option>
                    <option value="CONNECTIONS">Connections Only</option>
                    <option value="PRIVATE">Private (Only Me)</option>
                  </select>
                </div>
              </div>

              {/* Online status indicator toggle */}
              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Show Online Presence Indicators</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Allow your peers to see your active green indicator dot in chats.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showOnlineStatus;
                    setShowOnlineStatus(next);
                    savePreferences({ showOnlineStatus: next });
                  }}
                  className="cursor-pointer"
                >
                  {showOnlineStatus ? (
                    <ToggleRight size={38} className="text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <ToggleLeft size={38} className="text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-8">
              
              {/* Password change form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight border-b border-slate-100 pb-3 dark:border-white/5">Update Password</h3>
                
                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Current Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="field text-xs py-2 bg-slate-50 border-0"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="•••••••• (Min 8 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="field text-xs py-2 bg-slate-50 border-0"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="field text-xs py-2 bg-slate-50 border-0"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="primary-button text-xs py-2 px-6 shadow-sm"
                >
                  {changePasswordMutation.isPending ? "Updating Password..." : "Change Password"}
                </button>
              </form>

              {/* 2FA Authenticator placeholder toggle */}
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Two-Factor Authentication (2FA)</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Require a dynamic login verification code generated by authenticator apps.</p>
                </div>
                
                <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl dark:bg-black/10 dark:border-white/5 max-w-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Future Security Release</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">MFA integration (Google Authenticator / SMS) is currently in development and will launch in Release 2.0.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMfaEnabled(!mfaEnabled);
                      addToast("2FA configuration is currently simulated as a release placeholder.", "info");
                    }}
                    className="cursor-pointer"
                  >
                    {mfaEnabled ? (
                      <ToggleRight size={38} className="text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <ToggleLeft size={38} className="text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: ACCOUNT */}
          {activeTab === "account" && (
            <div className="space-y-8">
              
              {/* Connected Devices / Sessions list */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Active Sessions & Devices</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Manage active logins and connected browser tabs on this account.</p>
                </div>

                <div className="space-y-3.5 max-w-xl">
                  {[
                    { current: true, device: "Chrome Browser on Windows OS (Current Session)", ip: "192.168.1.45", loc: "Campus network, Library Building", icon: Laptop },
                    { current: false, device: "StudyConnect Mobile App on Pixel 8 Pro", ip: "10.0.2.16", loc: "Android Emulator cellular proxy", icon: Smartphone }
                  ].map((sess, idx) => {
                    const Icon = sess.icon;
                    return (
                      <div key={idx} className="flex items-start justify-between gap-4 p-3.5 border border-slate-100 rounded-2xl bg-slate-55/30 dark:bg-black/10 dark:border-white/5">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-indigo-50 border p-2 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/5">
                            <Icon size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{sess.device}</span>
                              {sess.current && (
                                <span className="rounded bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold">Current</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-450 mt-1">IP: {sess.ip} · {sess.loc}</p>
                          </div>
                        </div>

                        {!sess.current && (
                          <button
                            onClick={() => addToast("Successfully logged out device.", "success")}
                            className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Danger Zone: Delete Account */}
              <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-red-600 tracking-tight">Danger Zone</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Permanently remove and delete your student record from StudyConnect platform.</p>
                </div>

                <div className="border border-red-200 bg-red-50/50 rounded-2xl p-4 dark:bg-red-500/5 dark:border-red-900/30 flex flex-col sm:flex-row justify-between sm:items-center gap-4 max-w-xl">
                  <div>
                    <h4 className="text-xs font-bold text-red-700 dark:text-red-400">Permanently Delete Account</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 max-w-md">Once executed, all messages, file shares, profile data, and event registrations will be lost forever.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-700 shadow-sm cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    Delete Account
                  </button>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

    </div>
  );
}
