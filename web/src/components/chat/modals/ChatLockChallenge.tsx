import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, KeyRound, AlertCircle, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import { useChatPrivacyStore } from "../../../store/chat-privacy.store";
import { useToastStore } from "../../../store/toast.store";

interface ChatLockChallengeProps {
  channelId: string;
  conversationTitle?: string;
  onUnlocked: () => void;
  onOpenSetPin?: () => void;
  onBack?: () => void;
}

export function ChatLockChallenge({
  channelId,
  conversationTitle = "Protected Conversation",
  onUnlocked,
  onOpenSetPin,
  onBack
}: ChatLockChallengeProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  const unlockForSession = useChatPrivacyStore((state) => state.unlockForSession);
  const hasPin = useChatPrivacyStore((state) => state.hasPin);
  const { addToast } = useToastStore();

  useEffect(() => {
    // Focus first input on mount
    inputRefs[0].current?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Keep only numeric characters
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    const digit = clean.slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(null);

    // Auto-advance to next box
    if (index < 3 && digit) {
      inputRefs[index + 1].current?.focus();
    }

    // If 4 digits filled, submit immediately
    if (index === 3 && digit) {
      const fullPin = [...next.slice(0, 3), digit].join("");
      handleVerify(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === "Enter") {
      const fullPin = digits.join("");
      if (fullPin.length === 4) {
        handleVerify(fullPin);
      }
    }
  };

  const handleVerify = async (pinToTest: string) => {
    if (pinToTest.length !== 4) {
      setError("Please enter all 4 digits");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const success = await unlockForSession(channelId, pinToTest);
      if (success) {
        addToast("Conversation unlocked for this session", "success");
        onUnlocked();
      } else {
        setError("Incorrect PIN. Please try again.");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setDigits(["", "", "", ""]);
        inputRefs[0].current?.focus();
      }
    } catch {
      setError("Failed to verify PIN");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full min-h-0 flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-[#0B1220] select-none">
      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0F1A30] border border-slate-200 dark:border-slate-800/80 shadow-2xl p-6 sm:p-8 text-center flex flex-col items-center"
      >
        {/* Lock Icon with Glow */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-[#1E90FF] border border-sky-200 dark:border-sky-800/50 flex items-center justify-center shadow-inner">
            <Lock size={30} className="stroke-[2.2]" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
            <ShieldCheck size={14} />
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Conversation Locked
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[260px] leading-relaxed">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {conversationTitle}
          </span>{" "}
          is secured with Chat Lock. Enter your 4-digit PIN to access messages.
        </p>

        {/* 4 Digit Boxes */}
        <div className="flex items-center justify-center gap-3 my-6">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={inputRefs[idx]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-12 h-14 text-center text-xl font-mono font-bold rounded-2xl bg-slate-100 dark:bg-[#152238] border border-slate-300 dark:border-slate-700/80 focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/20 text-slate-900 dark:text-white outline-none transition-all"
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium mb-4">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={() => handleVerify(digits.join(""))}
          disabled={digits.join("").length !== 4 || isVerifying}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#38BDF8] hover:from-[#187bcd] hover:to-[#0284c7] text-white text-xs font-bold shadow-md shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isVerifying ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <>
              <span>Unlock Conversation</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>

        {/* Reset / Change PIN Option */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 w-full flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <span>Need to change your PIN?</span>
          <button
            onClick={onOpenSetPin}
            className="text-[#1E90FF] hover:underline font-semibold cursor-pointer"
          >
            Reset PIN
          </button>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            ← Back to conversations
          </button>
        )}
      </motion.div>

    </div>
  );
}
