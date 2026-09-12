import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router";
import {
  Plus,
  Compass,
  Sparkles,
  X,
  Users,
  Search,
  Check,
  ShieldCheck,
  Hash,
  Volume2,
  Bell,
  Coffee,
  Radio,
  MessageSquare,
  Send,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff
} from "lucide-react";
import { CircleSwitcher, type StudyCircle } from "../components/chat/CircleSwitcher";
import { CircleSidebar } from "../components/study-circles/CircleSidebar";
import { ChatContainer } from "../components/chat/ChatContainer";
import { ChatInspectorDrawer } from "../components/chat/ChatInspectorDrawer";
import { VoiceStageDock } from "../components/study-circles/VoiceStageDock";
import { ConversationList, type ConversationItem } from "../components/dm/ConversationList";
import { ConversationHeader, type ActivePeer } from "../components/dm/ConversationHeader";
import { DirectMessageStream, type DirectMessageItem } from "../components/dm/DirectMessageStream";
import type { PinnedMessageData } from "../components/dm/PinnedMessageBanner";
import { DirectMessageInput, type DMVoiceNotePayload } from "../components/dm/DirectMessageInput";
import { ContactInfoDrawer } from "../components/dm/ContactInfoDrawer";
import type { Conversation, DirectMessage } from "../types/direct-message";
import { ImageViewerModal, type LightboxImage } from "../components/chat/media/ImageViewerModal";
import type { ChatVoiceNotePayload } from "../components/chat/ChatInput";
import { LockChatModal } from "../components/chat/modals/LockChatModal";
import { ForwardMessageModal } from "../components/chat/modals/ForwardMessageModal";
import { StarredMessagesDrawer } from "../components/chat/modals/StarredMessagesDrawer";

import { useChatStore } from "../store/chat.store";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { useDirectMessageStore } from "../store/direct-message.store";
import { socketService } from "../services/socket.service";
import { communitiesApi } from "../api/communities.api";
import { chatApi } from "../api/chat.api";
import { directMessagesApi } from "../api/direct-messages.api";
import { usersApi } from "../api/users.api";
import {
  COMMUNITY_CATEGORIES,
  type Community,
  type CommunityCategory
} from "../types/community";
import type { Channel, ChatMessage } from "../types/chat";

const CIRCLES_STORAGE_KEY = "studyconnect_user_circles";

const CATEGORY_META: Record<string, { emoji: string; gradient: string }> = {
  "Java Programming": { emoji: "☕", gradient: "from-amber-500 to-orange-600" },
  "Python Programming": { emoji: "🐍", gradient: "from-emerald-500 to-teal-600" },
  "Web Development": { emoji: "🌐", gradient: "from-blue-500 to-indigo-600" },
  "Cyber Security": { emoji: "🛡️", gradient: "from-red-500 to-rose-700" },
  "Data Science": { emoji: "📊", gradient: "from-purple-500 to-indigo-600" },
  "Competitive Programming": { emoji: "⚡", gradient: "from-yellow-500 to-amber-600" },
  "Placement Preparation": { emoji: "🎯", gradient: "from-cyan-500 to-blue-600" },
  Other: { emoji: "💻", gradient: "from-blue-500 to-cyan-600" }
};

const mapCommunityToCircle = (c: Community): StudyCircle => {
  const meta = CATEGORY_META[c.category] || { emoji: "💻", gradient: "from-blue-600 to-cyan-500" };
  return {
    id: c._id,
    name: c.name,
    shortName: c.name.slice(0, 3).toUpperCase(),
    dept: c.category || "Campus",
    memberCount: c.memberCount || 1,
    emoji: meta.emoji,
    gradient: meta.gradient,
    avatarUrl: c.bannerImage,
    unreadCount: 0
  };
};

const getDefaultChannels = (circleId: string): Channel[] => [
  {
    _id: `chan-ann-${circleId}`,
    name: "announcements",
    type: "announcement",
    category: "announcements",
    topic: "Official syllabus, notices, and exam schedules",
    isStrictStudyMode: true
  },
  {
    _id: `chan-focus-${circleId}`,
    name: "algorithms-focus",
    type: "text",
    category: "focus",
    topic: "Strict study room for algorithm design, proofs, and coursework",
    isStrictStudyMode: true
  },
  {
    _id: `chan-code-${circleId}`,
    name: "code-review",
    type: "text",
    category: "focus",
    topic: "Share snippets, debug runtime errors, and review PRs",
    isStrictStudyMode: true,
    allowCodeSnippetsOnly: false
  },
  {
    _id: `chan-lounge-${circleId}`,
    name: "campus-watercooler",
    type: "text",
    category: "watercooler",
    topic: "Casual study breaks, campus chatter, and music sharing",
    isStrictStudyMode: false
  },
  {
    _id: `chan-stage-${circleId}`,
    name: "Live Study Stage",
    type: "voice",
    category: "stages",
    topic: "Drop-in audio and whiteboard screen sharing stage"
  }
];

const abbreviateDept = (dept?: string): string => {
  if (!dept) return "Campus";
  const map: Record<string, string> = {
    "computer science": "CSE",
    "computer science & engineering": "CSE",
    "computer science and engineering": "CSE",
    "information technology": "IT",
    "electronics": "ECE",
    "electronics and communication": "ECE",
    "electronics & communication": "ECE",
    "electrical": "EEE",
    "electrical and electronics": "EEE",
    "mechanical engineering": "MECH",
    "mechanical": "MECH",
    "civil engineering": "CIVIL",
    "civil": "CIVIL",
    "chemical engineering": "CHEM",
    "data science": "DS",
    "artificial intelligence": "AI",
    "ai & ml": "AIML",
    "mathematics": "MATH",
    "physics": "PHY",
    "mba": "MBA",
    "management": "MBA"
  };
  const lower = dept.toLowerCase();
  for (const key of Object.keys(map)) {
    if (lower.includes(key)) return map[key];
  }
  // Fallback: acronym from first letters of words, max 4 chars
  return dept
    .split(/[\s&,]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 4);
};

const mapBackendConversationToItem = (
  c: Conversation,
  currentUserId?: string
): ConversationItem => {
  const peerUser =
    c.participants?.find((p) => String(p?._id || p) !== String(currentUserId)) || c.participants?.[0];
  const lastMsg = c.lastMessage;
  const isMe = lastMsg ? (String(lastMsg.senderId) === String(currentUserId)) : false;
  const peerName =
    peerUser?.fullName ||
    (peerUser as any)?.name ||
    (peerUser as any)?.username ||
    "Classmate";

  return {
    id: c._id,
    peer: {
      id: peerUser?._id ? String(peerUser._id) : (typeof peerUser === "string" ? peerUser : ""),
      name: peerName,
      roll: peerUser?.rollNumber || "Campus",
      dept: abbreviateDept((peerUser as any)?.department),
      isOnline: true,
      avatar: peerUser?.profilePicture
    },
    lastMessage: lastMsg
      ? {
          text: lastMsg.content || "Attachment",
          senderId: lastMsg.senderId ? String(lastMsg.senderId) : "",
          time: lastMsg.createdAt
            ? new Date(lastMsg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })
            : "Recently",
          isRead: isMe ? ((lastMsg as any).read ?? true) : true,
          isDelivered: isMe ? ((lastMsg as any).delivered ?? true) : true,
          hasAttachment: !!(lastMsg as any).attachments?.length,
          hasCodeSnippet: !!(lastMsg as any).codeSnippet
        }
      : null,
    unreadCount: c.unreadCount ?? 0,
    isPinned: c.isPinned ?? false,
    isMuted: c.isMuted ?? false,
    isArchived: c.isArchived ?? false,
    isLocked: (c as any).isLocked || false,
    lockedReason: (c as any).lockedReason || ""
  };
};


