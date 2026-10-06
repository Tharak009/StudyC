import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  X,
  Search,
  CornerDownRight,
  Calendar,
  User as UserIcon,
  MessageSquare,
  Hash,
  ArrowRight
} from "lucide-react";
import {
  useChatOrganizationStore,
  type StarredMessageRecord
} from "../../../store/chat-organization.store";

export interface StarredMessagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStarredMessage: (record: StarredMessageRecord) => void;
}

export const StarredMessagesDrawer: React.FC<StarredMessagesDrawerProps> = ({
  isOpen,
  onClose,
  onSelectStarredMessage
}) => {
  const [search, setSearch] = useState("");
  const starredMessages = useChatOrganizationStore((state) => state.starredMessages);
  const unstarMessage = useChatOrganizationStore((state) => state.unstarMessage);

  if (!isOpen) return null;

  const filtered = starredMessages.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.text?.toLowerCase().includes(q) ||
      m.senderName?.toLowerCase().includes(q) ||
      m.channelName?.toLowerCase().includes(q) ||
      (m.communityName && m.communityName.toLowerCase().includes(q))
    );
  });

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 overflow-hidden bg-black/25 flex justify-end animate-in fade-in duration-150"
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className="w-full max-w-sm sm:max-w-md h-full bg-white dark:bg-[#0D1524] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-800 dark:text-slate-200"
        >

          {/* Header */}
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-[#10192C]">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-yellow-400 fill-yellow-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Starred Messages
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-500 dark:text-yellow-400 border border-yellow-400/20 font-mono font-bold">
                {starredMessages.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0D1524]">
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search starred messages..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-transparent focus:border-[#1E90FF] rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Star size={36} className="text-slate-300 dark:text-slate-700 mb-2 stroke-1" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {search ? "No matches found" : "No starred messages yet"}
                </p>
                <p className="text-xs mt-1 text-slate-400 max-w-xs leading-relaxed">
                  Star important study notes, code solutions, or key announcements by clicking "Star Message" on any message.
                </p>
              </div>
            ) : (
              filtered.map((msg) => {
                const dateStr = msg.createdAt
                  ? new Date(msg.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : "";

                return (
                  <div
                    key={msg.messageId}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121B2D] border border-slate-200/80 dark:border-slate-800/80 hover:border-sky-400/60 dark:hover:border-sky-500/50 transition-all flex flex-col gap-2 group"
                  >
                    {/* Source & Sender Header */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {msg.senderAvatar ? (
                          <img
                            src={msg.senderAvatar}
                            alt={msg.senderName}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {msg.senderName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {msg.senderName}
                        </span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400 truncate max-w-[160px]">
                          {msg.communityName
                            ? `${msg.communityName} • #${msg.channelName}`
                            : msg.channelName}
                        </span>
                      </div>

                      {dateStr && (
                        <span className="text-[10px] text-slate-400 shrink-0">{dateStr}</span>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                      {msg.text || (msg.hasAttachments ? `[Attachment]` : "")}
                    </p>

                    {/* Actions Footer */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStarredMessage(msg);
                          onClose();
                        }}
                        className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        <span>Jump to original conversation</span>
                        <ArrowRight size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => unstarMessage(msg.messageId)}
                        className="text-[11px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Remove from starred"
                      >
                        <Star size={12} className="fill-yellow-400 text-yellow-400" />
                        <span>Unstar</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StarredMessagesDrawer;
