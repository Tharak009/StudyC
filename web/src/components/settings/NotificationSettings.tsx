import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  MessageSquare,
  BookOpen,
  Calendar,
  Volume2,
  Check
} from "lucide-react";
import { useToastStore } from "../../store/toast.store";

const defaultNotifState = {
  directMessages: true,
  roomMentions: true,
  voiceRoomInvites: true,
  resourceVaultDrops: true,
  deadlineReminders24h: true,
  deadlineReminders1h: true,
  hackathonAlerts: false
};

function loadStoredNotifs(): typeof defaultNotifState {
  try {
    const raw = localStorage.getItem("studyconnect_notification_settings");
    return raw ? { ...defaultNotifState, ...JSON.parse(raw) } : defaultNotifState;
  } catch {
    return defaultNotifState;
  }
}

export function NotificationSettings() {
  const { addToast } = useToastStore();

  const [notifState, setNotifState] = useState<typeof defaultNotifState>(loadStoredNotifs);

  const toggle = (key: keyof typeof notifState) => {
    setNotifState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("studyconnect_notification_settings", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSave = () => {
    try {
      localStorage.setItem("studyconnect_notification_settings", JSON.stringify(notifState));
    } catch {}
    addToast("Notification preferences updated successfully!", "success");
  };

  const Switch = ({
    checked,
    onChange
  }: {
    checked: boolean;
    onChange: () => void;
  }) => (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-[#1E90FF]" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      
      {/* ── 1. Direct Messages & Mentions ─────────────────────────────── */}
      <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
          <MessageSquare size={16} className="text-[#1E90FF]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
            Chat & Community Notifications
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Direct Message Alerts
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Instant desktop & in-app alerts when classmates send you 1-on-1 direct messages.
              </p>
            </div>
            <Switch
              checked={notifState.directMessages}
              onChange={() => toggle("directMessages")}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/50">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Study Room Mentions (@you)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Receive notifications when peers tag your roll number or name in subject channels.
              </p>
            </div>
            <Switch
              checked={notifState.roomMentions}
              onChange={() => toggle("roomMentions")}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/50">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Voice Study Stage Invites
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Alerts when a classmate invites you to join an active audio cram session.
              </p>
            </div>
            <Switch
              checked={notifState.voiceRoomInvites}
              onChange={() => toggle("voiceRoomInvites")}
            />
          </div>
        </div>
      </div>

      {/* ── 2. Academic Vault & Deadlines ─────────────────────────────── */}
      <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
          <BookOpen size={16} className="text-[#1E90FF]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
            Academic Vault & Campus Deadlines
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Enrolled Subject Resource Drops
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Notify me when new lecture notes, PPTs, or solved papers are uploaded in my courses.
              </p>
            </div>
            <Switch
              checked={notifState.resourceVaultDrops}
              onChange={() => toggle("resourceVaultDrops")}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/50">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                24-Hour Assignment Countdown Alert
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Reminder alert exactly 24 hours before a lab assignment or homework due date.
              </p>
            </div>
            <Switch
              checked={notifState.deadlineReminders24h}
              onChange={() => toggle("deadlineReminders24h")}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/50">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                1-Hour Urgent Submission Alert
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                High-priority reminder 60 minutes prior to final deadline submission cutoffs.
              </p>
            </div>
            <Switch
              checked={notifState.deadlineReminders1h}
              onChange={() => toggle("deadlineReminders1h")}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 cursor-pointer"
        >
          <Check size={14} />
          <span>Save Preferences</span>
        </button>
      </div>

    </div>
  );
}

export default NotificationSettings;
