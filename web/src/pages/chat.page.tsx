import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  Loader2,
  AlertCircle,
  RefreshCw,
  Hash,
  Sparkles
} from "lucide-react";
import { Chat } from "stream-chat-react";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { useStreamChat } from "../hooks/useStreamChat";
import { useStreamDMs } from "../hooks/useStreamDMs";
import { useStreamCommunityChannels } from "../hooks/useStreamCommunityChannels";
import { communitiesApi } from "../api/communities.api";
import { usersApi } from "../api/users.api";
import { UnifiedChatSidebar } from "../components/chat/UnifiedChatSidebar";
import { StreamChannelView } from "../components/chat/StreamChannelView";
import type { Community } from "../types/community";
import type { ActivePeer } from "../components/dm/ConversationHeader";
import { fromStreamUserId } from "../utils/stream-id";
import { useChatNotifications } from "../hooks/useChatNotifications";
import { useChatPrivacyStore } from "../store/chat-privacy.store";
import { useChatOrganizationStore } from "../store/chat-organization.store";
import { ChatLockChallenge } from "../components/chat/modals/ChatLockChallenge";
import { SetChatPinModal } from "../components/chat/modals/SetChatPinModal";
import {
  GlobalMessageSearchModal,
  type SearchResultItem
} from "../components/chat/modals/GlobalMessageSearchModal";
import { ChatNotificationSettingsModal } from "../components/chat/modals/ChatNotificationSettingsModal";


const MIN_SIDEBAR_WIDTH = 300;
const MAX_SIDEBAR_WIDTH = 600;
const MIN_WORKSPACE_WIDTH = 360;
const RESIZE_HANDLE_WIDTH = 8;

