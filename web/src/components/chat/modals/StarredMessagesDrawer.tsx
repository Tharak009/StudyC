import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Search, CornerDownRight, Calendar, User as UserIcon } from "lucide-react";
import type { DirectMessage } from "../../../types/direct-message";
import type { ChatMessage } from "../../../types/chat";

export interface StarredMessagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  starredMessages: (DirectMessage | ChatMessage)[];
  onJumpToMessage: (messageId: string) => void;
  onUnstarMessage: (messageId: string) => Promise<void>;
}

export const StarredMessagesDrawer: React.FC<StarredMessagesDrawerProps> = ({
  isOpen,
  onClose,
  starredMessages,
  onJumpToMessage,
  onUnstarMessage
}) => {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filtered = starredMessages.filter((m) =>
    search ? m.content?.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className="w-full max-w-md h-full bg-[#0F172A] border-l border-slate-700/60 shadow-2xl flex flex-col text-slate-200"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-700/60 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-yellow-400 fill-yellow-400" />
              <h2 className="text-base font-bold text-white">Starred Messages</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-mono">
                {starredMessages.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/30">
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search starred messages..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#1E90FF] transition-colors"
              />
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
            {filtered.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Star size={36} className="text-slate-600 mb-2 stroke-1" />
                <p className="text-sm font-medium text-slate-400">No starred messages</p>
                <p className="text-xs mt-1 text-slate-500 max-w-xs">
                  Star important study notes, code solutions, or key announcements to quickly find them later.
                </p>
              </div>
            ) : (
              filtered.map((msg) => {
                const senderName =
                  (msg.senderId as any)?.fullName ||
                  (msg as any).senderName ||
                  "Classmate";
                const dateStr = new Date(msg.createdAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div
                    key={msg._id}
                    className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/70 transition-all flex flex-col gap-2 group"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                        <UserIcon size={12} className="text-sky-400" />
                        <span>{senderName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                        <Calendar size={11} />
                        <span>{dateStr}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
                      {msg.content || (msg.attachments?.length ? `[${msg.attachments.length} file attachment(s)]` : "")}
                    </p>

                    <div className="pt-2 border-t border-slate-700/30 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          onJumpToMessage(msg._id);
                          onClose();
                        }}
                        className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        <CornerDownRight size={13} />
                        <span>Jump to Message</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onUnstarMessage(msg._id)}
                        className="text-[11px] text-slate-400 hover:text-yellow-400 flex items-center gap-1 transition-colors"
                        title="Unstar"
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
