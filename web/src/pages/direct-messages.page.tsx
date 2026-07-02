import { ArrowLeft, MoreVertical, Wifi, WifiOff, FileText, Image as ImageIcon, MessageSquare, Info, ShieldCheck, Star, Users, Trash, Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Socket } from "socket.io-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConversationList } from "../components/conversation-list";
import { UserSearch } from "../components/user-search";
import { ChatWindow } from "../components/chat-window";
import { MessageInput } from "../components/message-input";
import { OnlineStatusBadge } from "../components/online-status-badge";
import { Avatar } from "../components/avatar";
import { useConversations, useConversation, useMessages } from "../hooks/use-direct-message";
import { socketService } from "../services/socket.service";
import { useAuthStore } from "../store/auth.store";
import { useDirectMessageStore } from "../store/direct-message.store";
import { directMessagesApi } from "../api/direct-messages.api";
import type { Conversation, DirectMessage } from "../types/direct-message";
import type { User } from "../types/auth";

type Ack<T> = { success: true; data: T } | { success: false; message: string };

function mergeMessages(history: DirectMessage[], live: DirectMessage[]): DirectMessage[] {
  const map = new Map<string, DirectMessage>();
  history.forEach((m) => map.set(m._id, m));
  live.forEach((m) => map.set(m._id, m));
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function DirectMessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user!)!;

  const { conversations, setConversations, addConversation } = useDirectMessageStore();
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const socketRef = useRef<Socket | null>(null);

  // Active chat state
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [editing, setEditing] = useState<DirectMessage | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [showInfoSidebar, setShowInfoSidebar] = useState(true);

  // Queries
  const conversationsQuery = useConversations(search || undefined);
  const conversationQuery = useConversation(conversationId);
  const messagesQuery = useMessages(conversationId);

  // Handle active conversation details
  const participant = useMemo(() => {
    return conversationQuery.data?.participants.find((p) => p._id !== user._id);
  }, [conversationQuery.data, user._id]);

  const isOnline = participant ? onlineUserIds.includes(participant._id) : false;

  // Handle message history sync
  useEffect(() => {
    const loaded = messagesQuery.data?.pages.flatMap((page) => page.items) ?? [];
    setMessages((current) => mergeMessages(loaded, current));
  }, [messagesQuery.data]);

  // Sync loaded conversations
  useEffect(() => {
    const allPages = conversationsQuery.data?.pages.flatMap((p) => p.items) ?? [];
    if (allPages.length > 0) setConversations(allPages);
  }, [conversationsQuery.data, setConversations]);

  // Connect to main presence sockets
  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit("presence:subscribe", { userIds: [] });
      if (conversationId) {
        socket.emit("joinConversation", { conversationId }, (ack: Ack<unknown>) => {
          if (!ack.success) setSocketError(ack.message);
        });
        socket.emit("markAsRead", { conversationId });
      }
    };
    const onDisconnect = () => setConnected(false);
    
    const onFriendOnline = (payload: { userId: string }) =>
      setOnlineUserIds((current) => [...new Set([...current, payload.userId])]);
    const onFriendOffline = (payload: { userId: string }) =>
      setOnlineUserIds((current) => current.filter((id) => id !== payload.userId));
    
    const onConversationCreated = (conversation: Conversation) => {
      addConversation(conversation);
    };

    const onMessageCreated = (message: DirectMessage) => {
      if (message.conversationId === conversationId) {
        setMessages((current) => mergeMessages([message], current));
        if (message.senderId._id !== user._id) {
          socket.emit("markAsRead", { conversationId });
        }
      }
    };

    const onMessageUpdated = (message: DirectMessage) => {
      if (message.conversationId === conversationId) {
        setMessages((current) => current.map((item) => (item._id === message._id ? message : item)));
      }
    };

    const onMessageDeleted = onMessageUpdated;

    const onUserTyping = (payload: { userId: string }) => {
      if (payload.userId !== user._id) {
        setTypingUserIds((current) => [...new Set([...current, payload.userId])]);
      }
    };

    const onUserStoppedTyping = (payload: { userId: string }) => {
      setTypingUserIds((current) => current.filter((id) => id !== payload.userId));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("friendOnline", onFriendOnline);
    socket.on("friendOffline", onFriendOffline);
    socket.on("conversationCreated", onConversationCreated);
    socket.on("directMessageCreated", onMessageCreated);
    socket.on("directMessageUpdated", onMessageUpdated);
    socket.on("directMessageDeleted", onMessageDeleted);
    socket.on("userTyping", onUserTyping);
    socket.on("userStoppedTyping", onUserStoppedTyping);

    if (socket.connected) onConnect();

    return () => {
      if (conversationId) {
        socket.emit("leaveConversation", { conversationId });
      }
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("friendOnline", onFriendOnline);
      socket.off("friendOffline", onFriendOffline);
      socket.off("conversationCreated", onConversationCreated);
      socket.off("directMessageCreated", onMessageCreated);
      socket.off("directMessageUpdated", onMessageUpdated);
      socket.off("directMessageDeleted", onMessageDeleted);
      socket.off("userTyping", onUserTyping);
      socket.off("userStoppedTyping", onUserStoppedTyping);
    };
  }, [conversationId, user._id, addConversation]);

  const handleSelect = useCallback(
    (conversation: Conversation) => {
      setMessages([]);
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

  // Send message attachments mutation
  const attachmentMutation = useMutation({
    mutationFn: ({ content, files }: { content: string; files: File[] }) =>
      directMessagesApi.sendMessage(conversationId!, {
        content,
        attachments: files,
        replyTo: replyTo?._id
      }),
    onSuccess: (message) => {
      setMessages((current) => mergeMessages([message], current));
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["direct-messages", "messages", conversationId] });
    }
  });

  const handleSend = useCallback(
    (content: string, files: File[]) => {
      const socket = socketRef.current;
      if (!socket) return;

      if (files.length > 0) {
        attachmentMutation.mutate({ content, files });
      } else if (content.trim()) {
        socket.emit(
          "sendDirectMessage",
          { conversationId, content, replyTo: replyTo?._id },
          (ack: Ack<DirectMessage>) => {
            if (ack.success) {
              setMessages((current) => mergeMessages([ack.data], current));
              setReplyTo(null);
            } else {
              setSocketError(ack.message);
            }
          }
        );
      }
    },
    [conversationId, replyTo, attachmentMutation]
  );

  const handleEdit = useCallback(
    (content: string) => {
      const socket = socketRef.current;
      if (!socket || !editing) return;

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

  const handleDelete = useCallback(
    (message: DirectMessage) => {
      const socket = socketRef.current;
      if (!socket) return;

      if (window.confirm("Delete this message?")) {
        socket.emit(
          "deleteDirectMessage",
          { conversationId, messageId: message._id },
          (ack: Ack<DirectMessage>) => {
            if (ack.success) {
              setMessages((current) =>
                current.map((item) => (item._id === ack.data._id ? ack.data : item))
              );
            } else {
              setSocketError(ack.message);
            }
          }
        );
      }
    },
    [conversationId]
  );

  const handleTypingStart = useCallback(() => {
    socketRef.current?.emit("typing", { conversationId });
  }, [conversationId]);

  const handleTypingStop = useCallback(() => {
    socketRef.current?.emit("stopTyping", { conversationId });
  }, [conversationId]);

  // Extract shared files and media
  const sharedFiles = useMemo(() => {
    return messages
      .flatMap((m) => m.attachments)
      .filter((a) => !a.mimeType.startsWith("image/"));
  }, [messages]);

  const sharedMedia = useMemo(() => {
    return messages
      .flatMap((m) => m.attachments)
      .filter((a) => a.mimeType.startsWith("image/"));
  }, [messages]);

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100vh-4rem)] animate-fade-up overflow-hidden sm:-mx-7 lg:-mx-10 lg:-my-10 bg-slate-50 dark:bg-ink-950">
      
      {/* 1. Left Sidebar: Chats List */}
      <ConversationList
        conversations={conversations}
        isLoading={conversationsQuery.isLoading}
        hasNextPage={conversationsQuery.hasNextPage ?? false}
        isFetchingNextPage={conversationsQuery.isFetchingNextPage}
        onLoadMore={() => conversationsQuery.fetchNextPage()}
        onSelect={handleSelect}
        selectedId={conversationId ?? null}
        onlineUserIds={onlineUserIds}
        currentUserId={user._id}
        search={search}
        onSearchChange={setSearch}
      />

      {/* 2. Center Column: Chat Space */}
      {conversationId ? (
        <section className="flex min-w-0 flex-1 flex-col bg-white dark:bg-ink-900 border-r border-slate-200 dark:border-white/5 h-full">
          {/* Chat Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-ink-900">
            <div className="flex min-w-0 items-center gap-3">
              <Link to="/direct-messages" className="icon-button shrink-0 lg:hidden">
                <ArrowLeft size={16} />
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  {participant?.fullName ?? "Conversation"}
                </h1>
                {participant && (
                  <OnlineStatusBadge online={isOnline} className="truncate text-[10px]" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                connected
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-350"
              }`}>
                {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                {connected ? "Live" : "Offline"}
              </span>
              <button
                onClick={() => setShowInfoSidebar(!showInfoSidebar)}
                className={`icon-button size-8 ${showInfoSidebar ? "text-indigo-650" : "text-slate-450"}`}
                title="Toggle Sidebar Info"
              >
                <Info size={16} />
              </button>
            </div>
          </header>

          {/* Active Message History */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <ChatWindow
              messages={messages}
              isLoading={messagesQuery.isLoading}
              hasNextPage={messagesQuery.hasNextPage ?? false}
              isFetchingNextPage={messagesQuery.isFetchingNextPage}
              onLoadMore={() => messagesQuery.fetchNextPage()}
              typingUserIds={typingUserIds}
              participantName={participant?.fullName ?? "User"}
              participantId={participant?._id ?? ""}
              currentUserId={user._id}
              onReply={setReplyTo}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          </div>

          {/* Message Input Panel */}
          <MessageInput
            disabled={!connected}
            replyTo={replyTo}
            editing={editing}
            onCancelContext={() => {
              setReplyTo(null);
              setEditing(null);
            }}
            onSend={handleSend}
            onEdit={handleEdit}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
          />
        </section>
      ) : (
        <section className="hidden flex-1 flex-col items-center justify-center lg:flex bg-white dark:bg-ink-900 border-r border-slate-200 dark:border-white/5">
          <div className="flex flex-col items-center gap-4 text-center p-6 max-w-sm">
            <div className="rounded-full bg-indigo-50 p-4 dark:bg-white/[0.04]">
              <MessageSquare size={36} className="text-indigo-650" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Start Messaging</h2>
            <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-400">
              Select a direct chat from the sidebar list, or search for an active peer user to begin collaboration.
            </p>
            <div className="mt-2 w-72">
              <UserSearch onSelect={handleUserSelect} excludeIds={[user._id]} />
            </div>
          </div>
        </section>
      )}

      {/* 3. Right Sidebar: Conversation Details */}
      {conversationId && showInfoSidebar && participant && (
        <aside className="hidden w-64 shrink-0 flex-col bg-white dark:bg-ink-900 border-l border-slate-100 dark:border-white/5 lg:flex h-full overflow-y-auto">
          {/* User Details */}
          <div className="p-5 flex flex-col items-center text-center border-b border-slate-100 dark:border-white/5 space-y-3">
            <Avatar name={participant.fullName} src={participant.profilePicture} className="size-16 ring-4 ring-indigo-50 dark:ring-indigo-950/40" />
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">{participant.fullName}</h3>
              <span className="block text-[10px] text-slate-450 dark:text-slate-400 mt-1 uppercase font-bold tracking-wider">{participant.department || "Student"}</span>
            </div>
          </div>

          {/* Members */}
          <div className="p-4 border-b border-slate-100 dark:border-white/5 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conversation Members</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Avatar name={user.fullName} src={user.profilePicture} className="size-6 text-[8px]" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">You</span>
              </div>
              <div className="flex items-center gap-2">
                <Avatar name={participant.fullName} src={participant.profilePicture} className="size-6 text-[8px]" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{participant.fullName}</span>
              </div>
            </div>
          </div>

          {/* Shared Files list */}
          <div className="p-4 border-b border-slate-100 dark:border-white/5 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shared Files ({sharedFiles.length})</h4>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {sharedFiles.map((file) => (
                <a
                  key={file.key}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border hover:bg-slate-100 dark:bg-black/15 dark:border-white/5 text-xs text-slate-700"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={13} className="text-indigo-650" />
                    <span className="truncate font-semibold dark:text-slate-350">{file.originalName}</span>
                  </div>
                </a>
              ))}
              {sharedFiles.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-2">No documents shared yet.</p>
              )}
            </div>
          </div>

          {/* Shared Media Gallery */}
          <div className="p-4 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shared Media ({sharedMedia.length})</h4>
            <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto">
              {sharedMedia.map((media) => (
                <a
                  key={media.key}
                  href={media.url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square rounded-lg overflow-hidden border border-slate-100 dark:border-white/5 bg-slate-100"
                >
                  <img src={media.url} alt="" className="size-full object-cover hover:scale-105 transition-transform" />
                </a>
              ))}
            </div>
            {sharedMedia.length === 0 && (
              <p className="text-[10px] text-slate-400 text-center py-2">No media shared yet.</p>
            )}
          </div>
        </aside>
      )}

    </div>
  );
}
