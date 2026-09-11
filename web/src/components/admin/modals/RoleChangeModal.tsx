import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
  Check,
  Sparkles,
  Info
} from "lucide-react";
import type { ManagedUser } from "../tabs/UserManagementTab";
import { useToastStore } from "../../../store/toast.store";

interface RoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ManagedUser | null;
  onSaveRole: (userId: string, newRole: "STUDENT" | "MODERATOR" | "ADMIN") => void;
}

export function RoleChangeModal({
  isOpen,
  onClose,
  user,
  onSaveRole
}: RoleChangeModalProps) {
  const { addToast } = useToastStore();
  const [selectedRole, setSelectedRole] = useState<"STUDENT" | "MODERATOR" | "ADMIN">(
    user?.role || "STUDENT"
  );

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRole(user.id, selectedRole);
    addToast(`Promoted ${user.fullName} to ${selectedRole} tier.`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl space-y-4"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-sky-400 text-white shadow-md">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Modify Account Role & Permissions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Target: {user.fullName} ({user.rollNumber})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          
          {/* Role Radio Options */}
          <div className="space-y-2.5">
            <label
              onClick={() => setSelectedRole("STUDENT")}
              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedRole === "STUDENT"
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-950/25 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#162544]/40"
              }`}
            >
              <input
                type="radio"
                name="role"
                checked={selectedRole === "STUDENT"}
                onChange={() => setSelectedRole("STUDENT")}
                className="mt-0.5"
              />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>STUDENT</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Default Access)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Standard campus access: Chat in enrolled batch channels, drop into voice stages, download vault notes, and participate in hackathons.
                </p>
              </div>
            </label>

            <label
              onClick={() => setSelectedRole("MODERATOR")}
              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedRole === "MODERATOR"
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-950/25 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#162544]/40"
              }`}
            >
              <input
                type="radio"
                name="role"
                checked={selectedRole === "MODERATOR"}
                onChange={() => setSelectedRole("MODERATOR")}
                className="mt-0.5"
              />
              <div>
                <h4 className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <span>MODERATOR / TA</span>
                  <span className="text-[10px] text-sky-400 font-normal">(Elevated Review)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Department TA privileges: Review flagged messages, mute abusive users in active voice stages, and verify uploaded course solutions.
                </p>
              </div>
            </label>

            <label
              onClick={() => setSelectedRole("ADMIN")}
              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedRole === "ADMIN"
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950/25 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#162544]/40"
              }`}
            >
              <input
                type="radio"
                name="role"
                checked={selectedRole === "ADMIN"}
                onChange={() => setSelectedRole("ADMIN")}
                className="mt-0.5"
              />
              <div>
                <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <span>ADMINISTRATOR</span>
                  <span className="text-[10px] text-purple-400 font-normal">(Full Governance)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Full administrative authority: Campus-wide socket broadcasts, user timeouts/bans, 90-day security audit inspection, and platform config.
                </p>
              </div>
            </label>
          </div>

          {/* Notice Callout */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200/70 dark:border-slate-800/70 flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Info size={14} className="text-sky-500 shrink-0 mt-0.5" />
            <span>
              All role changes are cryptographically recorded in the <strong>90-Day Audit Trail</strong> with your Admin ID and timestamp.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#38BDF8] text-white text-xs font-bold shadow-md shadow-[#2563EB]/25 cursor-pointer"
            >
              <Check size={14} />
              <span>Confirm Role Update</span>
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}

export default RoleChangeModal;
