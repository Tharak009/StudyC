import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  PlusCircle,
  X,
  Sparkles,
  Hash,
  Volume2,
  Users,
  ShieldCheck,
  Check,
  Building2
} from "lucide-react";
import type { GovernanceCommunity } from "../tabs/CommunityGovernanceTab";
import { useToastStore } from "../../../store/toast.store";

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCommunity: (newCircle: GovernanceCommunity) => void;
}

export function CreateCommunityModal({
  isOpen,
  onClose,
  onCreateCommunity
}: CreateCommunityModalProps) {
  const { addToast } = useToastStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("💻");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [category, setCategory] = useState<"BATCH_CIRCLE" | "LAB_ROOM" | "INTEREST_GROUP">("BATCH_CIRCLE");
  const [isMandatory, setIsMandatory] = useState(true);

  const [channels, setChannels] = useState({
    announcements: true,
    general: true,
    labs: true,
    exams: true,
    voiceStage1: true,
    voiceStage2: false
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast("Please provide a community name.", "warning");
      return;
    }

    const textChannelNames: string[] = [];
    if (channels.announcements) textChannelNames.push("#announcements");
    if (channels.general) textChannelNames.push("#general-discussion");
    if (channels.labs) textChannelNames.push("#lab-practicals");
    if (channels.exams) textChannelNames.push("#exam-review");

    const voiceCount = (channels.voiceStage1 ? 1 : 0) + (channels.voiceStage2 ? 1 : 0);

    const newComm: GovernanceCommunity = {
      id: `circ-${Date.now()}`,
      name,
      emoji,
      description: description || "Official campus academic collaboration circle with verified peer enrollment.",
      department,
      category,
      textChannelsCount: textChannelNames.length,
      voiceStagesCount: voiceCount,
      membersCount: isMandatory ? 240 : 1,
      onlineCount: isMandatory ? 34 : 1,
      activityScore: 92,
      moderators: [
        { name: "Devanshu Sharma", role: "TA Moderator", roll: "TA-CS2023" }
      ],
      status: "ACTIVE",
      createdAt: "Just now"
    };

    onCreateCommunity(newComm);
    addToast(`Provisioned official circle "${name}" with ${textChannelNames.length} channels.`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl space-y-4"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1E90FF] text-white shadow-md shadow-[#1E90FF]/25">
            <Building2 size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Provision Official Campus Study Circle
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Auto-generate batch channels, assign faculty advisors, and setup voice stages.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          
          {/* Emoji & Name */}
          <div className="flex items-center gap-3">
            <div className="w-16">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Emoji
              </label>
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-full text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] py-2 text-lg focus:outline-none focus:border-[#1E90FF]"
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Community Circle Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Computer Science 2026 Batch Official Hub"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Department Scope
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-xs font-bold"
              >
                <option value="Computer Science & Engineering">Computer Science (CSE)</option>
                <option value="Artificial Intelligence & Data Science">AI & Data Science (AI&DS)</option>
                <option value="Electronics & Communication">Electronics (ECE)</option>
                <option value="Information Technology">Information Tech (IT)</option>
                <option value="Campus-Wide Open">Campus-Wide Open</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Circle Type
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-xs font-bold"
              >
                <option value="BATCH_CIRCLE">Official Batch Circle</option>
                <option value="LAB_ROOM">Subject & Lab Room</option>
                <option value="INTEREST_GROUP">Student SIG / Club</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description Snippet
            </label>
            <input
              type="text"
              placeholder="e.g. Mandatory institutional hub for curriculum updates and peer discussion"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
            />
          </div>

          {/* Default Channel Generator Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Default Channels to Auto-Generate:
            </label>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 text-xs font-medium">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.announcements}
                  onChange={(e) => setChannels({ ...channels, announcements: e.target.checked })}
                />
                <span>#announcements (Admin only)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.general}
                  onChange={(e) => setChannels({ ...channels, general: e.target.checked })}
                />
                <span>#general-discussion</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.labs}
                  onChange={(e) => setChannels({ ...channels, labs: e.target.checked })}
                />
                <span>#lab-practicals</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.exams}
                  onChange={(e) => setChannels({ ...channels, exams: e.target.checked })}
                />
                <span>#exam-review</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.voiceStage1}
                  onChange={(e) => setChannels({ ...channels, voiceStage1: e.target.checked })}
                />
                <span className="text-emerald-500 font-bold">🔊 Voice Stage 1</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.voiceStage2}
                  onChange={(e) => setChannels({ ...channels, voiceStage2: e.target.checked })}
                />
                <span className="text-emerald-500 font-bold">🔊 Voice Stage 2</span>
              </label>
            </div>
          </div>

          {/* Mandatory Auto-Enroll Toggle */}
          <label className="flex items-start gap-3 p-3 rounded-2xl bg-[#1E90FF]/10 border border-[#1E90FF]/30 cursor-pointer">
            <input
              type="checkbox"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <h4 className="text-xs font-bold text-[#1E90FF]">
                Auto-Enroll All Verified Department Students ({department})
              </h4>
              <p className="text-[11px] text-[#1E90FF]/80 mt-0.5">
                Automatically mounts this circle to the sidebar of all verified students in this cohort.
              </p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 cursor-pointer"
            >
              <Check size={14} />
              <span>Provision Circle</span>
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}

export default CreateCommunityModal;
