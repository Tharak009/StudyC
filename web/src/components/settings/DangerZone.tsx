import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Trash2,
  PauseCircle,
  X,
  ShieldAlert
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useToastStore } from "../../store/toast.store";
import { useNavigate } from "react-router";

export function DangerZone() {
  const logout = useAuthStore((state) => state.logout);
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");

  const handleDeleteAccount = async () => {
    if (confirmInput !== "DELETE MY ACCOUNT") {
      addToast("Please type the exact confirmation phrase.", "warning");
      return;
    }
    setDeleteModalOpen(false);
    await logout();
    addToast("Account deactivation and data purge scheduled.", "info");
    navigate("/login");
  };

  return (
    <div className="p-6 rounded-3xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 backdrop-blur-xl space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-rose-500/20">
        <AlertTriangle size={16} className="text-rose-500" />
        <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">
          Account Danger Zone
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Request Permanent Account Erasure
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-lg leading-relaxed">
            Permanently purges your student authentication credentials, private messages, and personal vault bookmarks. Shared public academic notes will remain attributed or anonymized for batch continuity.
          </p>
        </div>

        <button
          onClick={() => setDeleteModalOpen(true)}
          className="px-4 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white text-xs font-bold transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          Delete Account
        </button>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl border border-rose-500/40 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl space-y-4"
            >
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 text-rose-500">
                <ShieldAlert size={22} />
                <h3 className="text-base font-bold">Confirm Permanent Deletion</h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This action is <strong>irreversible</strong>. To confirm, type{" "}
                <code className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold text-[11px]">
                  DELETE MY ACCOUNT
                </code>{" "}
                below:
              </p>

              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type confirmation phrase..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={confirmInput !== "DELETE MY ACCOUNT"}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Permanently Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default DangerZone;
