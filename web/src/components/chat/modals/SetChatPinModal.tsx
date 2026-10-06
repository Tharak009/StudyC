import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, X, Check, AlertCircle, ShieldCheck } from "lucide-react";
import { useChatPrivacyStore } from "../../../store/chat-privacy.store";
import { useToastStore } from "../../../store/toast.store";

interface SetChatPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPinSet?: () => void;
}

export function SetChatPinModal({ isOpen, onClose, onPinSet }: SetChatPinModalProps) {
  const [pin, setPinState] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setPin = useChatPrivacyStore((state) => state.setPin);
  const hasPin = useChatPrivacyStore((state) => state.hasPin);
  const { addToast } = useToastStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = pin.trim().replace(/\D/g, "");
    const cleanConfirm = confirmPin.trim().replace(/\D/g, "");

    if (cleanPin.length !== 4) {
      setError("PIN must be exactly 4 numeric digits");
      return;
    }

    if (cleanPin !== cleanConfirm) {
      setError("PINs do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);
    try {
      await setPin(cleanPin);
      addToast(hasPin() ? "Chat Lock PIN updated successfully" : "Chat Lock PIN created successfully", "success");
      setPinState("");
      setConfirmPin("");
      onPinSet?.();
      onClose();
    } catch {
      setError("Failed to save PIN. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 select-none animate-in fade-in duration-150"
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#0F1A30] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100"
        >

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0A1120]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#1E90FF]">
                <KeyRound size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {hasPin() ? "Change Chat Lock PIN" : "Set Chat Lock PIN"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  4-digit security code for private chats
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Create 4-digit PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPinState(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setError(null);
                }}
                placeholder="••••"
                autoFocus
                className="w-full text-center text-xl font-mono tracking-widest py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#152238] border border-slate-300 dark:border-slate-700 focus:border-[#1E90FF] focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Confirm 4-digit PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setError(null);
                }}
                placeholder="••••"
                className="w-full text-center text-xl font-mono tracking-widest py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#152238] border border-slate-300 dark:border-slate-700 focus:border-[#1E90FF] focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/40 text-[11px] text-sky-700 dark:text-sky-300">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-[#1E90FF]" />
              <span>
                Your PIN is hashed client-side. Locked conversations cannot be viewed without this PIN.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pin.length !== 4 || confirmPin.length !== 4 || isSubmitting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#38BDF8] hover:from-[#187bcd] hover:to-[#0284c7] text-white text-xs font-bold shadow-md shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isSubmitting ? "Saving..." : "Save PIN"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
