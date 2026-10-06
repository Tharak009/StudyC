import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  FolderPlus,
  Search,
  Check,
  MessagesSquare,
  BookOpen,
  FolderGit2,
  GraduationCap,
  LoaderCircle,
  Hash
} from "lucide-react";
import { communityGroupsApi } from "../../api/community-groups.api";
import type { CommunityGroup, GroupType } from "../../types/community-group";
import { useToastStore } from "../../store/toast.store";

interface AttachGroupModalProps {
  communityId: string;
  existingGroups: CommunityGroup[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (group: CommunityGroup) => void;
}

export function AttachGroupModal({
  communityId,
  existingGroups,
  isOpen,
  onClose,
  onSuccess
}: AttachGroupModalProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const [channelName, setChannelName] = useState("");
  const [streamChannelId, setStreamChannelId] = useState("");
  const [type, setType] = useState<GroupType>("DISCUSSION");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setChannelName("");
      setStreamChannelId("");
      setDescription("");
      setType("DISCUSSION");
      setError(null);
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: () =>
      communityGroupsApi.attach(communityId, {
        name: channelName.trim(),
        description: description.trim() || undefined,
        type,
        streamChannelId: streamChannelId.trim()
      }),
    onSuccess: (attachedGroup) => {
      addToast("Channel attached to community!", "success");
      queryClient.invalidateQueries({ queryKey: ["community-groups", communityId] });
      queryClient.invalidateQueries({ queryKey: ["community", communityId] });
      onClose();
      if (onSuccess) {
        onSuccess(attachedGroup);
      }
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err?.message || "Failed to attach group");
    }
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) {
      setError("Please provide a group name");
      return;
    }
    if (!streamChannelId.trim()) {
      setError("Please provide the Stream Channel ID");
      return;
    }

    // Check if already in community
    const alreadyExists = existingGroups.some(
      (g) => g.streamChannelId === streamChannelId.trim()
    );
    if (alreadyExists) {
      setError("This channel is already attached to this community");
      return;
    }

    setError(null);
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[min(90vh,680px)] rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B132B] flex flex-col my-auto overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 p-4 sm:p-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF] dark:bg-[#1E90FF]/20 dark:text-[#1E90FF]">
              <FolderPlus size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Attach Existing Channel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Link an existing Stream Chat channel to this community
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
            {error && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50/70 text-xs font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Display Name *
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. Competitive Programming"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Stream Channel ID *
              </label>
              <input
                type="text"
                value={streamChannelId}
                onChange={(e) => setStreamChannelId(e.target.value)}
                placeholder="e.g. competitive-programming-2026"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
              />
              <p className="text-[11px] text-slate-400">
                Unique ID of the existing Stream Chat channel to attach.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Group Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as GroupType)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
              >
                <option value="DISCUSSION">Discussion</option>
                <option value="STUDY">Study Group</option>
                <option value="PROJECT">Project Team</option>
                <option value="SUBJECT">Subject Specific</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this channel about?"
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E90FF] resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 p-4 sm:px-6 border-t border-slate-100 dark:border-white/10 shrink-0 bg-white dark:bg-[#0B132B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1E90FF] hover:bg-[#187BCD] disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            >
              {mutation.isPending ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  <span>Attaching...</span>
                </>
              ) : (
                <span>Attach Channel</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
