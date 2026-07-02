import { LoaderCircle, MessageSquare, Search, Pin, Star } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { Conversation } from "../types/direct-message";
import { Avatar } from "./avatar";

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelect: (conversation: Conversation) => void;
  selectedId: string | null;
  onlineUserIds: string[];
  currentUserId: string;
  search: string;
  onSearchChange: (value: string) => void;
}

export function ConversationList({
  conversations,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelect,
  selectedId,
  onlineUserIds,
  currentUserId,
  search,
  onSearchChange
}: ConversationListProps) {
  const [activeTab, setActiveTab] = useState<"all" | "pinned" | "unread">("all");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  // Load pinned conversation IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("studyconnect-pinned-chats");
      if (stored) setPinnedIds(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleTogglePin = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = pinnedIds.includes(conversationId)
      ? pinnedIds.filter((id) => id !== conversationId)
      : [...pinnedIds, conversationId];
    
    setPinnedIds(updated);
    localStorage.setItem("studyconnect-pinned-chats", JSON.stringify(updated));
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let list = [...conversations];

    // Filter by search
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((c) => {
        const other = c.participants.find((p) => p._id !== currentUserId);
        return other?.fullName.toLowerCase().includes(query);
      });
    }

    // Filter by tab
    if (activeTab === "pinned") {
      list = list.filter((c) => pinnedIds.includes(c._id));
    } else if (activeTab === "unread") {
      // Show chats where last message exists and is not from current user
      list = list.filter((c) => c.lastMessage && c.lastMessage.senderId !== currentUserId);
    }

    // Sort: pinned conversations first, then sorted by latest message
    list.sort((a, b) => {
      const aPinned = pinnedIds.includes(a._id) ? 1 : 0;
      const bPinned = pinnedIds.includes(b._id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    return list;
  }, [conversations, search, activeTab, pinnedIds, currentUserId]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays === 1) {
      return "Yesterday";
    }
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <aside className="flex w-full flex-col border-r border-slate-200 dark:border-white/10 lg:w-80 shrink-0 bg-white dark:bg-ink-900 h-full">
      {/* Search Input */}
      <div className="p-3 border-b border-slate-100 dark:border-white/5">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="field pl-9 text-xs py-2 bg-slate-50 border-0 dark:bg-black/20"
            placeholder="Search conversations..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      {/* Tabs segment */}
      <div className="flex border-b border-slate-100 dark:border-white/5 px-2 bg-slate-50/50 dark:bg-black/10">
        {(["all", "pinned", "unread"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer text-center ${
              activeTab === tab
                ? "border-indigo-650 text-indigo-750 dark:border-indigo-500 dark:text-indigo-400 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoaderCircle className="animate-spin text-indigo-600" size={24} />
          </div>
        )}

        {!isLoading && filteredConversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4 text-xs text-slate-500">
            <MessageSquare size={24} className="mb-2 opacity-40 text-indigo-650" />
            <p className="font-semibold">{search ? "No conversations match" : "No conversations yet"}</p>
            <p className="mt-0.5 text-[10px] opacity-75">
              {activeTab === "pinned"
                ? "Click the star icon to pin your favorite chats here."
                : activeTab === "unread"
                ? "No new unread messages."
                : "Search for a student user to start a chat."}
            </p>
          </div>
        )}

        <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
          {filteredConversations.map((conversation) => {
            const other = conversation.participants.find(
              (p) => p._id !== currentUserId
            );
            if (!other) return null;
            const online = onlineUserIds.includes(other._id);
            const isPinned = pinnedIds.includes(conversation._id);
            const isSelected = selectedId === conversation._id;

            return (
              <li key={conversation._id}>
                <button
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-slate-50/80 dark:hover:bg-white/[0.02] relative group cursor-pointer ${
                    isSelected ? "bg-slate-50 dark:bg-white/[0.03] border-l-2 border-indigo-600" : "border-l-2 border-transparent"
                  }`}
                  type="button"
                  onClick={() => onSelect(conversation)}
                >
                  <div className="relative shrink-0">
                    <Avatar name={other.fullName} src={other.profilePicture} className="size-9 ring-2 ring-slate-100 dark:ring-white/5" />
                    {online && (
                      <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-ink-900" />
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`truncate text-xs font-bold ${isSelected ? "text-indigo-650 dark:text-indigo-400" : "text-slate-800 dark:text-slate-200"}`}>
                        {other.fullName}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {conversation.lastMessage && (
                          <span className="shrink-0 text-[10px] text-slate-400 font-medium">
                            {formatTime(new Date(conversation.lastMessage.createdAt))}
                          </span>
                        )}
                        <button
                          onClick={(e) => handleTogglePin(e, conversation._id)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 ${
                            isPinned ? "opacity-100 text-amber-500" : "text-slate-400"
                          }`}
                          title={isPinned ? "Unpin chat" : "Pin chat"}
                        >
                          <Star size={11} fill={isPinned ? "currentColor" : "transparent"} />
                        </button>
                      </div>
                    </div>
                    <p className="truncate text-[11px] text-slate-450 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {conversation.lastMessage?.content ?? "No messages yet"}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {hasNextPage && (
          <div className="p-3 text-center">
            <button
              className="secondary-button text-xs py-1 px-3"
              type="button"
              onClick={onLoadMore}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
