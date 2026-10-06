import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, BarChart2, Loader2 } from "lucide-react";
import type { Channel as StreamChannel } from "stream-chat";
import { useToastStore } from "../../../store/toast.store";

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel?: StreamChannel | null;
}

export function CreatePollModal({
  isOpen,
  onClose,
  channel
}: CreatePollModalProps) {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToastStore();

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel) {
      setError("No active channel to post poll");
      return;
    }

    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      setError("Please enter a question for the poll");
      return;
    }

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError("Please provide at least 2 non-empty options");
      return;
    }

    const unique = new Set(cleanOptions);
    if (unique.size !== cleanOptions.length) {
      setError("Options must be unique");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await channel.sendMessage({
        text: `📊 Poll: ${cleanQuestion}`,
        attachments: [
          {
            type: "poll",
            question: cleanQuestion,
            description: description.trim() || undefined,
            options: cleanOptions.map((text, idx) => ({ id: `opt_${idx}`, text })),
            allowMultiple,
            isAnonymous
          } as any
        ]
      });

      addToast("Poll posted to channel", "success");
      setQuestion("");
      setDescription("");
      setOptions(["", ""]);
      setAllowMultiple(false);
      setIsAnonymous(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create poll");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/50 select-none animate-in fade-in duration-150"
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.16 }}
          className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0D1524] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100 max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#090F1A] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#1E90FF]">
                <BarChart2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Campus Poll</h3>
                <p className="text-[11px] text-slate-400">
                  Gather instant feedback from peers and classmates
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
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Question <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What topic should we focus on for Friday's sprint?"
                maxLength={200}
                required
                className="w-full text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#152238] border border-slate-300 dark:border-slate-700 focus:border-[#1E90FF] focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add extra context or instructions..."
                maxLength={300}
                className="w-full text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#152238] border border-slate-300 dark:border-slate-700 focus:border-[#1E90FF] focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            {/* Options */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Poll Options ({options.length}/10)
              </label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 text-right font-mono text-xs text-slate-400 shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      maxLength={100}
                      className="flex-1 text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#152238] border border-slate-300 dark:border-slate-700 focus:border-[#1E90FF] focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Remove option"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-[#1E90FF] hover:underline cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add another option</span>
                </button>
              )}
            </div>

            {/* Settings Toggles */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1E90FF] focus:ring-sky-500 cursor-pointer"
                />
                <span>Allow participants to select multiple options</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1E90FF] focus:ring-sky-500 cursor-pointer"
                />
                <span>Anonymous votes (hide voter names from results)</span>
              </label>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#1E90FF] hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Posting Poll...</span>
                  </>
                ) : (
                  <>
                    <BarChart2 size={14} />
                    <span>Create Poll</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
