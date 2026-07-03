import React, { useState, useEffect } from "react";
import { Vote, Clock, Play, Award, CheckCircle, XCircle, Trash2, X } from "lucide-react";

// --- START VOTE DIALOG ---
interface StartVoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (question: string, duration: number) => void;
}

export function StartVoteDialog({ isOpen, onClose, onStart }: StartVoteDialogProps) {
  const [question, setQuestion] = useState("");
  const [duration, setDuration] = useState(60);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    onStart(question.trim(), duration);
    setQuestion("");
    setDuration(60);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4 bg-slate-950/20 backdrop-blur-[2px] animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative my-8 w-full max-w-md transform rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/5 dark:bg-ink-900 transition-all duration-300 animate-scale-up">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-white/[0.04] dark:hover:text-white transition"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-650 dark:bg-indigo-500/20 dark:text-indigo-400">
            <Vote size={18} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
            Initiate Vote Session
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-350">
              Vote Question / Proposition
            </label>
            <input
              type="text"
              placeholder="e.g. Should we Proof Theorem 4 next?"
              className="field py-2.5 text-xs"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-350">
              Duration Limit
            </label>
            <select
              className="field py-2 text-xs"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              aria-label="Vote duration"
            >
              <option value={30}>30 Seconds</option>
              <option value={60}>1 Minute</option>
              <option value={90}>1.5 Minutes</option>
              <option value={120}>2 Minutes</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:text-slate-405 dark:hover:bg-white/[0.03] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-ink-950 dark:hover:bg-slate-100 transition shadow-md focus:outline-none focus:ring-2 focus:ring-signal-500"
            >
              <Play size={13} />
              Launch Vote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- VOTE POPUP CONTAINER ---
interface VotePopupProps {
  isOpen: boolean;
  question: string;
  durationSeconds: number;
  votedCount: number;
  totalParticipants: number;
  onVote: (choice: "yes" | "no" | "abstain") => void;
  onComplete: () => void;
}

export function VotePopup({
  isOpen,
  question,
  durationSeconds,
  votedCount,
  totalParticipants,
  onVote,
  onComplete,
}: VotePopupProps) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);

  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(durationSeconds);
  }, [isOpen, durationSeconds]);

  useEffect(() => {
    if (!isOpen) return;
    if (timeLeft <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isOpen, onComplete]);

  if (!isOpen) return null;

  const progressPercent = Math.min(100, (votedCount / totalParticipants) * 100);

  return (
    <div className="fixed bottom-24 left-6 z-50 w-full max-w-sm rounded-2xl border border-indigo-250 bg-white p-4 shadow-2xl dark:border-indigo-500/20 dark:bg-ink-900 animate-scale-up">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
          <div className="flex items-center gap-1.5 text-indigo-650 dark:text-indigo-400">
            <Vote size={15} />
            <span className="text-xs font-bold uppercase tracking-wider">Live Vote Poll</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Clock size={13} className="text-indigo-500" />
            <span>{timeLeft}s remaining</span>
          </div>
        </div>

        {/* Question */}
        <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
          {question}
        </p>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase">
            <span>Progress</span>
            <span>
              {votedCount}/{totalParticipants} Voted ({Math.round(progressPercent)}%)
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.04] overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Ballot selectors */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            onClick={() => onVote("yes")}
            className="rounded-xl border border-green-200 bg-green-500/[0.03] text-green-600 py-2 text-xs font-bold hover:bg-green-500/10 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
          >
            Yes 👍
          </button>
          <button
            type="button"
            onClick={() => onVote("no")}
            className="rounded-xl border border-red-200 bg-red-500/[0.03] text-red-650 py-2 text-xs font-bold hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
          >
            No 👎
          </button>
          <button
            type="button"
            onClick={() => onVote("abstain")}
            className="rounded-xl border border-slate-200 bg-slate-500/[0.03] text-slate-500 py-2 text-xs font-bold hover:bg-slate-500/10 focus:outline-none focus:ring-2 focus:ring-slate-500 transition"
          >
            Abstain
          </button>
        </div>
      </div>
    </div>
  );
}

// --- VOTE RESULT DIALOG ---
interface VoteResultDialogProps {
  isOpen: boolean;
  question: string;
  yesCount: number;
  noCount: number;
  abstainCount: number;
  passed: boolean;
  onClose: () => void;
}

export function VoteResultDialog({
  isOpen,
  question,
  yesCount,
  noCount,
  abstainCount,
  passed,
  onClose,
}: VoteResultDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4 bg-slate-950/20 backdrop-blur-[2px] animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative my-8 w-full max-w-sm transform rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/5 dark:bg-ink-900 transition-all duration-300 animate-scale-up">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-white/[0.04] dark:hover:text-white transition"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        {/* Results Icon & Header */}
        <div className="flex flex-col items-center text-center space-y-3 pb-3 border-b border-slate-100 dark:border-white/5">
          {passed ? (
            <div className="flex size-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
              <CheckCircle size={24} />
            </div>
          ) : (
            <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <XCircle size={24} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              {passed ? "Proposition Passed" : "Proposition Defeated"}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase mt-0.5">
              Vote Outcome
            </p>
          </div>
        </div>

        {/* Question & Breakdown */}
        <div className="mt-4 space-y-4 text-center">
          <p className="text-xs font-bold text-slate-650 dark:text-slate-300 leading-relaxed italic px-2">
            "{question}"
          </p>

          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl dark:bg-white/[0.01] border border-slate-100/50 dark:border-white/5">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">Yes</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{yesCount}</p>
            </div>
            <div className="space-y-0.5 border-x border-slate-200/50 dark:border-white/5">
              <span className="text-[10px] font-bold text-red-650 dark:text-red-400 uppercase">No</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{noCount}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-455 uppercase">Abstain</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{abstainCount}</p>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-ink-950 dark:hover:bg-slate-100 px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-signal-500 transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// --- VOTE HISTORY LIST ---
export interface VoteRecord {
  id: string;
  question: string;
  yesCount: number;
  noCount: number;
  passed: boolean;
}

interface VoteHistoryProps {
  history: VoteRecord[];
  onClear: () => void;
}

export function VoteHistoryList({ history, onClear }: VoteHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-white/[0.01] text-center space-y-1">
        <Award className="size-6 mx-auto text-slate-350 dark:text-slate-655" />
        <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">No Vote History</h4>
        <p className="text-[9px] text-slate-500 dark:text-slate-450 leading-relaxed max-w-[200px] mx-auto">
          Completed poll ballots will be recorded here during the call session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-white/5">
        <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Poll History</span>
        <button
          type="button"
          onClick={onClear}
          className="rounded p-0.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
          title="Clear history"
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {history.map((rec) => (
          <div
            key={rec.id}
            className="rounded-xl border border-slate-100 bg-white p-2.5 dark:border-white/5 dark:bg-white/[0.01] flex items-center justify-between gap-2 shadow-sm"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {rec.question}
              </p>
              <span className="text-[9px] text-slate-455 dark:text-slate-500 mt-1 block">
                Result: {rec.yesCount} Yes vs {rec.noCount} No
              </span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider flex-shrink-0 ${
                rec.passed
                  ? "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                  : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
              }`}
            >
              {rec.passed ? "Passed" : "Failed"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
