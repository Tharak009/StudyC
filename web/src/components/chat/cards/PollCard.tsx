import React, { useState, useMemo } from "react";
import type { Channel as StreamChannel } from "stream-chat";
import { Check, BarChart2, Lock } from "lucide-react";

export interface PollOption {
  id: string;
  text: string;
}

export interface PollPayloadData {
  question: string;
  description?: string;
  options: PollOption[];
  allowMultiple?: boolean;
  isAnonymous?: boolean;
  isClosed?: boolean;
}

interface PollCardProps {
  poll: PollPayloadData;
  messageId?: string;
  channel?: StreamChannel;
  reactionCounts?: Record<string, number>;
  ownReactions?: Array<{ type: string }>;
  isMine?: boolean;
}

export function PollCard({
  poll,
  messageId,
  channel,
  reactionCounts = {},
  ownReactions = [],
  isMine = false
}: PollCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive user's votes from Stream's native own_reactions: vote_opt_0, vote_opt_1
  const userVotedOptionIds = useMemo(() => {
    return ownReactions
      .filter((r) => r.type.startsWith("vote_"))
      .map((r) => r.type.slice("vote_".length));
  }, [ownReactions]);

  // Compute vote counts per option from Stream reaction_counts
  const { optionCounts, totalVotes } = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;

    (poll.options || []).forEach((opt) => {
      const count = reactionCounts[`vote_${opt.id}`] || 0;
      counts[opt.id] = count;
      total += count;
    });

    return { optionCounts: counts, totalVotes: total };
  }, [poll.options, reactionCounts]);

  const hasVoted = userVotedOptionIds.length > 0;
  const isClosed = Boolean(poll.isClosed);

  const handleVoteToggle = async (optionId: string) => {
    if (!channel || !messageId || isClosed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const reactionType = `vote_${optionId}`;
      const isAlreadyVoted = userVotedOptionIds.includes(optionId);

      if (isAlreadyVoted) {
        // Remove vote
        await channel.deleteReaction(messageId, reactionType);
      } else {
        // If single choice, remove previous vote first
        if (!poll.allowMultiple && userVotedOptionIds.length > 0) {
          for (const prevId of userVotedOptionIds) {
            await channel.deleteReaction(messageId, `vote_${prevId}`);
          }
        }
        // Add new vote
        await channel.sendReaction(messageId, { type: reactionType });
      }
    } catch (err) {
      console.error("Failed to cast vote on Stream:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md my-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-4 shadow-sm select-none">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1E90FF]">
            <BarChart2 size={13} />
            <span>Campus Poll</span>
            {poll.isAnonymous && (
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.2 text-[9px] font-medium text-slate-500">
                Anonymous
              </span>
            )}
            {poll.allowMultiple && (
              <span className="rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.2 text-[9px] font-medium">
                Multi-choice
              </span>
            )}
          </div>
          <h4 className="mt-1 text-sm font-bold leading-snug text-slate-900 dark:text-white">
            {poll.question}
          </h4>
          {poll.description && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {poll.description}
            </p>
          )}
        </div>
        {isClosed && (
          <span className="shrink-0 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 flex items-center gap-1 border border-amber-500/20">
            <Lock size={10} />
            Closed
          </span>
        )}
      </div>

      {/* Options List */}
      <div className="space-y-2">
        {(poll.options || []).map((option) => {
          const isUserVote = userVotedOptionIds.includes(option.id);
          const voteCount = optionCounts[option.id] || 0;
          const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

          return (
            <button
              key={option.id}
              type="button"
              disabled={isClosed || isSubmitting}
              onClick={() => handleVoteToggle(option.id)}
              className={`relative flex w-full flex-col overflow-hidden rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                isUserVote
                  ? "border-[#1E90FF] bg-sky-50/50 dark:bg-sky-950/30"
                  : "border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0D1524] hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              {/* Progress bar background */}
              {totalVotes > 0 && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    isUserVote
                      ? "bg-[#1E90FF]/15 dark:bg-[#1E90FF]/25"
                      : "bg-slate-200/50 dark:bg-slate-700/30"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-${
                      poll.allowMultiple ? "md" : "full"
                    } border text-[10px] transition-colors ${
                      isUserVote
                        ? "border-[#1E90FF] bg-[#1E90FF] text-white font-bold"
                        : "border-slate-400/50 bg-white dark:bg-[#151E2E]"
                    }`}
                  >
                    {isUserVote && (poll.allowMultiple ? "✓" : "•")}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {option.text}
                  </span>
                  {isUserVote && (
                    <span className="text-[10px] font-bold text-[#1E90FF] shrink-0">
                      (Your vote)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                  <span>{pct}%</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    ({voteCount})
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
        <span>
          {totalVotes} {totalVotes === 1 ? "total vote" : "total votes"}
        </span>
        <span>
          {poll.allowMultiple ? "Select all that apply" : "Single choice poll"}
        </span>
      </div>
    </div>
  );
}
