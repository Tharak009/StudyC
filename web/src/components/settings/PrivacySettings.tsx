import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Shield,
  CheckCheck,
  Users,
  Check
} from "lucide-react";
import { useToastStore } from "../../store/toast.store";

const defaultPrivacy = {
  showOnlineStatus: true,
  readReceipts: true,
  connectionScope: "all" as "all" | "dept_only"
};

function loadStoredPrivacy(): typeof defaultPrivacy {
  try {
    const raw = localStorage.getItem("studyconnect_privacy_settings");
    return raw ? { ...defaultPrivacy, ...JSON.parse(raw) } : defaultPrivacy;
  } catch {
    return defaultPrivacy;
  }
}

export function PrivacySettings() {
  const { addToast } = useToastStore();

  const [privacy, setPrivacy] = useState<typeof defaultPrivacy>(loadStoredPrivacy);

  const updatePrivacy = (partial: Partial<typeof defaultPrivacy>) => {
    setPrivacy((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem("studyconnect_privacy_settings", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSave = () => {
    try {
      localStorage.setItem("studyconnect_privacy_settings", JSON.stringify(privacy));
    } catch {}
    addToast("Privacy settings saved successfully!", "success");
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
      
      {/* ── Campus Presence & Visibility ──────────────────────────────── */}
      <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
          <Eye size={16} className="text-[#1E90FF]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
            Real-Time Presence & Read Receipts
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Display "Active Now" Status
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Shows a green presence dot to classmates in shared study circles and voice stages.
              </p>
            </div>
            <Switch
              checked={privacy.showOnlineStatus}
              onChange={() => updatePrivacy({ showOnlineStatus: !privacy.showOnlineStatus })}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/50">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>1-on-1 Direct Message Read Receipts</span>
                <CheckCheck size={14} className="text-[#1E90FF]" />
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Allows classmates to see glowing double checkmarks when you have read their messages.
              </p>
            </div>
            <Switch
              checked={privacy.readReceipts}
              onChange={() => updatePrivacy({ readReceipts: !privacy.readReceipts })}
            />
          </div>
        </div>
      </div>

      {/* ── Peer Connection Permissions ───────────────────────────────── */}
      <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
          <Users size={16} className="text-[#1E90FF]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
            Peer Discovery & Connection Requests
          </h3>
        </div>

        <div className="space-y-3">
          <label
            onClick={() => updatePrivacy({ connectionScope: "all" })}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              privacy.connectionScope === "all"
                ? "border-[#1E90FF] bg-[#1E90FF]/5 dark:bg-[#1E90FF]/10"
                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#080D1A]"
            }`}
          >
            <input
              type="radio"
              name="scope"
              checked={privacy.connectionScope === "all"}
              onChange={() => updatePrivacy({ connectionScope: "all" })}
              className="mt-0.5"
            />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Allow connection invitations from any verified .edu student
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Classmates across all academic engineering disciplines can search and message you.
              </p>
            </div>
          </label>

          <label
            onClick={() => updatePrivacy({ connectionScope: "dept_only" })}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              privacy.connectionScope === "dept_only"
                ? "border-[#1E90FF] bg-[#1E90FF]/5 dark:bg-[#1E90FF]/10"
                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#080D1A]"
            }`}
          >
            <input
              type="radio"
              name="scope"
              checked={privacy.connectionScope === "dept_only"}
              onChange={() => updatePrivacy({ connectionScope: "dept_only" })}
              className="mt-0.5"
            />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Strict: Same Department & Graduation Batch Only
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Restricts incoming DM invitations strictly to students in your department.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 cursor-pointer"
        >
          <Check size={14} />
          <span>Save Privacy Rules</span>
        </button>
      </div>

    </div>
  );
}

export default PrivacySettings;
