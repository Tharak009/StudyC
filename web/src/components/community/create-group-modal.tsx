import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Plus,
  MessageCircle,
  BookOpen,
  FolderKanban,
  GraduationCap,
  Sparkles,
  LoaderCircle,
  Layers,
  ArrowRight
} from "lucide-react";
import { communityGroupsApi } from "../../api/community-groups.api";
import type { CommunityGroup, GroupType } from "../../types/community-group";

interface CreateGroupModalProps {
  communityId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (group: CommunityGroup) => void;
}

const GROUP_TYPE_OPTIONS: {
  type: GroupType;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  {
    type: "DISCUSSION",
    label: "Discussion",
    desc: "Open peer discussion & collaborative questions",
    icon: MessageCircle
  },
  {
    type: "STUDY",
    label: "Study & Homework",
    desc: "Focused coursework problem solving and study sessions",
    icon: BookOpen
  },
  {
    type: "PROJECT",
    label: "Project Team",
    desc: "Collaborative project coordination and code building",
    icon: FolderKanban
  },
  {
    type: "SUBJECT",
    label: "Subject Specific",
    desc: "Focused on a specific curriculum topic or exam subject",
    icon: GraduationCap
  }
];

export function CreateGroupModal({
  communityId,
  isOpen,
  onClose,
  onSuccess
}: CreateGroupModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<GroupType>("DISCUSSION");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setType("DISCUSSION");
      setError(null);
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const mutation = useMutation({
    mutationFn: () =>
      communityGroupsApi.create(communityId, {
        name: name.trim(),
        description: description.trim(),
        type
      }),
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({
        queryKey: ["community-groups", communityId]
      });
      queryClient.invalidateQueries({ queryKey: ["community", communityId] });
      setName("");
      setDescription("");
      setType("DISCUSSION");
      setError(null);
      onClose();
      if (onSuccess) {
        onSuccess(newGroup);
      }
    },
    onError: (err: any) => {
      setError(
        err?.response?.data?.message || err?.message || "Failed to create group"
      );
    }
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a group name");
      return;
    }
    setError(null);
    mutation.mutate();
  };

  const selectedOption =
    GROUP_TYPE_OPTIONS.find((opt) => opt.type === type) || GROUP_TYPE_OPTIONS[0];
  const Icon = selectedOption.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[min(90vh,700px)] rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B132B] flex flex-col my-auto overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 p-4 sm:p-5 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF]">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add Community Group
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create a specialized discussion space with Stream Chat realtime messaging
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
            {error && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50/70 text-xs font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Group Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Java DSA Problem Solving"
                maxLength={60}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1E90FF] focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white transition-all"
              />
            </div>

            {/* Topic / Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Topic / Purpose
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will members discuss and collaborate on in this group?"
                maxLength={500}
                className="w-full px-4 py-2 rounded-xl border border-slate-200/80 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1E90FF] focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white transition-all resize-none"
              />
            </div>

            {/* Group Category Cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Group Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {GROUP_TYPE_OPTIONS.map((opt) => {
                  const OptIcon = opt.icon;
                  const isSelected = type === opt.type;
                  return (
                    <button
                      type="button"
                      key={opt.type}
                      onClick={() => setType(opt.type)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#1E90FF] bg-[#1E90FF]/10 text-slate-900 dark:text-white shadow-2xs"
                          : "border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isSelected
                            ? "bg-[#1E90FF] text-white"
                            : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <OptIcon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold">{opt.label}</p>
                        <p className="text-[11px] opacity-75 line-clamp-2 leading-tight mt-0.5">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Preview of Group Card */}
            <div className="p-3.5 rounded-2xl border border-dashed border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#080D1A]/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Sidebar Preview
              </p>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#0B132B] border border-slate-200/80 dark:border-white/10 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon size={16} className="text-[#1E90FF]" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {name || "Group Name Preview"}
                  </span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1E90FF]/15 text-[#1E90FF] font-bold uppercase">
                  {type.toLowerCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 p-4 sm:px-6 border-t border-slate-200/80 dark:border-white/10 shrink-0 bg-white dark:bg-[#0B132B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-[#1E90FF]/25 cursor-pointer"
            >
              {mutation.isPending ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  <span>Creating Group...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Create Group</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
