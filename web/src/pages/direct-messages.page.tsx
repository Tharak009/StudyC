import { MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Socket } from "socket.io-client";
import { ConversationList } from "../components/conversation-list";
import { UserSearch } from "../components/user-search";
import { useConversations } from "../hooks/use-direct-message";
import { socketService } from "../services/socket.service";
import { useAuthStore } from "../store/auth.store";
import { useDirectMessageStore } from "../store/direct-message.store";
import type { Conversation } from "../types/direct-message";
import type { User } from "../types/auth";

export function DirectMessagesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user!)!;
  const { conversations, setConversations, addConversation } = useDirectMessageStore();
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const socketRef = useRef<Socket | null>(null);

  const conversationsQuery = useConversations(search || undefined);

  useEffect(() => {
    const allPages = conversationsQuery.data?.pages.flatMap((p) => p.items) ?? [];
    if (allPages.length > 0) setConversations(allPages);
  }, [conversationsQuery.data, setConversations]);

  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;
    socketRef.current = socket;

    const onConnect = () => {
      socket.emit("presence:subscribe", { userIds: [] });
    };
    const onFriendOnline = (payload: { userId: string }) =>
      setOnlineUserIds((current) => [...new Set([...current, payload.userId])]);
    const onFriendOffline = (payload: { userId: string }) =>
      setOnlineUserIds((current) => current.filter((id) => id !== payload.userId));
    const onConversationCreated = (conversation: Conversation) => {
      addConversation(conversation);
    };

    socket.on("connect", onConnect);
    socket.on("friendOnline", onFriendOnline);
    socket.on("friendOffline", onFriendOffline);
    socket.on("conversationCreated", onConversationCreated);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("friendOnline", onFriendOnline);
      socket.off("friendOffline", onFriendOffline);
      socket.off("conversationCreated", onConversationCreated);
    };
  }, [user._id, addConversation]);

  const handleSelect = useCallback(
    (conversation: Conversation) => {
      navigate(`/direct-messages/${conversation._id}`);
    },
    [navigate]
  );

  const handleUserSelect = useCallback(
    async (selectedUser: User) => {
      const socket = socketRef.current;
      if (!socket) return;
      socket.emit(
        "startConversation",
        { receiverId: selectedUser._id },
        (ack: { success: boolean; data: Conversation }) => {
          if (ack.success) {
            addConversation(ack.data);
            navigate(`/direct-messages/${ack.data._id}`);
          }
        }
      );
    },
    [navigate, addConversation]
  );

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100vh-4rem)] animate-fade-up overflow-hidden sm:-mx-7 lg:-mx-10 lg:-my-10">
      <ConversationList
        conversations={conversations}
        isLoading={conversationsQuery.isLoading}
        hasNextPage={conversationsQuery.hasNextPage ?? false}
        isFetchingNextPage={conversationsQuery.isFetchingNextPage}
        onLoadMore={() => conversationsQuery.fetchNextPage()}
        onSelect={handleSelect}
        selectedId={null}
        onlineUserIds={onlineUserIds}
        currentUserId={user._id}
        search={search}
        onSearchChange={setSearch}
      />

      <section className="hidden flex-1 flex-col items-center justify-center lg:flex">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-slate-100 p-4 dark:bg-white/[0.06]">
            <MessageSquare size={40} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold">Your Messages</h2>
          <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
            Select a conversation from the left or search for a user to start messaging
          </p>
          <div className="mt-2 w-72">
            <UserSearch onSelect={handleUserSelect} excludeIds={[user._id]} />
          </div>
        </div>
      </section>
    </div>
  );
}
