import React from "react";
import {
  Plus,
  Search,
  X,
  MessageSquare,
  Mic,
  Headphones,
  ShieldCheck
} from "lucide-react";
import type { ConversationItem } from "../dm/ConversationList";
import type { User as AuthUser } from "../../types/auth";

interface DMSidebarProps {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  onSelectConversation: (convId: string) => void;
  onOpenNewChat: () => void;
  onCloseConversation?: (convId: string, e: React.MouseEvent) => void;
  currentUser?: AuthUser | null;
}

export function DMSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenNewChat,
  onCloseConversation,
  currentUser
}: DMSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.peer.name.toLowerCase().includes(q) ||
      c.peer.roll?.toLowerCase().includes(q) ||
      c.peer.dept?.toLowerCase().includes(q) ||
      (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(q))
    );
  });

  return (
    <aside
      aria-label="Direct Messages navigation"
      className="w-64 h-full shrink-0 flex flex-col justify-between bg-white/95 dark:bg-[#0B1324]/95 border-r border-slate-200/80 dark:border-slate-800/80 select-none text-slate-700 dark:text-slate-300 transition-colors duration-200"
    >
      {/* ── Top Header / Search ────────────────────────────────────────── */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Find or start a chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] transition-colors"
          />
        </div>
      </div>

      {/* ── Navigation & Direct Messages List ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-3 space-y-2">
        {/* Direct Messages Section Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            <span>DIRECT MESSAGES</span>
            <button
              type="button"
              onClick={onOpenNewChat}
              title="Start New Direct Message"
              className="p-1 rounded-lg text-slate-400 hover:text-[#1E90FF] dark:hover:text-[#1E90FF] hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Conversations List */}
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
              {searchQuery ? "No conversations found" : "No recent chats"}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredConversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                const peerInitial = (conv.peer.name || "S").charAt(0).toUpperCase();

                return (
                  <div
                    key={conv.id}
                    className="relative group flex items-center"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                        isActive
                          ? "bg-slate-200/80 dark:bg-[#162544] text-slate-900 dark:text-white font-semibold shadow-xs"
                          : "hover:bg-slate-100/80 dark:hover:bg-[#0F1A30] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {/* Avatar with Presence Indicator */}
                      <div className="relative shrink-0">
                        {conv.peer.avatar ? (
                          <img
                            src={conv.peer.avatar}
                            alt={conv.peer.name}
                            className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            {peerInitial}
                          </div>
                        )}
                        {/* Status Dot */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#0B1324] ${
                            conv.peer.isOnline ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"
                          }`}
                        />
                      </div>

                      {/* Text details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {conv.peer.name}
                          </span>
                          {conv.unreadCount > 0 && (
                            <span className="ml-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#1E90FF] text-[9px] font-bold text-white shrink-0 shadow-xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>

                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {conv.lastMessage?.text || conv.peer.dept || "Campus Peer"}
                        </p>
                      </div>
                    </button>

                    {/* Hover Close Button */}
                    {onCloseConversation && (
                      <button
                        type="button"
                        onClick={(e) => onCloseConversation(conv.id, e)}
                        title="Close chat"
                        className="absolute right-2 hidden group-hover:flex p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: Discord User Profile Card ─────────────────────────── */}
      <div className="p-2.5 bg-slate-50 dark:bg-[#080D1A] border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            {currentUser?.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt={currentUser.fullName}
                className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-800"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[#1E90FF] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {(currentUser?.fullName || "Me").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-50 dark:ring-[#080D1A]" />
          </div>

          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
              <span>{currentUser?.fullName || "Student"}</span>
              {currentUser?.role === "ADMIN" && (
                <ShieldCheck className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
              )}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {currentUser?.rollNumber || "Online"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 text-slate-400">
          <button
            type="button"
            title="Online Presence"
            className="p-1.5 rounded-lg hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#162544] transition-colors cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </button>
          <button
            type="button"
            title="Audio Settings"
            className="p-1.5 rounded-lg hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#162544] transition-colors cursor-pointer"
          >
            <Headphones className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default DMSidebar;
