import React from "react";
import {
  Users,
  Plus,
  Search,
  X,
  MessageSquare,
  Mic,
  MicOff,
  Headphones,
  Settings,
  ShieldCheck,
  CheckCheck
} from "lucide-react";
import type { ConversationItem } from "../dm/ConversationList";
import type { User as AuthUser } from "../../types/auth";

interface DMSidebarProps {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  activeView: "friends" | "conversation";
  pendingRequestsCount?: number;
  onSelectFriends: () => void;
  onSelectConversation: (convId: string) => void;
  onOpenNewChat: () => void;
  onCloseConversation?: (convId: string, e: React.MouseEvent) => void;
  currentUser?: AuthUser | null;
}

export function DMSidebar({
  conversations,
  activeConversationId,
  activeView,
  pendingRequestsCount = 0,
  onSelectFriends,
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
      className="w-64 h-full shrink-0 flex flex-col justify-between bg-[#0B132B] border-r border-[#162544] select-none text-gray-300"
    >
      {/* ── Top Header / Search ────────────────────────────────────────── */}
      <div className="p-3 border-b border-[#162544]/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Find or start a chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#080D1A] border border-[#162544] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* ── Navigation & Direct Messages List ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-3 space-y-4">
        {/* Friends Primary Navigation Button */}
        <div>
          <button
            type="button"
            onClick={onSelectFriends}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === "friends"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "hover:bg-[#162544] text-gray-300 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>Friends</span>
            </div>

            {pendingRequestsCount > 0 && (
              <span className="flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* Direct Messages Section Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold text-gray-400 tracking-wider">
            <span>DIRECT MESSAGES</span>
            <button
              type="button"
              onClick={onOpenNewChat}
              title="Create DM / Add Friend"
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#162544] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Conversations List */}
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500">
              {searchQuery ? "No conversations found" : "No recent chats"}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredConversations.map((conv) => {
                const isActive =
                  activeView === "conversation" && activeConversationId === conv.id;
                const peerInitial = (conv.peer.name || "S").charAt(0).toUpperCase();

                return (
                  <div
                    key={conv.id}
                    className="relative group flex items-center"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all text-left ${
                        isActive
                          ? "bg-[#162544] text-white font-semibold"
                          : "hover:bg-[#0F1A30] text-gray-300 hover:text-white"
                      }`}
                    >
                      {/* Avatar with Presence Indicator */}
                      <div className="relative shrink-0">
                        {conv.peer.avatar ? (
                          <img
                            src={conv.peer.avatar}
                            alt={conv.peer.name}
                            className="h-8 w-8 rounded-full object-cover border border-[#162544]"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            {peerInitial}
                          </div>
                        )}
                        {/* Status Dot */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0B132B] ${
                            conv.peer.isOnline ? "bg-emerald-500" : "bg-slate-500"
                          }`}
                        />
                      </div>

                      {/* Text details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-xs font-semibold text-gray-200">
                            {conv.peer.name}
                          </span>
                          {conv.unreadCount > 0 && (
                            <span className="ml-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#1E90FF] text-[9px] font-bold text-white shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>

                        <p className="truncate text-[11px] text-gray-400 mt-0.5">
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
                        className="absolute right-2 hidden group-hover:flex p-1 rounded-md text-gray-400 hover:text-white hover:bg-black/40 transition-colors"
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
      <div className="p-2.5 bg-[#080D1A] border-t border-[#162544] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            {currentUser?.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt={currentUser.fullName}
                className="h-8 w-8 rounded-full object-cover border border-[#162544]"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {(currentUser?.fullName || "Me").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#080D1A]" />
          </div>

          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate flex items-center gap-1">
              <span>{currentUser?.fullName || "Student"}</span>
              {currentUser?.role === "ADMIN" && (
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              )}
            </div>
            <div className="text-[10px] text-gray-400 truncate">
              {currentUser?.rollNumber || "Online"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 text-gray-400">
          <button
            type="button"
            title="Online Presence"
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#162544] transition-colors"
          >
            <Mic className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button
            type="button"
            title="Audio Settings"
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#162544] transition-colors"
          >
            <Headphones className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default DMSidebar;
