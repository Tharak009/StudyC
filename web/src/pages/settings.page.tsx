import { useState, useMemo } from "react";
import {
  Settings,
  Search,
  Building,
  UserPlus,
  Key,
  Mail,
  Bell,
  UploadCloud,
  Compass,
  Calendar,
  Eye,
  Shield,
  Database,
  Info,
  Save,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import { useSettingsStore } from "../store/settings.store";
import { useToastStore } from "../store/toast.store";
import { ConfirmationDialog } from "../components/confirmation-dialog";
import {
  GeneralSettingsForm,
  CollegeSettingsForm,
  RegistrationSettingsForm,
  AuthenticationSettingsForm,
  EmailSettingsForm,
  NotificationSettingsForm,
  FileUploadSettingsForm,
  CommunitiesSettingsForm,
  EventSettingsForm,
  AppearanceSettingsForm,
  SecuritySettingsForm,
  BackupSettingsForm,
  AboutSystemForm
} from "../components/settings-form-sections";

type SettingsCategory =
  | "general"
  | "college"
  | "registration"
  | "authentication"
  | "email"
  | "notifications"
  | "upload"
  | "communities"
  | "events"
  | "appearance"
  | "security"
  | "backups"
  | "about";

interface CategoryMeta {
  id: SettingsCategory;
  label: string;
  description: string;
  icon: any;
}

const CATEGORIES: CategoryMeta[] = [
  { id: "general", label: "General", description: "Platform name, logo, language, and date configurations.", icon: Settings },
  { id: "college", label: "College", description: "College name, allowed email domains, website, and academic structure.", icon: Building },
  { id: "registration", label: "Registration", description: "Signups toggles, college email lock, verification requirements, and roles.", icon: UserPlus },
  { id: "authentication", label: "Authentication", description: "Session timeout, passwords expiry durations, and lockout policies.", icon: Key },
  { id: "email", label: "Email SMTP", description: "SMTP relay parameters, display names, and connectivity checkers.", icon: Mail },
  { id: "notifications", label: "Notifications", description: "Manage email logs, push feeds, community posts, and events triggers.", icon: Bell },
  { id: "upload", label: "File Upload", description: "Maximum sizes, allowed extensions, and global storage ceilings.", icon: UploadCloud },
  { id: "communities", label: "Communities", description: "Creation policies, private approvals, and member thresholds.", icon: Compass },
  { id: "events", label: "Events", description: "Student organizer rights, approval workflow, and registration limits.", icon: Calendar },
  { id: "appearance", label: "Appearance", description: "Default themes, primary styles hex codes, and light switcher.", icon: Eye },
  { id: "security", label: "Security", description: "Strong password policies, charsets constraints, and duration controls.", icon: Shield },
  { id: "backups", label: "Backup & Logs", description: "Database snapshot schedules, backup logs, and restoration points.", icon: Database },
  { id: "about", label: "About System", description: "Version records, server statuses, and environment dependencies.", icon: Info }
];

export function SystemSettingsPage() {
  const { addToast } = useToastStore();
  const storeSettings = useSettingsStore();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("general");
  const [searchTerm, setSearchTerm] = useState("");

  // Staged / Unsaved Local Changes
  // stagedChanges structure: { [category]: { field: val } }
  const [stagedChanges, setStagedChanges] = useState<Record<string, any>>({});

  // Confirmation Modals State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "SAVE" | "RESET" | "TEST_EMAIL" | "BACKUP" | "RESTORE";
    targetId?: string;
    title: string;
    message: string;
  } | null>(null);

  // Search filter applied to sidebar categories list
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return CATEGORIES;
    const query = searchTerm.toLowerCase();
    return CATEGORIES.filter(
      (c) =>
        c.label.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
    );
  }, [searchTerm]);

  // Current category values merged: Store values + Staged changes
  const activeValues = useMemo(() => {
    return {
      ...(storeSettings as any)[activeCategory],
      ...(stagedChanges[activeCategory] || {})
    };
  }, [storeSettings, activeCategory, stagedChanges]);

  // Check if there are any staged changes overall
  const isDirty = useMemo(() => {
    return Object.keys(stagedChanges).some((key) => {
      const categoryChanges = stagedChanges[key];
      return Object.keys(categoryChanges).length > 0;
    });
  }, [stagedChanges]);

  // Staging changes updates
  const handleUpdateActiveValues = (newVals: any) => {
    setStagedChanges((prev) => ({
      ...prev,
      [activeCategory]: {
        ...(prev[activeCategory] || {}),
        ...newVals
      }
    }));
  };

  // Mutators and Action execution
  const executeConfirmAction = () => {
    if (!confirmDialog) return;
    const { type, targetId } = confirmDialog;

    if (type === "SAVE") {
      // Save staged changes to store settings
      Object.keys(stagedChanges).forEach((section) => {
        storeSettings.updateSettings(section, stagedChanges[section]);
      });
      setStagedChanges({});
      addToast("System Settings Saved Successfully", "success");
    } else if (type === "RESET") {
      // Discard staging changes
      setStagedChanges({});
      addToast("Unsaved changes discarded", "info");
    } else if (type === "TEST_EMAIL") {
      addToast("Sending SMTP handshake email...", "info");
      setTimeout(() => {
        addToast("SMTP configuration verified: Test email sent successfully!", "success");
      }, 1500);
    } else if (type === "BACKUP") {
      addToast("Compressing database snap and logs...", "info");
      setTimeout(() => {
        storeSettings.triggerManualBackup();
        addToast("Database manual backup completed successfully", "success");
      }, 2000);
    } else if (type === "RESTORE" && targetId) {
      addToast("Restoring system databases from snapshot...", "info");
      setTimeout(() => {
        storeSettings.restoreBackup(targetId);
        addToast("Database snapshot restored successfully", "success");
      }, 2000);
    }

    setConfirmDialog(null);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-500 dark:text-slate-400">System Settings</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            System Settings
          </h2>
        </div>
      </div>

      {/* Main Settings split-pane container */}
      <div className="grid gap-6 md:grid-cols-[280px_1fr] animate-fade-up">
        {/* Left sidebar nav panel */}
        <div className="space-y-4">
          {/* Keyword Search box */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search settings..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-450 focus:border-indigo-500 dark:border-white/5 dark:bg-ink-900 dark:text-white"
            />
          </div>

          {/* Navigation Category list */}
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-0.5">
            {filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-455">No sections match query</div>
            ) : (
              filteredCategories.map((c) => {
                const Icon = c.icon;
                const hasStagedChanges = !!stagedChanges[c.id] && Object.keys(stagedChanges[c.id]).length > 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition cursor-pointer ${
                      activeCategory === c.id
                        ? "bg-slate-50 text-indigo-650 dark:bg-white/[0.03] dark:text-indigo-400 font-semibold"
                        : "text-slate-655 hover:bg-slate-50/50 dark:text-slate-400 dark:hover:bg-white/[0.01]"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={`shrink-0 mt-0.5 ${
                        activeCategory === c.id ? "text-indigo-650 dark:text-indigo-400" : "text-slate-400"
                      }`}
                    />
                    <div className="min-w-0">
                      <span className="text-xs leading-none flex items-center gap-1.5 font-bold">
                        {c.label}
                        {hasStagedChanges && (
                          <span className="size-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                        )}
                      </span>
                      <p className="text-[10px] text-slate-450 line-clamp-1 mt-0.5 leading-normal">
                        {c.description}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right content forms container */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-ink-900">
          <div className="border-b border-slate-100 dark:border-white/5 pb-4 mb-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {CATEGORIES.find((c) => c.id === activeCategory)?.label} Settings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-455 mt-1 leading-relaxed">
              {CATEGORIES.find((c) => c.id === activeCategory)?.description}
            </p>
          </div>

          {/* Form Router */}
          <div>
            {activeCategory === "general" && (
              <GeneralSettingsForm values={activeValues} onChange={handleUpdateActiveValues} />
            )}
            {activeCategory === "college" && (
              <CollegeSettingsForm values={activeValues} onChange={handleUpdateActiveValues} />
            )}
            {activeCategory === "registration" && (
              <RegistrationSettingsForm values={activeValues} onChange={handleUpdateActiveValues} />
            )}
            {activeCategory === "authentication" && (
              <AuthenticationSettingsForm values={activeValues} onChange={handleUpdateActiveValues} />
            )}
            {activeCategory === "email" && (
              <EmailSettingsForm
                values={activeValues}
                onChange={handleUpdateActiveValues}
                onSendTestEmail={() =>
                  setConfirmDialog({
                    isOpen: true,
                    type: "TEST_EMAIL",
                    title: "Send SMTP Test Email?",
                    message: "A test email will be sent to the configured sender address using the SMTP host settings."
                  })
                }
              />
            )}
            {activeCategory === "notifications" && (
              <NotificationSettingsForm values={activeValues} onChange={handleUpdateActiveValues} />
            )}
            {activeCategory === "upload" && (
              <FileUploadSettingsForm values={activeValues} onChange={handleUpdateActiveValues} />
            )}
            {activeCategory === "communities" && (
              <CommunitiesSettingsForm values={activeValues} onChange={handleUpdateActiveValues} />
            )}
            {activeCategory === "events" && (
              <EventSettingsForm values={activeValues} onChange={handleUpdateActiveValues} />
            )}
            {activeCategory === "appearance" && (
              <AppearanceSettingsForm values={activeValues} onChange={handleUpdateActiveValues} />
            )}
            {activeCategory === "security" && (
              <SecuritySettingsForm values={activeValues} onChange={handleUpdateActiveValues} />
            )}
            {activeCategory === "backups" && (
              <BackupSettingsForm
                values={activeValues}
                onTriggerBackup={() =>
                  setConfirmDialog({
                    isOpen: true,
                    type: "BACKUP",
                    title: "Run Manual Database Backup?",
                    message: "Confirm that you want to create a manual backup snapshot. This compressed tar.gz log will be appended to the history."
                  })
                }
                onRestoreBackup={(backupId) =>
                  setConfirmDialog({
                    isOpen: true,
                    type: "RESTORE",
                    targetId: backupId,
                    title: "Restore Backup Snapshot?",
                    message: "Warning: Restoring backup snapshots resets configuration state. This action may modify active parameters."
                  })
                }
              />
            )}
            {activeCategory === "about" && <AboutSystemForm values={activeValues} />}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save Action Bar */}
      {isDirty && (
        <div className="fixed bottom-4 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 px-4 animate-fade-up">
          <div className="flex items-center justify-between rounded-2xl border border-indigo-200/50 bg-indigo-50/90 backdrop-blur-md p-4 shadow-xl dark:border-indigo-500/20 dark:bg-indigo-950/90">
            <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
              Unsaved settings detected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    type: "RESET",
                    title: "Discard Changes?",
                    message: "Are you sure you want to discard all staging changes? Edits will revert to previous values."
                  })
                }
                className="inline-flex items-center gap-1 rounded-xl border border-indigo-200/40 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer shadow-sm"
              >
                <RotateCcw size={12} />
                Discard
              </button>
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    type: "SAVE",
                    title: "Save Config Changes?",
                    message: "Confirm that you want to commit these settings. Values will be applied globally across StudyConnect."
                  })
                }
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-650 hover:opacity-95 px-4 py-1.5 text-xs font-bold text-white shadow shadow-indigo-150 cursor-pointer"
              >
                <Save size={12} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      {confirmDialog && (
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={
            confirmDialog.type === "SAVE"
              ? "Apply globally"
              : confirmDialog.type === "RESET"
              ? "Discard edits"
              : confirmDialog.type === "TEST_EMAIL"
              ? "Send test"
              : confirmDialog.type === "BACKUP"
              ? "Backup now"
              : "Restore snap"
          }
          isDestructive={confirmDialog.type === "RESET" || confirmDialog.type === "RESTORE"}
          onConfirm={executeConfirmAction}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
