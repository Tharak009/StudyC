import { useState } from "react";
import { Plus, X, Mail, ShieldCheck, Database, CalendarDays, RefreshCw, Layers } from "lucide-react";
import type { BackupEntry } from "../store/settings.store";

// Helper components
function ToggleSwitch({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/5">
      <div className="space-y-0.5 pr-4">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</h4>
        <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-normal">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out outline-none ${
          checked ? "bg-indigo-650" : "bg-slate-200 dark:bg-white/10"
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// 1. General Settings
export function GeneralSettingsForm({ values, onChange }: { values: any; onChange: (vals: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Platform Name
          </label>
          <input
            type="text"
            value={values.platformName || ""}
            onChange={(e) => onChange({ platformName: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Platform Logo URL
          </label>
          <input
            type="text"
            value={values.platformLogo || ""}
            onChange={(e) => onChange({ platformLogo: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Platform Description
        </label>
        <textarea
          value={values.platformDescription || ""}
          onChange={(e) => onChange({ platformDescription: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Default Language
          </label>
          <select
            value={values.defaultLanguage || "en"}
            onChange={(e) => onChange({ defaultLanguage: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
          >
            <option value="en">English (US)</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Timezone
          </label>
          <select
            value={values.timezone || "UTC+05:30"}
            onChange={(e) => onChange({ timezone: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
          >
            <option value="UTC+00:00">UTC+00:00 (GMT)</option>
            <option value="UTC+05:30">UTC+05:30 (IST)</option>
            <option value="UTC-08:00">UTC-08:00 (PST)</option>
          </select>
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Date Format
          </label>
          <select
            value={values.dateFormat || "YYYY-MM-DD"}
            onChange={(e) => onChange({ dateFormat: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
          >
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="DD-MM-YYYY">DD-MM-YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// 2. College Settings
export function CollegeSettingsForm({ values, onChange }: { values: any; onChange: (vals: any) => void }) {
  const [newDept, setNewDept] = useState("");

  const handleAddDept = () => {
    if (!newDept.trim()) return;
    const currentDepts = values.departments || [];
    if (!currentDepts.includes(newDept.trim())) {
      onChange({ departments: [...currentDepts, newDept.trim()] });
    }
    setNewDept("");
  };

  const handleRemoveDept = (deptName: string) => {
    const currentDepts = values.departments || [];
    onChange({ departments: currentDepts.filter((d: string) => d !== deptName) });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            College Name
          </label>
          <input
            type="text"
            value={values.collegeName || ""}
            onChange={(e) => onChange({ collegeName: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            College Website
          </label>
          <input
            type="text"
            value={values.website || ""}
            onChange={(e) => onChange({ website: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Email Domain Limit
          </label>
          <input
            type="text"
            value={values.emailDomain || ""}
            onChange={(e) => onChange({ emailDomain: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
            placeholder="e.g. comstudy.edu.in"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Current Academic Year
          </label>
          <input
            type="text"
            value={values.academicYear || ""}
            onChange={(e) => onChange({ academicYear: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Semester Config
          </label>
          <select
            value={values.semester || "Odd"}
            onChange={(e) => onChange({ semester: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
          >
            <option value="Odd">Odd Semester</option>
            <option value="Even">Even Semester</option>
          </select>
        </div>
      </div>

      {/* Departments chips block */}
      <div className="space-y-2 pt-2">
        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Registered Departments
        </label>
        <div className="flex flex-wrap gap-1.5 min-h-8 border border-slate-200 rounded-xl p-2 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.01]">
          {values.departments?.map((dept: string) => (
            <span
              key={dept}
              className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-750 dark:bg-indigo-500/10 dark:text-indigo-400 border dark:border-indigo-500/20"
            >
              {dept}
              <button
                type="button"
                onClick={() => handleRemoveDept(dept)}
                className="hover:text-red-500 outline-none cursor-pointer"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2 max-w-sm">
          <input
            type="text"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            placeholder="Add new department..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={handleAddDept}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-650 px-3 py-1.5 text-xs font-bold text-white shadow shadow-indigo-150 cursor-pointer hover:opacity-95"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

// 3. Registration Settings
export function RegistrationSettingsForm({ values, onChange }: { values: any; onChange: (vals: any) => void }) {
  return (
    <div className="space-y-1">
      <ToggleSwitch
        label="Enable Public Registration"
        description="Allow new users to sign up from the landing page. If disabled, only admins can create user profiles."
        checked={values.enableRegistration}
        onChange={(val) => onChange({ enableRegistration: val })}
      />
      <ToggleSwitch
        label="Restrict to College Emails"
        description="Restrict signups exclusively to email addresses ending in the college domain."
        checked={values.allowOnlyCollegeEmails}
        onChange={(val) => onChange({ allowOnlyCollegeEmails: val })}
      />
      <ToggleSwitch
        label="Require Email Verification"
        description="Force students to verify their email address before they can log in."
        checked={values.requireEmailVerification}
        onChange={(val) => onChange({ requireEmailVerification: val })}
      />

      <div className="pt-4 max-w-xs">
        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Default Student Signup Role
        </label>
        <select
          value={values.defaultStudentRole || "STUDENT"}
          onChange={(e) => onChange({ defaultStudentRole: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
        >
          <option value="STUDENT">Student</option>
          <option value="GUEST">Guest User</option>
        </select>
      </div>
    </div>
  );
}

// 4. Authentication Settings
export function AuthenticationSettingsForm({ values, onChange }: { values: any; onChange: (vals: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Session Timeout (Minutes)
          </label>
          <input
            type="number"
            value={values.sessionTimeout ?? 60}
            onChange={(e) => onChange({ sessionTimeout: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Remember Me Duration (Days)
          </label>
          <input
            type="number"
            value={values.rememberMeDuration ?? 30}
            onChange={(e) => onChange({ rememberMeDuration: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Force Password Expiry (Days)
          </label>
          <input
            type="number"
            value={values.passwordExpiry ?? 90}
            onChange={(e) => onChange({ passwordExpiry: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Max Login Attempts (Lockout Trigger)
          </label>
          <input
            type="number"
            value={values.maxLoginAttempts ?? 5}
            onChange={(e) => onChange({ maxLoginAttempts: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}

// 5. Email SMTP Settings
export function EmailSettingsForm({
  values,
  onChange,
  onSendTestEmail
}: {
  values: any;
  onChange: (vals: any) => void;
  onSendTestEmail: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            SMTP Outgoing Server Host
          </label>
          <input
            type="text"
            value={values.smtpHost || ""}
            onChange={(e) => onChange({ smtpHost: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            SMTP Port
          </label>
          <input
            type="number"
            value={values.smtpPort ?? 587}
            onChange={(e) => onChange({ smtpPort: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Sender Display Name
          </label>
          <input
            type="text"
            value={values.senderName || ""}
            onChange={(e) => onChange({ senderName: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Sender Email
          </label>
          <input
            type="email"
            value={values.senderEmail || ""}
            onChange={(e) => onChange({ senderEmail: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Reply-To Email Address
          </label>
          <input
            type="email"
            value={values.replyToEmail || ""}
            onChange={(e) => onChange({ replyToEmail: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onSendTestEmail}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 dark:border-white/5 dark:bg-ink-950 dark:text-slate-300 shadow-sm cursor-pointer"
        >
          <Mail size={13} />
          Send Test Email Configuration
        </button>
      </div>
    </div>
  );
}

// 6. Notification Settings
export function NotificationSettingsForm({ values, onChange }: { values: any; onChange: (vals: any) => void }) {
  return (
    <div className="space-y-1">
      <ToggleSwitch
        label="System Email Alerts"
        description="Allow the platform to dispatch system update emails, warnings, and report notifications."
        checked={values.emailNotifications}
        onChange={(val) => onChange({ emailNotifications: val })}
      />
      <ToggleSwitch
        label="In-App Push Notifications"
        description="Enable real-time push alerts to student workspace feeds."
        checked={values.pushNotifications}
        onChange={(val) => onChange({ pushNotifications: val })}
      />
      <ToggleSwitch
        label="Announcements Alerts"
        description="Auto-alert students when critical/general announcements are published."
        checked={values.announcementNotifications}
        onChange={(val) => onChange({ announcementNotifications: val })}
      />
      <ToggleSwitch
        label="Event Invitations Alerts"
        description="Notify members when community workshops, academic events, or club socials are scheduled."
        checked={values.eventNotifications}
        onChange={(val) => onChange({ eventNotifications: val })}
      />
      <ToggleSwitch
        label="Community Activity Alerts"
        description="Notify users when they are approved to join private communities or receive direct mentions."
        checked={values.communityNotifications}
        onChange={(val) => onChange({ communityNotifications: val })}
      />
    </div>
  );
}

// 7. File Upload Settings
export function FileUploadSettingsForm({ values, onChange }: { values: any; onChange: (vals: any) => void }) {
  const [newType, setNewType] = useState("");

  const handleAddType = () => {
    if (!newType.trim()) return;
    const currentTypes = values.allowedFileTypes || [];
    const formatted = newType.trim().startsWith(".") ? newType.trim() : `.${newType.trim()}`;
    if (!currentTypes.includes(formatted)) {
      onChange({ allowedFileTypes: [...currentTypes, formatted] });
    }
    setNewType("");
  };

  const handleRemoveType = (typeName: string) => {
    const currentTypes = values.allowedFileTypes || [];
    onChange({ allowedFileTypes: currentTypes.filter((t: string) => t !== typeName) });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Max Attachment Size (MB)
          </label>
          <input
            type="number"
            value={values.maxFileSize ?? 10}
            onChange={(e) => onChange({ maxFileSize: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Max Image Dimension Size (MB)
          </label>
          <input
            type="number"
            value={values.maxImageSize ?? 5}
            onChange={(e) => onChange({ maxImageSize: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Global Storage Limit (GB)
          </label>
          <input
            type="number"
            value={values.storageLimit ?? 100}
            onChange={(e) => onChange({ storageLimit: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Allowed Upload File Types
        </label>
        <div className="flex flex-wrap gap-1.5 min-h-8 border border-slate-200 rounded-xl p-2 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.01]">
          {values.allowedFileTypes?.map((type: string) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300"
            >
              {type}
              <button
                type="button"
                onClick={() => handleRemoveType(type)}
                className="hover:text-red-500 outline-none cursor-pointer"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2 max-w-sm">
          <input
            type="text"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="e.g. .pdf or pdf"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={handleAddType}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-805 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-white/5 dark:bg-ink-950 dark:text-slate-350 shadow-sm border cursor-pointer"
          >
            Add Extension
          </button>
        </div>
      </div>
    </div>
  );
}

// 8. Communities Settings
export function CommunitiesSettingsForm({ values, onChange }: { values: any; onChange: (vals: any) => void }) {
  return (
    <div className="space-y-4">
      <ToggleSwitch
        label="Allow Student Community Creation"
        description="If disabled, only administrator roles can configure new learning community spaces."
        checked={values.allowCommunityCreation}
        onChange={(val) => onChange({ allowCommunityCreation: val })}
      />
      <ToggleSwitch
        label="Require Community Approval"
        description="Force student-created spaces to pass admin approval reviews before they are live."
        checked={values.communityApprovalRequired}
        onChange={(val) => onChange({ communityApprovalRequired: val })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Max Members Per Community
          </label>
          <input
            type="number"
            value={values.maxMembers ?? 500}
            onChange={(e) => onChange({ maxMembers: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Max Communities per Student User
          </label>
          <input
            type="number"
            value={values.maxCommunitiesPerUser ?? 10}
            onChange={(e) => onChange({ maxCommunitiesPerUser: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}

// 9. Event Settings
export function EventSettingsForm({ values, onChange }: { values: any; onChange: (vals: any) => void }) {
  return (
    <div className="space-y-4">
      <ToggleSwitch
        label="Allow Student Event Creation"
        description="Permit community hosts and students to post workshops and study sessions."
        checked={values.allowStudentEvents}
        onChange={(val) => onChange({ allowStudentEvents: val })}
      />
      <ToggleSwitch
        label="Require Event Approval"
        description="Verify student-submitted events before posting them to the shared calendar board."
        checked={values.requireEventApproval}
        onChange={(val) => onChange({ requireEventApproval: val })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Max Participants per Event
          </label>
          <input
            type="number"
            value={values.maxParticipants ?? 200}
            onChange={(e) => onChange({ maxParticipants: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Registration Deadline Limit (Hours before Event)
          </label>
          <input
            type="number"
            value={values.registrationDeadlineHours ?? 24}
            onChange={(e) => onChange({ registrationDeadlineHours: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}

// 10. Appearance Settings
export function AppearanceSettingsForm({ values, onChange }: { values: any; onChange: (vals: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Default Theme
          </label>
          <select
            value={values.defaultTheme || "Dark"}
            onChange={(e) => onChange({ defaultTheme: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500 cursor-pointer"
          >
            <option value="Light">Light Mode Theme</option>
            <option value="Dark">Dark Mode Theme</option>
          </select>
        </div>

        <ToggleSwitch
          label="Enable Dark Mode Toggle"
          description="Allow student users to toggle dark mode overrides manually from layouts header."
          checked={values.enableDarkMode}
          onChange={(val) => onChange({ enableDarkMode: val })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Primary Theme Color (Hex)
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={values.primaryColor || "#6366f1"}
              onChange={(e) => onChange({ primaryColor: e.target.value })}
              className="size-9 rounded-lg border-0 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
            />
            <input
              type="text"
              value={values.primaryColor || "#6366f1"}
              onChange={(e) => onChange({ primaryColor: e.target.value })}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Accent Accent Color (Hex)
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={values.accentColor || "#8b5cf6"}
              onChange={(e) => onChange({ accentColor: e.target.value })}
              className="size-9 rounded-lg border-0 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
            />
            <input
              type="text"
              value={values.accentColor || "#8b5cf6"}
              onChange={(e) => onChange({ accentColor: e.target.value })}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 11. Security Settings
export function SecuritySettingsForm({ values, onChange }: { values: any; onChange: (vals: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Password Policy Strength
          </label>
          <select
            value={values.passwordPolicy || "Strong"}
            onChange={(e) => onChange({ passwordPolicy: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
          >
            <option value="Basic">Basic (Length Only)</option>
            <option value="Strong">Strong (Mixed Charsets)</option>
          </select>
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Minimum Password Length
          </label>
          <input
            type="number"
            value={values.minLength ?? 8}
            onChange={(e) => onChange({ minLength: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Account Lock Duration (Minutes)
          </label>
          <input
            type="number"
            value={values.accountLockDuration ?? 30}
            onChange={(e) => onChange({ accountLockDuration: parseInt(e.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/5">
        <ToggleSwitch
          label="Require Uppercase Characters"
          description="Force passwords to contain at least one uppercase letter (A-Z)."
          checked={values.requireUppercase}
          onChange={(val) => onChange({ requireUppercase: val })}
        />
        <ToggleSwitch
          label="Require Numeric Digits"
          description="Force passwords to contain at least one number digit (0-9)."
          checked={values.requireNumbers}
          onChange={(val) => onChange({ requireNumbers: val })}
        />
        <ToggleSwitch
          label="Require Special Symbols"
          description="Force passwords to contain special symbols (e.g. @, #, $, !)."
          checked={values.requireSymbols}
          onChange={(val) => onChange({ requireSymbols: val })}
        />
      </div>
    </div>
  );
}

// 12. Backup settings
export function BackupSettingsForm({
  values,
  onTriggerBackup,
  onRestoreBackup
}: {
  values: any;
  onTriggerBackup: () => void;
  onRestoreBackup: (backupId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Overview Block */}
      <div className="rounded-2xl border p-4 bg-slate-50/50 dark:bg-black/10 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Database size={14} className="text-indigo-650" />
            Backup Database Status: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{values.backupStatus}</span>
          </h4>
          <p className="text-[10px] text-slate-455 leading-normal">
            Last automated backup completed at: <span className="font-semibold">{values.lastBackup}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onTriggerBackup}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:opacity-95 px-4 py-2 text-xs font-bold text-white shadow shadow-indigo-150 cursor-pointer"
        >
          <Database size={13} />
          Backup Now (Manual)
        </button>
      </div>

      {/* Backup History Table */}
      <div className="space-y-2 pt-2">
        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Backup History Log
        </label>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-black/20 text-slate-500 dark:text-slate-400 border-b dark:border-white/5 font-semibold">
                <th className="px-4 py-2">Filename</th>
                <th className="px-4 py-2">File Size</th>
                <th className="px-4 py-2">Created Date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {values.history?.map((b: BackupEntry) => (
                <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{b.filename}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{b.size}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{b.date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider ${
                      b.status === "Completed"
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : "bg-indigo-50 text-indigo-750 dark:bg-indigo-950/20 dark:text-indigo-400"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onRestoreBackup(b.id)}
                      disabled={b.status === "Restored"}
                      className="rounded px-2.5 py-1 text-[10px] font-bold border border-slate-200 hover:bg-slate-50 dark:border-white/5 dark:bg-ink-950 dark:text-slate-350 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 13. About System Form
export function AboutSystemForm({ values }: { values: any }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="rounded-xl border p-4 bg-slate-50/50 dark:bg-black/10 dark:border-white/5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            StudyConnect Version
          </span>
          <span className="font-extrabold text-base text-slate-800 dark:text-white">
            {values.version}
          </span>
        </div>

        <div className="rounded-xl border p-4 bg-slate-50/50 dark:bg-black/10 dark:border-white/5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Running Environment
          </span>
          <span className="font-extrabold text-base text-indigo-650 dark:text-indigo-400">
            {values.environment}
          </span>
        </div>

        <div className="rounded-xl border p-4 bg-slate-50/50 dark:bg-black/10 dark:border-white/5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Server Build Date
          </span>
          <span className="font-semibold text-xs text-slate-800 dark:text-white block mt-1.5">
            {values.buildDate}
          </span>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">System Handshake Details</h4>
        <dl className="grid gap-3 grid-cols-2 text-xs leading-normal">
          <div className="border-b pb-1 dark:border-white/5">
            <dt className="text-slate-455 font-semibold">Database Connection</dt>
            <dd className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="size-1.5 rounded-full bg-current animate-pulse" />
              {values.databaseStatus}
            </dd>
          </div>
          <div className="border-b pb-1 dark:border-white/5">
            <dt className="text-slate-455 font-semibold">Web Server Status</dt>
            <dd className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="size-1.5 rounded-full bg-current animate-pulse" />
              {values.serverStatus}
            </dd>
          </div>
          <div className="border-b pb-1 dark:border-white/5">
            <dt className="text-slate-455 font-semibold">Frontend App Version</dt>
            <dd className="font-bold text-slate-800 dark:text-slate-300 mt-0.5">{values.frontendVersion}</dd>
          </div>
          <div className="border-b pb-1 dark:border-white/5">
            <dt className="text-slate-455 font-semibold">Backend Engine Version</dt>
            <dd className="font-bold text-slate-800 dark:text-slate-300 mt-0.5">{values.backendVersion}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
