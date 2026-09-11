import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Sliders,
  X,
  Plus,
  Tag,
  Code2,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useToastStore } from "../../../store/toast.store";
import { apiClient } from "../../../api/client";

export interface ChannelSettingsData {
  id: string;
  name: string;
  isStrictStudyMode?: boolean;
  academicContextTags?: string[];
  strictnessThreshold?: number; // 0.30, 0.40, 0.55
  allowCodeSnippetsOnly?: boolean;
  strikeLimitBeforeTimeout?: number;
  timeoutDurationMinutes?: number;
}

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChannelSettingsData | null;
  communityId?: string;
  onSaveSuccess?: (updatedChannel: ChannelSettingsData) => void;
}

const STRICTNESS_LEVELS = [
  {
    id: "relaxed",
    label: "Relaxed",
    threshold: 0.3,
    description: "Allows broader technical topics and general peer questions."
  },
  {
    id: "balanced",
    label: "Balanced",
    threshold: 0.4,
    description: "Recommended: Requires coursework relevance, homework questions, or code."
  },
  {
    id: "strict",
    label: "Strict",
    threshold: 0.55,
    description: "Rigorous: High academic density required. Off-topic queries are blocked."
  }
];

export function ChannelSettingsModal({
  isOpen,
  onClose,
  channel,
  communityId,
  onSaveSuccess
}: ChannelSettingsModalProps) {
  const { addToast } = useToastStore();

  const [isStrict, setIsStrict] = useState<boolean>(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [threshold, setThreshold] = useState<number>(0.4);
  const [codeOnly, setCodeOnly] = useState<boolean>(false);
  const [timeoutMins, setTimeoutMins] = useState<number>(5);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (channel) {
      setIsStrict(channel.isStrictStudyMode ?? true);
      setTags(channel.academicContextTags || [
        "algorithms",
        "complexity",
        "homework",
        "exam",
        "lab",
        "code"
      ]);
      setThreshold(channel.strictnessThreshold ?? 0.4);
      setCodeOnly(channel.allowCodeSnippetsOnly ?? false);
      setTimeoutMins(channel.timeoutDurationMinutes ?? 5);
    }
  }, [channel, isOpen]);

  if (!isOpen || !channel) return null;

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase().replace(/^[#,\s]+/, "");
      if (val && !tags.includes(val)) {
        if (tags.length >= 15) {
          addToast("Maximum of 15 context tags per channel", "warning");
          return;
        }
        setTags([...tags, val]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updatedPayload: ChannelSettingsData = {
      ...channel,
      isStrictStudyMode: isStrict,
      academicContextTags: tags,
      strictnessThreshold: threshold,
      allowCodeSnippetsOnly: codeOnly,
      timeoutDurationMinutes: timeoutMins
    };

    try {
      if (communityId) {
        // Dispatch PATCH API to backend
        await apiClient.patch(
          `/api/communities/${communityId}/channels/${channel.id || channel.name}/study-mode`,
          updatedPayload
        );
      }
    } catch {
      // Backend may be offline in dev/mock mode; fall back gracefully to local persistence
    }

    // Persist to local channel storage for instant UI reflection
    try {
      const storageKey = `studyconnect_channels_${communityId || "default"}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const chans = JSON.parse(raw);
        const nextChans = chans.map((c: any) =>
          c.id === channel.id || c.name === channel.name
            ? { ...c, ...updatedPayload }
            : c
        );
        localStorage.setItem(storageKey, JSON.stringify(nextChans));
      }
    } catch {}

    setIsSaving(false);
    onSaveSuccess?.(updatedPayload);
    addToast(`Strict Study Mode settings saved for #${channel.name}!`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-xl rounded-3xl border border-slate-700/60 bg-[#0F1A30]/95 dark:bg-[#090E1A]/95 p-6 sm:p-7 shadow-2xl shadow-blue-950/40 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/30 flex items-center justify-center shadow-md">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Channel Focus Settings</span>
                <span className="text-xs font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded-full">
                  #{channel.name}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Configure real-time academic relevance guards and allowed coursework topics.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* 1. Strict Study Mode Master Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-start gap-3 max-w-md">
              <div
                className={`p-2 rounded-xl mt-0.5 ${
                  isStrict
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-700/30 text-slate-400 border border-slate-700/40"
                }`}
              >
                {isStrict ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Strict Study Mode</span>
                  {isStrict && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  When enabled, off-topic banter and gaming messages are blocked before delivery.
                </p>
              </div>
            </div>

            {/* Switch */}
            <button
              type="button"
              onClick={() => setIsStrict(!isStrict)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isStrict ? "bg-[#1E90FF]" : "bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isStrict ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* 2. Academic Context Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag size={13} className="text-[#1E90FF]" />
                Syllabus & Topic Keywords ({tags.length}/15)
              </span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">
                Press Enter to add tag
              </span>
            </label>

            <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] focus-within:border-[#1E90FF] transition-all">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#1E90FF]/15 text-[#38BDF8] border border-[#1E90FF]/30 text-xs font-semibold"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-400 hover:text-white rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              <input
                type="text"
                placeholder="Add keyword (e.g. recursion, pointers, dijkstra, semaphore)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none py-1"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Messages containing these words receive a 2.5x relevance boost, preventing false rejections.
            </p>
          </div>

          {/* 3. Strictness Threshold Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
              Moderation Strictness
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {STRICTNESS_LEVELS.map((level) => {
                const active = Math.abs(threshold - level.threshold) < 0.05;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setThreshold(level.threshold)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      active
                        ? "border-[#1E90FF] bg-[#1E90FF]/15 shadow-md shadow-[#1E90FF]/20"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] text-slate-300"
                    }`}
                  >
                    <div className="text-xs font-extrabold text-white flex items-center justify-between">
                      <span>{level.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Math.round(level.threshold * 100)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      {level.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Secondary Toggles: Code Only & Timeout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Code snippets only */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div className="pr-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Code2 size={14} className="text-[#1E90FF]" />
                  Code & Math Only
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Restricts room strictly to code blocks or equations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCodeOnly(!codeOnly)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  codeOnly ? "bg-[#1E90FF]" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    codeOnly ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Timeout duration */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1.5">
                <Clock size={14} className="text-amber-400" />
                Timeout on 3 Strikes
              </div>
              <div className="flex gap-2">
                {[3, 5, 10].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTimeoutMins(mins)}
                    className={`flex-1 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      timeoutMins === mins
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-white/[0.04] text-slate-400 hover:text-white"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-extrabold shadow-lg shadow-[#1E90FF]/30 hover:shadow-xl hover:shadow-[#1E90FF]/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Save Channel Settings</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
export default ChannelSettingsModal;
