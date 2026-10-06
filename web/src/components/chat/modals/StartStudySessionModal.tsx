import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Timer, Play, Sparkles } from "lucide-react";
import type { Channel as StreamChannel } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { socketService } from "../../../services/socket.service";
import { useChatStore } from "../../../store/chat.store";
import { useToastStore } from "../../../store/toast.store";

interface StartStudySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel?: StreamChannel | null;
  communityId?: string;
}

const DURATION_PRESETS = [15, 25, 45, 60];

export function StartStudySessionModal({
  isOpen,
  onClose,
  channel,
  communityId
}: StartStudySessionModalProps) {
  const { client } = useChatContext();
  const { setActiveSprint } = useChatStore();
  const { addToast } = useToastStore();

  const [topic, setTopic] = useState("Deep Work & Problem Solving");
  const [duration, setDuration] = useState(25);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel) return;

    const cleanTopic = topic.trim() || "Deep Work & Focus";
    setIsSubmitting(true);

    try {
      const endsAt = new Date(Date.now() + duration * 60 * 1000).toISOString();
      const currentUserName = (client.user?.name as string) || "Classmate";
      const currentUserId = client.userID || "";

      // 1. Post to Stream Channel
      await channel.sendMessage({
        text: `⏱️ Starting a ${duration}-min Study Sprint: "${cleanTopic}"`,
        attachments: [
          {
            type: "study_session",
            communityId,
            channelId: channel.id,
            topic: cleanTopic,
            durationMinutes: duration,
            startedBy: currentUserId,
            startedByName: currentUserName,
            endsAt
          } as any
        ]
      });

      // 2. Start sprint via Socket
      const socket = socketService.get() || socketService.connect();
      if (communityId) {
        socket?.emit("sprint:start", {
          communityId,
          channelId: channel.id,
          durationMinutes: duration,
          topic: cleanTopic
        });
      }

      // 3. Set local sprint state
      setActiveSprint({
        communityId: communityId || "",
        channelId: channel.id,
        isActive: true,
        durationMinutes: duration,
        startedAt: new Date().toISOString(),
        endsAt,
        topic: cleanTopic,
        startedBy: currentUserId,
        startedByName: currentUserName,
        participants: [currentUserId]
      });

      addToast(`Study Sprint (${duration}m) started!`, "success");
      onClose();
    } catch (err: any) {
      addToast(err?.message || "Failed to start study session", "error");
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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-[#005FFF] dark:text-sky-400 flex items-center justify-center">
                <Timer size={18} />
              </div>
              <h3 className="font-bold text-base">Start a Study Sprint</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Session Focus / Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Operating Systems Chapter 4, DSA Trees"
                maxLength={80}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#005FFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Duration (minutes)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_PRESETS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDuration(mins)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      duration === mins
                        ? "bg-[#005FFF] text-white border-[#005FFF] shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-[#005FFF] hover:bg-[#004ECC] text-white transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Play size={13} />
                <span>Launch Sprint</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
