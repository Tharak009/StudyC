import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Users, MessageSquare, ArrowRight, CornerDownRight } from "lucide-react";
import { useDirectMessageStore } from "../../../store/direct-message.store";
import { useChatStore } from "../../../store/chat.store";
import type { DirectMessage } from "../../../types/direct-message";
import type { ChatMessage } from "../../../types/chat";

export interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messagesToForward: (DirectMessage | ChatMessage)[];
  onForwardDMs: (targetConversationIds: string[]) => Promise<void>;
  onForwardCircles: (targetCommunityId: string, channelId?: string) => Promise<void>;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  messagesToForward,
  onForwardDMs,
  onForwardCircles
}) => {
  const { conversations } = useDirectMessageStore();
  const { channels, selectedCommunityId } = useChatStore();

  const [search, setSearch] = useState("");
  const [selectedDmIds, setSelectedDmIds] = useState<string[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered direct message conversations
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) =>
      c.participants.some((p) => p.fullName?.toLowerCase().includes(q) || p.rollNumber?.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  // Filtered text channels in current circle
  const textChannels = useMemo(() => {
    const list = channels.filter((c) => c.type !== "voice");
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [channels, search]);

  const toggleDmSelection = (convId: string) => {
    setSelectedDmIds((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId]
    );
  };

  const handleForward = async () => {
    if (selectedDmIds.length === 0 && !selectedChannelId) return;
    setIsSubmitting(true);
    try {
      if (selectedDmIds.length > 0) {
        await onForwardDMs(selectedDmIds);
      }
      if (selectedChannelId && selectedCommunityId) {
        await onForwardCircles(selectedCommunityId, selectedChannelId);
      }
      onClose();
    } catch (err) {
      console.error("Failed to forward messages:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalSelected = selectedDmIds.length + (selectedChannelId ? 1 : 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-[#0F172A] border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-200"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-700/60 flex items-center justify-between bg-slate-900/50">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Forward {messagesToForward.length > 1 ? `${messagesToForward.length} Messages` : "Message"}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Select destinations to forward to</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Snippet Preview */}
          {messagesToForward.length > 0 && (
            <div className="px-4 py-2.5 bg-[#162544]/40 border-b border-slate-700/40 text-xs text-slate-300 flex items-start gap-2">
              <CornerDownRight size={14} className="text-[#1E90FF] shrink-0 mt-0.5" />
              <div className="line-clamp-2 italic text-slate-400">
                "{messagesToForward[0]?.content || (messagesToForward[0]?.attachments?.length ? "Attachment" : "Message")}"
                {messagesToForward.length > 1 && ` and ${messagesToForward.length - 1} more`}
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/30">
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats, study circles..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#1E90FF] transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Destination List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
            {/* Direct Messages Section */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 px-1 mb-2 block">
                Direct Messages
              </span>
              {filteredConversations.length === 0 ? (
                <div className="text-xs text-slate-500 px-2 py-1 italic">No chats found</div>
              ) : (
                <div className="space-y-1">
                  {filteredConversations.map((conv) => {
                    const peer = conv.participants.find((p) => p.fullName) || conv.participants[0];
                    const isSelected = selectedDmIds.includes(conv._id);
                    return (
                      <button
                        key={conv._id}
                        type="button"
                        onClick={() => toggleDmSelection(conv._id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#1E90FF]/15 border-[#1E90FF]/60 text-white"
                            : "bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/60 text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {peer?.profilePicture ? (
                              <img src={peer.profilePicture} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              peer?.fullName?.charAt(0) || "U"
                            )}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-semibold text-slate-100">{peer?.fullName || "Student"}</span>
                            <span className="text-[10px] text-slate-400">{peer?.department || peer?.rollNumber || "Direct Message"}</span>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-[#1E90FF] border-[#1E90FF] text-white"
                              : "border-slate-600 bg-slate-800/80 text-transparent"
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Study Circle Channels Section */}
            {textChannels.length > 0 && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 px-1 mb-2 block">
                  Study Circle Channels
                </span>
                <div className="space-y-1">
                  {textChannels.map((chan) => {
                    const id = chan._id || chan.name;
                    const isSelected = selectedChannelId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedChannelId(isSelected ? null : id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500/60 text-white"
                            : "bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/60 text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                            <Users size={15} />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-semibold text-slate-100">#{chan.name}</span>
                            <span className="text-[10px] text-slate-400">{chan.topic || "Channel"}</span>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-slate-600 bg-slate-800/80 text-transparent"
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="p-4 border-t border-slate-700/60 bg-slate-900/60 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {totalSelected === 0 ? "Select at least 1 destination" : `${totalSelected} selected`}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={totalSelected === 0 || isSubmitting}
                onClick={handleForward}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#1E90FF] hover:bg-[#1C86EE] text-white disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md shadow-[#1E90FF]/30"
              >
                <span>{isSubmitting ? "Forwarding..." : `Forward (${totalSelected})`}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ForwardMessageModal;
