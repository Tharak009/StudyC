import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  AlertTriangle,
  X,
  Clock,
  ShieldAlert,
  Info
} from "lucide-react";

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  createdAt?: string;
  isAuthor: boolean;
  isModeratorOrAdmin: boolean;
  messageSnippet?: string;
}

export const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  isOpen,
  onClose,
  onDeleteForMe,
  onDeleteForEveryone,
  createdAt,
  isAuthor,
  isModeratorOrAdmin,
  messageSnippet
}) => {
  // Calculate remaining 24h window for author
  const { canDeleteForEveryone, timeRemainingStr, isExpired } = useMemo(() => {
    if (isModeratorOrAdmin) {
      return { canDeleteForEveryone: true, timeRemainingStr: "Moderator Override Active", isExpired: false };
    }
    if (!isAuthor || !createdAt) {
      return { canDeleteForEveryone: false, timeRemainingStr: "Author Only", isExpired: true };
    }

    const createdTime = new Date(createdAt).getTime();
    const now = Date.now();
    const diffMs = 24 * 60 * 60 * 1000 - (now - createdTime);

    if (diffMs <= 0) {
      return { canDeleteForEveryone: false, timeRemainingStr: "24h window expired", isExpired: true };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      canDeleteForEveryone: true,
      timeRemainingStr: `${hours}h ${minutes}m remaining`,
      isExpired: false
    };
  }, [createdAt, isAuthor, isModeratorOrAdmin]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="relative w-full max-w-md rounded-2xl bg-[#0F1A30] border border-[#162544] shadow-2xl shadow-black/80 overflow-hidden text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#162544] bg-[#0A1120]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Delete Message</h3>
                <p className="text-[11px] text-slate-400">Choose deletion scope</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Snippet preview if available */}
          {messageSnippet && (
            <div className="mx-5 mt-4 p-3 rounded-xl bg-[#080D1A] border border-[#162544] text-xs text-slate-300 italic truncate max-h-16">
              "{messageSnippet}"
            </div>
          )}

          {/* Body Options */}
          <div className="p-5 space-y-3">
            {/* Option 1: Delete For Me */}
            <button
              onClick={() => {
                onDeleteForMe();
                onClose();
              }}
              className="w-full flex items-start gap-3.5 p-3.5 rounded-xl bg-[#162544]/40 hover:bg-[#162544] border border-slate-700/50 hover:border-slate-500 transition-all text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-slate-800 text-slate-300 group-hover:text-white shrink-0 mt-0.5">
                <Trash2 size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                    Delete for me
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    Local
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug mt-1">
                  Remove this message only from your chat screen. Other participants will still see it.
                </p>
              </div>
            </button>

            {/* Option 2: Delete For Everyone */}
            <div
              className={`w-full rounded-xl border transition-all ${
                canDeleteForEveryone
                  ? "bg-rose-950/20 hover:bg-rose-950/30 border-rose-900/50 hover:border-rose-700/80 cursor-pointer"
                  : "bg-slate-900/50 border-slate-800 opacity-60 cursor-not-allowed"
              }`}
            >
              <button
                disabled={!canDeleteForEveryone}
                onClick={() => {
                  if (canDeleteForEveryone) {
                    onDeleteForEveryone();
                    onClose();
                  }
                }}
                className="w-full flex items-start gap-3.5 p-3.5 text-left disabled:cursor-not-allowed"
              >
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    canDeleteForEveryone
                      ? "bg-rose-500/20 text-rose-400"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  <AlertTriangle size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        canDeleteForEveryone ? "text-rose-300" : "text-slate-400"
                      }`}
                    >
                      Delete for everyone
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        canDeleteForEveryone
                          ? "bg-rose-900/40 text-rose-300"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      Authoritative
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug mt-1">
                    Permanently wipe content and attachments for all members. A tombstone card will indicate the deletion.
                  </p>

                  {/* Window time indicator */}
                  <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                    {isModeratorOrAdmin ? (
                      <span className="flex items-center gap-1 text-sky-400 font-semibold">
                        <ShieldAlert size={12} />
                        Moderator privilege: bypasses 24h limit
                      </span>
                    ) : (
                      <span
                        className={`flex items-center gap-1 ${
                          isExpired ? "text-amber-400" : "text-slate-400"
                        }`}
                      >
                        <Clock size={12} />
                        {timeRemainingStr}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* Non-author note if cannot delete for everyone */}
            {!isAuthor && !isModeratorOrAdmin && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                <Info size={13} className="shrink-0" />
                <span>Only the message author or community moderators can delete for everyone.</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#162544] bg-[#0A1120] flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default DeleteMessageModal;
