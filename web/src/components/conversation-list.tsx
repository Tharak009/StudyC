import { LoaderCircle, MessageSquare, Search } from "lucide-react";
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
  return (
    <aside className="flex w-full flex-col border-r border-slate-200 dark:border-white/10 lg:w-80">
      <div className="border-b border-slate-200 p-3 dark:border-white/10">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="field pl-9 text-sm"
            placeholder="Search conversations..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoaderCircle className="animate-spin" size={24} />
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-slate-500">
            <MessageSquare size={32} className="mb-2 opacity-50" />
            <p>{search ? "No conversations match" : "No conversations yet"}</p>
            <p className="mt-1 text-xs">Search for a user to start messaging</p>
          </div>
        )}

        <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
          {conversations.map((conversation) => {
            const other = conversation.participants.find(
              (p) => p._id !== currentUserId
            );
            if (!other) return null;
            const online = onlineUserIds.includes(other._id);

            return (
              <li key={conversation._id}>
                <button
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04] ${
                    selectedId === conversation._id
                      ? "bg-slate-100 dark:bg-white/[0.06]"
                      : ""
                  }`}
                  type="button"
                  onClick={() => onSelect(conversation)}
                >
                  <div className="relative shrink-0">
                    <Avatar name={other.fullName} src={other.profilePicture} className="size-10" />
                    {online && (
                      <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-emerald-500 dark:border-ink-900" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-semibold">{other.fullName}</p>
                      {conversation.lastMessage && (
                        <span className="ml-2 shrink-0 text-xs text-slate-400">
                          {formatTime(new Date(conversation.lastMessage.createdAt))}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {conversation.lastMessage?.content ?? "No messages yet"}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {hasNextPage && (
          <div className="p-3">
            <button
              className="secondary-button w-full text-sm"
              type="button"
              onClick={onLoadMore}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage && <LoaderCircle className="animate-spin" size={14} />}
              Load more
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}
