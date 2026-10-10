import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router";
import {
  Search,
  Plus,
  Hash,
  MessageSquare,
  Users,
  ChevronDown,
  ChevronRight,
  Bell,
  BellOff,
  Coffee,
  Sparkles,
  Radio,
  User,
  X,
  Loader2,
  ArrowLeft,
  Pin,
  Archive,
  MoreVertical,
  CheckCheck,
  Lock,
  Megaphone,
  BookOpen,
  FolderKanban,
  GraduationCap,
  MessageCircle,
  RefreshCw
} from "lucide-react";
import type { ConversationItem, PeerSearchResult } from "../dm/ConversationList";
import type { Community } from "../../types/community";
import type { Channel } from "../../types/chat";
import type { CommunityGroup, GroupType } from "../../types/community-group";
import { useChatOrganizationStore } from "../../store/chat-organization.store";
import { useChatPrivacyStore } from "../../store/chat-privacy.store";
import { useStreamChat } from "../../hooks/useStreamChat";


interface UnifiedChatSidebarProps {
  // Direct Messages
  conversations: ConversationItem[];
  activeConversationId: string | null;
  onSelectConversation: (convId: string) => void;
  loadingDMs?: boolean;

  // Communities & Channels
  communities: Community[];
  activeCommunityId: string | null;
  communityChannels: Channel[];
  communityGroups: CommunityGroup[];
  loadingCommunityGroups?: boolean;
  communityGroupsError?: boolean;
  onRetryCommunityGroups?: () => void;
  activeCommunityChannelId: string | null;
  onSelectCommunity: (communityId: string) => void;
  onSelectCommunityChannel: (channel: Channel) => void;
  onSelectCommunityGroup: (groupId: string) => void;
  loadingCommunities?: boolean;

  // New DM Directory
  directoryPeers: PeerSearchResult[];
  onStartDmWithPeer: (peerId: string) => void;

  // Global search & notifications
  onOpenGlobalSearch?: () => void;
  onOpenNotificationSettings?: () => void;
}

