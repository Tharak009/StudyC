import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Unlock,
  X,
  AlertCircle,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

interface LockChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLocked: boolean;
  currentReason?: string;
  targetTitle: string;
  onConfirm: (isLocked: boolean, reason?: string) => void;
}

const PRESET_REASONS = [
  "Final Exam in Progress - Academic Focus Only",
  "Course Completed / Archived for Semester",
  "Maintenance / Cooldown Period",
  "Guest Lecture / Quiet Study Session"
];

export const LockChatModal: React.FC<LockChatModalProps> = ({
  isOpen,
  onClose,
  isLocked,
  currentReason = "",
  targetTitle,
  onConfirm
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>("");
  const [useCustom, setUseCustom] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isLocked) {
      // Unlocking
      onConfirm(false);
    } else {
      // Locking
      const finalReason = useCustom ? customReason.trim() || PRESET_REASONS[0] : selectedPreset;
      onConfirm(true, finalReason);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="relative w-full max-w-md rounded-2xl bg-[#0F1A30] border border-[#162544] shadow-2xl shadow-black/80 overflow-hidden text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#162544] bg-[#0A1120]">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl ${
                  isLocked
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {isLocked ? <Unlock size={18} /> : <Lock size={18} />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  {isLocked ? "Unlock Channel" : "Lock Channel"}
                </h3>
                <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                  {targetTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {isLocked ? (
              /* Unlock Confirmation State */
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 leading-relaxed">
                    <p className="font-bold text-emerald-400 mb-1">
                      Ready to resume open communication
                    </p>
                    <p>
                      Unlocking <span className="font-semibold text-white">{targetTitle}</span> will allow all verified members to send messages, share code, and post attachments again.
                    </p>
                  </div>
                </div>

                {currentReason && (
                  <div className="text-xs text-slate-400 bg-[#080D1A] p-3 rounded-xl border border-[#162544]">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                      Current Lock Reason
                    </span>
                    <span className="italic text-slate-300">"{currentReason}"</span>
                  </div>
                )}
              </div>
            ) : (
              /* Lock Configuration State */
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 leading-relaxed">
                  <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">Read-Only Mode: </span>
                    Regular students will not be able to post messages. An in-feed banner will inform students of the lock reason.
                  </div>
                </div>

                {/* Presets */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    Select Lock Reason
                  </label>
                  <div className="space-y-1.5">
                    {PRESET_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => {
                          setSelectedPreset(reason);
                          setUseCustom(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                          !useCustom && selectedPreset === reason
                            ? "bg-[#1E90FF]/20 border border-[#1E90FF]/50 text-white font-semibold"
                            : "bg-[#162544]/50 border border-slate-700/50 text-slate-300 hover:bg-[#162544]"
                        }`}
                      >
                        <span className="truncate pr-2">{reason}</span>
                        {!useCustom && selectedPreset === reason && (
                          <span className="w-2 h-2 rounded-full bg-[#1E90FF] shrink-0" />
                        )}
                      </button>
                    ))}

                    {/* Custom reason toggle */}
                    <button
                      type="button"
                      onClick={() => setUseCustom(true)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                        useCustom
                          ? "bg-[#1E90FF]/20 border border-[#1E90FF]/50 text-white font-semibold"
                          : "bg-[#162544]/50 border border-slate-700/50 text-slate-300 hover:bg-[#162544]"
                      }`}
                    >
                      <span>Custom Reason...</span>
                      {useCustom && (
                        <span className="w-2 h-2 rounded-full bg-[#1E90FF] shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Custom text input */}
                {useCustom && (
                  <div>
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="e.g. Lab examination in progress until 4 PM"
                      autoFocus
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#080D1A] border border-slate-700 focus:border-[#1E90FF] focus:outline-none text-white placeholder:text-slate-500 transition-colors"
                    />
                  </div>
                )}

                {/* Moderator Override note */}
                <div className="flex items-center gap-2 text-[11px] text-sky-400 bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20">
                  <ShieldCheck size={14} className="shrink-0 text-sky-400" />
                  <span>Faculty and moderators retain Admin Override to post updates.</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 py-3 border-t border-[#162544] bg-[#0A1120] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                isLocked
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                  : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30"
              }`}
            >
              {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
              <span>{isLocked ? "Confirm Unlock" : "Lock Channel"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default LockChatModal;
