import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import type { Socket } from "socket.io-client";
import { directMessagesApi } from "../api/direct-messages.api";
import { ChatWindow } from "../components/chat-window";
import { MessageInput } from "../components/message-input";
import { OnlineStatusBadge } from "../components/online-status-badge";
import { socketService } from "../services/socket.service";
import { useAuthStore } from "../store/auth.store";
import { useConversation, useMessages } from "../hooks/use-direct-message";
import type { DirectMessage } from "../types/direct-message";
import { getErrorMessage } from "../utils/errors";

type Ack<T> = { success: true; data: T } | { success: false; message: string };

export function ConversationPage() {
  const { conversationId } = useParams();
  const user = useAuthStore((state) => state.user!)!;
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [editing, setEditing] = useState<DirectMessage | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);

  const conversation = useConversation(conversationId);
  const history = useMessages(conversationId);

  const participant = useMemo(() => {
    return conversation.data?.participants.find((p) => p._id !== user._id);
  }, [conversation.data, user._id]);

  useEffect(() => {
    const loaded = history.data?.pages.flatMap((page) => page.items) ?? [];
    setMessages((current) => mergeMessages(loaded, current));
  }, [history.data]);

  useEffect(() => {
    if (!conversationId) return;
    const socket = socketService.connect();
    if (!socket) return;

    const onConnect = () => {
      setConnected(true);
      socket.emit("joinConversation", { conversationId }, (ack: Ack<unknown>) => {
        if (!ack.success) setSocketError(ack.message);
      });
      socket.emit("markAsRead", { conversationId });
    };
    const onDisconnect = () => setConnected(false);
    const onCreated = (message: DirectMessage) => {
      setMessages((current) => mergeMessages([message], current));
      if (message.senderId._id !== user._id) {
        socket.emit("markAsRead", { conversationId });
      }
    };
    const onUpdated = (message: DirectMessage) =>
      setMessages((current) => current.map((item) => (item._id === message._id ? message : item)));
    const onDeleted = onUpdated;
    const onUserTyping = (payload: { userId: string }) => {
      if (payload.userId !== user._id)
        setTypingUserIds((current) => [...new Set([...current, payload.userId])]);
    };
    const onUserStoppedTyping = (payload: { userId: string }) =>
      setTypingUserIds((current) => current.filter((id) => id !== payload.userId));
    const onFriendOnline = (payload: { userId: string }) =>
      setOnlineUserIds((current) => [...new Set([...current, payload.userId])]);
    const onFriendOffline = (payload: { userId: string }) =>
      setOnlineUserIds((current) => current.filter((id) => id !== payload.userId));
    const onError = (payload: { message: string }) => setSocketError(payload.message);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("directMessageCreated", onCreated);
    socket.on("directMessageUpdated", onUpdated);
    socket.on("directMessageDeleted", onDeleted);
    socket.on("userTyping", onUserTyping);
    socket.on("userStoppedTyping", onUserStoppedTyping);
    socket.on("friendOnline", onFriendOnline);
    socket.on("friendOffline", onFriendOffline);
    socket.on("dmError", onError);

    if (socket.connected) onConnect();

    return () => {
      socket.emit("leaveConversation", { conversationId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("directMessageCreated", onCreated);
      socket.off("directMessageUpdated", onUpdated);
      socket.off("directMessageDeleted", onDeleted);
      socket.off("userTyping", onUserTyping);
      socket.off("userStoppedTyping", onUserStoppedTyping);
      socket.off("friendOnline", onFriendOnline);
      socket.off("friendOffline", onFriendOffline);
      socket.off("dmError", onError);
    };
  }, [conversationId, user._id]);

  const isOnline = participant ? onlineUserIds.includes(participant._id) : false;

  const attachmentMutation = useMutation({
    mutationFn: ({ content, files }: { content: string; files: File[] }) =>
      directMessagesApi.sendMessage(conversationId!, {
        content,
        attachments: files,
        replyTo: replyTo?._id
      }),
    onSuccess: (message) => {
      setMessages((current) => mergeMessages([message], current));
      queryClient.invalidateQueries({ queryKey: ["direct-messages", "messages", conversationId] });
    }
  });

  const sendText = useCallback(
    (socket: Socket, content: string) => {
      socket.emit(
        "sendDirectMessage",
        { conversationId, content, replyTo: replyTo?._id },
        (ack: Ack<DirectMessage>) => {
          if (ack.success) setMessages((current) => mergeMessages([ack.data], current));
          else setSocketError(ack.message);
        }
      );
    },
    [conversationId, replyTo]
  );

  const editMessage = useCallback(
    (socket: Socket, content: string) => {
      if (!editing) return;
      socket.emit(
        "editDirectMessage",
        { conversationId, messageId: editing._id, content },
        (ack: Ack<DirectMessage>) => {
          if (ack.success) {
            setMessages((current) =>
              current.map((item) => (item._id === ack.data._id ? ack.data : item))
            );
            setEditing(null);
          } else {
            setSocketError(ack.message);
          }
        }
      );
    },
    [conversationId, editing]
  );

  const activeSocket = socketService.get();

  if (!conversationId) return null;

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100vh-4rem)] animate-fade-up overflow-hidden bg-slate-50 dark:bg-ink-950 sm:-mx-7 lg:-mx-10 lg:-my-10">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-ink-900">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/direct-messages"
              className="icon-button shrink-0 lg:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={18} />
            </Link>
            <Link
              to="/direct-messages"
              className="hidden text-xs font-semibold text-signal-600 hover:text-signal-700 lg:block dark:text-signal-300"
            >
              All messages
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">
                {participant?.fullName ?? "Conversation"}
              </h1>
              {participant && (
                <OnlineStatusBadge
                  online={isOnline}
                  className="truncate"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                connected
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connected ? "Connected" : "Offline"}
            </span>
            <button className="icon-button" type="button" aria-label="More options">
              <MoreVertical size={18} />
            </button>
          </div>
        </header>

        <ChatWindow
          messages={messages}
          isLoading={history.isLoading}
          hasNextPage={history.hasNextPage}
          isFetchingNextPage={history.isFetchingNextPage}
          onLoadMore={() => history.fetchNextPage()}
                    typingUserIds={typingUserIds}
          participantName={participant?.fullName ?? "User"}
          participantId={participant?._id ?? ""}
          currentUserId={user._id}
          onReply={(message) => {
            setReplyTo(message);
            setEditing(null);
          }}
          onEdit={(message) => {
            setEditing(message);
            setReplyTo(null);
          }}
        />

        {(socketError || attachmentMutation.isError) && (
          <p
            role="alert"
            className="mx-3 mb-2 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300"
          >
            {socketError ?? getErrorMessage(attachmentMutation.error)}
          </p>
        )}

        <MessageInput
          disabled={!connected && !activeSocket}
          replyTo={replyTo}
          editing={editing}
          placeholder="Message"
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
          onTypingStart={() => activeSocket?.emit("typingStart", { conversationId })}
          onTypingStop={() => activeSocket?.emit("typingStop", { conversationId })}
        />
      </section>
    </div>
  );
}

const mergeMessages = (incoming: DirectMessage[], current: DirectMessage[]) => {
  const byId = new Map<string, DirectMessage>();
  [...current, ...incoming].forEach((message) => byId.set(message._id, message));
  return [...byId.values()];
};
