import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  X,
  Search,
  MessageSquare,
  Hash,
  Check,
  Loader2,
  Send,
  Users
} from "lucide-react";
import type { LocalMessage, StreamChat, Channel as StreamChannel } from "stream-chat";
import { useToastStore } from "../../../store/toast.store";

export interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: LocalMessage[];
  client: StreamChat;
  onForwardComplete?: () => void;
}

interface DestinationItem {
  id: string;
  cid: string;
  name: string;
  avatar?: string;
  type: "dm" | "community";
  subtitle?: string;
  channel: StreamChannel;
}

export function ForwardMessageModal({
  isOpen,
  onClose,
  messages,
  client,
  onForwardComplete
}: ForwardMessageModalProps) {
  const [search, setSearch] = useState("");
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { addToast } = useToastStore();

  // Load available DM and Community channels
  useEffect(() => {
    if (!isOpen || !client.userID) return;
    let isMounted = true;
    setLoading(true);

    async function loadDestinations() {
      try {
        const channels = await client.queryChannels(
          {
            members: { $in: [client.userID as string] }
          },
          { last_message_at: -1 },
          { limit: 30, state: true }
        );

        if (!isMounted) return;

        const items: DestinationItem[] = channels.map((chan) => {
          const isDM = chan.type === "messaging";
          let name = (chan.data as any)?.name as string;
          let avatar: string | undefined = undefined;
          let subtitle = "";

          if (isDM) {
            const members = Object.values(chan.state.members || {});
            const peer = members.find((m) => m.user_id !== client.userID) || members[0];
            name = (peer?.user?.name as string) || "Classmate";
            avatar = peer?.user?.image as string;
            subtitle = ((peer?.user as any)?.department as string) || "Direct Message";
          } else {
            name = name || chan.id;
            subtitle = ((chan.data as any)?.communityName as string) || "Community Channel";
          }

          return {
            id: chan.id,
            cid: chan.cid,
            name,
            avatar,
            type: isDM ? "dm" : "community",
            subtitle,
            channel: chan
          };
        });

        setDestinations(items);
      } catch (err) {
        console.error("Failed to load forward destinations:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDestinations();
    return () => {
      isMounted = false;
    };
  }, [isOpen, client]);

  const filtered = useMemo(() => {
    if (!search.trim()) return destinations;
    const q = search.toLowerCase();
    return destinations.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.subtitle && d.subtitle.toLowerCase().includes(q))
    );
  }, [destinations, search]);

  if (!isOpen) return null;

  const handleSendForward = async () => {
    if (!selectedChannelId || messages.length === 0) return;
    const target = destinations.find((d) => d.id === selectedChannelId);
    if (!target) return;

    setSending(true);
    try {
      for (const msg of messages) {
        const originalSenderName = msg.user?.name || "Classmate";
        const originalSenderAvatar = msg.user?.image;
        const originalSenderId = msg.user?.id || "";

        await target.channel.sendMessage({
          text: msg.text || "",
          attachments: msg.attachments || [],
          forwarded: true,
          forwarded_from: {
            id: originalSenderId,
            name: originalSenderName,
            avatar: originalSenderAvatar
          }
        } as any);
      }

      addToast(
        messages.length === 1
          ? `Message forwarded to ${target.name}`
          : `${messages.length} messages forwarded to ${target.name}`,
        "success"
      );

      onForwardComplete?.();
      onClose();
    } catch (err: any) {
      addToast(err?.message || "Failed to forward message", "error");
    } finally {
      setSending(false);
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
          className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#0D1524] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100 max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#090F1A] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#1E90FF]">
                <Share2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Forward {messages.length > 1 ? `${messages.length} Messages` : "Message"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Choose a peer or study channel destination
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

          {/* Snippet Preview of Forwarded Content */}
          <div className="px-6 py-3 bg-slate-50/80 dark:bg-[#111929] border-b border-slate-100 dark:border-slate-800 shrink-0">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Forwarding content:
            </p>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#0D1524] border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-200 line-clamp-2 italic">
              {messages.length === 1
                ? messages[0].text || (messages[0].attachments?.length ? "[Attachment]" : "")
                : `${messages.length} messages selected (${messages.map((m) => m.user?.name || "Classmate").slice(0, 3).join(", ")})`}
            </div>
          </div>

          {/* Search Input */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0D1524] shrink-0">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search classmates or channels..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-transparent focus:border-[#1E90FF] rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Destination List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <Loader2 size={24} className="animate-spin text-[#1E90FF]" />
                <span>Loading conversations...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No matching classmates or channels found.
              </div>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedChannelId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedChannelId(item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-sky-50 dark:bg-sky-950/40 border-[#1E90FF] ring-1 ring-[#1E90FF]/30"
                        : "bg-slate-50/60 dark:bg-[#121B2D] border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                        ) : item.type === "dm" ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center">
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center">
                            <Hash size={16} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{item.subtitle}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                        isSelected
                          ? "border-[#1E90FF] bg-[#1E90FF] text-white"
                          : "border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0 bg-slate-50/30 dark:bg-[#0A1120]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedChannelId || sending}
              onClick={handleSendForward}
              className="px-4 py-2 rounded-xl bg-[#1E90FF] hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {sending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Forwarding...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