export function ChatPage({ lockedOnly = false }: { lockedOnly?: boolean }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [maxSidebarWidth, setMaxSidebarWidth] = useState(MAX_SIDEBAR_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const chatLayoutRef = useRef<HTMLDivElement>(null);
  const resizePointerId = useRef<number | null>(null);
  const resizePointerOffset = useRef(0);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const pendingSidebarWidth = useRef<number | null>(null);
  const resizeFrame = useRef<number | null>(null);
  const authUser = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();
  const handleBack = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  const getSidebarMaxWidth = useCallback(() => {
    const layoutWidth = chatLayoutRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    return Math.max(
      MIN_SIDEBAR_WIDTH,
      Math.min(
        MAX_SIDEBAR_WIDTH,
        layoutWidth - MIN_WORKSPACE_WIDTH - RESIZE_HANDLE_WIDTH
      )
    );
  }, []);

  const flushPendingSidebarWidth = useCallback(() => {
    if (resizeFrame.current !== null) {
      cancelAnimationFrame(resizeFrame.current);
      resizeFrame.current = null;
    }
    if (pendingSidebarWidth.current !== null) {
      setSidebarWidth(pendingSidebarWidth.current);
      pendingSidebarWidth.current = null;
    }
  }, []);

  useEffect(() => {
    const updateWidthConstraints = () => {
      const nextMaxWidth = getSidebarMaxWidth();
      setMaxSidebarWidth(nextMaxWidth);
      setSidebarWidth((currentWidth) => Math.min(currentWidth, nextMaxWidth));
    };

    updateWidthConstraints();
    window.addEventListener("resize", updateWidthConstraints);
    return () => window.removeEventListener("resize", updateWidthConstraints);
  }, [getSidebarMaxWidth]);

  useEffect(() => () => {
    if (resizeFrame.current !== null) cancelAnimationFrame(resizeFrame.current);
  }, []);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const stopResizing = () => {
      flushPendingSidebarWidth();
      const pointerId = resizePointerId.current;
      if (pointerId !== null && resizeHandleRef.current?.hasPointerCapture(pointerId)) {
        resizeHandleRef.current.releasePointerCapture(pointerId);
      }
      resizePointerId.current = null;
      setIsResizingSidebar(false);
    };

    window.addEventListener("blur", stopResizing);
    return () => window.removeEventListener("blur", stopResizing);
  }, [flushPendingSidebarWidth, isResizingSidebar]);

  const handleResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    resizePointerId.current = event.pointerId;
    const layoutLeft = chatLayoutRef.current?.getBoundingClientRect().left ?? 0;
    resizePointerOffset.current = event.clientX - layoutLeft - sidebarWidth;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizingSidebar(true);
  };

  const handleResizePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (resizePointerId.current !== event.pointerId || !chatLayoutRef.current) return;
    const layoutLeft = chatLayoutRef.current.getBoundingClientRect().left;
    const nextWidth = event.clientX - layoutLeft - resizePointerOffset.current;
    pendingSidebarWidth.current = Math.max(
      MIN_SIDEBAR_WIDTH,
      Math.min(getSidebarMaxWidth(), nextWidth)
    );
    if (resizeFrame.current === null) {
      resizeFrame.current = requestAnimationFrame(() => {
        resizeFrame.current = null;
        if (pendingSidebarWidth.current !== null) {
          setSidebarWidth(pendingSidebarWidth.current);
          pendingSidebarWidth.current = null;
        }
      });
    }
  };

  const handleResizePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (resizePointerId.current !== event.pointerId) return;
    flushPendingSidebarWidth();
    resizePointerId.current = null;
    setIsResizingSidebar(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleLostResizePointerCapture = () => {
    flushPendingSidebarWidth();
    resizePointerId.current = null;
    setIsResizingSidebar(false);
  };

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSidebarWidth((width) => Math.max(MIN_SIDEBAR_WIDTH, width - 16));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setSidebarWidth((width) => Math.min(maxSidebarWidth, width + 16));
    } else if (event.key === "Home") {
      event.preventDefault();
      setSidebarWidth(MIN_SIDEBAR_WIDTH);
    } else if (event.key === "End") {
      event.preventDefault();
      setSidebarWidth(maxSidebarWidth);
    }
  };

  // Connection and client from Stream provider
  const { client, connectionStatus, error, reconnect } = useStreamChat();

  // Navigation mode: "circle" or "dms"
  const urlConvId = searchParams.get("conv");
  const urlCircleId = searchParams.get("circle");
  const urlMode = searchParams.get("mode");
  const urlTargetMsg = searchParams.get("targetMsg");
  const activeMode: "circle" | "dms" = !lockedOnly && (
    urlMode === "circle" || (!urlMode && Boolean(urlCircleId))
  ) ? "circle" : "dms";

  // Modals state
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [isSetPinModalOpen, setIsSetPinModalOpen] = useState(false);

  // Chat Privacy & Lock state
  const isLocked = useChatPrivacyStore((state) => state.isLocked);
  const isUnlockedInSession = useChatPrivacyStore((state) => state.isUnlockedInSession);
  const unlockedInSessionIds = useChatPrivacyStore((state) => state.unlockedInSessionIds);
  const lockedConversationIds = useChatPrivacyStore((state) => state.lockedConversationIds);

  // Communities state
  const [communities, setCommunities] = useState<Community[]>([]);

  // Selected Circle / Community
  const activeCircleId = useMemo(() => {
    if (urlCircleId) return urlCircleId;
    if (urlMode === "circle" && communities.length > 0) return communities[0]._id;
    return "";
  }, [urlCircleId, urlMode, communities]);

  const activeCommunity = useMemo(() => {
    return communities.find((c) => c._id === activeCircleId) || null;
  }, [communities, activeCircleId]);

  // Stream DMs hook
  const {
    conversations,
    activeChannel: activeDmStreamChannel,
    activeConversationId,
    loading: dmsLoading,
    selectConversation,
    deleteConversation,
    startDm
  } = useStreamDMs(urlConvId);

  // Stream Community channels hook
  const {
    activeChannel: activeCommunityStreamChannel,
    activeChannelId: activeCommunityChannelId,
  } = useStreamCommunityChannels(!lockedOnly && activeMode === "circle" ? activeCircleId || null : null);

  // Load user's communities
  useEffect(() => {
    if (lockedOnly) {
      setCommunities([]);
      return;
    }
    let isMounted = true;
    async function loadCommunities() {
      try {
        const res = await communitiesApi.list({ limit: 50 });
        if (isMounted) {
          const list = res?.items || [];
          setCommunities(list);
        }
      } catch (err: any) {
        console.error("Failed to load communities:", err);
      }
    }
    loadCommunities();
    return () => {
      isMounted = false;
    };
  }, [lockedOnly]);

  useEffect(() => {
    if (lockedOnly && lockedConversationIds.length === 0) {
      navigate("/chat", { replace: true });
    }
  }, [lockedOnly, lockedConversationIds.length, navigate]);

  useEffect(() => {
    if (lockedOnly && urlConvId && !lockedConversationIds.includes(urlConvId)) {
      setSearchParams({}, { replace: true });
    }
  }, [lockedOnly, lockedConversationIds, setSearchParams, urlConvId]);

  // Selection handlers
  const handleSelectConversation = useCallback(
    (convId: string) => {
      setSearchParams({ mode: "dms", conv: convId });
      selectConversation(convId);
    },
    [setSearchParams, selectConversation]
  );

  const handleStartNewChat = useCallback(
    async (peerId: string) => {
      try {
        const channelId = await startDm(peerId);
        setSearchParams({ mode: "dms", conv: channelId });
        addToast("Direct message started", "success");
      } catch (err: any) {
        addToast(err?.message || "Failed to start direct message", "error");
      }
    },
    [startDm, setSearchParams, addToast]
  );

  const handleSearchPeers = useCallback(async (query: string) => {
    const users = await usersApi.search(query);
    return (users || [])
      .filter((user) => user._id !== authUser?._id)
      .map((user) => ({
        id: user._id,
        name: user.fullName,
        roll: user.rollNumber || "Student",
        dept: user.department || "Campus",
        isOnline: Boolean(user.status === "ACTIVE"),
        avatar: user.profilePicture
      }));
  }, [authUser?._id]);

  const handleBackToConversations = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    await deleteConversation(conversationId);
    useChatOrganizationStore.getState().unpinConversation(conversationId);
    useChatOrganizationStore.getState().unarchiveConversation(conversationId);
    useChatPrivacyStore.getState().removeConversationLock(conversationId);
    useChatPrivacyStore.getState().setDisappearingDuration(conversationId, 0);
    if (urlConvId === conversationId) {
      setSearchParams({}, { replace: true });
    }
    addToast("Chat removed from your list. The other participant keeps the conversation.", "success");
  }, [deleteConversation, urlConvId, setSearchParams, addToast]);

  // Listen for real-time background Stream messages, chime sound & browser notifications
  useChatNotifications({
    client,
    activeChannelId:
      activeMode === "dms"
        ? activeDmStreamChannel?.id || null
        : activeCommunityStreamChannel?.id || null,
    onNavigateToChannel: (channelId, isDM) => {
      if (isDM) {
        setSearchParams({ mode: "dms", conv: channelId });
      } else {
        setSearchParams({ mode: "circle", channel: channelId });
      }
    }
  });

  // Handle global search result navigation
  const handleSelectSearchResult = useCallback(
    (item: SearchResultItem) => {
      setIsGlobalSearchOpen(false);
      if (item.sourceType === "dm") {
        setSearchParams({ mode: "dms", conv: item.sourceId, targetMsg: item.id });
      } else {
        const nextParams: Record<string, string> = {
          mode: "circle",
          circle: item.communityId || item.sourceId,
          targetMsg: item.id
        };
        if (item.channelId) {
          nextParams.channel = item.channelId;
        }
        setSearchParams(nextParams);
      }
    },
    [setSearchParams]
  );

  // Active DM Peer details
  const activeDmPeer: ActivePeer | null = useMemo(() => {
    if (!activeDmStreamChannel) return null;
    const members = Object.values(activeDmStreamChannel.state.members || {});
    const myId = client?.userID || "";
    const peerMember = members.find((m) => m.user_id !== myId) || members[0];
    const peerUser = (peerMember?.user || {}) as any;
    const streamUserId = (peerUser?.id || peerMember?.user_id || "") as string;
    let rawId = fromStreamUserId(streamUserId);

    if (!rawId && activeDmStreamChannel.id.startsWith("dm_")) {
      const parts = activeDmStreamChannel.id.slice("dm_".length).split("_");
      const cleanMyId = fromStreamUserId(myId);
      const otherPart = parts.find((p) => p !== cleanMyId);
      if (otherPart) {
        rawId = otherPart;
      }
    }

    return {
      id: rawId || streamUserId,
      name: peerUser?.name || "Classmate",
      roll: peerUser?.rollNumber || "Student",
      dept: peerUser?.department || "Campus",
      isOnline: Boolean(peerUser?.online),
      lastSeen: peerUser?.last_active,
      avatar: peerUser?.image
    };
  }, [activeDmStreamChannel, client?.userID]);

  // Active channel determination
  const hasActiveChannel = Boolean(
    (activeMode === "dms" && activeDmStreamChannel) ||
    (activeMode === "circle" && activeCommunityStreamChannel)
  );

  // 1. Connection Loading State
  if (connectionStatus === "connecting" && !client?.userID) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-[#080D1A] font-sans">
        <div className="text-center space-y-3 p-6 max-w-sm">
          <Loader2 size={36} className="animate-spin text-[#1E90FF] mx-auto" />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Connecting to Stream Chat...
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Authenticating your StudyConnect credentials and loading realtime channels.
          </p>
          <button type="button" onClick={handleBack} className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5" aria-label="Back to Dashboard" title="Back to Dashboard">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 2. Connection Error State
  if (connectionStatus === "error" && !client?.userID) {
    const isConfigError = Boolean(
      error?.includes("VITE_STREAM_API_KEY") ||
      error?.includes("credentials are not configured") ||
      error?.includes("STREAM_NOT_CONFIGURED")
    );

    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-[#080D1A] font-sans p-4">
        <div className="text-center space-y-4 p-8 max-w-md bg-white dark:bg-[#0D1524] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {isConfigError ? "Stream Chat Configuration Required" : "Chat Service Unavailable"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {error || "Unable to connect to the Stream Chat realtime network. Please verify your internet connection or try reconnecting."}
          </p>
          {isConfigError && (
            <div className="text-left bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 space-y-2">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Missing Environment Configuration:
              </p>
              <ul className="list-disc pl-4 space-y-1 font-mono text-[10.5px]">
                <li><code className="text-[#1E90FF]">web/.env</code>: <span className="text-slate-500">VITE_STREAM_API_KEY</span></li>
                <li><code className="text-[#1E90FF]">backend/.env</code>: <span className="text-slate-500">STREAM_API_KEY & STREAM_API_SECRET</span></li>
              </ul>
            </div>
          )}
          <button
            onClick={() => reconnect()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E90FF] hover:bg-sky-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
          <div>
            <button type="button" onClick={handleBack} className="text-xs font-semibold text-[#1E90FF] hover:underline" aria-label="Back to Dashboard" title="Back to Dashboard">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Main Chat Interface backed by Stream React SDK
  return (
    <div className={`flex h-full min-h-0 w-full overflow-hidden bg-slate-100 font-sans text-slate-900 dark:bg-[#080D1A] dark:text-slate-100${isResizingSidebar ? " cursor-col-resize select-none" : ""}`}>
      {client ? (
        <Chat client={client} theme="str-chat__theme-light dark:str-chat__theme-dark">
          <div ref={chatLayoutRef} className="flex h-full min-h-0 min-w-0 flex-1">
            {/* Left Column: Unified Conversations & Communities Sidebar */}
            <div
              className={`${
                hasActiveChannel ? "hidden lg:flex" : "flex"
              } h-full min-h-0 w-full shrink-0 flex-col lg:w-[var(--chat-sidebar-width)]`}
              style={{ "--chat-sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
            >
              <UnifiedChatSidebar
                viewMode={lockedOnly ? "locked" : "all"}
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onDeleteConversation={handleDeleteConversation}
                loadingDMs={dmsLoading}
                onSearchPeers={handleSearchPeers}
                onStartDmWithPeer={handleStartNewChat}
                onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
                onOpenNotificationSettings={() =>
                  setIsNotificationSettingsOpen(true)
                }
              />
            </div>

            <div
              ref={resizeHandleRef}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize Chats sidebar"
              aria-valuemin={MIN_SIDEBAR_WIDTH}
              aria-valuemax={maxSidebarWidth}
              aria-valuenow={Math.round(sidebarWidth)}
              aria-valuetext={`${Math.round(sidebarWidth)} pixels`}
              tabIndex={0}
              className="group relative z-10 hidden w-2 shrink-0 cursor-col-resize touch-none select-none items-stretch justify-center rounded-sm outline-none lg:flex"
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerCancel={handleResizePointerUp}
              onLostPointerCapture={handleLostResizePointerCapture}
              onKeyDown={handleResizeKeyDown}
            >
              <span className="h-full w-px rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Right Column: Active Channel Message Area */}
            <div
              className={`${
                hasActiveChannel ? "flex" : "hidden lg:flex"
              } h-full min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-[#0B1220]`}
            >
              {activeMode === "circle" && activeCommunityStreamChannel ? (
                isLocked(activeCommunityStreamChannel.id) &&
                !isUnlockedInSession(activeCommunityStreamChannel.id) ? (
                  <ChatLockChallenge
                    channelId={activeCommunityStreamChannel.id}
                    conversationTitle={
                      ((activeCommunityStreamChannel.data as any)?.name as string) ||
                      activeCommunityStreamChannel.id ||
                      "Channel"
                    }
                    onUnlocked={() => {}}
                    onOpenSetPin={() => setIsSetPinModalOpen(true)}
                    onBack={handleBackToConversations}
                  />
                ) : (
                  <StreamChannelView
                    key={activeCommunityStreamChannel.cid || activeCommunityStreamChannel.id}
                    channel={activeCommunityStreamChannel}
                    channelName={
                      ((activeCommunityStreamChannel.data as any)?.name as string) ||
                      activeCommunityStreamChannel.id ||
                      "channel"
                    }
                    communityName={activeCommunity?.name}
                    targetMessageId={urlTargetMsg}
                    onBack={handleBackToConversations}
                  />
                )
              ) : activeMode === "dms" && activeDmStreamChannel ? (
                isLocked(activeDmStreamChannel.id) &&
                !isUnlockedInSession(activeDmStreamChannel.id) ? (
                  <ChatLockChallenge
                    channelId={activeDmStreamChannel.id}
                    conversationTitle={activeDmPeer?.name || "Direct Message"}
                    onUnlocked={() => {}}
                    onOpenSetPin={() => setIsSetPinModalOpen(true)}
                    onBack={handleBackToConversations}
                  />
                ) : (
                  <StreamChannelView
                    key={activeDmStreamChannel.cid || activeDmStreamChannel.id}
                    channel={activeDmStreamChannel}
                    channelName={activeDmPeer?.name || "Direct Message"}
                    isDM
                    peer={activeDmPeer}
                    targetMessageId={urlTargetMsg}
                    onBack={handleBackToConversations}
                  />
                )
              ) : (

                /* Empty Placeholder State when no active channel is selected on desktop */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <div className="max-w-sm space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-[#1E90FF] flex items-center justify-center mx-auto shadow-2xs">
                      <MessageSquare size={32} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      Welcome to StudyConnect Chat
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Select a direct message or community channel from the left sidebar to start messaging. All messages and presence are synchronized in real time.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Chat>
      ) : (
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[#1E90FF]" />
        </div>
      )}

      {/* Global Message Search Modal */}
      <GlobalMessageSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        initialScope="all"
        currentConversationId={
          activeMode === "dms" ? activeConversationId : activeCommunityChannelId
        }
        currentChannelCid={
          activeMode === "dms"
            ? activeDmStreamChannel?.cid
            : activeCommunityStreamChannel?.cid
        }
        currentChannelId={
          activeMode === "dms"
            ? activeDmStreamChannel?.id
            : activeCommunityStreamChannel?.id
        }
        currentCommunityId={activeCircleId}
        currentPeerName={activeDmPeer?.name}
        currentCircleName={activeCommunity?.name}
        onSelectMessage={handleSelectSearchResult}
      />

      {/* Chat Notification Settings Modal */}
      <ChatNotificationSettingsModal
        isOpen={isNotificationSettingsOpen}
        onClose={() => setIsNotificationSettingsOpen(false)}
      />

      {/* Set / Reset Chat PIN Modal */}
      <SetChatPinModal
        isOpen={isSetPinModalOpen}
        onClose={() => setIsSetPinModalOpen(false)}
      />
    </div>
  );
}


export default ChatPage;