const mapBackendMessageToItem = (m: DirectMessage): DirectMessageItem => {
  const isAudio = m.messageType === "AUDIO";
  const audioAttachment = isAudio ? m.attachments?.find((a) => a.mimeType?.startsWith("audio/")) : undefined;
  const senderFullName =
    (m.senderId && typeof m.senderId === "object" && (m.senderId as any).fullName) ||
    (m as any).senderName ||
    (m as any).senderId?.name ||
    "Classmate";

  return {
    id: m._id,
    senderId: m.senderId?._id || (m as any).senderId || "",
    senderName: senderFullName,
    content: m.content || "",
    attachments: m.attachments
      ?.filter((a) => !isAudio || !a.mimeType?.startsWith("audio/"))
      .map((a) => ({
        name: a.originalName,
        size: `${(a.size / (1024 * 1024)).toFixed(1)} MB`,
        sizeBytes: a.size,
        type: a.mimeType?.includes("pdf")
          ? "pdf"
          : a.mimeType?.startsWith("image/")
          ? "image"
          : a.mimeType?.startsWith("audio/")
          ? "audio"
          : a.mimeType?.startsWith("video/")
          ? "video"
          : "zip",
        mimeType: a.mimeType,
        url: a.url,
        thumbnailUrl: a.thumbnailUrl,
        duration: a.duration,
        waveform: a.waveform
      })),
    voiceNote: audioAttachment
      ? {
          duration: audioAttachment.duration ? `${Math.round(audioAttachment.duration)}s` : "0s",
          durationSec: audioAttachment.duration,
          url: audioAttachment.url,
          waveform: audioAttachment.waveform
        }
      : undefined,
    replyTo: m.replyTo
      ? {
          _id: (m.replyTo as any)._id || (m.replyTo as any).id,
          senderName: m.replyTo.senderId?.fullName || "Classmate",
          content: m.replyTo.content
        }
      : undefined,
    isRead: m.read,
    isDelivered: m.delivered !== undefined ? m.delivered : true,
    status: m.status || (m.read ? "READ" : m.delivered ? "DELIVERED" : "SENT"),
    clientMessageId: m.clientMessageId,
    time: m.createdAt
      ? new Date(m.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      : "",
    createdAt: m.createdAt || new Date().toISOString(),
    reactions: (m as any).reactions || [],
    deletedFor: (m as any).deletedFor || [],
    isDeletedForEveryone: (m as any).isDeletedForEveryone || false,
    deletedBy: (m as any).deletedBy,
    deletedAt: (m as any).deletedAt,
    isStarred: (m as any).isStarred || false,
    starredBy: (m as any).starredBy || [],
    isPinned: (m as any).isPinned || false,
    pinnedAt: (m as any).pinnedAt,
    pinnedBy: (m as any).pinnedBy,
    isForwarded: (m as any).isForwarded || false,
    forwardedFrom: (m as any).forwardedFrom,
    edited: (m as any).edited || false,
    editedAt: (m as any).editedAt
  };
};


interface ChatPageProps {
  initialMode?: "circle" | "dms";
}

export function ChatPage({ initialMode }: ChatPageProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const modeParam = searchParams.get("mode");
  const convParam = searchParams.get("conv");

  const user = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();

  // ── Unified View Mode ("circle" | "dms") ──────────────────────────────────
  const [viewMode, setViewMode] = useState<"circle" | "dms">(
    initialMode || (modeParam === "dms" ? "dms" : "circle")
  );

  useEffect(() => {
    if (modeParam === "dms" && viewMode !== "dms") {
      setViewMode("dms");
    } else if (modeParam === "circle" && viewMode !== "circle") {
      setViewMode("circle");
    }
  }, [modeParam, viewMode]);

  // ── Study Circles Workspace State ─────────────────────────────────────────
  const {
    messages,
    activeChannel,
    setSelectedChannel,
    setChannels,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    updateMessagePin,
    markMessageAccepted,
    addThreadReply,
    setActiveSprint,
    updateSprintParticipants,
    activeVoiceStage,
    setActiveVoiceStage,
    updateVoicePeers
  } = useChatStore();

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);

  const [rawCommunities, setRawCommunities] = useState<Community[]>([]);
  const [circles, setCircles] = useState<StudyCircle[]>([]);
  const [activeCircle, setActiveCircle] = useState<StudyCircle | null>(null);
  const [circleChannels, setCircleChannels] = useState<Channel[]>([]);
  const [circleMembers, setCircleMembers] = useState<
    Array<{
      _id: string;
      fullName: string;
      rollNumber?: string;
      department?: string;
      role?: string;
      isOnline?: boolean;
      karma?: number;
    }>
  >([]);

  const isModeratorOrAdmin = useMemo(() => {
    if (!user) return false;
    if (user.role === "ADMIN") return true;
    if (viewMode === "circle" && activeCircle) {
      const comm = rawCommunities.find((c) => c._id === activeCircle.id);
      if (comm) {
        const ownerId =
          typeof comm.owner === "object" && comm.owner !== null
            ? (comm.owner as any)._id
            : comm.owner;
        if (ownerId === user._id) return true;
        if (
          Array.isArray(comm.moderators) &&
          comm.moderators.some(
            (m: any) => (typeof m === "object" && m !== null ? m._id : m) === user._id
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }, [user, viewMode, activeCircle, rawCommunities]);

  // ── Direct Messages Workspace State ─────────────────────────────
  const [dmConversations, setDmConversations] = useState<ConversationItem[]>([]);
  const [activeDmConvId, setActiveDmConvId] = useState<string | null>(convParam || null);
  const activeDmConvIdRef = useRef<string | null>(activeDmConvId);
  useEffect(() => {
    activeDmConvIdRef.current = activeDmConvId;
  }, [activeDmConvId]);
  const [dmMessagesMap, setDmMessagesMap] = useState<Record<string, DirectMessageItem[]>>({});
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [dmReplyTarget, setDmReplyTarget] = useState<{ senderName: string; content: string } | null>(null);

  // Zustand Store bindings for Phase 1 Reliability
  const drafts = useDirectMessageStore((state) => state.drafts);
  const typingMap = useDirectMessageStore((state) => state.typingPeers);
  const connectionStatus = useDirectMessageStore((state) => state.connectionStatus);
  const setConnectionStatus = useDirectMessageStore((state) => state.setConnectionStatus);
  const setTyping = useDirectMessageStore((state) => state.setTyping);

  // New Chat Modal state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [searchedStudents, setSearchedStudents] = useState<any[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [searchInChatOpen, setSearchInChatOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [isChatEnlarged, setIsChatEnlarged] = useState(false);
  const [activeCall, setActiveCall] = useState<{
    isOpen: boolean;
    type: "audio" | "video";
    isMuted: boolean;
    isVideoEnabled: boolean;
  } | null>(null);

  // DM Selection, Pinning & Customization State
  const [isDmSelectionMode, setIsDmSelectionMode] = useState(false);
  const [selectedDmMessageIds, setSelectedDmMessageIds] = useState<string[]>([]);
  const [pinnedMessagesMap, setPinnedMessagesMap] = useState<Record<string, PinnedMessageData | null>>({
    default: {
      id: "pin-default",
      title: "Three Days of Happiness.pdf",
      type: "document",
      url: "#"
    }
  });
  const [favoriteConversations, setFavoriteConversations] = useState<Record<string, boolean>>({});
  const [lockedConversations, setLockedConversations] = useState<Record<string, boolean>>({});
  const [mutedConversations, setMutedConversations] = useState<Record<string, boolean>>({});

  // Phase 2 Message Interactions State
  const [dmEditingTarget, setDmEditingTarget] = useState<{ id: string; content: string } | null>(null);
  const [circleEditingTarget, setCircleEditingTarget] = useState<{ id: string; content: string } | null>(null);
  const [forwardModal, setForwardModal] = useState<{
    isOpen: boolean;
    messageIds: string[];
    sourceText?: string;
  } | null>(null);
  const [isStarredDrawerOpen, setIsStarredDrawerOpen] = useState(false);
  const [circleSelectionMode, setCircleSelectionMode] = useState(false);
  const [selectedCircleMessageIds, setSelectedCircleMessageIds] = useState<string[]>([]);

  // Phase 3 — Lightbox state (shared by DM + circle workspaces)
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    images: LightboxImage[];
    initialIndex: number;
  }>({ isOpen: false, images: [], initialIndex: 0 });

  const handleOpenLightbox = useCallback((images: LightboxImage[], initialIndex: number) => {
    setLightboxState({ isOpen: true, images, initialIndex });
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Modals for Study Circles
  const [isExploreCirclesOpen, setIsExploreCirclesOpen] = useState(false);
  const [exploreSearch, setExploreSearch] = useState("");
  const [exploreCategory, setExploreCategory] = useState<string>("all");
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(false);
  const [isJoiningCircleId, setIsJoiningCircleId] = useState<string | null>(null);

  const [isCreateCircleOpen, setIsCreateCircleOpen] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleCategory, setNewCircleCategory] = useState<CommunityCategory>("Web Development");
  const [newCircleDescription, setNewCircleDescription] = useState("");
  const [newCircleEmoji, setNewCircleEmoji] = useState("🌐");

  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice" | "announcement">("text");
  const [newChannelCategory, setNewChannelCategory] = useState<
    "focus" | "announcements" | "watercooler" | "stages"
  >("focus");
  const [newChannelTopic, setNewChannelTopic] = useState("");
  const [newChannelStrict, setNewChannelStrict] = useState(true);

  // ── 1. Fetch Communities from API ─────────────────────────────────────────
  const fetchCommunities = useCallback(async () => {
    try {
      setIsLoadingCommunities(true);
      const res = await communitiesApi.list({ limit: 50 });
      if (res?.items) {
        setRawCommunities(res.items);
        const mapped = res.items.map(mapCommunityToCircle);
        setCircles(mapped);
        try {
          localStorage.setItem(CIRCLES_STORAGE_KEY, JSON.stringify(mapped));
        } catch {}

        setActiveCircle((current) => {
          if (current && mapped.some((c) => c.id === current.id)) {
            return current;
          }
          const joinedCircle = mapped.find((m) => {
            const raw = res.items.find((rc: any) => rc._id === m.id);
            return raw?.isMember || raw?.owner?._id === user?._id;
          });
          return joinedCircle || mapped[0] || null;
        });
      }
    } catch (err) {
      console.warn("Could not fetch communities:", err);
    } finally {
      setIsLoadingCommunities(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  // ── 2. Select Circle & Load Channels + Members ─────────────────────────────
  useEffect(() => {
    if (!activeCircle) {
      setCircleChannels([]);
      setSelectedChannel(null);
      setCircleMembers([]);
      setMessages([]);
      return;
    }

    const rawComm = rawCommunities.find((c) => c._id === activeCircle.id);
    const chans: Channel[] =
      rawComm?.channels && rawComm.channels.length > 0
        ? (rawComm.channels as unknown as Channel[])
        : getDefaultChannels(activeCircle.id);

    setCircleChannels(chans);
    setChannels(chans);

    // Default to first academic focus channel
    const defaultChan = chans.find((c) => c.category === "focus") || chans[0];
    setSelectedChannel(defaultChan || null);

    // Fetch members
    communitiesApi
      .members(activeCircle.id)
      .then((mems) => {
        if (mems) {
          const mappedMembers = mems.map((m) => ({
            _id: m.userId?._id || m._id,
            fullName: m.userId?.fullName || "Scholar",
            rollNumber: m.userId?.rollNumber || "",
            department: m.userId?.department || "Academic",
            role: m.role || "STUDENT",
            isOnline: true,
            karma: (m.userId as any)?.karma || 0
          }));
          setCircleMembers(mappedMembers);
        }
      })
      .catch(() => {
        if (user) {
          setCircleMembers([
            {
              _id: user._id || "u-me",
              fullName: user.fullName || "Student",
              rollNumber: user.rollNumber || "",
              department: user.department || "Campus",
              role: user.role === "ADMIN" ? "ADMIN" : "STUDENT",
              isOnline: true,
              karma: (user as any)?.karma || 0
            }
          ]);
        }
      });
  }, [activeCircle, rawCommunities, setSelectedChannel, setChannels, setMessages, user]);

  // ── 3. Load Channel Messages & Connect Socket Room ────────────────────────
  useEffect(() => {
    if (!activeCircle || !activeChannel || viewMode !== "circle") return;

    let isMounted = true;
    const chanId = activeChannel._id || activeChannel.name;

    chatApi
      .history(activeCircle.id, {
        channelId: chanId,
        limit: 50,
        order: "oldest"
      })
      .then((res) => {
        if (isMounted && res?.items) {
          setMessages(res.items);
        }
      })
      .catch((err) => {
        console.warn("Failed to load message history:", err);
      });

    const socket = socketService.connect();
    if (socket) {
      socket.emit("chat:joinRoom", {
        communityId: activeCircle.id,
        channelId: chanId
      });
      socket.emit("joinRoom", {
        roomId: activeCircle.id,
        communityId: activeCircle.id
      });
    }

    return () => {
      isMounted = false;
    };
  }, [activeCircle, activeChannel, viewMode, setMessages]);

  // ── 4. Fetch DM Conversations ──────────────────────────
  const fetchDmData = useCallback(async () => {
    if (!user?._id) return;
    try {
      const convsRes = await directMessagesApi.listConversations({ limit: 50 }).catch(() => null);

      if (convsRes?.items) {
        const mapped = convsRes.items.map((c) => mapBackendConversationToItem(c, user._id));
        setDmConversations(mapped);
        const initialLocked: Record<string, boolean> = {};
        convsRes.items.forEach((c) => {
          if (c.isLocked) initialLocked[c._id] = true;
        });
        setLockedConversations((prev) => ({ ...prev, ...initialLocked }));
        if (!convParam && !activeDmConvId && mapped.length > 0) {
          setActiveDmConvId(mapped[0].id);
        }
      }
    } catch (err) {
      console.warn("Could not load DM data:", err);
    }
  }, [user?._id, convParam, activeDmConvId]);

  useEffect(() => {
    fetchDmData();
  }, [fetchDmData]);

  // Sync route convParam to activeDmConvId
  useEffect(() => {
    if (convParam && convParam !== activeDmConvId) {
      setActiveDmConvId(convParam);
    }
  }, [convParam, activeDmConvId]);

  // Search campus students for New Direct Message Modal
  useEffect(() => {
    if (!isNewChatModalOpen) return;
    let isCancelled = false;
    setIsSearchingStudents(true);
    const timer = setTimeout(() => {
      usersApi
        .search(newChatSearch.trim())
        .then((res) => {
          if (!isCancelled && res) {
            setSearchedStudents(res.filter((u: any) => u._id !== user?._id));
          }
        })
        .catch(() => {
          if (!isCancelled) setSearchedStudents([]);
        })
        .finally(() => {
          if (!isCancelled) setIsSearchingStudents(false);
        });
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [newChatSearch, isNewChatModalOpen, user?._id]);

  // Load messages for active DM conversation
  useEffect(() => {
    if (!activeDmConvId) return;

    const socket = socketService.get();
    if (socket) {
      socket.emit("joinConversation", { conversationId: activeDmConvId });
    }

    let isMounted = true;
    directMessagesApi
      .getMessages(activeDmConvId, { limit: 50, order: "oldest" })
      .then((res) => {
        if (isMounted && res?.items) {
          const mapped = res.items.map(mapBackendMessageToItem);
          setDmMessagesMap((prev) => ({
            ...prev,
            [activeDmConvId]: mapped
          }));
        }
      })
      .catch((err) => {
        console.warn("Failed to load DM history:", err);
      });

    directMessagesApi.markAsRead(activeDmConvId).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [activeDmConvId]);

  // ── 5. Global Real-time Socket Event Listeners ─────────────────────────────
  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;

    // Circle Chat Events
    const handleMessageReceived = (msg: ChatMessage) => {
      addMessage(msg);
    };

    const handleThreadReplyReceived = (reply: ChatMessage) => {
      addThreadReply(reply);
    };

    const handleMessagePinned = (data: { messageId: string; isPinned: boolean }) => {
      updateMessagePin(data.messageId, data.isPinned);
    };

    const handleSolutionAccepted = (data: { messageId: string; karmaAwarded?: number }) => {
      markMessageAccepted(data.messageId, data.karmaAwarded || 25);
      addToast("Accepted solution marked! +25 Karma awarded.", "success");
    };

    const handleSprintStarted = (sprint: any) => {
      setActiveSprint(sprint);
      addToast(`Study Sprint started: "${sprint.topic}"`, "info");
    };

    const handleSprintJoined = (data: { userId: string; userName?: string }) => {
      if (useChatStore.getState().activeSprint) {
        const prev = useChatStore.getState().activeSprint!.participants;
        if (!prev.includes(data.userId)) {
          updateSprintParticipants([...prev, data.userId]);
        }
      }
    };

    const handleSprintLeft = (data: { userId: string }) => {
      if (useChatStore.getState().activeSprint) {
        const prev = useChatStore.getState().activeSprint!.participants;
        updateSprintParticipants(prev.filter((id) => id !== data.userId));
      }
    };

    const handleSprintCompleted = (data: { karmaAwarded: number }) => {
      setActiveSprint(null);
      addToast(`Study Sprint completed! +${data.karmaAwarded} Karma awarded!`, "success");
    };

    const handleVoicePeerJoined = (data: { peer: any }) => {
      const current = useChatStore.getState().activeVoiceStage;
      if (current) {
        updateVoicePeers([...current.peers.filter((p) => p.socketId !== data.peer.socketId), data.peer]);
      }
    };

    const handleVoicePeerLeft = (data: { socketId: string }) => {
      const current = useChatStore.getState().activeVoiceStage;
      if (current) {
        updateVoicePeers(current.peers.filter((p) => p.socketId !== data.socketId));
      }
    };

    const handleVoicePeerSpeaking = (data: { socketId: string; isSpeaking: boolean }) => {
      const current = useChatStore.getState().activeVoiceStage;
      if (current) {
        updateVoicePeers(
          current.peers.map((p) =>
            p.socketId === data.socketId ? { ...p, isSpeaking: data.isSpeaking } : p
          )
        );
      }
    };

    const handleVoicePeerMuted = (data: { socketId: string; isMuted: boolean }) => {
      const current = useChatStore.getState().activeVoiceStage;
      if (current) {
        updateVoicePeers(
          current.peers.map((p) =>
            p.socketId === data.socketId ? { ...p, isMuted: data.isMuted } : p
          )
        );
      }
    };

    const handleVoicePeerScreenshare = (data: { socketId: string; isSharing: boolean }) => {
      const current = useChatStore.getState().activeVoiceStage;
      if (current) {
        updateVoicePeers(
          current.peers.map((p) =>
            p.socketId === data.socketId ? { ...p, isScreenSharing: data.isSharing } : p
          )
        );
      }
    };

    // Direct Messages Events & Reliability
    const handleDirectMessage = (data: any) => {
      const msg = data?.message || data;
      const incomingConvId = data?.conversationId || msg?.conversationId || activeDmConvIdRef.current;
      if (!incomingConvId) return;

      const newMsg = mapBackendMessageToItem(msg);
      const activeConvId = activeDmConvIdRef.current;
      const isCurrentlyActive = incomingConvId === activeConvId;

      // Delivery receipt: acknowledge delivery if we received it and aren't sender
      if (newMsg.senderId !== user?._id) {
        socket.emit("dm:delivered", {
          conversationId: incomingConvId,
          messageId: newMsg.id,
          senderId: newMsg.senderId
        });
      }

      // Read receipt: acknowledge read if conversation is open and we aren't sender
      if (isCurrentlyActive && newMsg.senderId !== user?._id) {
        socket.emit("dm:read", {
          conversationId: incomingConvId,
          messageId: newMsg.id,
          senderId: newMsg.senderId
        });
      }

      setDmMessagesMap((prev) => {
        const list = prev[incomingConvId] || [];
        const existingIdx = list.findIndex(
          (m) =>
            m.id === newMsg.id ||
            (newMsg.clientMessageId && m.clientMessageId === newMsg.clientMessageId) ||
            (m.clientMessageId && m.clientMessageId === newMsg.id)
        );
        if (existingIdx !== -1) {
          const updated = [...list];
          updated[existingIdx] = {
            ...updated[existingIdx],
            ...newMsg,
            status: isCurrentlyActive && newMsg.senderId !== user?._id ? "READ" : newMsg.status
          };
          return {
            ...prev,
            [incomingConvId]: updated
          };
        }
        return {
          ...prev,
          [incomingConvId]: [...list, newMsg]
        };
      });

      setDmConversations((prev) => {
        const exists = prev.find((c) => c.id === incomingConvId);
        if (!exists) {
          fetchDmData();
          return prev;
        }
        const updatedConv: ConversationItem = {
          ...exists,
          lastMessage: {
            text: newMsg.content || (newMsg.attachments?.length ? "Sent an attachment" : "New message"),
            senderId: newMsg.senderId,
            time: newMsg.time,
            isRead: isCurrentlyActive || newMsg.isRead,
            isDelivered: newMsg.isDelivered,
            hasAttachment: !!(newMsg.attachments && newMsg.attachments.length > 0),
            hasCodeSnippet: !!newMsg.codeSnippet
          },
          unreadCount: isCurrentlyActive ? 0 : (exists.unreadCount || 0) + 1
        };
        const others = prev.filter((c) => c.id !== incomingConvId);
        return [updatedConv, ...others].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        });
      });
    };

    const handleDmDelivered = (data: any) => {
      const { conversationId, messageId, clientMessageId } = data || {};
      if (!conversationId) return;

      setDmMessagesMap((prev) => {
        const list = prev[conversationId];
        if (!list) return prev;
        return {
          ...prev,
          [conversationId]: list.map((m) => {
            if (
              (messageId && m.id === messageId) ||
              (clientMessageId && m.clientMessageId === clientMessageId) ||
              (!messageId && !clientMessageId)
            ) {
              return {
                ...m,
                isDelivered: true,
                status: m.status === "READ" ? "READ" : "DELIVERED"
              };
            }
            return m;
          })
        };
      });

      setDmConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId && c.lastMessage
            ? { ...c, lastMessage: { ...c.lastMessage, isDelivered: true } }
            : c
        )
      );
    };

    const handleDmRead = (data: any) => {
      const { conversationId, messageId } = data || {};
      if (!conversationId) return;

      setDmMessagesMap((prev) => {
        const list = prev[conversationId];
        if (!list) return prev;
        return {
          ...prev,
          [conversationId]: list.map((m) => {
            if (!messageId || m.id === messageId) {
              return {
                ...m,
                isRead: true,
                isDelivered: true,
                status: "READ"
              };
            }
            return m;
          })
        };
      });

      setDmConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId && c.lastMessage
            ? { ...c, lastMessage: { ...c.lastMessage, isRead: true } }
            : c
        )
      );
    };

    const handleDmUserTyping = (data: any) => {
      if (data?.conversationId) {
        setTyping(data.conversationId, true);
        if (data.conversationId === activeDmConvIdRef.current) {
          setIsPeerTyping(true);
        }
      }
    };

    const handleDmUserStoppedTyping = (data: any) => {
      if (data?.conversationId) {
        setTyping(data.conversationId, false);
        if (data.conversationId === activeDmConvIdRef.current) {
          setIsPeerTyping(false);
        }
      }
    };

    const handleConnect = () => {
      setConnectionStatus("connected");
      if (activeDmConvIdRef.current) {
        socket.emit("joinConversation", { conversationId: activeDmConvIdRef.current });
      }
    };
    const handleDisconnect = () => {
      setConnectionStatus("offline");
    };
    const handleConnectError = () => {
      setConnectionStatus("connecting");
    };

    const handleTyping = () => setIsPeerTyping(true);
    const handleStopTyping = () => setIsPeerTyping(false);

    const handleChatError = (err: any) => {
      const msg = err?.message || (typeof err === "string" ? err : "Chat error occurred");
      addToast(msg, "error");
    };

    const handleChatRejected = (data: any) => {
      if (data?.reason) {
        addToast(data.reason, "error");
      }
    };

    const handleCircleReactionUpdated = (data: any) => {
      if (data?.messageId && data?.reactions) {
        updateMessage({
          _id: data.messageId,
          reactions: data.reactions
        } as any);
      }
    };

    const handleDmReactionUpdated = (data: any) => {
      if (!data?.conversationId || !data?.messageId) return;
      setDmMessagesMap((prev) => {
        const list = prev[data.conversationId];
        if (!list) return prev;
        return {
          ...prev,
          [data.conversationId]: list.map((m) =>
            m.id === data.messageId ? { ...m, reactions: data.reactions } : m
          )
        };
      });
    };

    const handleCircleDeletedForMe = (data: any) => {
      if (data?.messageId) {
        removeMessage(data.messageId);
      }
    };

    const handleDmDeletedForMe = (data: any) => {
      if (!data?.conversationId || !data?.messageId) return;

      let deletedWasLast = false;

      setDmMessagesMap((prev) => {
        const list = prev[data.conversationId];
        if (!list) return prev;
        const filtered = list.filter((m) => m.id !== data.messageId);
        // Check if the deleted message was the most recent one
        const lastInList = list[list.length - 1];
        if (lastInList?.id === data.messageId) {
          deletedWasLast = true;
          // After filtering, update sidebar with new last message
          const newLast = filtered[filtered.length - 1];
          setDmConversations((convPrev) =>
            convPrev.map((c) => {
              if (c.id !== data.conversationId) return c;
              return {
                ...c,
                lastMessage: newLast
                  ? {
                      ...c.lastMessage!,
                      text: newLast.content || (newLast.voiceNote ? "🎙️ Voice note" : "📎 Attachment"),
                      time: newLast.time,
                      senderId: newLast.senderId
                    }
                  : null
              };
            })
          );
        }
        return { ...prev, [data.conversationId]: filtered };
      });
    };

    const handleCircleMessagePurged = (data: any) => {
      if (data?.messageId) {
        updateMessage({
          _id: data.messageId,
          isDeletedForEveryone: true,
          content: "",
          attachments: [],
          deletedBy: data.deletedBy,
          deletedAt: data.deletedAt
        } as any);
      }
    };

    const handleDmMessagePurged = (data: any) => {
      if (!data?.conversationId || !data?.messageId) return;

      setDmMessagesMap((prev) => {
        const list = prev[data.conversationId];
        if (!list) return prev;
        return {
          ...prev,
          [data.conversationId]: list.map((m) =>
            m.id === data.messageId
              ? {
                  ...m,
                  isDeletedForEveryone: true,
                  content: "",
                  attachments: [],
                  deletedBy: data.deletedBy,
                  deletedAt: data.deletedAt
                }
              : m
          )
        };
      });

      // Also update the sidebar preview if this was the last message
      setDmConversations((prev) =>
        prev.map((c) => {
          if (c.id !== data.conversationId) return c;
          if (!c.lastMessage) return c;
          return {
            ...c,
            lastMessage: {
              ...c.lastMessage,
              text: "🗑️ This message was deleted"
            }
          };
        })
      );
    };

    const handleChannelLockStateChanged = (data: any) => {
      if (!data?.communityId) return;
      setCircleChannels((prev) =>
        prev.map((ch) =>
          ch._id === data.channelId || ch.name === data.channelName
            ? {
                ...ch,
                isLocked: data.isLocked,
                lockedReason: data.lockedReason,
                lockedBy: data.lockedBy,
                lockedAt: data.lockedAt
              }
            : ch
        )
      );
      if (
        activeChannel &&
        (activeChannel._id === data.channelId || activeChannel.name === data.channelName)
      ) {
        setSelectedChannel({
          ...activeChannel,
          isLocked: data.isLocked,
          lockedReason: data.lockedReason,
          lockedBy: data.lockedBy,
          lockedAt: data.lockedAt
        });
      }
      addToast(
        data.isLocked
          ? `Channel #${data.channelName || "channel"} locked: ${data.lockedReason || "Read-only mode"}`
          : `Channel #${data.channelName || "channel"} unlocked`,
        data.isLocked ? "warning" : "info"
      );
    };

    const handleDmLockStateChanged = (data: any) => {
      if (!data?.conversationId) return;
      setLockedConversations((prev) => ({
        ...prev,
        [data.conversationId]: data.isLocked
      }));
      setDmConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId
            ? {
                ...c,
                isLocked: data.isLocked,
                lockedReason: data.lockedReason
              }
            : c
        )
      );
      addToast(
        data.isLocked
          ? `Conversation locked by ${data.lockedByName || "Classmate"}: ${data.lockedReason || "Direct messages paused"}`
          : "Conversation unlocked",
        data.isLocked ? "warning" : "info"
      );
    };

    const handleDmMessageEdited = (data: any) => {
      const convId = data?.conversationId || (data?.message as any)?.conversationId;
      const msgId = data?._id || data?.id;
      const content = data?.content;
      if (!msgId) return;
      setDmMessagesMap((prev) => {
        const next = { ...prev };
        if (convId && next[convId]) {
          next[convId] = next[convId].map((m) =>
            m.id === msgId ? { ...m, content, edited: true, editedAt: data.editedAt || new Date().toISOString() } : m
          );
        } else {
          for (const [cId, list] of Object.entries(next)) {
            if (list.some((m) => m.id === msgId)) {
              next[cId] = list.map((m) =>
                m.id === msgId ? { ...m, content, edited: true, editedAt: data.editedAt || new Date().toISOString() } : m
              );
            }
          }
        }
        return next;
      });
    };

    const handleDmStarUpdated = (data: any) => {
      if (!data?.messageId) return;
      setDmMessagesMap((prev) => {
        const next = { ...prev };
        for (const [cId, list] of Object.entries(next)) {
          if (list.some((m) => m.id === data.messageId)) {
            next[cId] = list.map((m) =>
              m.id === data.messageId ? { ...m, isStarred: data.isStarred } : m
            );
          }
        }
        return next;
      });
    };

    const handleDmPinUpdated = (data: any) => {
      if (!data?.messageId) return;
      setDmMessagesMap((prev) => {
        const next = { ...prev };
        const convId = data.conversationId;
        if (convId && next[convId]) {
          next[convId] = next[convId].map((m) =>
            m.id === data.messageId
              ? { ...m, isPinned: data.isPinned, pinnedAt: data.pinnedAt, pinnedBy: data.pinnedBy }
              : m
          );
        } else {
          for (const [cId, list] of Object.entries(next)) {
            if (list.some((m) => m.id === data.messageId)) {
              next[cId] = list.map((m) =>
                m.id === data.messageId
                  ? { ...m, isPinned: data.isPinned, pinnedAt: data.pinnedAt, pinnedBy: data.pinnedBy }
                  : m
              );
            }
          }
        }
        return next;
      });
    };

    const handleCircleMessageEdited = (data: any) => {
      if (data?._id) {
        updateMessage({
          _id: data._id,
          content: data.content,
          edited: true,
          editedAt: data.editedAt || new Date().toISOString()
        } as any);
      }
    };

    const handleCircleStarUpdated = (data: any) => {
      if (data?.messageId) {
        updateMessage({
          _id: data.messageId,
          isStarred: data.isStarred
        } as any);
      }
    };

    const handleCirclePinUpdated = (data: any) => {
      if (data?.messageId) {
        updateMessage({
          _id: data.messageId,
          isPinned: data.isPinned,
          pinnedAt: data.pinnedAt,
          pinnedBy: data.pinnedBy
        } as any);
      }
    };

    // Attach listeners
    socket.on("chat:messageReceived", handleMessageReceived);
    socket.on("messageCreated", handleMessageReceived);
    socket.on("newMessage", handleMessageReceived);
    socket.on("chatError", handleChatError);
    socket.on("chat:messageRejected", handleChatRejected);
    socket.on("chat:threadReplyReceived", handleThreadReplyReceived);
    socket.on("chat:messagePinned", handleMessagePinned);
    socket.on("chat:solutionAccepted", handleSolutionAccepted);
    socket.on("sprint:started", handleSprintStarted);
    socket.on("sprint:joined", handleSprintJoined);
    socket.on("sprint:left", handleSprintLeft);
    socket.on("sprint:completed", handleSprintCompleted);
    socket.on("voice:peerJoined", handleVoicePeerJoined);
    socket.on("voice:peerLeft", handleVoicePeerLeft);
    socket.on("voice:peerSpeaking", handleVoicePeerSpeaking);
    socket.on("voice:peerMuted", handleVoicePeerMuted);
    socket.on("voice:peerScreenshare", handleVoicePeerScreenshare);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    socket.on("directMessageReceived", handleDirectMessage);
    socket.on("directMessageCreated", handleDirectMessage);
    socket.on("dm:messageReceived", handleDirectMessage);
    socket.on("dm:messageDelivered", handleDmDelivered);
    socket.on("dm:messageRead", handleDmRead);
    socket.on("messageRead", handleDmRead);
    socket.on("dm:userTyping", handleDmUserTyping);
    socket.on("dm:userStoppedTyping", handleDmUserStoppedTyping);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    socket.on("chat:reactionUpdated", handleCircleReactionUpdated);
    socket.on("dm:reactionUpdated", handleDmReactionUpdated);
    socket.on("chat:messageDeletedForMe", handleCircleDeletedForMe);
    socket.on("dm:messageDeletedForMe", handleDmDeletedForMe);
    socket.on("chat:messagePurged", handleCircleMessagePurged);
    socket.on("dm:messagePurged", handleDmMessagePurged);
    socket.on("channel:lockStateChanged", handleChannelLockStateChanged);
    socket.on("dm:lockStateChanged", handleDmLockStateChanged);

    socket.on("dm:messageEdited", handleDmMessageEdited);
    socket.on("directMessageUpdated", handleDmMessageEdited);
    socket.on("dm:starUpdated", handleDmStarUpdated);
    socket.on("dm:pinUpdated", handleDmPinUpdated);
    socket.on("dm:messagePinned", handleDmPinUpdated);

    socket.on("chat:messageEdited", handleCircleMessageEdited);
    socket.on("messageUpdated", handleCircleMessageEdited);
    socket.on("chat:starUpdated", handleCircleStarUpdated);
    socket.on("chat:pinUpdated", handleCirclePinUpdated);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);

      socket.off("chat:messageReceived", handleMessageReceived);
      socket.off("messageCreated", handleMessageReceived);
      socket.off("newMessage", handleMessageReceived);
      socket.off("chatError", handleChatError);
      socket.off("chat:messageRejected", handleChatRejected);
      socket.off("chat:threadReplyReceived", handleThreadReplyReceived);
      socket.off("chat:messagePinned", handleMessagePinned);
      socket.off("chat:solutionAccepted", handleSolutionAccepted);
      socket.off("sprint:started", handleSprintStarted);
      socket.off("sprint:joined", handleSprintJoined);
      socket.off("sprint:left", handleSprintLeft);
      socket.off("sprint:completed", handleSprintCompleted);
      socket.off("voice:peerJoined", handleVoicePeerJoined);
      socket.off("voice:peerLeft", handleVoicePeerLeft);
      socket.off("voice:peerSpeaking", handleVoicePeerSpeaking);
      socket.off("voice:peerMuted", handleVoicePeerMuted);
      socket.off("voice:peerScreenshare", handleVoicePeerScreenshare);

      socket.off("directMessageReceived", handleDirectMessage);
      socket.off("directMessageCreated", handleDirectMessage);
      socket.off("dm:messageReceived", handleDirectMessage);
      socket.off("dm:messageDelivered", handleDmDelivered);
      socket.off("dm:messageRead", handleDmRead);
      socket.off("messageRead", handleDmRead);
      socket.off("dm:userTyping", handleDmUserTyping);
      socket.off("dm:userStoppedTyping", handleDmUserStoppedTyping);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);

      socket.off("chat:reactionUpdated", handleCircleReactionUpdated);
      socket.off("dm:reactionUpdated", handleDmReactionUpdated);
      socket.off("chat:messageDeletedForMe", handleCircleDeletedForMe);
      socket.off("dm:messageDeletedForMe", handleDmDeletedForMe);
      socket.off("chat:messagePurged", handleCircleMessagePurged);
      socket.off("dm:messagePurged", handleDmMessagePurged);
      socket.off("channel:lockStateChanged", handleChannelLockStateChanged);
      socket.off("dm:lockStateChanged", handleDmLockStateChanged);

      socket.off("dm:messageEdited", handleDmMessageEdited);
      socket.off("directMessageUpdated", handleDmMessageEdited);
      socket.off("dm:starUpdated", handleDmStarUpdated);
      socket.off("dm:pinUpdated", handleDmPinUpdated);
      socket.off("dm:messagePinned", handleDmPinUpdated);

      socket.off("chat:messageEdited", handleCircleMessageEdited);
      socket.off("messageUpdated", handleCircleMessageEdited);
      socket.off("chat:starUpdated", handleCircleStarUpdated);
      socket.off("chat:pinUpdated", handleCirclePinUpdated);
    };
  }, [
    activeDmConvId,
    activeChannel,
    addMessage,
    updateMessage,
    removeMessage,
    addThreadReply,
    updateMessagePin,
    markMessageAccepted,
    setActiveSprint,
    updateSprintParticipants,
    updateVoicePeers,
    addToast,
    setSelectedChannel
  ]);

  // Total unread DMs
  const totalUnreadDMs = useMemo(() => {
    return dmConversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [dmConversations]);

  // Active DM conversation and messages
  const activeDmConversation = useMemo(() => {
    return dmConversations.find((c) => c.id === activeDmConvId) || null;
  }, [dmConversations, activeDmConvId]);

  const activeDmMessages = useMemo(() => {
    return activeDmConvId ? dmMessagesMap[activeDmConvId] || [] : [];
  }, [dmMessagesMap, activeDmConvId]);

  // ── 6. Send Circle Message Dispatcher ─────────────────────────────────────
  const handleSendMessage = async (
    content: string,
    codeSnippet?: { language: string; code: string; title?: string },
    files?: File[],
    _poll?: any,
    voiceNote?: ChatVoiceNotePayload,
    intent?: "chat" | "question" | "solution" | "code"
  ) => {
    if (!activeCircle || !activeChannel) return;

    const chanId = activeChannel._id || activeChannel.name;
    const tempId = `circle-opt-${Date.now()}`;

    // Ensure student is joined in this circle before dispatching message
    const rawComm = rawCommunities.find((rc) => rc._id === activeCircle.id);
    const isMemberAlready = rawComm?.isMember || rawComm?.owner?._id === user?._id;
    if (!isMemberAlready) {
      try {
        await communitiesApi.join(activeCircle.id);
        setRawCommunities((prev) =>
          prev.map((c) => (c._id === activeCircle.id ? { ...c, isMember: true } : c))
        );
      } catch (joinErr) {
        console.warn("Could not auto-join circle before messaging:", joinErr);
      }
    }

    // Collect all files to upload (regular attachments + voice note file)
    const allFiles: File[] = [];
    if (files && files.length > 0) allFiles.push(...files);
    if (voiceNote?.file) allFiles.push(voiceNote.file);

    // 1. Optimistic Message in UI
    const optimisticMsg: ChatMessage = {
      _id: tempId,
      communityId: activeCircle.id,
      channelId: chanId,
      senderId: {
        _id: user?._id || "u-me",
        fullName: user?.fullName || "Student",
        profilePicture: user?.profilePicture,
        department: user?.department,
        rollNumber: user?.rollNumber
      } as any,
      content: content || "",
      messageType: voiceNote?.file ? "AUDIO" : allFiles.length > 0 ? "DOCUMENT" : "TEXT",
      attachments:
        allFiles.map((f) => ({
          key: f.name,
          url: "#",
          originalName: f.name,
          mimeType: f.type,
          size: f.size
        })) || [],
      codeSnippet,
      intent: intent || (codeSnippet ? "code" : "chat"),
      edited: false,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addMessage(optimisticMsg);

    // 2. Attachments / voice note upload via multipart
    if (allFiles.length > 0) {
      try {
        const uploaded = await chatApi.create(activeCircle.id, {
          content: content || "",
          channelId: chanId,
          attachments: allFiles,
          ...(voiceNote ? { duration: voiceNote.durationSec, waveform: voiceNote.waveform } : {})
        });
        if (uploaded) {
          useChatStore.getState().setMessages(
            useChatStore.getState().messages.map((m) => (m._id === tempId ? uploaded : m))
          );
        }
      } catch (err: any) {
        addToast(err?.response?.data?.message || "Failed to upload attachments", "error");
        useChatStore.getState().setMessages(
          useChatStore.getState().messages.filter((m) => m._id !== tempId)
        );
      }
      return;
    }


    // 3. Socket dispatch with fallback to HTTP REST
    const payload = {
      communityId: activeCircle.id,
      channelId: chanId,
      content: content || "",
      codeSnippet,
      intent: intent || (codeSnippet ? "code" : "chat")
    };

    const socket = socketService.get() || socketService.connect();
    if (socket && socket.connected) {
      socket.emit("chat:sendMessage", payload, (res: any) => {
        if (res?.success && res.data) {
          useChatStore.getState().setMessages(
            useChatStore.getState().messages.map((m) => (m._id === tempId ? res.data : m))
          );
        } else if (res && !res.success) {
          addToast(res.message || "Failed to send message", "error");
          useChatStore.getState().setMessages(
            useChatStore.getState().messages.filter((m) => m._id !== tempId)
          );
        }
      });
    } else {
      try {
        const created = await chatApi.create(activeCircle.id, {
          content: content || "",
          channelId: chanId
        });
        if (created) {
          useChatStore.getState().setMessages(
            useChatStore.getState().messages.map((m) => (m._id === tempId ? created : m))
          );
        }
      } catch (err: any) {
        addToast(err?.response?.data?.message || "Failed to send message", "error");
        useChatStore.getState().setMessages(
          useChatStore.getState().messages.filter((m) => m._id !== tempId)
        );
      }
    }
  };

  // ── 7. Send Direct Message Dispatcher ─────────────────────────────────────
  const handleSelectDmConversation = (convId: string) => {
    setActiveDmConvId(convId);
    setSearchParams({ mode: "dms", conv: convId });
    setSearchInChatOpen(false);
    setChatSearchQuery("");
    setDmConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
    );
    directMessagesApi.markAsRead(convId).catch(() => {});
    const socket = socketService.get();
    const conv = dmConversations.find((c) => c.id === convId);
    if (socket && conv?.peer?.id) {
      socket.emit("dm:read", {
        conversationId: convId,
        senderId: conv.peer.id
      });
    }
  };

  const handleStartNewDm = async (
    peerId: string,
    customPeer?: { name: string; roll?: string; dept?: string }
  ) => {
    const existing = dmConversations.find((c) => c.peer.id === peerId);
    if (existing) {
      handleSelectDmConversation(existing.id);
      return;
    }

    try {
      const backendConv = await directMessagesApi.startConversation(peerId);
      if (!backendConv) {
        addToast("Unable to start conversation with this student", "error");
        return;
      }

      const mappedConv = mapBackendConversationToItem(backendConv, user?._id);
      if (customPeer && (!mappedConv.peer.name || mappedConv.peer.name === "Student")) {
        mappedConv.peer.name = customPeer.name;
        mappedConv.peer.roll = customPeer.roll || mappedConv.peer.roll;
        mappedConv.peer.dept = customPeer.dept || mappedConv.peer.dept;
      }

      setDmConversations((prev) => {
        const found = prev.find((c) => c.id === mappedConv.id || c.peer.id === mappedConv.peer.id);
        if (found) return prev;
        return [mappedConv, ...prev];
      });

      setActiveDmConvId(mappedConv.id);
      setSearchParams({ mode: "dms", conv: mappedConv.id });
      addToast(`Connected with ${mappedConv.peer.name}`, "success");
    } catch (err: any) {
      console.error("Failed to start conversation:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to start conversation";
      addToast(msg, "error");
    }
  };

  const handleSendDirectMessage = async (
    content: string,
    codeSnippet?: { language: string; code: string },
    files?: File[],
    voiceNote?: DMVoiceNotePayload
  ) => {
    if (!activeDmConvId) return;

    const student = user?.fullName || "Student";
    const studentId = user?._id || "u-me";

    // Collect all files: regular attachments + voice note file
    const allFiles: File[] = [];
    if (files && files.length > 0) allFiles.push(...files);
    if (voiceNote?.file) allFiles.push(voiceNote.file);

    const clientMessageId = `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newMsg: DirectMessageItem = {
      id: clientMessageId,
      clientMessageId,
      senderId: studentId,
      senderName: student,
      content,
      codeSnippet,
      voiceNote: voiceNote
        ? {
            duration: voiceNote.duration,
            durationSec: voiceNote.durationSec,
            waveform: voiceNote.waveform,
            url: voiceNote.url
          }
        : undefined,
      attachments: files?.map((f) => ({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        sizeBytes: f.size,
        type: f.type.startsWith("image/")
          ? "image"
          : f.name.endsWith(".pdf")
          ? "pdf"
          : "zip",
        mimeType: f.type,
        url: "#"
      })),
      replyTo: dmReplyTarget || undefined,
      isRead: false,
      isDelivered: false,
      status: "SENDING",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: new Date().toISOString()
    };

    setDmMessagesMap((prev) => ({
      ...prev,
      [activeDmConvId]: [...(prev[activeDmConvId] || []), newMsg]
    }));

    setDmConversations((prev) => {
      const conv = prev.find((c) => c.id === activeDmConvId);
      if (!conv) return prev;
      const updatedConv = {
        ...conv,
        lastMessage: {
          text: content || (voiceNote ? "🎙️ Voice Note" : "Sent an attachment"),
          senderId: studentId,
          time: newMsg.time,
          isRead: true,
          isDelivered: false,
          hasAttachment: !!(allFiles.length > 0),
          hasCodeSnippet: !!codeSnippet
        }
      };
      const others = prev.filter((c) => c.id !== activeDmConvId);
      return [updatedConv, ...others].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
    });

    try {
      const sent = await directMessagesApi.sendMessage(activeDmConvId, {
        content,
        clientMessageId,
        attachments: allFiles.length > 0 ? allFiles : undefined,
        duration: voiceNote?.durationSec,
        waveform: voiceNote?.waveform
      });

      if (sent) {
        const mappedSent = mapBackendMessageToItem(sent);
        setDmMessagesMap((prev) => ({
          ...prev,
          [activeDmConvId]: (prev[activeDmConvId] || []).map((m) =>
            m.id === clientMessageId || (m.clientMessageId && m.clientMessageId === clientMessageId)
              ? mappedSent
              : m
          )
        }));
        setDmConversations((prev) =>
          prev.map((c) =>
            c.id === activeDmConvId && c.lastMessage
              ? { ...c, lastMessage: { ...c.lastMessage, isDelivered: mappedSent.isDelivered } }
              : c
          )
        );
      }
    } catch (err: any) {
      console.warn("Could not persist message to backend API:", err?.message || err);
      addToast(err?.response?.data?.message || "Failed to send message", "error");
      setDmMessagesMap((prev) => ({
        ...prev,
        [activeDmConvId]: (prev[activeDmConvId] || []).map((m) =>
          m.id === clientMessageId || (m.clientMessageId && m.clientMessageId === clientMessageId)
            ? { ...m, status: "FAILED" }
            : m
        )
      }));
    }
  };


  const handleRetryDirectMessage = async (failedMsg: DirectMessageItem) => {
    if (!activeDmConvId) return;

    setDmMessagesMap((prev) => ({
      ...prev,
      [activeDmConvId]: (prev[activeDmConvId] || []).map((m) =>
        m.id === failedMsg.id ? { ...m, status: "SENDING" } : m
      )
    }));

    try {
      const sent = await directMessagesApi.sendMessage(activeDmConvId, {
        content: failedMsg.content,
        clientMessageId: failedMsg.clientMessageId || failedMsg.id
      });

      if (sent) {
        const mappedSent = mapBackendMessageToItem(sent);
        setDmMessagesMap((prev) => ({
          ...prev,
          [activeDmConvId]: (prev[activeDmConvId] || []).map((m) =>
            m.id === failedMsg.id || (failedMsg.clientMessageId && m.clientMessageId === failedMsg.clientMessageId)
              ? mappedSent
              : m
          )
        }));
      }
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Retry failed. Please check connection.", "error");
      setDmMessagesMap((prev) => ({
        ...prev,
        [activeDmConvId]: (prev[activeDmConvId] || []).map((m) =>
          m.id === failedMsg.id ? { ...m, status: "FAILED" } : m
        )
      }));
    }
  };

  const handleTogglePin = async (convId: string) => {
    try {
      const res = await directMessagesApi.togglePin(convId);
      setDmConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === convId ? { ...c, isPinned: res.isPinned } : c
        );
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        });
      });
      addToast(res.isPinned ? "Pinned conversation" : "Unpinned conversation", "info");
    } catch (err) {
      addToast("Failed to pin conversation", "error");
    }
  };

  const handleToggleMute = async (convId: string) => {
    try {
      const res = await directMessagesApi.toggleMute(convId);
      setDmConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, isMuted: res.isMuted } : c))
      );
      addToast(res.isMuted ? "Muted conversation" : "Unmuted conversation", "info");
    } catch (err) {
      addToast("Failed to mute conversation", "error");
    }
  };

  const handleToggleArchive = async (convId: string) => {
    try {
      const res = await directMessagesApi.toggleArchive(convId);
      setDmConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, isArchived: res.isArchived } : c))
      );
      addToast(res.isArchived ? "Archived conversation" : "Unarchived conversation", "info");
    } catch (err) {
      addToast("Failed to archive conversation", "error");
    }
  };

  const handleMarkAsRead = async (convId: string) => {
    try {
      await directMessagesApi.markAsRead(convId);
      setDmConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );
      const conv = dmConversations.find((c) => c.id === convId);
      const socket = socketService.get();
      if (socket && conv?.peer?.id) {
        socket.emit("dm:read", {
          conversationId: convId,
          senderId: conv.peer.id
        });
      }
    } catch (err) {
      addToast("Failed to mark as read", "error");
    }
  };

  const handleMarkAsUnread = async (convId: string) => {
    try {
      await directMessagesApi.markAsUnread(convId);
      setDmConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: Math.max(c.unreadCount, 1) } : c))
      );
      addToast("Marked as unread", "info");
    } catch (err) {
      addToast("Failed to mark as unread", "error");
    }
  };

  // ── 7. Emoji Reactions, Dual-Tier Deletion & Lock Handlers ──────────────────
  const handleCircleReact = useCallback(
    (messageId: string, emoji: string, category?: "STANDARD" | "CAMPUS_CUSTOM") => {
      if (!activeCircle || !activeChannel) return;
      const socket = socketService.get();
      if (!socket) return;
      socket.emit("chat:reaction", {
        messageId,
        communityId: activeCircle.id,
        channelId: activeChannel._id || activeChannel.name,
        emoji,
        category: category || "STANDARD"
      });
    },
    [activeCircle, activeChannel]
  );

  const handleCircleDeleteForMe = useCallback(
    (messageId: string) => {
      if (!activeCircle) return;
      removeMessage(messageId);
      const socket = socketService.get();
      if (socket) {
        socket.emit("chat:deleteForMe", {
          messageId,
          communityId: activeCircle.id
        });
      }
    },
    [activeCircle, removeMessage]
  );

  const handleCircleDeleteForEveryone = useCallback(
    (messageId: string) => {
      if (!activeCircle || !activeChannel) return;
      const socket = socketService.get();
      if (socket) {
        socket.emit("chat:deleteForEveryone", {
          messageId,
          communityId: activeCircle.id,
          channelId: activeChannel._id || activeChannel.name
        });
      }
    },
    [activeCircle, activeChannel]
  );

  const handleDmReact = useCallback(
    (messageId: string, emoji: string, category?: "STANDARD" | "CAMPUS_CUSTOM") => {
      if (!activeDmConvId) return;
      const socket = socketService.get();
      if (socket) {
        socket.emit("dm:reaction", {
          messageId,
          conversationId: activeDmConvId,
          emoji,
          category: category || "STANDARD"
        });
      }
    },
    [activeDmConvId]
  );

  const handleDmDeleteForMe = useCallback(
    async (messageId: string) => {
      if (!activeDmConvId) return;

      setDmMessagesMap((prev) => {
        const list = prev[activeDmConvId] || [];
        const filtered = list.filter((m) => m.id !== messageId);

        // Update sidebar last message preview if deleted message was the last one
        const lastInList = list[list.length - 1];
        if (lastInList?.id === messageId) {
          const newLast = filtered[filtered.length - 1];
          setDmConversations((convPrev) =>
            convPrev.map((c) => {
              if (c.id !== activeDmConvId) return c;
              return {
                ...c,
                lastMessage: newLast
                  ? {
                      ...c.lastMessage!,
                      text: newLast.isDeletedForEveryone
                        ? "🗑️ This message was deleted"
                        : newLast.content || (newLast.voiceNote ? "🎙️ Voice note" : "📎 Attachment"),
                      time: newLast.time,
                      senderId: newLast.senderId
                    }
                  : null
              };
            })
          );
        }

        return { ...prev, [activeDmConvId]: filtered };
      });

      const socket = socketService.get();
      if (socket) {
        socket.emit("dm:deleteForMe", {
          messageId,
          conversationId: activeDmConvId
        });
      }

      try {
        await directMessagesApi.deleteForMe(messageId);
      } catch (err) {
        console.warn("Delete for me API fallback error:", err);
      }
    },
    [activeDmConvId]
  );

  const handleDmDeleteForEveryone = useCallback(
    async (messageId: string) => {
      if (!activeDmConvId) return;

      // Optimistically update message in dmMessagesMap
      setDmMessagesMap((prev) => {
        const list = prev[activeDmConvId] || [];
        return {
          ...prev,
          [activeDmConvId]: list.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isDeletedForEveryone: true,
                  content: "",
                  attachments: [],
                  deletedAt: new Date().toISOString()
                }
              : m
          )
        };
      });

      // Optimistically update sidebar preview
      setDmConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeDmConvId || !c.lastMessage) return c;
          return {
            ...c,
            lastMessage: {
              ...c.lastMessage,
              text: "🗑️ This message was deleted"
            }
          };
        })
      );

      const socket = socketService.get();
      if (socket) {
        socket.emit("dm:deleteForEveryone", {
          messageId,
          conversationId: activeDmConvId
        });
      }

      try {
        await directMessagesApi.deleteForEveryone(messageId);
      } catch (err) {
        console.warn("Delete for everyone API fallback error:", err);
      }
    },
    [activeDmConvId]
  );

  const handleToggleChannelLock = useCallback(
    (isLocked: boolean, reason?: string) => {
      if (!activeCircle || !activeChannel) return;
      const socket = socketService.get();
      if (!socket) return;
      socket.emit("chat:toggleChannelLock", {
        communityId: activeCircle.id,
        channelId: activeChannel._id || activeChannel.name,
        isLocked,
        lockedReason: reason
      });
    },
    [activeCircle, activeChannel]
  );

  const handleToggleDmLock = useCallback(
    (isLocked: boolean, reason?: string) => {
      if (!activeDmConvId) return;
      const socket = socketService.get();
      if (!socket) return;
      socket.emit("dm:toggleLock", {
        conversationId: activeDmConvId,
        isLocked,
        lockedReason: reason
      });
    },
    [activeDmConvId]
  );

  const handleStartCall = (type: "audio" | "video") => {
    setActiveCall({
      isOpen: true,
      type,
      isMuted: false,
      isVideoEnabled: type === "video"
    });
  };

  // Phase 2 Interaction Handlers (Edit, Star, Forward, Pin)
  const handleSaveDmEdit = async (messageId: string, content: string) => {
    try {
      await directMessagesApi.editMessage(messageId, content);
      if (activeDmConvId) {
        setDmMessagesMap((prev) => ({
          ...prev,
          [activeDmConvId]: (prev[activeDmConvId] || []).map((m) =>
            m.id === messageId ? { ...m, content, edited: true, editedAt: new Date().toISOString() } : m
          )
        }));
      }
      setDmEditingTarget(null);
      addToast("Message edited", "success");
    } catch (err) {
      addToast("Failed to edit message", "error");
    }
  };

  const handleSaveCircleEdit = async (messageId: string, content: string) => {
    if (!activeCircle) return;
    try {
      await chatApi.editMessage(activeCircle.id, messageId, content);
      updateMessage({
        _id: messageId,
        content,
        edited: true,
        editedAt: new Date().toISOString()
      } as any);
      setCircleEditingTarget(null);
      addToast("Message edited", "success");
    } catch (err) {
      addToast("Failed to edit message", "error");
    }
  };

  const handleToggleStarDm = async (messageId: string, isStarred: boolean) => {
    try {
      await directMessagesApi.toggleStar(messageId);
      if (activeDmConvId) {
        setDmMessagesMap((prev) => ({
          ...prev,
          [activeDmConvId]: (prev[activeDmConvId] || []).map((m) =>
            m.id === messageId ? { ...m, isStarred } : m
          )
        }));
      }
      addToast(isStarred ? "Message starred" : "Message unstarred", "info");
    } catch (err) {
      addToast("Failed to update star", "error");
    }
  };

  const handleToggleStarCircle = async (messageId: string, isStarred: boolean) => {
    if (!activeCircle) return;
    try {
      await chatApi.toggleStar(activeCircle.id, messageId);
      updateMessage({
        _id: messageId,
        isStarred
      } as any);
      addToast(isStarred ? "Message starred" : "Message unstarred", "info");
    } catch (err) {
      addToast("Failed to update star", "error");
    }
  };

  const handleBulkStarDms = async () => {
    if (!activeDmConvId || selectedDmMessageIds.length === 0) return;
    try {
      await directMessagesApi.bulkStar(activeDmConvId, selectedDmMessageIds, true);
      setDmMessagesMap((prev) => ({
        ...prev,
        [activeDmConvId]: (prev[activeDmConvId] || []).map((m) =>
          selectedDmMessageIds.includes(m.id) ? { ...m, isStarred: true } : m
        )
      }));
      addToast(`${selectedDmMessageIds.length} message(s) starred`, "success");
      setSelectedDmMessageIds([]);
      setIsDmSelectionMode(false);
    } catch (err) {
      addToast("Failed to star messages", "error");
    }
  };

  const handleBulkForwardDms = () => {
    if (!activeDmConvId || selectedDmMessageIds.length === 0) return;
    const msgs = dmMessagesMap[activeDmConvId] || [];
    const selected = msgs.filter((m) => selectedDmMessageIds.includes(m.id));
    const preview = selected.map((m) => m.content).filter(Boolean).join("\n\n");
    setForwardModal({
      isOpen: true,
      messageIds: selectedDmMessageIds,
      sourceText: preview
    });
    setIsDmSelectionMode(false);
    setSelectedDmMessageIds([]);
  };

  const handleForwardDMs = async (targetConversationIds: string[]) => {
    if (!forwardModal) return;
    try {
      await directMessagesApi.forwardMessages(activeDmConvId || "", forwardModal.messageIds, targetConversationIds);
      addToast("Message forwarded successfully", "success");
      setForwardModal(null);
    } catch (err) {
      addToast("Failed to forward message", "error");
    }
  };

  const handleForwardCircles = async (targetCommunityId: string, channelId?: string) => {
    if (!forwardModal || !activeCircle) return;
    try {
      await chatApi.forward(activeCircle.id, {
        messageIds: forwardModal.messageIds,
        targetCommunityId,
        targetChannelId: channelId
      });
      addToast("Message forwarded to study circle", "success");
      setForwardModal(null);
    } catch (err) {
      addToast("Failed to forward message", "error");
    }
  };

  const messagesToForward = useMemo(() => {
    if (!forwardModal) return [];
    if (viewMode === "circle") {
      return messages.filter((m) => forwardModal.messageIds.includes(m._id));
    }
    const dms = activeDmConvId ? (dmMessagesMap[activeDmConvId] || []) : [];
    return dms
      .filter((m) => forwardModal.messageIds.includes(m.id))
      .map((m) => ({
        _id: m.id,
        content: m.content,
        senderId: { fullName: m.senderName },
        createdAt: m.createdAt
      })) as any[];
  }, [forwardModal, viewMode, messages, activeDmConvId, dmMessagesMap]);

  const currentStarredMessages = useMemo(() => {
    if (viewMode === "circle") {
      return messages.filter((m) => m.isStarred);
    }
    const dms = activeDmConvId ? (dmMessagesMap[activeDmConvId] || []) : [];
    return dms
      .filter((m) => m.isStarred)
      .map((m) => ({
        _id: m.id,
        content: m.content,
        senderId: { fullName: m.senderName },
        createdAt: m.createdAt,
        isStarred: true
      })) as any[];
  }, [viewMode, messages, activeDmConvId, dmMessagesMap]);

  const handleUnstarMessageFromDrawer = async (messageId: string) => {
    if (viewMode === "circle") {
      await handleToggleStarCircle(messageId, false);
    } else {
      await handleToggleStarDm(messageId, false);
    }
  };

  // Selection mode handlers
  const handleToggleSelectDmMessage = (msgId: string) => {
    setSelectedDmMessageIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  const handleDeleteSelectedDmMessages = async () => {
    if (!activeDmConvId || selectedDmMessageIds.length === 0) return;
    const count = selectedDmMessageIds.length;
    try {
      await directMessagesApi.bulkDeleteForMe(activeDmConvId, selectedDmMessageIds);
      setDmMessagesMap((prev) => ({
        ...prev,
        [activeDmConvId]: (prev[activeDmConvId] || []).filter(
          (m) => !selectedDmMessageIds.includes(m.id)
        )
      }));
      addToast(`${count} message${count > 1 ? "s" : ""} deleted for you`, "info");
      setSelectedDmMessageIds([]);
      setIsDmSelectionMode(false);
    } catch (err) {
      addToast("Failed to delete messages", "error");
    }
  };

  const handleCancelDmSelection = () => {
    setIsDmSelectionMode(false);
    setSelectedDmMessageIds([]);
  };

  // Pinning handlers
  const handlePinDmMessage = (msg: DirectMessageItem) => {
    if (!activeDmConvId) return;
    const docTitle = msg.attachments?.[0]?.name || (msg.content.slice(0, 35) + "...");
    const pinData: PinnedMessageData = {
      id: msg.id,
      title: docTitle,
      type: msg.attachments?.length ? "document" : "text",
      url: msg.attachments?.[0]?.url
    };
    setPinnedMessagesMap((prev) => ({
      ...prev,
      [activeDmConvId]: pinData
    }));
    addToast(`Pinned: "${docTitle}"`, "success");
  };

  const handleUnpinDmMessage = () => {
    if (!activeDmConvId) return;
    setPinnedMessagesMap((prev) => ({
      ...prev,
      [activeDmConvId]: null,
      default: null
    }));
    addToast("Message unpinned", "info");
  };

  // Export Chat handler
  const handleExportChat = () => {
    if (!activeDmConversation || !activeDmConvId) return;
    const msgs = dmMessagesMap[activeDmConvId] || [];
    let text = `====================================================\n`;
    text += `STUDYCONNECT CONVERSATION EXPORT\n`;
    text += `Classmate: ${activeDmConversation.peer.name} (${activeDmConversation.peer.roll})\n`;
    text += `Department: ${activeDmConversation.peer.dept}\n`;
    text += `Export Date: ${new Date().toLocaleString()}\n`;
    text += `Total Messages: ${msgs.length}\n`;
    text += `====================================================\n\n`;

    msgs.forEach((m) => {
      text += `[${m.time} | ${new Date(m.createdAt).toLocaleDateString()}] ${m.senderName}:\n`;
      if (m.content) text += `${m.content}\n`;
      if (m.attachments?.length) {
        m.attachments.forEach((a) => {
          text += `  [Attachment: ${a.name} (${a.size})]\n`;
        });
      }
      if (m.codeSnippet) {
        text += `  [Code (${m.codeSnippet.language})]:\n${m.codeSnippet.code}\n`;
      }
      if (m.voiceNote) {
        text += `  [Voice Note (${m.voiceNote.duration})]\n`;
      }
      text += `\n`;
    });

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `StudyConnect_${activeDmConversation.peer.name.replace(/\s+/g, "_")}_Chat.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast("Chat history downloaded", "success");
  };

  // Clear Chat handler
  const handleClearChat = () => {
    if (!activeDmConvId) return;
    setDmMessagesMap((prev) => ({
      ...prev,
      [activeDmConvId]: []
    }));
    setDmConversations((prev) =>
      prev.map((c) => (c.id === activeDmConvId ? { ...c, lastMessage: null } : c))
    );
  };

  // Delete Chat handler
  const handleDeleteChat = () => {
    if (!activeDmConvId) return;
    const removedId = activeDmConvId;
    setDmConversations((prev) => prev.filter((c) => c.id !== removedId));
    setDmMessagesMap((prev) => {
      const updated = { ...prev };
      delete updated[removedId];
      return updated;
    });
    setActiveDmConvId(null);
    setSearchParams({ mode: "dms" });
  };

  // ── 8. Create Channel Handler ──────────────────────────────────────────────
  const handleCreateChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !activeCircle) return;

    const formattedName = newChannelName.toLowerCase().replace(/\s+/g, "-");
    const newChan: Channel = {
      _id: `chan-${Date.now()}`,
      name: formattedName,
      type: newChannelType,
      category: newChannelCategory,
      topic: newChannelTopic.trim(),
      isStrictStudyMode: newChannelStrict
    };

    const updated = [...circleChannels, newChan];
    setCircleChannels(updated);
    setChannels(updated);
    setSelectedChannel(newChan);
    setIsCreateChannelOpen(false);
    setNewChannelName("");
    setNewChannelTopic("");
    addToast(`Channel #${formattedName} created!`, "success");
  };

  // ── 9. Create Circle Handler ───────────────────────────────────────────────
  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircleName.trim()) return;

    try {
      const created = await communitiesApi.create({
        name: newCircleName.trim(),
        category: newCircleCategory,
        description: newCircleDescription.trim(),
        visibility: "public",
        tags: [newCircleCategory.toLowerCase().replace(/\s+/g, "-")]
      });

      if (created) {
        const mapped = mapCommunityToCircle(created);
        setCircles((prev) => [mapped, ...prev]);
        setActiveCircle(mapped);
        setIsCreateCircleOpen(false);
        setNewCircleName("");
        setNewCircleDescription("");
        addToast(`Circle "${created.name}" established!`, "success");
        fetchCommunities();
      }
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to create study circle", "error");
    }
  };

  // ── 10. Join Circle Handler ────────────────────────────────────────────────
  const handleJoinCircle = async (circle: StudyCircle) => {
    try {
      setIsJoiningCircleId(circle.id);
      await communitiesApi.join(circle.id);
      setActiveCircle(circle);
      setIsExploreCirclesOpen(false);
      addToast(`Joined "${circle.name}"!`, "success");
      fetchCommunities();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to join circle", "error");
    } finally {
      setIsJoiningCircleId(null);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      {/* ── High-Density Slack / Discord Grade Split Layout ── */}
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Rail: Discord-Style Circle Switcher with Top DMs Hub */}
        <CircleSwitcher
          circles={circles}
          activeCircleId={activeCircle?.id || ""}
          activeMode={viewMode}
          onSelectDMs={() => {
            setViewMode("dms");
            setSearchParams({ mode: "dms" });
          }}
          onSelectCircle={(circle) => {
            setViewMode("circle");
            setActiveCircle(circle);
            setSearchParams({ mode: "circle", circle: circle.id });
          }}
          onExploreCircles={() => setIsExploreCirclesOpen(true)}
          onCreateCircle={() => setIsCreateCircleOpen(true)}
          unreadDMsCount={totalUnreadDMs}
        />

        {viewMode === "circle" ? (
          /* ── Study Circles Workspace ── */
          activeCircle && activeChannel ? (
            <>
              {/* Pane 1: Circle Channels Sidebar (4-Tier Categorization) */}
              <CircleSidebar
                community={{
                  _id: activeCircle.id,
                  name: activeCircle.name,
                  memberCount: activeCircle.memberCount
                }}
                channels={circleChannels}
                activeChannelId={activeChannel._id || activeChannel.name}
                onSelectChannel={(ch) => setSelectedChannel(ch)}
                onCreateChannel={() => setIsCreateChannelOpen(true)}
                currentUserId={user?._id}
              />

              {/* Pane 2: Core Chat Container (Frosted Ambient Header, Math, Code Sandbox, ChatInput) */}
              <ChatContainer
                community={{
                  _id: activeCircle.id,
                  name: activeCircle.name
                }}
                channel={activeChannel}
                currentUserId={user?._id}
                currentUserName={user?.fullName}
                isModeratorOrAdmin={isModeratorOrAdmin}
                onSendMessage={handleSendMessage}
                onReact={handleCircleReact}
                onDeleteForMe={handleCircleDeleteForMe}
                onDeleteForEveryone={handleCircleDeleteForEveryone}
                onOpenLockModal={() => setIsLockModalOpen(true)}
                onOpenStarredMessages={() => setIsStarredDrawerOpen(true)}
                onEditMessage={(m) => setCircleEditingTarget({ id: m._id, content: m.content || "" })}
                onForwardMessage={(m) => setForwardModal({ isOpen: true, messageIds: [m._id], sourceText: m.content || "" })}
                onToggleStar={handleToggleStarCircle}
                editingTarget={circleEditingTarget}
                onCancelEdit={() => setCircleEditingTarget(null)}
                onSaveEdit={handleSaveCircleEdit}
                onOpenLightbox={handleOpenLightbox}
              />

              {/* Pane 3: Inspector Drawer (Threads, Shared Vault, Roster & Presence) */}
              <ChatInspectorDrawer
                communityId={activeCircle.id}
                channelId={activeChannel._id || activeChannel.name}
                currentUserId={user?._id}
                currentUserName={user?.fullName}
                members={circleMembers}
              />
            </>
          ) : (
            /* Empty / Welcome State when no circles exist */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-[#080D1A]">
              <div className="w-16 h-16 rounded-3xl bg-[#1E90FF]/10 border border-[#1E90FF]/20 text-[#1E90FF] flex items-center justify-center mb-4 shadow-xl">
                <Compass className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Select or Discover a Study Circle</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                Study Circles are collaborative campus workspaces with synchronized study sprints, LaTeX
                math rendering, and drop-in audio stages.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsExploreCirclesOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white font-bold text-xs shadow-md shadow-[#1E90FF]/25 transition-all cursor-pointer"
                >
                  Explore Campus Circles
                </button>
                <button
                  onClick={() => setIsCreateCircleOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-white dark:bg-[#0F1A30] hover:bg-slate-100 dark:hover:bg-[#162544] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 font-bold text-xs transition-all cursor-pointer shadow-xs"
                >
                  Create Circle
                </button>
              </div>
            </div>
          )
        ) : (
          /* ── Direct Messages Workspace (Discord Architecture) ── */
          <>
            {/* Pane 1: Direct Messages Sidebar */}
            <div className="w-80 md:w-96 flex-shrink-0 h-full border-r border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1424]/80 backdrop-blur-xl flex flex-col overflow-hidden">
              <ConversationList
                conversations={dmConversations}
                activeConversationId={activeDmConvId}
                onSelectConversation={(convId) => handleSelectDmConversation(convId)}
                currentUser={user}
                onStartNewChat={(peerId, customPeer) => handleStartNewDm(peerId, customPeer)}
                onTogglePin={handleTogglePin}
                onToggleMute={handleToggleMute}
                onToggleArchive={handleToggleArchive}
                onMarkAsRead={handleMarkAsRead}
                onMarkAsUnread={handleMarkAsUnread}
                drafts={drafts}
                typingMap={typingMap}
              />
            </div>

            {/* Pane 2 & 3: 1-on-1 Conversation OR Direct Messages Welcome State */}
            {activeDmConversation ? (
              <div className="flex-1 flex flex-row min-w-0 h-full overflow-hidden">
                {/* Pane 2: 1-on-1 Direct Message Stream */}
                <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 dark:bg-[#080D1A]">
                  <ConversationHeader
                    peer={activeDmConversation.peer}
                    onBack={() => {
                      setActiveDmConvId(null);
                      setSearchParams({ mode: "dms" });
                    }}
                    onOpenContactInfo={() => setIsContactInfoOpen((prev) => !prev)}
                    onStartCall={handleStartCall}
                    onSearchInChat={() => setSearchInChatOpen((prev) => !prev)}
                    isPeerTyping={isPeerTyping}
                    isEnlarged={isChatEnlarged}
                    onToggleEnlarge={() => setIsChatEnlarged((prev) => !prev)}
                    onSelectMessagesMode={() => setIsDmSelectionMode((prev) => !prev)}
                    onExportChat={handleExportChat}
                    onCloseChat={() => {
                      setActiveDmConvId(null);
                      setSearchParams({ mode: "dms" });
                    }}
                    onClearChat={handleClearChat}
                    onDeleteChat={handleDeleteChat}
                    onBlockPeer={handleDeleteChat}
                    onReportPeer={(_reason, _details) => {}}
                    isFavorite={!!favoriteConversations[activeDmConvId || ""]}
                    onToggleFavorite={() => {
                      if (!activeDmConvId) return;
                      setFavoriteConversations((prev) => ({
                        ...prev,
                        [activeDmConvId]: !prev[activeDmConvId]
                      }));
                    }}
                    isLocked={!!lockedConversations[activeDmConvId || ""]}
                    onToggleLock={() => setIsLockModalOpen(true)}
                    isMuted={!!mutedConversations[activeDmConvId || ""]}
                    onMute={(dur) => {
                      if (!activeDmConvId) return;
                      setMutedConversations((prev) => ({
                        ...prev,
                        [activeDmConvId]: dur !== "unmute"
                      }));
                    }}
                    onDisappearingMessages={(_timer) => {}}
                    onScheduleCall={(_details) => {}}
                    onOpenStarredMessages={() => setIsStarredDrawerOpen(true)}
                  />

                  {/* Offline / Reconnecting Status Banner */}
                  {connectionStatus !== "connected" && (
                    <div
                      className={`px-4 py-1 text-xs font-semibold flex items-center justify-center gap-2 select-none shrink-0 ${
                        connectionStatus === "connecting"
                          ? "bg-amber-500/20 text-amber-300 border-b border-amber-500/30"
                          : "bg-rose-500/20 text-rose-300 border-b border-rose-500/30"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          connectionStatus === "connecting" ? "bg-amber-400 animate-ping" : "bg-rose-400"
                        }`}
                      />
                      <span>
                        {connectionStatus === "connecting"
                          ? "Reconnecting to chat server..."
                          : "You are currently offline. Messages will be sent when reconnected."}
                      </span>
                    </div>
                  )}

                  {/* In-Chat Search Bar */}
                  <AnimatePresence>
                    {searchInChatOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="p-2.5 px-4 bg-white/95 dark:bg-[#0B1324]/95 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3 z-10 backdrop-blur-md"
                      >
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder={`Search messages with ${activeDmConversation.peer.name}...`}
                            value={chatSearchQuery}
                            onChange={(e) => setChatSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-[#080D1A] pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E90FF]"
                            autoFocus
                          />
                          {chatSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setChatSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchInChatOpen(false);
                            setChatSearchQuery("");
                          }}
                          className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                        >
                          Close
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Real-time Direct Message Stream */}
                  <DirectMessageStream
                    messages={activeDmMessages}
                    currentUser={user}
                    onReply={(msg) =>
                      setDmReplyTarget({ senderName: msg.senderName, content: msg.content })
                    }
                    onReact={handleDmReact}
                    onDeleteForMe={handleDmDeleteForMe}
                    onDeleteForEveryone={handleDmDeleteForEveryone}
                    onRetry={handleRetryDirectMessage}
                    searchQuery={chatSearchQuery}
                    pinnedMessage={pinnedMessagesMap[activeDmConvId || ""] ?? pinnedMessagesMap.default}
                    onPinMessage={handlePinDmMessage}
                    onUnpinMessage={handleUnpinDmMessage}
                    onEdit={(msg) => setDmEditingTarget({ id: msg.id, content: msg.content })}
                    onForward={(msg) => setForwardModal({ isOpen: true, messageIds: [msg.id], sourceText: msg.content })}
                    onToggleStar={handleToggleStarDm}
                    onStartSelectionMode={(initialId) => {
                      setIsDmSelectionMode(true);
                      if (initialId) setSelectedDmMessageIds([initialId]);
                    }}
                    isSelectionMode={isDmSelectionMode}
                    selectedMessageIds={selectedDmMessageIds}
                    onToggleSelectMessage={handleToggleSelectDmMessage}
                    onDeleteSelected={handleDeleteSelectedDmMessages}
                    onForwardSelected={handleBulkForwardDms}
                    onStarSelected={handleBulkStarDms}
                    onCancelSelection={handleCancelDmSelection}
                    onOpenLightbox={handleOpenLightbox}
                  />

                  {/* Input Dock */}
                  <DirectMessageInput
                    conversationId={activeDmConvId || undefined}
                    peerName={activeDmConversation.peer.name}
                    onSendMessage={handleSendDirectMessage}
                    onTyping={(isTyping) => {
                      const socket = socketService.get();
                      if (socket && activeDmConversation) {
                        socket.emit(isTyping ? "dm:typing" : "dm:stopTyping", {
                          conversationId: activeDmConvId,
                          recipientId: activeDmConversation.peer.id
                        });
                        socket.emit(isTyping ? "typing" : "stopTyping", {
                          conversationId: activeDmConvId,
                          receiverId: activeDmConversation.peer.id
                        });
                      }
                    }}
                    isPeerTyping={isPeerTyping}
                    replyTarget={dmReplyTarget}
                    onCancelReply={() => setDmReplyTarget(null)}
                    editingTarget={dmEditingTarget}
                    onCancelEdit={() => setDmEditingTarget(null)}
                    onSaveEdit={handleSaveDmEdit}
                    isLocked={!!lockedConversations[activeDmConvId || ""]}
                    lockedReason={
                      dmConversations.find((c) => c.id === activeDmConvId)?.lockedReason ||
                      "This direct message conversation has been locked."
                    }
                  />
                </div>

                {/* Pane 3: Contact Info Drawer */}
                <ContactInfoDrawer
                  isOpen={isContactInfoOpen}
                  onClose={() => setIsContactInfoOpen(false)}
                  peer={activeDmConversation.peer}
                  messages={activeDmMessages}
                  onStartCall={handleStartCall}
                  onSearchInChat={() => {
                    setIsContactInfoOpen(false);
                    setSearchInChatOpen(true);
                  }}
                />
              </div>
            ) : (
              /* Clean Welcome State for Direct Messages */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-[#080D1A]">
                <div className="w-16 h-16 rounded-3xl bg-[#1E90FF]/10 border border-[#1E90FF]/20 text-[#1E90FF] flex items-center justify-center mb-4 shadow-xl">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Your Direct Messages
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                  Select a conversation from the sidebar or start a new direct message with any classmate across your campus.
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white font-bold text-xs shadow-md shadow-[#1E90FF]/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start New Chat</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Drop-in Voice & Screen Stage Floating Dock ── */}
      <VoiceStageDock
        currentUserId={user?._id}
        currentUserName={user?.fullName}
      />

      {/* ── Call Simulation Modal ── */}
      <AnimatePresence>
        {activeCall && activeCall.isOpen && activeDmConversation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0B1324]/95 text-slate-900 dark:text-slate-100 p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center"
            >
              <span className="text-[11px] font-bold text-[#1E90FF] uppercase tracking-wider mb-6 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#1E90FF] animate-ping" />
                {activeCall.type === "video" ? "StudyConnect Video Call" : "StudyConnect Voice Call"}
              </span>

              <div className="relative mb-4">
                <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-[#1E90FF]/30 bg-[#1E90FF] flex items-center justify-center text-2xl font-black text-white shadow-xl">
                  {activeDmConversation.peer.avatar ? (
                    <img
                      src={activeDmConversation.peer.avatar}
                      alt={activeDmConversation.peer.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    activeDmConversation.peer.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="absolute inset-0 rounded-full border border-[#1E90FF]/50 animate-ping pointer-events-none" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">
                {activeDmConversation.peer.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6">
                {activeDmConversation.peer.roll} • {activeDmConversation.peer.dept}
              </p>

              <div className="text-xs text-[#1E90FF] font-medium mb-8">
                Ringing... (End-to-End Encrypted)
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null))
                  }
                  className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
                    activeCall.isMuted
                      ? "bg-rose-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                  title={activeCall.isMuted ? "Unmute" : "Mute"}
                >
                  {activeCall.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCall(null)}
                  className="h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform hover:scale-105"
                  title="End Call"
                >
                  <PhoneOff size={24} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveCall((prev) =>
                      prev ? { ...prev, isVideoEnabled: !prev.isVideoEnabled } : null
                    )
                  }
                  className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
                    !activeCall.isVideoEnabled
                      ? "bg-rose-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                  title={activeCall.isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                >
                  {activeCall.isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create Channel Modal ── */}
      <AnimatePresence>
        {isCreateChannelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0B1324] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-slate-700 dark:text-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80 mb-4">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-[#1E90FF]" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Study Channel</h3>
                </div>
                <button
                  onClick={() => setIsCreateChannelOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. dynamic-programming"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] focus:ring-1 focus:ring-[#1E90FF] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Channel Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "focus", label: "💬 Focus Room" },
                      { id: "announcements", label: "📌 Syllabus & Notices" },
                      { id: "watercooler", label: "☕ Watercooler" },
                      { id: "stages", label: "🔊 Voice Stage" }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setNewChannelCategory(cat.id as any);
                          if (cat.id === "stages") setNewChannelType("voice");
                          else if (cat.id === "announcements") setNewChannelType("announcement");
                          else setNewChannelType("text");
                        }}
                        className={`p-2 rounded-xl text-xs font-medium text-left border transition-all ${
                          newChannelCategory === cat.id
                            ? "bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/40"
                            : "bg-slate-50 dark:bg-[#080D1A] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Topic & Objectives (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Discussions on recursion and trees"
                    value={newChannelTopic}
                    onChange={(e) => setNewChannelTopic(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] focus:ring-1 focus:ring-[#1E90FF] transition-all"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Strict Study Mode</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Off-topic messages are intercepted by AI classifier
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newChannelStrict}
                    onChange={(e) => setNewChannelStrict(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1E90FF] focus:ring-0 cursor-pointer accent-[#1E90FF]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateChannelOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white shadow-md shadow-[#1E90FF]/25 transition-all"
                  >
                    Create Channel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create Circle Modal ── */}
      <AnimatePresence>
        {isCreateCircleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0B1324] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-slate-700 dark:text-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#1E90FF]" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Establish Study Circle</h3>
                </div>
                <button
                  onClick={() => setIsCreateCircleOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCircle} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Circle Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Systems Lab, AI & ML Hub"
                    value={newCircleName}
                    onChange={(e) => setNewCircleName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] focus:ring-1 focus:ring-[#1E90FF] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Academic Discipline
                  </label>
                  <select
                    value={newCircleCategory}
                    onChange={(e) => setNewCircleCategory(e.target.value as CommunityCategory)}
                    className="w-full bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#1E90FF] focus:ring-1 focus:ring-[#1E90FF] transition-all"
                  >
                    {COMMUNITY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-white dark:bg-[#0B1324] text-slate-900 dark:text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Objectives & Syllabus
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe coursework, weekly problem solving goals..."
                    value={newCircleDescription}
                    onChange={(e) => setNewCircleDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] focus:ring-1 focus:ring-[#1E90FF] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Circle Avatar Emoji
                  </label>
                  <div className="flex items-center gap-2">
                    {["💻", "⚡", "🧠", "🔬", "📐", "🚀", "📚", "🎨"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCircleEmoji(emoji)}
                        className={`h-9 w-9 text-base rounded-xl flex items-center justify-center border transition-all ${
                          newCircleEmoji === emoji
                            ? "border-[#1E90FF] bg-[#1E90FF]/15 scale-110 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-900 dark:text-white"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateCircleOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white shadow-md shadow-[#1E90FF]/25 transition-all"
                  >
                    Create Circle
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Explore Campus Circles Modal ── */}
      <AnimatePresence>
        {isExploreCirclesOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0B1324] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl text-slate-700 dark:text-slate-200 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF] flex items-center justify-center">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Explore Campus Study Circles
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Join active student workspaces across departments.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExploreCirclesOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search & Categories */}
              <div className="py-3.5 space-y-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search circles by title or subject..."
                    value={exploreSearch}
                    onChange={(e) => setExploreSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] focus:ring-1 focus:ring-[#1E90FF] transition-all"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setExploreCategory("all")}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 ${
                      exploreCategory === "all"
                        ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                        : "bg-slate-100 dark:bg-[#080D1A] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    All Disciplines
                  </button>
                  {COMMUNITY_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setExploreCategory(cat)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 ${
                        exploreCategory === cat
                          ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                          : "bg-slate-100 dark:bg-[#080D1A] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Circle Cards List */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 py-1">
                {isLoadingCommunities ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <Sparkles className="animate-spin mx-auto mb-2 text-[#1E90FF] w-6 h-6" />
                    <span>Loading campus study circles...</span>
                  </div>
                ) : (() => {
                  const filtered = circles.filter((c) => {
                    const matchesSearch =
                      !exploreSearch.trim() ||
                      c.name.toLowerCase().includes(exploreSearch.toLowerCase()) ||
                      c.dept.toLowerCase().includes(exploreSearch.toLowerCase());
                    const matchesCat =
                      exploreCategory === "all" ||
                      c.dept.toLowerCase() === exploreCategory.toLowerCase();
                    return matchesSearch && matchesCat;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                        <Users className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          No matching study circles found
                        </p>
                        <button
                          onClick={() => {
                            setIsExploreCirclesOpen(false);
                            setIsCreateCircleOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-[#1E90FF] text-white text-xs font-bold hover:bg-[#187bcd] transition-colors shadow-sm"
                        >
                          Create This Circle
                        </button>
                      </div>
                    );
                  }

                  return filtered.map((circle) => {
                    const rawComm = rawCommunities.find((rc) => rc._id === circle.id);
                    const isMemberAlready =
                      rawComm?.isMember || rawComm?.owner?._id === user?._id;
                    const isSelected = activeCircle?.id === circle.id;

                    return (
                      <div
                        key={circle.id}
                        className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#080D1A]/80 hover:border-[#1E90FF]/40 dark:hover:border-[#1E90FF]/40 transition-all flex items-center justify-between gap-3 shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-11 w-11 rounded-2xl bg-gradient-to-tr ${circle.gradient} text-white flex items-center justify-center text-xl shrink-0 shadow-sm`}
                          >
                            {circle.emoji}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {circle.name}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 shrink-0">
                                {circle.dept}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {rawComm?.description || `Collaborative study circle for ${circle.name}.`}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                              <span className="flex items-center gap-1 font-medium">
                                <Users className="w-3 h-3" />
                                {circle.memberCount} Scholars
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected && viewMode === "circle" ? (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          ) : isMemberAlready ? (
                            <button
                              onClick={() => {
                                setViewMode("circle");
                                setActiveCircle(circle);
                                setSearchParams({ mode: "circle", circle: circle.id });
                                setIsExploreCirclesOpen(false);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#1E90FF] hover:text-white text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all"
                            >
                              Open Circle
                            </button>
                          ) : (
                            <button
                              disabled={isJoiningCircleId === circle.id}
                              onClick={() => handleJoinCircle(circle)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 shadow-sm shadow-[#1E90FF]/20"
                            >
                              {isJoiningCircleId === circle.id ? (
                                <Sparkles className="w-3 h-3 animate-spin" />
                              ) : (
                                <Plus className="w-3 h-3" />
                              )}
                              <span>Join Circle</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs mt-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {circles.length} campus circles available
                </span>
                <button
                  onClick={() => {
                    setIsExploreCirclesOpen(false);
                    setIsCreateCircleOpen(true);
                  }}
                  className="font-bold text-[#1E90FF] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Circle</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Start New Chat Modal ── */}
      <AnimatePresence>
        {isNewChatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0B1324] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl text-slate-700 dark:text-slate-200 flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80 mb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Start Direct Message</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Search and connect with campus peers</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsNewChatModalOpen(false);
                    setNewChatSearch("");
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students by name, roll number, or department..."
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#080D1A] pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] focus:ring-1 focus:ring-[#1E90FF] transition-all"
                  autoFocus
                />
                {isSearchingStudents && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <Sparkles className="w-4 h-4 text-[#1E90FF] animate-spin" />
                  </div>
                )}
              </div>

              {/* Students List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                {isSearchingStudents ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                    <Sparkles className="w-6 h-6 text-[#1E90FF] animate-spin" />
                    <span className="text-xs">Searching campus scholars...</span>
                  </div>
                ) : searchedStudents.length > 0 ? (
                  searchedStudents.map((student) => (
                    <div
                      key={student._id}
                      className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#080D1A]/80 hover:border-[#1E90FF]/40 dark:hover:border-[#1E90FF]/40 transition-all flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-xs">
                          {student.avatarUrl ? (
                            <img
                              src={student.avatarUrl}
                              alt={student.fullName}
                              className="h-full w-full rounded-xl object-cover"
                            />
                          ) : (
                            student.fullName?.charAt(0).toUpperCase() || "S"
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {student.fullName}
                            </span>
                            {student.role === "ADMIN" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {student.rollNumber || "Student"} • {student.department || "Academic Scholar"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsNewChatModalOpen(false);
                          setNewChatSearch("");
                          handleStartNewDm(student._id, {
                            name: student.fullName,
                            roll: student.rollNumber,
                            dept: student.department
                          });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold transition-all shadow-xs shadow-[#1E90FF]/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Chat</span>
                      </button>
                    </div>
                  ))
                ) : newChatSearch.trim() ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      No classmates found matching &ldquo;{newChatSearch}&rdquo;
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Try searching with their full name or college roll number
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                    <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Find any student on campus
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Type their name, department, or roll number above to initiate a direct message.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Chat / Channel Lock Modal ── */}
      <LockChatModal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        isLocked={
          viewMode === "circle"
            ? (activeChannel?.isLocked ?? false)
            : (!!lockedConversations[activeDmConvId || ""])
        }
        currentReason={
          viewMode === "circle"
            ? (activeChannel?.lockedReason || "")
            : (dmConversations.find((c) => c.id === activeDmConvId)?.lockedReason || "")
        }
        targetTitle={
          viewMode === "circle"
            ? `#${activeChannel?.name || "channel"}`
            : `@${activeDmConversation?.peer?.name || "Direct Message"}`
        }
        onConfirm={(locked, reason) => {
          if (viewMode === "circle") {
            handleToggleChannelLock(locked, reason);
          } else {
            handleToggleDmLock(locked, reason);
          }
        }}
      />

      {/* ── Forward Message Modal ── */}
      {forwardModal && (
        <ForwardMessageModal
          isOpen={forwardModal.isOpen}
          onClose={() => setForwardModal(null)}
          messagesToForward={messagesToForward}
          onForwardDMs={handleForwardDMs}
          onForwardCircles={handleForwardCircles}
        />
      )}

      {/* ── Starred Messages Slide-Over Drawer ── */}
      <StarredMessagesDrawer
        isOpen={isStarredDrawerOpen}
        onClose={() => setIsStarredDrawerOpen(false)}
        starredMessages={currentStarredMessages}
        onJumpToMessage={(messageId) => {
          setIsStarredDrawerOpen(false);
          const el = document.getElementById(`msg-${messageId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-[#1E90FF]", "ring-offset-2", "animate-pulse");
            setTimeout(() => {
              el.classList.remove("ring-2", "ring-[#1E90FF]", "ring-offset-2", "animate-pulse");
            }, 2500);
          }
        }}
        onUnstarMessage={handleUnstarMessageFromDrawer}
      />

      {/* ── Phase 3: Image Lightbox (shared by DM + Circle workspaces) ── */}
      <ImageViewerModal
        isOpen={lightboxState.isOpen}
        images={lightboxState.images}
        initialIndex={lightboxState.initialIndex}
        onClose={handleCloseLightbox}
      />
    </div>
  );
}

export default ChatPage;
