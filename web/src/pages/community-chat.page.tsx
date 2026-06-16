import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, LoaderCircle, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import type { Socket } from "socket.io-client";
import { chatApi } from "../api/chat.api";
import { communitiesApi } from "../api/communities.api";
import { MessageBubble } from "../components/message-bubble";
import { MessageInput } from "../components/message-input";
import { OnlineMembersPanel } from "../components/online-members-panel";
import { TypingIndicator } from "../components/typing-indicator";
import { socketService } from "../services/socket.service";
import { useAuthStore } from "../store/auth.store";
import type { ChatMessage } from "../types/chat";
import { getErrorMessage } from "../utils/errors";

type Ack<T> = { success: true; data: T } | { success: false; message: string };

export function CommunityChatPage() {
  const { id } = useParams();
  const user = useAuthStore((state) => state.user)!;
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);

  const community = useQuery({
    queryKey: ["community", id],
    queryFn: () => communitiesApi.details(id!),
    enabled: Boolean(id)
  });
  const members = useQuery({
    queryKey: ["community-members", id],
    queryFn: () => communitiesApi.members(id!),
    enabled: Boolean(id)
  });
  const history = useInfiniteQuery({
    queryKey: ["community-messages", id],
    queryFn: ({ pageParam }) => chatApi.history(id!, { page: pageParam, limit: 30, order: "latest" }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
    enabled: Boolean(id)
  });

  useEffect(() => {
    const loaded = history.data?.pages.flatMap((page) => page.items) ?? [];
    setMessages((current) => mergeMessages(loaded, current));
  }, [history.data]);

  useEffect(() => {
    if (!id) return;
    const socket = socketService.connect();
    if (!socket) return;

    const onConnect = () => {
      setConnected(true);
      socket.emit("joinCommunity", { communityId: id }, (ack: Ack<{ onlineUserIds: string[] }>) => {
        if (ack.success) setOnlineUserIds(ack.data.onlineUserIds);
        else setSocketError(ack.message);
      });
    };
    const onDisconnect = () => setConnected(false);
    const onCreated = (message: ChatMessage) => setMessages((current) => mergeMessages([message], current));
    const onUpdated = (message: ChatMessage) =>
      setMessages((current) => current.map((item) => (item._id === message._id ? message : item)));
    const onDeleted = onUpdated;
    const onUserTyping = (payload: { userId: string }) => {
      if (payload.userId !== user._id) setTypingUserIds((current) => [...new Set([...current, payload.userId])]);
    };
    const onUserStoppedTyping = (payload: { userId: string }) =>
      setTypingUserIds((current) => current.filter((item) => item !== payload.userId));
    const onPresence = (payload: { onlineUserIds: string[] }) => setOnlineUserIds(payload.onlineUserIds);
    const onError = (payload: { message: string }) => setSocketError(payload.message);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("messageCreated", onCreated);
    socket.on("messageUpdated", onUpdated);
    socket.on("messageDeleted", onDeleted);
    socket.on("userTyping", onUserTyping);
    socket.on("userStoppedTyping", onUserStoppedTyping);
    socket.on("userJoined", onPresence);
    socket.on("userLeft", onPresence);
    socket.on("chatError", onError);

    if (socket.connected) onConnect();

    return () => {
      socket.emit("leaveCommunity", { communityId: id });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("messageCreated", onCreated);
      socket.off("messageUpdated", onUpdated);
      socket.off("messageDeleted", onDeleted);
      socket.off("userTyping", onUserTyping);
      socket.off("userStoppedTyping", onUserStoppedTyping);
      socket.off("userJoined", onPresence);
      socket.off("userLeft", onPresence);
      socket.off("chatError", onError);
    };
  }, [id, user._id]);

  const attachmentMutation = useMutation({
    mutationFn: ({ content, files }: { content: string; files: File[] }) =>
      chatApi.create(id!, { content, attachments: files, replyTo: replyTo?._id }),
    onSuccess: (message) => {
      setMessages((current) => mergeMessages([message], current));
      queryClient.invalidateQueries({ queryKey: ["community-messages", id] });
    }
  });

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    members.data?.forEach((member) => map.set(member.userId._id, member.userId.fullName));
    return map;
  }, [members.data]);

  const orderedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const canModerate = community.data?.membershipRole === "OWNER" || community.data?.membershipRole === "MODERATOR";
  const typingNames = typingUserIds.map((userId) => memberNameById.get(userId)).filter(Boolean) as string[];

  const sendText = (socket: Socket, content: string) => {
    socket.emit(
      "sendMessage",
      { communityId: id, content, replyTo: replyTo?._id },
      (ack: Ack<ChatMessage>) => {
        if (ack.success) setMessages((current) => mergeMessages([ack.data], current));
        else setSocketError(ack.message);
      }
    );
  };

  const editMessage = (socket: Socket, content: string) => {
    if (!editing) return;
    socket.emit(
      "editMessage",
      { communityId: id, messageId: editing._id, content },
      (ack: Ack<ChatMessage>) => {
        if (ack.success) {
          setMessages((current) => current.map((item) => (item._id === ack.data._id ? ack.data : item)));
          setEditing(null);
        } else {
          setSocketError(ack.message);
        }
      }
    );
  };

  const activeSocket = socketService.get();

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100vh-4rem)] animate-fade-up overflow-hidden bg-slate-50 dark:bg-ink-950 sm:-mx-7 lg:-mx-10 lg:-my-10">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-ink-900">
          <div className="min-w-0">
            <Link to={`/communities/${id}`} className="text-xs font-semibold text-signal-600 dark:text-signal-300">
              Back to community
            </Link>
            <h1 className="flex min-w-0 items-center gap-2 truncate text-lg font-semibold">
              <Hash size={18} />
              {community.data?.name ?? "Community chat"}
            </h1>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            connected ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
          }`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? "Connected" : "Offline"}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {history.hasNextPage && (
            <button
              type="button"
              className="secondary-button mx-auto mb-4 flex"
              onClick={() => history.fetchNextPage()}
              disabled={history.isFetchingNextPage}
            >
              {history.isFetchingNextPage && <LoaderCircle className="animate-spin" size={16} />}
              Load older messages
            </button>
          )}
          {orderedMessages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isOwn={message.senderId._id === user._id}
              canModerate={Boolean(canModerate)}
              onReply={(next) => {
                setReplyTo(next);
                setEditing(null);
              }}
              onEdit={(next) => {
                setEditing(next);
                setReplyTo(null);
              }}
              onDelete={(next) => {
                activeSocket?.emit("deleteMessage", { communityId: id, messageId: next._id });
              }}
            />
          ))}
          {orderedMessages.length === 0 && !history.isLoading && (
            <div className="py-20 text-center text-sm text-slate-500 dark:text-slate-400">
              Start the first conversation in this community.
            </div>
          )}
        </div>

        <TypingIndicator names={typingNames} />
        {(socketError || attachmentMutation.isError) && (
          <p role="alert" className="mx-3 mb-2 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
            {socketError ?? getErrorMessage(attachmentMutation.error)}
          </p>
        )}
        <MessageInput
          disabled={!connected && !activeSocket}
          replyTo={replyTo}
          editing={editing}
          onCancelContext={() => {
            setReplyTo(null);
            setEditing(null);
          }}
          onSend={(content, files) => {
            setSocketError(null);
            if (files.length > 0) attachmentMutation.mutate({ content, files });
            else if (activeSocket) sendText(activeSocket, content);
            setReplyTo(null);
          }}
          onEdit={(content) => {
            if (activeSocket) editMessage(activeSocket, content);
          }}
          onTypingStart={() => activeSocket?.emit("typingStart", { communityId: id })}
          onTypingStop={() => activeSocket?.emit("typingStop", { communityId: id })}
        />
      </section>

      <OnlineMembersPanel members={members.data ?? []} onlineUserIds={onlineUserIds} />
    </div>
  );
}

const mergeMessages = (incoming: ChatMessage[], current: ChatMessage[]) => {
  const byId = new Map<string, ChatMessage>();
  [...current, ...incoming].forEach((message) => byId.set(message._id, message));
  return [...byId.values()];
};