export function UnifiedChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  loadingDMs = false,
  communities,
  activeCommunityId,
  communityChannels,
  communityGroups,
  loadingCommunityGroups = false,
  communityGroupsError = false,
  onRetryCommunityGroups,
  activeCommunityChannelId,
  onSelectCommunity,
  onSelectCommunityChannel,
  onSelectCommunityGroup,
  loadingCommunities = false,
  directoryPeers,
  onStartDmWithPeer,
  onOpenGlobalSearch,
  onOpenNotificationSettings
}: UnifiedChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [peerSearchQuery, setPeerSearchQuery] = useState("");
  const [expandedCommunities, setExpandedCommunities] = useState<Record<string, boolean>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { client } = useStreamChat();

  const isConversationPinned = useChatOrganizationStore(
    (state) => state.isConversationPinned
  );
  const togglePinConversation = useChatOrganizationStore(
    (state) => state.togglePinConversation
  );
  const isConversationArchived = useChatOrganizationStore(
    (state) => state.isConversationArchived
  );
  const toggleArchiveConversation = useChatOrganizationStore(
    (state) => state.toggleArchiveConversation
  );

  const lockedConversationIds = useChatPrivacyStore(
    (state) => state.lockedConversationIds
  );

  // Close context menu on outside click
  useEffect(() => {
    if (!activeMenuId) return;
    const handleDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [activeMenuId]);

  // Native Stream mute toggle
  const handleToggleMute = async (
    channelId: string,
    isCurrentlyMuted: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (!client) return;
    try {
      const channel = client.channel("messaging", channelId);
      if (isCurrentlyMuted) {
        await channel.unmute();
      } else {
        await channel.mute();
      }
    } catch (err) {
      console.warn("Failed to toggle channel mute:", err);
    }
  };

  // Native Stream mark read / unread toggle
  const handleToggleRead = async (
    channelId: string,
    unreadCount: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (!client) return;
    try {
      const channel = client.channel("messaging", channelId);
      if (unreadCount > 0) {
        await channel.markRead();
      } else {
        const lastMsg = channel.state.messages[channel.state.messages.length - 1];
        await channel.markUnread({ message_id: lastMsg?.id });
      }
    } catch (err) {
      console.warn("Failed to toggle read state:", err);
    }
  };

  // Toggle community channel list accordion
  const toggleCommunity = (communityId: string) => {
    onSelectCommunity(communityId);
    setExpandedCommunities((prev) => ({
      ...prev,
      [communityId]: !prev[communityId]
    }));
  };

  // Filtered DMs
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.peer.name.toLowerCase().includes(q) ||
        c.peer.roll.toLowerCase().includes(q) ||
        (c.peer.dept && c.peer.dept.toLowerCase().includes(q)) ||
        (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  // Split DMs into pinned, regular active, and archived
  const { pinnedDMs, regularDMs, archivedDMs } = useMemo(() => {
    const pinned: ConversationItem[] = [];
    const regular: ConversationItem[] = [];
    const archived: ConversationItem[] = [];

    filteredConversations.forEach((conv) => {
      if (isConversationArchived(conv.id)) {
        archived.push(conv);
      } else if (isConversationPinned(conv.id)) {
        pinned.push(conv);
      } else {
        regular.push(conv);
      }
    });

    return { pinnedDMs: pinned, regularDMs: regular, archivedDMs: archived };
  }, [filteredConversations, isConversationPinned, isConversationArchived]);

  // Filtered Communities
  const filteredCommunities = useMemo(() => {
    if (!searchQuery.trim()) return communities;
    const q = searchQuery.toLowerCase();
    return communities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [communities, searchQuery]);

  // Directory peers for new chat modal
  const filteredDirectoryPeers = useMemo(() => {
    if (!peerSearchQuery.trim()) return directoryPeers;
    const q = peerSearchQuery.toLowerCase();
    return directoryPeers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.roll.toLowerCase().includes(q) ||
        p.dept.toLowerCase().includes(q)
    );
  }, [directoryPeers, peerSearchQuery]);

  // Helper for channel icon
  const getChannelIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("announcement") || lower.includes("notice")) {
      return <Bell size={14} className="text-amber-500" />;
    }
    if (lower.includes("watercooler") || lower.includes("random") || lower.includes("lounge")) {
      return <Coffee size={14} className="text-emerald-500" />;
    }
    return <Hash size={14} className="text-sky-500" />;
  };

  const getGroupIcon = (type: GroupType) => {
    switch (type) {
      case "ANNOUNCEMENT":
        return <Megaphone size={14} className="text-amber-500" />;
      case "STUDY":
        return <BookOpen size={14} className="text-emerald-500" />;
      case "PROJECT":
        return <FolderKanban size={14} className="text-purple-500" />;
      case "SUBJECT":
        return <GraduationCap size={14} className="text-amber-500" />;
      case "DISCUSSION":
      default:
        return <MessageCircle size={14} className="text-sky-500" />;
    }
  };

  // Reusable Conversation Row Renderer
  const renderConversationRow = (
    conv: ConversationItem,
    isPinnedSection = false,
    isArchivedSection = false
  ) => {
    const isActive = activeConversationId === conv.id;
    const isPinned = isConversationPinned(conv.id);
    const isArchived = isConversationArchived(conv.id);
    const isLocked = lockedConversationIds.includes(conv.id);

    return (
      <div
        key={conv.id}
        onClick={() => onSelectConversation(conv.id)}
        className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all group cursor-pointer relative ${
          isActive
            ? "bg-sky-50 dark:bg-sky-950/40 text-slate-900 dark:text-white border-l-2 border-[#1E90FF]"
            : "hover:bg-slate-100/70 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
        }`}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          {conv.peer.avatar ? (
            <img
              src={conv.peer.avatar}
              alt={conv.peer.name}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {conv.peer.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          {conv.peer.isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0D1524]" />
          )}
        </div>

        {/* Meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-semibold truncate group-hover:text-[#1E90FF] transition-colors">
                {conv.peer.name}
              </span>
              {isLocked && (
                <Lock size={11} className="text-amber-500 shrink-0" title="Locked conversation" />
              )}
              {isPinned && !isPinnedSection && (
                <Pin size={10} className="text-[#1E90FF] shrink-0 fill-[#1E90FF]" />
              )}
              {conv.isMuted && (
                <BellOff size={10} className="text-amber-500 shrink-0" />
              )}
            </div>
            {conv.lastMessage?.time && (
              <span className="text-[10px] text-slate-400 shrink-0">
                {conv.lastMessage.time}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] text-slate-400 truncate leading-tight flex-1">
              {conv.isTyping ? (
                <span className="text-sky-500 font-medium animate-pulse">
                  typing...
                </span>
              ) : isLocked ? (
                <span className="text-slate-400 italic font-medium flex items-center gap-1">
                  🔒 Locked conversation
                </span>
              ) : (
                conv.lastMessage?.text || "No messages yet"
              )}
            </p>


            <div className="flex items-center gap-1 shrink-0">
              {conv.unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#1E90FF] text-white text-[10px] font-bold">
                  {conv.unreadCount}
                </span>
              )}

              {/* Context menu button */}
              <div
                className="relative"
                ref={activeMenuId === conv.id ? menuRef : null}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === conv.id ? null : conv.id);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Options"
                  aria-label="Conversation options"
                >
                  <MoreVertical size={13} />
                </button>

                {activeMenuId === conv.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1 z-30 w-40 rounded-xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-xs text-slate-700 dark:text-slate-200 font-normal"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinConversation(conv.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                    >
                      <Pin
                        size={12}
                        className={isPinned ? "text-[#1E90FF]" : "text-slate-400"}
                      />
                      <span>{isPinned ? "Unpin chat" : "Pin chat"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) =>
                        handleToggleMute(conv.id, Boolean(conv.isMuted), e)
                      }
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                    >
                      {conv.isMuted ? (
                        <>
                          <Bell size={12} className="text-slate-400" />
                          <span>Unmute</span>
                        </>
                      ) : (
                        <>
                          <BellOff size={12} className="text-amber-500" />
                          <span>Mute</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) =>
                        handleToggleRead(conv.id, conv.unreadCount, e)
                      }
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                    >
                      <CheckCheck size={12} className="text-sky-500" />
                      <span>
                        {conv.unreadCount > 0 ? "Mark as read" : "Mark as unread"}
                      </span>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleArchiveConversation(conv.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                    >
                      <Archive size={12} className="text-slate-400" />
                      <span>{isArchived ? "Unarchive" : "Archive"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-full h-full flex flex-col bg-white dark:bg-[#0D1524] border-r border-slate-200/80 dark:border-slate-800 select-none">
      {/* 1. Sidebar Top Header */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/dashboard"
            className="p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#1E90FF] to-sky-400 text-white flex items-center justify-center shadow-2xs shrink-0">
            <MessageSquare size={16} />
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            Chats
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {onOpenGlobalSearch && (
            <button
              onClick={onOpenGlobalSearch}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              title="Global search messages & files"
              aria-label="Search all messages"
            >
              <Search size={16} />
            </button>
          )}

          {onOpenNotificationSettings && (
            <button
              onClick={onOpenNotificationSettings}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              title="Chat notification settings"
              aria-label="Notification settings"
            >
              <Bell size={16} />
            </button>
          )}

          <button
            onClick={() => setIsNewChatModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF] hover:bg-[#1E90FF]/20 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            title="Start a new Direct Message"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/60">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-8 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-transparent focus:border-sky-500/50 focus:bg-white dark:focus:bg-[#080D1A] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Navigation List (DMs + Communities + Archived) */}
      <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-5 scrollbar-thin">
        {/* ── SECTION 0: PINNED CHATS ── */}
        {pinnedDMs.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Pin size={11} className="text-[#1E90FF] fill-[#1E90FF]" />
                <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  Pinned
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                {pinnedDMs.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {pinnedDMs.map((conv) => renderConversationRow(conv, true))}
            </div>
          </div>
        )}

        {/* ── SECTION A: DIRECT MESSAGES ── */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Direct Messages
            </span>
            <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
              {regularDMs.length}
            </span>
          </div>

          {loadingDMs && conversations.length === 0 ? (
            <div className="flex items-center gap-2 p-3 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin text-sky-500" />
              <span>Loading messages...</span>
            </div>
          ) : regularDMs.length === 0 && pinnedDMs.length === 0 ? (
            <div className="p-3 text-center rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/40">
              <p className="text-xs text-slate-400">
                {searchQuery ? "No matching messages" : "No direct messages yet"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="mt-1.5 text-xs text-[#1E90FF] hover:underline font-medium"
                >
                  Start a chat with a classmate
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {regularDMs.map((conv) => renderConversationRow(conv, false))}
            </div>
          )}
        </div>

        {/* ── SECTION B: COMMUNITIES & CHANNELS ── */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Communities
            </span>
            <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
              {communities.length}
            </span>
          </div>

          {loadingCommunities && communities.length === 0 ? (
            <div className="flex items-center gap-2 p-3 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin text-sky-500" />
              <span>Loading communities...</span>
            </div>
          ) : filteredCommunities.length === 0 ? (
            <div className="p-3 text-center rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/40">
              <p className="text-xs text-slate-400">No communities found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommunities.map((community) => {
                const isCurrent = activeCommunityId === community._id;
                const isExpanded = expandedCommunities[community._id] ?? isCurrent;

                return (
                  <div key={community._id} className="rounded-xl overflow-hidden">
                    {/* Community Header Accordion Row */}
                    <button
                      onClick={() => toggleCommunity(community._id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all ${
                        isCurrent
                          ? "bg-slate-100/80 dark:bg-slate-800/70 text-slate-900 dark:text-white font-semibold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {community.bannerImage ? (
                          <img
                            src={community.bannerImage}
                            alt={community.name}
                            className="w-6 h-6 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {community.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-medium truncate">
                          {community.name}
                        </span>
                      </div>

                      <div className="text-slate-400 shrink-0 ml-1">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </button>

                    {/* Community Sub-channels (Stream Channels) */}
                    {isExpanded && isCurrent && (
                      <div className="pl-6 pr-1 py-1 space-y-0.5">
                        {communityChannels.length === 0 ? (
                          <div className="text-[11px] text-slate-400 p-1">
                            No legacy channels provisioned
                          </div>
                        ) : (
                          communityChannels.map((chan) => {
                            const isChanActive = activeCommunityChannelId === chan._id;
                            const isChanLocked = lockedConversationIds.includes(
                              chan._id || (chan as any).streamChannelId || ""
                            );
                            return (
                              <button
                                key={chan._id}
                                onClick={() => onSelectCommunityChannel(chan)}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition-all ${
                                  isChanActive
                                    ? "bg-sky-50 dark:bg-sky-950/50 text-[#1E90FF] font-semibold"
                                    : "hover:bg-slate-100/60 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {getChannelIcon(chan.name)}
                                  <span className="truncate">{chan.name}</span>
                                  {isChanLocked && (
                                    <Lock size={10} className="text-amber-500 shrink-0" />
                                  )}
                                </div>


                                {chan.unreadCount && chan.unreadCount > 0 ? (
                                  <span className="px-1.5 py-0.2 rounded-full bg-[#1E90FF] text-white text-[9px] font-bold">
                                    {chan.unreadCount}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })
                        )}

                        <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/70">
                          <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Community Groups
                          </div>
                          {loadingCommunityGroups ? (
                            <div className="flex items-center gap-2 px-2 py-2 text-[11px] text-slate-400">
                              <Loader2 size={12} className="animate-spin text-sky-500" />
                              <span>Loading groups...</span>
                            </div>
                          ) : communityGroupsError ? (
                            <div className="px-2 py-2 text-[11px] text-slate-400">
                              <span>Could not load community groups.</span>
                              {onRetryCommunityGroups && (
                                <button
                                  type="button"
                                  onClick={onRetryCommunityGroups}
                                  className="ml-1 inline-flex items-center gap-1 text-[#1E90FF] hover:underline"
                                >
                                  <RefreshCw size={10} /> Retry
                                </button>
                              )}
                            </div>
                          ) : communityGroups.length === 0 ? (
                            <div className="px-2 py-1 text-[11px] text-slate-400">
                              No active groups
                            </div>
                          ) : (
                            communityGroups.map((group) => (
                              <button
                                key={group._id}
                                type="button"
                                onClick={() => onSelectCommunityGroup(group._id)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-all hover:bg-slate-100/60 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400"
                                title={group.description || group.name}
                              >
                                {getGroupIcon(group.type)}
                                <span className="truncate">{group.name}</span>
                                {(group.isAnnouncement || group.type === "ANNOUNCEMENT") && (
                                  <span className="ml-auto shrink-0 text-[8px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                    Broadcast
                                  </span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SECTION C: ARCHIVED CONVERSATIONS ── */}
        {archivedDMs.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Archive size={13} className="text-slate-400" />
                <span>Archived Chats</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                  {archivedDMs.length}
                </span>
                {showArchived ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </div>
            </button>

            {showArchived && (
              <div className="mt-1 space-y-0.5">
                {archivedDMs.map((conv) =>
                  renderConversationRow(conv, false, true)
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Modal: Start New Direct Message */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#0D1524] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-[#1E90FF] flex items-center justify-center">
                  <User size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Start a Direct Message
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Find and chat with fellow students
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={peerSearchQuery}
                  onChange={(e) => setPeerSearchQuery(e.target.value)}
                  placeholder="Search by name, roll number, or department..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-1 focus:ring-sky-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredDirectoryPeers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No students found matching "{peerSearchQuery}"
                </div>
              ) : (
                filteredDirectoryPeers.map((peer) => (
                  <button
                    key={peer.id}
                    onClick={() => {
                      onStartDmWithPeer(peer.id);
                      setIsNewChatModalOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {peer.avatar ? (
                        <img
                          src={peer.avatar}
                          alt={peer.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center">
                          {peer.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#1E90FF] truncate">
                          {peer.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {peer.roll} • {peer.dept}
                        </div>
                      </div>
                    </div>

                    <span className="text-xs text-[#1E90FF] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Chat →
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
