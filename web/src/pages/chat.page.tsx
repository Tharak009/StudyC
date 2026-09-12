import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { CircleSwitcher, type StudyCircle } from "../components/chat/CircleSwitcher";
import { CircleSidebar } from "../components/study-circles/CircleSidebar";
import { ChatContainer } from "../components/chat/ChatContainer";
import { ChatInspectorDrawer } from "../components/chat/ChatInspectorDrawer";
import { VoiceStageDock } from "../components/study-circles/VoiceStageDock";
import { DMSidebar } from "../components/chat/DMSidebar";
import { ConversationHeader, type ActivePeer } from "../components/dm/ConversationHeader";
import { DirectMessageStream, type DirectMessageItem } from "../components/dm/DirectMessageStream";
import { DirectMessageInput } from "../components/dm/DirectMessageInput";
import { ContactInfoDrawer } from "../components/dm/ContactInfoDrawer";
import type { ConversationItem } from "../components/dm/ConversationList";
import type { Conversation, DirectMessage } from "../types/direct-message";

import { useChatStore } from "../store/chat.store";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
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

const mapBackendConversationToItem = (
  c: Conversation,
  currentUserId?: string
): ConversationItem => {
  const peerUser =
    c.participants?.find((p) => p._id !== currentUserId) || c.participants?.[0];
  return {
    id: c._id,
    peer: {
      id: peerUser?._id || "",
      name: peerUser?.fullName || "Student",
      roll: peerUser?.rollNumber || "Campus",
      dept: (peerUser as any)?.department || "Computer Science",
      isOnline: true,
      avatar: peerUser?.profilePicture
    },
    lastMessage: c.lastMessage
      ? {
          text: c.lastMessage.content || "Attachment",
          senderId: c.lastMessage.senderId || "",
          time: c.lastMessage.createdAt
            ? new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })
            : "Recently",
          isRead: true,
          isDelivered: true
        }
      : null,
    unreadCount: 0
  };
};

