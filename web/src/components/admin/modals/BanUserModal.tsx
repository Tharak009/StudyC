import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Ban,
  X,
  AlertOctagon,
  Trash2,
  ShieldAlert,
  UserX
} from "lucide-react";
import type { ManagedUser } from "../tabs/UserManagementTab";
import { useToastStore } from "../../../store/toast.store";

interface BanUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ManagedUser | null;
  onConfirmBan: (userId: string, reason: string) => void;
}

export function BanUserModal({
  isOpen,
  onClose,
  user,
  onConfirmBan
}: BanUserModalProps) {
  const { addToast } = useToastStore();

  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [banReason, setBanReason] = useState("Severe Campus Code of Conduct Violation");

  if (!isOpen || !user) return null;

  const isConfirmed = confirmPhrase.trim().toUpperCase() === "CONFIRM BAN";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) {
      addToast('Please type the exact phrase "CONFIRM BAN".', "warning");
      return;
    }

    onConfirmBan(user.id, banReason);
    addToast(`Permanently banned ${user.fullName} and revoked institutional token.`, "error");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg rounded-3xl border border-rose-500/40 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl space-y-4"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 text-rose-500">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30">
            <UserX size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Permanent Institutional Ban
            </h3>
            <p className="text-xs text-rose-500 tabular-nums font-medium">
              Target: {user.fullName} ({user.rollNumber} • {user.email})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          
          {/* Cascading Cleanup Notice */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
              <ShieldAlert size={16} />
              <span>Cascading Permanent Cleanup Actions:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] opacity-90">
              <li>Immediate revocation of JWT access & refresh tokens across all devices.</li>
              <li>Permanent block on email <code>{user.email}</code> from future logins.</li>
              <li>Removal of student from all department & batch study circles.</li>
              <li>Flagged content scrubbed from public channel feeds.</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Formal Ban Justification
            </label>
            <input
              type="text"
              required
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g. Distributed malicious links and repeated hate speech"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Safety Phrase Confirmation: Type <span className="text-rose-500 font-bold tracking-wide">CONFIRM BAN</span>
            </label>
            <input
              type="text"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="CONFIRM BAN"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 uppercase"
            />
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
              disabled={!isConfirmed}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Ban size={14} />
              <span>Execute Permanent Ban</span>
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}

export default BanUserModal;
