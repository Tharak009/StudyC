import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  ShieldCheck,
  User,
  Users,
  Sparkles,
  X,
  MessageCircle,
  GraduationCap,
  Check,
  CheckCheck,
  FileText,
  FileCode,
  Filter
} from "lucide-react";
import type { User as AuthUser } from "../../types/auth";
import { usersApi } from "../../api/users.api";

export interface ConversationItem {
  id: string;
  peer: {
    id: string;
    name: string;
    roll: string;
    dept: string;
    isOnline: boolean;
    lastSeen?: string;
    avatar?: string;
  };
  lastMessage: {
    text: string;
    senderId: string;
    time: string;
    isRead: boolean;
    isDelivered?: boolean;
    hasAttachment?: boolean;
    hasCodeSnippet?: boolean;
  } | null;
  unreadCount: number;
  isPinned?: boolean;
  isFavorite?: boolean;
}

export interface PeerSearchResult {
  id: string;
  name: string;
  roll: string;
  dept: string;
  isOnline: boolean;
  avatar?: string;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  currentUser?: AuthUser | null;
  onStartNewChat?: (peerId: string, customPeer?: { name: string; roll?: string; dept?: string }) => void;
  directoryPeers?: PeerSearchResult[];
}

type FilterTab = "all" | "unread" | "favorites" | "classmates";

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  currentUser,
  onStartNewChat,
  directoryPeers = []
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [peerSearch, setPeerSearch] = useState("");
  const [realUsers, setRealUsers] = useState<AuthUser[]>([]);
  const [isSearchingRealUsers, setIsSearchingRealUsers] = useState(false);

  // Search real registered users from MongoDB Atlas
  React.useEffect(() => {
    if (!newChatModalOpen) return;
    let isMounted = true;
    const fetchRealUsers = async () => {
      setIsSearchingRealUsers(true);
      try {
        const users = await usersApi.search(peerSearch);
        if (isMounted) {
          setRealUsers((users || []).filter((u) => u._id !== currentUser?._id));
        }
      } catch (err) {
        console.error("Failed to search registered users:", err);
      } finally {
        if (isMounted) setIsSearchingRealUsers(false);
      }
    };

    const timer = setTimeout(fetchRealUsers, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [peerSearch, newChatModalOpen, currentUser?._id]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const filteredConversations = conversations.filter((c) => {
    // 1. Filter Tab
    if (filterTab === "unread" && c.unreadCount === 0) return false;
    if (filterTab === "favorites" && !c.isFavorite) return false;
    if (filterTab === "classmates" && c.peer.dept !== (currentUser?.department || "CSE")) {
      // If filtering by department classmates
    }

    // 2. Text Search
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.peer.name.toLowerCase().includes(q) ||
      c.peer.roll.toLowerCase().includes(q) ||
      c.peer.dept.toLowerCase().includes(q) ||
      (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(q))
    );
  });

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <aside className="w-full md:w-80 h-full flex flex-col justify-between border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0B1324]/95 backdrop-blur-xl shrink-0 select-none">
      
      <div className="flex flex-col h-full overflow-hidden">
        
        {/* ── 1. WhatsApp Top Header (Profile + New Chat) ───────────────── */}
        <div className="h-16 px-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-[#080D1A]/80 shrink-0">
          
          {/* User Profile Avatar with Online Ring */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-9 w-9 rounded-2xl overflow-hidden bg-[#1E90FF] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {currentUser?.profilePicture ? (
                  <img
                    src={currentUser.profilePicture}
                    alt={currentUser.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(currentUser?.fullName || "Aarav Sharma")
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0B1324]" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Chats</span>
                {totalUnread > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#1E90FF] text-white">
                    {totalUnread}
                  </span>
                )}
              </h2>
              <span className="text-[10px] text-slate-400 font-medium">Direct Messages</span>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setNewChatModalOpen(true)}
              className="p-2 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF] hover:bg-[#1E90FF] hover:text-white transition-all cursor-pointer shadow-xs"
              title="New Chat"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* ── 2. WhatsApp Search Bar ──────────────────────────────────── */}
        <div className="p-2.5 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search or start a new chat"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] pl-9 pr-7 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* ── 3. WhatsApp Filter Chips (All, Unread, Favorites) ────────── */}
        <div className="px-2.5 py-2 flex items-center gap-1.5 border-b border-slate-200/60 dark:border-slate-800/60 overflow-x-auto scrollbar-none shrink-0 bg-slate-50/40 dark:bg-[#080D1A]/30">
          {[
            { id: "all", label: "All" },
            { id: "unread", label: totalUnread > 0 ? `Unread (${totalUnread})` : "Unread" },
            { id: "favorites", label: "Favorites" },
            { id: "classmates", label: "Classmates" }
          ].map((chip) => {
            const isActive = filterTab === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilterTab(chip.id as FilterTab)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-[#1E90FF] text-white shadow-xs shadow-[#1E90FF]/25"
                    : "bg-slate-200/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* ── 4. WhatsApp Conversation List ───────────────────────────── */}
        <div className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-none">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-3">
              <MessageCircle size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {filterTab === "unread" ? "No unread messages" : "No chats yet"}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Start a peer conversation to collaborate on campus assignments and study materials.
              </p>
              <button
                type="button"
                onClick={() => setNewChatModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-semibold shadow-sm shadow-[#1E90FF]/25 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>New Chat</span>
              </button>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = activeConversationId === c.id;
              const isSentByMe =
                currentUser?._id === c.lastMessage?.senderId ||
                currentUser?.fullName === "Aarav Sharma" ||
                c.lastMessage?.senderId === "u-me";

              return (
                <motion.button
                  key={c.id}
                  onClick={() => onSelectConversation(c.id)}
                  whileHover={{ scale: 1.008 }}
                  whileTap={{ scale: 0.99 }}
                  className={`w-full text-left p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 relative group ${
                    isActive
                      ? "border-[#1E90FF]/40 bg-[#1E90FF]/10 dark:bg-[#1E90FF]/15 shadow-sm shadow-[#1E90FF]/10"
                      : "border-transparent hover:border-slate-200/80 dark:hover:border-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-[#0F1A30]/60"
                  }`}
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <motion.div
                      layoutId="activeDmIndicator"
                      className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#1E90FF]"
                    />
                  )}

                  {/* Avatar with Status Ring */}
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl overflow-hidden bg-[#1E90FF] text-white font-bold text-xs shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                      {c.peer.avatar ? (
                        <img
                          src={c.peer.avatar}
                          alt={c.peer.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(c.peer.name)
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#0B1324] ${
                        c.peer.isOnline ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                      title={c.peer.isOnline ? "Active" : "Offline"}
                    />
                  </div>

                  {/* Peer Info & Last Message */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {c.peer.name}
                        </span>
                        <span className="text-[9px] font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-1 py-0.2 rounded">
                          {c.peer.dept}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] tabular-nums shrink-0 ml-1 ${
                          c.unreadCount > 0
                            ? "text-[#1E90FF] font-bold"
                            : "text-slate-400"
                        }`}
                      >
                        {c.lastMessage?.time}
                      </span>
                    </div>

                    {/* WhatsApp-Style Message Line with Delivery Ticks */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate leading-relaxed min-w-0">
                        {/* WhatsApp checkmarks for messages sent by me */}
                        {isSentByMe && c.lastMessage && (
                          <span
                            className="shrink-0 inline-flex items-center"
                            title={c.lastMessage.isRead ? "Read" : c.lastMessage.isDelivered ? "Delivered" : "Sent"}
                          >
                            {c.lastMessage.isRead ? (
                              <CheckCheck size={14} className="text-[#1E90FF]" />
                            ) : c.lastMessage.isDelivered ? (
                              <CheckCheck size={14} className="text-slate-400" />
                            ) : (
                              <Check size={14} className="text-slate-400" />
                            )}
                          </span>
                        )}

                        {c.lastMessage?.hasAttachment && (
                          <FileText size={12} className="text-[#1E90FF] shrink-0" />
                        )}

                        {c.lastMessage?.hasCodeSnippet && (
                          <FileCode size={12} className="text-[#1E90FF] shrink-0" />
                        )}

                        <span className="truncate">
                          {c.lastMessage ? (
                            c.lastMessage.text
                          ) : (
                            <span className="italic text-slate-400">Started conversation</span>
                          )}
                        </span>
                      </div>

                      {/* Unread Count Badge */}
                      {c.unreadCount > 0 && (
                        <span className="h-4.5 min-w-4.5 px-1.5 rounded-full bg-[#1E90FF] text-white text-[10px] font-black flex items-center justify-center shadow-xs shrink-0">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

      </div>

      {/* ── 5. Start New Peer Chat Modal (Portaled to document.body for true viewport centering) ── */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {newChatModalOpen && (
              <div
                onClick={(e) => {
                  if (e.target === e.currentTarget) setNewChatModalOpen(false);
                }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 transition-opacity"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 12 }}
                  transition={{ duration: 0.18 }}
                  className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setNewChatModalOpen(false)}
                    className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>

                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="h-9 w-9 rounded-2xl bg-[#1E90FF]/15 text-[#1E90FF] flex items-center justify-center shrink-0">
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                        New Peer Conversation
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Connect with verified campus students or initiate a 1-on-1 chat.
                      </p>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative my-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search registered classmate by name, roll, or department..."
                      value={peerSearch}
                      onChange={(e) => setPeerSearch(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] pl-10 pr-8 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/20"
                      autoFocus
                    />
                    {peerSearch && (
                      <button
                        type="button"
                        onClick={() => setPeerSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Real Registered Users List */}
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-none">
                    {isSearchingRealUsers ? (
                      <div className="flex items-center justify-center py-8 text-xs text-slate-400 gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-[#1E90FF] border-t-transparent animate-spin" />
                        <span>Searching registered campus students...</span>
                      </div>
                    ) : realUsers.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {peerSearch.trim()
                            ? `No registered students found matching "${peerSearch}".`
                            : "Type a name or roll number above to find registered students."}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Only real, registered campus accounts can be messaged.
                        </p>
                      </div>
                    ) : (
                      realUsers.map((user) => {
                        const existingConv = conversations.find((c) => c.peer.id === user._id);

                        return (
                          <button
                            key={user._id}
                            type="button"
                            onClick={() => {
                              if (existingConv) {
                                onSelectConversation(existingConv.id);
                              } else {
                                onStartNewChat?.(user._id, {
                                  name: user.fullName,
                                  roll: user.rollNumber || "CSE",
                                  dept: user.department || "Computer Science"
                                });
                              }
                              setNewChatModalOpen(false);
                            }}
                            className="w-full p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 hover:border-[#1E90FF]/50 bg-slate-50/50 dark:bg-[#080D1A]/50 hover:bg-[#1E90FF]/5 dark:hover:bg-[#1E90FF]/10 transition-all flex items-center justify-between text-left cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#1E90FF] to-[#187bcd] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                {user.profilePicture ? (
                                  <img
                                    src={user.profilePicture}
                                    alt={user.fullName}
                                    className="h-full w-full object-cover rounded-xl"
                                  />
                                ) : (
                                  getInitials(user.fullName)
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                                  <span className="truncate">{user.fullName}</span>
                                  <ShieldCheck size={12} className="text-[#1E90FF] shrink-0" />
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {user.rollNumber || "CSE"} • {user.department || "Campus"}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 ml-2">
                              {existingConv ? (
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                                  Active Chat &rarr;
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-[#1E90FF] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                                  <span>Message</span>
                                  <span>&rarr;</span>
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 mt-2">
                    <span>End-to-end encrypted direct channel</span>
                    <button
                      type="button"
                      onClick={() => setNewChatModalOpen(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </aside>
  );
}

export default ConversationList;