const mapBackendMessageToItem = (m: DirectMessage): DirectMessageItem => ({
  id: m._id,
  senderId: m.senderId?._id || (m as any).senderId || "",
  senderName: m.senderId?.fullName || "Classmate",
  content: m.content || "",
  attachments: m.attachments?.map((a) => ({
    name: a.originalName,
    size: `${(a.size / (1024 * 1024)).toFixed(1)} MB`,
    type: a.mimeType?.includes("pdf") ? "pdf" : "zip",
    url: a.url
  })),
  replyTo: m.replyTo
    ? {
        senderName: m.replyTo.senderId?.fullName || "Classmate",
        content: m.replyTo.content
      }
    : undefined,
  isRead: m.read,
  isDelivered: true,
  time: m.createdAt
    ? new Date(m.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "",
  createdAt: m.createdAt || new Date().toISOString()
});

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

  // Layout sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // ── Study Circles Workspace State ─────────────────────────────────────────
  const {
    activeChannel,
    setSelectedChannel,
    setChannels,
    setMessages,
    addMessage,
    updateMessagePin,
    markMessageAccepted,
    addThreadReply,
    setActiveSprint,
    updateSprintParticipants,
    activeVoiceStage,
    setActiveVoiceStage,
    updateVoicePeers
  } = useChatStore();

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

  // ── Direct Messages Workspace State ─────────────────────────────
  const [dmConversations, setDmConversations] = useState<ConversationItem[]>([]);
  const [activeDmConvId, setActiveDmConvId] = useState<string | null>(convParam || null);
  const [dmMessagesMap, setDmMessagesMap] = useState<Record<string, DirectMessageItem[]>>({});
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [dmReplyTarget, setDmReplyTarget] = useState<{ senderName: string; content: string } | null>(null);

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
          return mapped[0] || null;
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

    // Direct Messages Events
    const handleDirectMessage = (data: any) => {
      const incomingConvId = data.conversationId || activeDmConvId;
      if (!incomingConvId) return;

      const newMsg: DirectMessageItem = {
        id: data._id || `dm-${Date.now()}`,
        senderId: data.senderId?._id || data.senderId || "u-peer",
        senderName: data.senderId?.fullName || data.senderName || "Classmate",
        content: data.content || "",
        attachments: data.attachments?.map((a: any) => ({
          name: a.originalName || a.name || "Attachment",
          size: typeof a.size === "number" ? `${(a.size / (1024 * 1024)).toFixed(1)} MB` : a.size || "1 MB",
          type: a.mimeType?.includes("pdf") ? "pdf" : "zip",
          url: a.url || "#"
        })),
        codeSnippet: data.codeSnippet,
        isRead: false,
        isDelivered: true,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: new Date().toISOString()
      };

      setDmMessagesMap((prev) => {
        const list = prev[incomingConvId] || [];
        const existingIdx = list.findIndex(
          (m) =>
            m.id === newMsg.id ||
            (m.id.startsWith("dm-opt-") &&
              m.senderId === newMsg.senderId &&
              m.content === newMsg.content)
        );
        if (existingIdx !== -1) {
          const updated = [...list];
          updated[existingIdx] = newMsg;
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

      setDmConversations((prev) =>
        prev.map((c) =>
          c.id === incomingConvId
            ? {
                ...c,
                lastMessage: {
                  text: newMsg.content || "Sent an attachment",
                  senderId: newMsg.senderId,
                  time: newMsg.time,
                  isRead: incomingConvId === activeDmConvId,
                  isDelivered: true
                },
                unreadCount: incomingConvId === activeDmConvId ? 0 : c.unreadCount + 1
              }
            : c
        )
      );
    };

    const handleTyping = () => setIsPeerTyping(true);
    const handleStopTyping = () => setIsPeerTyping(false);

    // Attach listeners
    socket.on("chat:messageReceived", handleMessageReceived);
    socket.on("messageCreated", handleMessageReceived);
    socket.on("newMessage", handleMessageReceived);
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

    socket.on("directMessageReceived", handleDirectMessage);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("chat:messageReceived", handleMessageReceived);
      socket.off("messageCreated", handleMessageReceived);
      socket.off("newMessage", handleMessageReceived);
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
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [
    activeDmConvId,
    addMessage,
    addThreadReply,
    updateMessagePin,
    markMessageAccepted,
    setActiveSprint,
    updateSprintParticipants,
    updateVoicePeers,
    addToast
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
    _voiceNote?: any,
    intent?: "chat" | "question" | "solution" | "code"
  ) => {
    if (!activeCircle || !activeChannel) return;

    const socket = socketService.get();
    const chanId = activeChannel._id || activeChannel.name;

    if (files && files.length > 0) {
      try {
        const uploaded = await chatApi.create(activeCircle.id, {
          content: content || "",
          attachments: files
        });
        if (uploaded) {
          addMessage(uploaded);
        }
      } catch (err: any) {
        addToast(err?.response?.data?.message || "Failed to upload attachments", "error");
      }
      return;
    }

    const payload = {
      communityId: activeCircle.id,
      channelId: chanId,
      content: content || "",
      codeSnippet,
      intent: intent || (codeSnippet ? "code" : "chat")
    };

    socket?.emit("chat:sendMessage", payload, (res: any) => {
      if (res?.success && res.data) {
        addMessage(res.data);
      }
    });
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
    voiceNote?: { duration: string; url?: string }
  ) => {
    if (!activeDmConvId) return;

    const student = user?.fullName || "Student";
    const studentId = user?._id || "u-me";

    const tempId = `dm-opt-${Date.now()}`;
    const newMsg: DirectMessageItem = {
      id: tempId,
      senderId: studentId,
      senderName: student,
      content,
      codeSnippet,
      voiceNote,
      attachments: files?.map((f) => ({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        type: f.name.endsWith(".pdf") ? "pdf" : "zip",
        url: "#"
      })),
      replyTo: dmReplyTarget || undefined,
      isRead: false,
      isDelivered: true,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: new Date().toISOString()
    };

    setDmMessagesMap((prev) => ({
      ...prev,
      [activeDmConvId]: [...(prev[activeDmConvId] || []), newMsg]
    }));

    setDmConversations((prev) =>
      prev.map((c) =>
        c.id === activeDmConvId
          ? {
              ...c,
              lastMessage: {
                text: content || (voiceNote ? "🎙️ Voice Note" : "Sent an attachment"),
                senderId: studentId,
                time: newMsg.time,
                isRead: true,
                isDelivered: true,
                hasAttachment: !!(files && files.length > 0),
                hasCodeSnippet: !!codeSnippet
              }
            }
          : c
      )
    );

    try {
      const sent = await directMessagesApi.sendMessage(activeDmConvId, {
        content,
        attachments: files
      });

      if (sent) {
        const mappedSent = mapBackendMessageToItem(sent);
        setDmMessagesMap((prev) => ({
          ...prev,
          [activeDmConvId]: (prev[activeDmConvId] || []).map((m) =>
            m.id === tempId ? mappedSent : m
          )
        }));
      }
    } catch (err: any) {
      console.warn("Could not persist message to backend API:", err?.message || err);
      addToast(err?.response?.data?.message || "Failed to send message", "error");
      setDmMessagesMap((prev) => ({
        ...prev,
        [activeDmConvId]: (prev[activeDmConvId] || []).filter((m) => m.id !== tempId)
      }));
    }
  };

  const handleDmReact = (messageId: string, emoji: string) => {
    if (!activeDmConvId) return;
    const student = user?.fullName || "Scholar";

    setDmMessagesMap((prev) => {
      const currentList = prev[activeDmConvId] || [];
      const updated = currentList.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const users = currentReactions[emoji] || [];

        if (users.includes(student)) {
          const filtered = users.filter((u) => u !== student);
          if (filtered.length === 0) delete currentReactions[emoji];
          else currentReactions[emoji] = filtered;
        } else {
          currentReactions[emoji] = [...users, student];
        }

        return { ...m, reactions: currentReactions };
      });

      return { ...prev, [activeDmConvId]: updated };
    });
  };

  const handleStartCall = (type: "audio" | "video") => {
    setActiveCall({
      isOpen: true,
      type,
      isMuted: false,
      isVideoEnabled: type === "video"
    });
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
      {/* ── App Navigation Sidebar ── */}
      <DashboardSidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

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
                onSendMessage={handleSendMessage}
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
            <DMSidebar
              conversations={dmConversations}
              activeConversationId={activeDmConvId}
              onSelectConversation={(convId) => handleSelectDmConversation(convId)}
              onOpenNewChat={() => setIsNewChatModalOpen(true)}
              currentUser={user}
            />

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
                  />

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
                    searchQuery={chatSearchQuery}
                  />

                  {/* Input Dock */}
                  <DirectMessageInput
                    peerName={activeDmConversation.peer.name}
                    onSendMessage={handleSendDirectMessage}
                    onTyping={(isTyping) => {
                      const socket = socketService.get();
                      if (socket && activeDmConversation) {
                        socket.emit(isTyping ? "typing" : "stopTyping", {
                          conversationId: activeDmConvId,
                          receiverId: activeDmConversation.peer.id
                        });
                      }
                    }}
                    isPeerTyping={isPeerTyping}
                    replyTarget={dmReplyTarget}
                    onCancelReply={() => setDmReplyTarget(null)}
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
    </div>
  );
}

export default ChatPage;
