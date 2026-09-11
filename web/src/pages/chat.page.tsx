import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash,
  Volume2,
  Users,
  Search,
  Pin,
  Sparkles,
  Radio,
  X,
  Vote,
  Star,
  GraduationCap,
  Info,
  ChevronRight,
  ShieldCheck,
  Plus,
  Compass,
  Globe,
  Check
} from "lucide-react";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { UnifiedCircleSidebar } from "../components/chat/UnifiedCircleSidebar";
import { GroupInfoDrawer } from "../components/chat/GroupInfoDrawer";
import { VoiceStage, type VoiceParticipant } from "../components/chat/VoiceStage";
import {
  MessageList,
  type ChatMessageItem,
  type ChatPoll,
  type ChatVoiceNote
} from "../components/chat/MessageList";
import { ChatInput } from "../components/chat/ChatInput";
import { type ChatMember } from "../components/chat/ChatMemberList";
import { type StudyCircle } from "../components/chat/CircleSwitcher";
import { type Channel } from "../components/chat/ChannelSidebar";
import { ChannelHeader } from "../components/chat/ChannelHeader";
import { ChannelSettingsModal, type ChannelSettingsData } from "../components/chat/modals/ChannelSettingsModal";
import { socketService } from "../services/socket.service";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { dispatchCampusNotification } from "../utils/notifications";
import { communitiesApi } from "../api/communities.api";
import { chatApi } from "../api/chat.api";
import {
  COMMUNITY_CATEGORIES,
  type Community,
  type CommunityCategory
} from "../types/community";
import type { ChatMessage } from "../types/chat";

// ── Persistent Storage Keys for User Created Data ────────────────────────────

const CIRCLES_STORAGE_KEY = "studyconnect_user_circles";
const CHANNELS_STORAGE_PREFIX = "studyconnect_channels_";
const MESSAGES_STORAGE_PREFIX = "studyconnect_messages_";

const CATEGORY_META: Record<string, { emoji: string; gradient: string }> = {
  "Java Programming": { emoji: "☕", gradient: "from-amber-500 to-orange-600" },
  "Python Programming": { emoji: "🐍", gradient: "from-emerald-500 to-teal-600" },
  "Web Development": { emoji: "🌐", gradient: "from-blue-500 to-indigo-600" },
  "Cyber Security": { emoji: "🛡️", gradient: "from-red-500 to-rose-700" },
  "Data Science": { emoji: "📊", gradient: "from-purple-500 to-indigo-600" },
  "Competitive Programming": { emoji: "⚡", gradient: "from-yellow-500 to-amber-600" },
  "Placement Preparation": { emoji: "🎯", gradient: "from-cyan-500 to-blue-600" },
  "Other": { emoji: "💻", gradient: "from-blue-500 to-cyan-600" }
};

const mapCommunityToCircle = (c: Community): StudyCircle => {
  const meta = CATEGORY_META[c.category] || { emoji: "💻", gradient: "from-[#1E90FF] to-[#187bcd]" };
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

const mapBackendChatMessageToItem = (m: ChatMessage): ChatMessageItem => ({
  id: m._id,
  sender: {
    id: m.senderId?._id || (m as any).senderId || "",
    name: m.senderId?.fullName || "Student",
    roll: m.senderId?.rollNumber || "",
    dept: (m.senderId as any)?.department || "Campus",
    avatar: m.senderId?.profilePicture,
    isVerified: true,
    roleTag: (m.senderId as any)?.role === "ADMIN" ? "FACULTY" : "STUDENT"
  },
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
  timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
  editedAt: m.editedAt ? new Date(m.editedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined
});

function getDefaultChannels(circleId: string): Channel[] {
  return [
    { id: `c-gen-${circleId}`, name: "general", type: "text", unread: 0 },
    { id: `c-res-${circleId}`, name: "resources", type: "text", unread: 0 },
    { id: `c-voi-${circleId}`, name: "voice-lounge", type: "voice", unread: 0, activeUsers: 0 }
  ];
}

function loadSavedCircles(): StudyCircle[] {
  try {
    const raw = localStorage.getItem(CIRCLES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSavedChannels(circleId: string): Channel[] {
  try {
    const raw = localStorage.getItem(`${CHANNELS_STORAGE_PREFIX}${circleId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSavedMessages(channelId: string): ChatMessageItem[] {
  try {
    const raw = localStorage.getItem(`${MESSAGES_STORAGE_PREFIX}${channelId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function ChatPage() {
  const user = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();

  // Circle & Channel state
  const [circles, setCircles] = useState<StudyCircle[]>(loadSavedCircles);
  const [activeCircle, setActiveCircle] = useState<StudyCircle | null>(() => {
    const saved = loadSavedCircles();
    return saved[0] || null;
  });

  const [channels, setChannels] = useState<Channel[]>(() => {
    const saved = loadSavedCircles();
    if (saved[0]) {
      const chans = loadSavedChannels(saved[0].id);
      return chans.length > 0 ? chans : getDefaultChannels(saved[0].id);
    }
    return [];
  });

  const [activeChannel, setActiveChannel] = useState<Channel | null>(() => {
    const saved = loadSavedCircles();
    if (saved[0]) {
      const chans = loadSavedChannels(saved[0].id);
      return chans[0] || getDefaultChannels(saved[0].id)[0];
    }
    return null;
  });

  const [activeVoice, setActiveVoice] = useState<Channel | null>(null);
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([]);

  // WhatsApp-style Group Info & Faculty Drawer state
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  // App Sidebar rail state (starts expanded at 260px when Study Circles is opened)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isChatEnlarged, setIsChatEnlarged] = useState(false);

  // Explore Circles Modal state
  const [isExploreCirclesOpen, setIsExploreCirclesOpen] = useState(false);
  const [exploreSearch, setExploreSearch] = useState("");
  const [exploreCategory, setExploreCategory] = useState<string>("all");
  const [rawCommunities, setRawCommunities] = useState<Community[]>([]);
  const [isJoiningCircleId, setIsJoiningCircleId] = useState<string | null>(null);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(false);

  // Create Circle Modal state
  const [isCreateCircleOpen, setIsCreateCircleOpen] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleCategory, setNewCircleCategory] = useState<CommunityCategory>("Web Development");
  const [newCircleDescription, setNewCircleDescription] = useState("");
  const [newCircleEmoji, setNewCircleEmoji] = useState("🌐");

  // Settings & Search modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");

  // Esc key exits enlarged subpage mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isChatEnlarged) {
        setIsChatEnlarged(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isChatEnlarged]);

  // Chat stream state
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    const saved = loadSavedCircles();
    if (saved[0]) {
      const chans = loadSavedChannels(saved[0].id);
      if (chans[0]) return loadSavedMessages(chans[0].id);
    }
    return [];
  });

  // Real authenticated members from backend
  const [members, setMembers] = useState<ChatMember[]>(() => {
    if (!user) return [];
    return [
      {
        id: user._id || "u-me",
        name: user.fullName || "Current User",
        roll: user.rollNumber || "",
        dept: user.department || "Campus",
        role: user.role === "ADMIN" ? "FACULTY" : "STUDENT",
        isOnline: true,
        statusText: "Active Now"
      }
    ];
  });

  // Fetch all campus communities from MongoDB Atlas
  const fetchCommunities = async () => {
    try {
      setIsLoadingCommunities(true);
      const res = await communitiesApi.list({ limit: 50 });
      if (res?.items) {
        setRawCommunities(res.items);
        const mappedCircles = res.items.map(mapCommunityToCircle);
        setCircles(mappedCircles);
        try {
          localStorage.setItem(CIRCLES_STORAGE_KEY, JSON.stringify(mappedCircles));
        } catch {}

        // If no active circle, select first one
        setActiveCircle((current) => {
          if (current && mappedCircles.some((c) => c.id === current.id)) {
            return current;
          }
          return mappedCircles[0] || null;
        });
      }
    } catch (err) {
      console.warn("Could not fetch communities from server:", err);
    } finally {
      setIsLoadingCommunities(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, [user?._id]);

  // Fetch real members whenever active circle changes
  useEffect(() => {
    if (!activeCircle) {
      setMembers([]);
      return;
    }

    let isMounted = true;
    const fetchMembers = async () => {
      try {
        const mems = await communitiesApi.members(activeCircle.id);
        if (isMounted && mems) {
          const mapped: ChatMember[] = mems.map((m) => ({
            id: m.userId?._id || m._id,
            name: m.userId?.fullName || "Member",
            roll: m.userId?.rollNumber || "",
            dept: m.userId?.department || "Campus",
            role: m.role === "OWNER" ? "ADMIN" : m.role === "MODERATOR" ? "MODERATOR" : "STUDENT",
            isOnline: true,
            statusText: "Active Member",
            avatar: m.userId?.profilePicture
          }));
          setMembers(mapped);
          return;
        }
      } catch {
        // fallback
      }

      if (isMounted && user) {
        setMembers([
          {
            id: user._id || "u-me",
            name: user.fullName || "Current User",
            roll: user.rollNumber || "",
            dept: user.department || "Campus",
            role: user.role === "ADMIN" ? "FACULTY" : "STUDENT",
            isOnline: true,
            statusText: "Active Now"
          }
        ]);
      }
    };

    fetchMembers();
    return () => {
      isMounted = false;
    };
  }, [activeCircle?.id, user]);

  // Document Title
  useEffect(() => {
    if (activeCircle) {
      document.title = `Study Circles • ${activeCircle.name} | StudyConnect`;
    } else {
      document.title = "Study Circles | StudyConnect";
    }
  }, [activeCircle]);

  // Switch channels when active circle changes
  useEffect(() => {
    if (activeCircle) {
      const savedChans = loadSavedChannels(activeCircle.id);
      const circleChans = savedChans.length > 0 ? savedChans : getDefaultChannels(activeCircle.id);
      setChannels(circleChans);
      setActiveChannel(circleChans[0] || null);
    } else {
      setChannels([]);
      setActiveChannel(null);
      setMessages([]);
    }
  }, [activeCircle?.id]);

  // Switch messages when active channel or active circle changes
  useEffect(() => {
    if (!activeCircle || !activeChannel) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const fetchMessages = async () => {
      try {
        const historyRes = await chatApi.history(activeCircle.id, {
          limit: 50,
          order: "oldest"
        });
        if (isMounted && historyRes?.items) {
          const mapped = historyRes.items.map(mapBackendChatMessageToItem);
          setMessages(mapped);
          return;
        }
      } catch {
        // fallback to saved local messages
      }

      if (isMounted) {
        setMessages(loadSavedMessages(activeChannel.id));
      }
    };

    fetchMessages();
    return () => {
      isMounted = false;
    };
  }, [activeCircle?.id, activeChannel?.id]);

  const handleUpdateCircleAvatar = (circleId: string, avatarUrl: string | undefined) => {
    setCircles((prev) => {
      const updated = prev.map((c) => (c.id === circleId ? { ...c, avatarUrl } : c));
      try {
        localStorage.setItem(CIRCLES_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (activeCircle && activeCircle.id === circleId) {
      setActiveCircle((prev) => (prev ? { ...prev, avatarUrl } : prev));
    }
  };

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyTarget, setReplyTarget] = useState<{ senderName: string; content: string } | null>(null);

  // Pinned message
  const pinnedMessage = useMemo(() => {
    return messages.find((m) => m.isPinned) || null;
  }, [messages]);

  // Filter messages based on chat search query
  const displayedMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return messages;
    const q = chatSearchQuery.toLowerCase().trim();
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.sender.name.toLowerCase().includes(q) ||
        m.codeSnippet?.code.toLowerCase().includes(q)
    );
  }, [messages, chatSearchQuery]);

  // ── Helper to update and persist messages to active channel ──────────────
  const updateMessages = (updater: (prev: ChatMessageItem[]) => ChatMessageItem[]) => {
    setMessages((prev) => {
      const next = updater(prev);
      if (activeChannel) {
        try {
          localStorage.setItem(`${MESSAGES_STORAGE_PREFIX}${activeChannel.id}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  // ── Socket.IO Real-Time Lifecycle ──────────────────────────────────────────
  useEffect(() => {
    if (!activeCircle) return;
    const socket = socketService.connect();

    if (socket) {
      socket.emit("joinRoom", { roomId: activeCircle.id, communityId: activeCircle.id });
      if (activeChannel) {
        socket.emit("joinRoom", { roomId: activeChannel.id });
      }

      const handleNewMessage = (data: any) => {
        const newMsg: ChatMessageItem = {
          id: data._id || `m-${Date.now()}`,
          sender: {
            id: data.senderId?._id || data.sender?.id || "u-anon",
            name: data.senderId?.fullName || data.senderName || data.sender?.name || "Classmate",
            roll: data.senderId?.rollNumber || data.senderRoll || data.sender?.roll || "",
            dept: data.senderId?.department || data.senderDepartment || data.sender?.dept || "Campus",
            avatar: data.senderId?.profilePicture,
            isVerified: true,
            roleTag: data.senderId?.role === "ADMIN" ? "FACULTY" : "STUDENT"
          },
          content: data.content || "",
          codeSnippet: data.codeSnippet,
          attachments: data.attachments?.map((a: any) => ({
            name: a.originalName || a.name || "Attachment",
            size: typeof a.size === "number" ? `${(a.size / (1024 * 1024)).toFixed(1)} MB` : a.size || "1 MB",
            type: a.mimeType?.includes("pdf") ? "pdf" : "zip",
            url: a.url || "#"
          })),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };

        updateMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      };

      const handleTyping = (data: { userId: string; username?: string }) => {
        if (data.username && !typingUsers.includes(data.username)) {
          setTypingUsers((prev) => [...prev, data.username!]);
        }
      };

      const handleStopTyping = (data: { userId: string; username?: string }) => {
        if (data.username) {
          setTypingUsers((prev) => prev.filter((u) => u !== data.username));
        }
      };

      const handleStudyModeUpdated = (payload: { channelId: string; channel: any }) => {
        if (!payload?.channel) return;
        setChannels((prev) =>
          prev.map((c) =>
            c.id === payload.channelId || c.name === payload.channel.name
              ? { ...c, ...payload.channel }
              : c
          )
        );
        setActiveChannel((prev) =>
          prev && (prev.id === payload.channelId || prev.name === payload.channel.name)
            ? { ...prev, ...payload.channel }
            : prev
        );
        addToast(`Strict Study Mode updated for #${payload.channel.name}`, "info");
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("messageCreated", handleNewMessage);
      socket.on("chat:messageReceived", handleNewMessage);
      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);
      socket.on("channel:studyModeUpdated", handleStudyModeUpdated);

      return () => {
        socket.emit("leaveRoom", { roomId: activeCircle.id, communityId: activeCircle.id });
        if (activeChannel) {
          socket.emit("leaveRoom", { roomId: activeChannel.id });
        }
        socket.off("newMessage", handleNewMessage);
        socket.off("messageCreated", handleNewMessage);
        socket.off("chat:messageReceived", handleNewMessage);
        socket.off("typing", handleTyping);
        socket.off("stopTyping", handleStopTyping);
        socket.off("channel:studyModeUpdated", handleStudyModeUpdated);
      };
    }
  }, [activeCircle?.id, activeChannel?.id, addToast]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSelectCircle = (circle: StudyCircle) => {
    setActiveCircle(circle);
    setCircles((prev) =>
      prev.map((c) => (c.id === circle.id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleSelectChannel = (channel: Channel) => {
    setActiveChannel(channel);
    setChannels((prev) =>
      prev.map((c) => (c.id === channel.id ? { ...c, unread: 0 } : c))
    );
  };

  const handleJoinVoice = (channel: Channel) => {
    setActiveVoice(channel);
    if (user) {
      setVoiceParticipants([
        {
          id: user._id || "u-me",
          name: user.fullName || "Current User",
          roll: user.rollNumber || "CSE",
          isSpeaking: false,
          isMuted: false
        }
      ]);
    } else {
      setVoiceParticipants([]);
    }
    addToast(`Connected to voice stage: ${channel.name}`, "success");
  };

  const handleDisconnectVoice = () => {
    setActiveVoice(null);
    setVoiceParticipants([]);
    addToast("Left Voice Stage", "info");
  };

  const handleCreateCircle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCircleName.trim()) {
      addToast("Please enter a circle name", "error");
      return;
    }

    const trimmedName = newCircleName.trim();

    try {
      // Create community in MongoDB Atlas
      const createdCommunity = await communitiesApi.create({
        name: trimmedName,
        description:
          newCircleDescription.trim() ||
          `${trimmedName} Study Circle for collaborative learning and campus assignments.`,
        category: newCircleCategory,
        tags: [newCircleCategory.toLowerCase().replace(/\s+/g, "-"), "study-circle"],
        visibility: "public"
      });

      const newCircle = mapCommunityToCircle(createdCommunity);
      const defaultChannels = getDefaultChannels(newCircle.id);

      const updatedCircles = [newCircle, ...circles.filter((c) => c.id !== newCircle.id)];
      setCircles(updatedCircles);
      setActiveCircle(newCircle);
      setChannels(defaultChannels);
      setActiveChannel(defaultChannels[0]);
      setMessages([]);

      try {
        localStorage.setItem(CIRCLES_STORAGE_KEY, JSON.stringify(updatedCircles));
        localStorage.setItem(`${CHANNELS_STORAGE_PREFIX}${newCircle.id}`, JSON.stringify(defaultChannels));
        localStorage.setItem(`${MESSAGES_STORAGE_PREFIX}${defaultChannels[0].id}`, JSON.stringify([]));
      } catch {}

      setIsCreateCircleOpen(false);
      setNewCircleName("");
      setNewCircleDescription("");

      dispatchCampusNotification({
        type: "COMMUNITY_UPDATE",
        title: `Joined Circle: #${newCircle.name}`,
        message: `You created and joined the #${newCircle.name} study circle (${newCircle.dept}).`,
        categoryTag: newCircle.dept,
        href: "/chat",
        senderName: user?.fullName || "Student"
      });

      addToast(`Study Circle "${newCircle.name}" created and synced across campus!`, "success");
      fetchCommunities();
    } catch (err: any) {
      console.error("Failed to create study circle", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to create study circle";
      addToast(msg, "error");
    }
  };

  const handleJoinCircle = async (targetCircle: StudyCircle) => {
    setIsJoiningCircleId(targetCircle.id);
    try {
      await communitiesApi.join(targetCircle.id);
      setActiveCircle(targetCircle);
      const defaultChans = getDefaultChannels(targetCircle.id);
      setChannels(defaultChans);
      setActiveChannel(defaultChans[0]);
      setIsExploreCirclesOpen(false);
      addToast(`Joined #${targetCircle.name}! You can now collaborate with peers.`, "success");
      fetchCommunities();
    } catch (err: any) {
      console.error("Failed to join study circle", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to join circle";
      addToast(msg, "error");
    } finally {
      setIsJoiningCircleId(null);
    }
  };

  const handleCreateChannel = (
    name: string,
    type: "text" | "voice" | "announcement"
  ) => {
    if (!activeCircle) {
      addToast("Please select or create a circle first", "error");
      return;
    }
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, "-");
    const newChan: Channel = {
      id: `c-${Date.now()}`,
      name: cleanName,
      type,
      unread: 0,
      activeUsers: type === "voice" ? 1 : undefined
    };
    const updated = [...channels, newChan];
    setChannels(updated);
    try {
      localStorage.setItem(`${CHANNELS_STORAGE_PREFIX}${activeCircle.id}`, JSON.stringify(updated));
      localStorage.setItem(`${MESSAGES_STORAGE_PREFIX}${newChan.id}`, JSON.stringify([]));
    } catch {}
    if (!activeChannel && type !== "voice") {
      setActiveChannel(newChan);
    }
    addToast(`Created channel #${cleanName}`, "success");
  };

  const handleSendMessage = async (
    content: string,
    codeSnippet?: { language: string; code: string },
    files?: File[],
    poll?: ChatPoll,
    voiceNote?: ChatVoiceNote
  ) => {
    if (!activeCircle || !activeChannel) return;

    const student = user?.fullName || "Student";
    const roll = user?.rollNumber || "";

    const tempId = `m-${Date.now()}`;
    const newMsg: ChatMessageItem = {
      id: tempId,
      sender: {
        id: user?._id || "u-me",
        name: student,
        roll: roll,
        dept: user?.department || "CSE",
        avatar: user?.profilePicture,
        isVerified: true,
        roleTag: user?.role === "ADMIN" ? "FACULTY" : "STUDENT"
      },
      content,
      codeSnippet,
      attachments: files?.map((f) => ({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        type: f.name.endsWith(".pdf") ? "pdf" : "zip",
        url: "#"
      })),
      poll,
      voiceNote,
      replyTo: replyTarget || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    updateMessages((prev) => [...prev, newMsg]);

    try {
      // 1. Send via REST chatApi to save in MongoDB Atlas
      const created = await chatApi.create(activeCircle.id, {
        content,
        attachments: files
      });
      if (created) {
        const mapped = mapBackendChatMessageToItem(created);
        updateMessages((prev) => prev.map((m) => (m.id === tempId ? mapped : m)));
      }

      // 2. Broadcast via socket
      const socket = socketService.get();
      if (socket) {
        socket.emit("sendMessage", {
          communityId: activeCircle.id,
          channelId: activeChannel.id,
          content,
          codeSnippet
        });
      }
    } catch (err: any) {
      console.warn("Could not persist message via API, emitting socket fallback:", err);
      const socket = socketService.get();
      if (socket) {
        socket.emit("sendMessage", {
          communityId: activeCircle.id,
          channelId: activeChannel.id,
          content,
          codeSnippet
        });
      }
    }
  };

  const handleReact = (messageId: string, emoji: string) => {
    updateMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const currentReactions = msg.reactions || [];
        const existingIdx = currentReactions.findIndex((r) => r.emoji === emoji);

        if (existingIdx >= 0) {
          const updated = [...currentReactions];
          updated[existingIdx].count += 1;
          return { ...msg, reactions: updated };
        } else {
          return {
            ...msg,
            reactions: [...currentReactions, { emoji, count: 1, users: ["u-me"] }]
          };
        }
      })
    );
  };

  const handleVotePoll = (messageId: string, optionId: string) => {
    updateMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId || !msg.poll) return msg;

        const updatedOptions = msg.poll.options.map((opt) => {
          if (opt.id === optionId) {
            const willVote = !opt.votedByMe;
            return {
              ...opt,
              votedByMe: willVote,
              votes: willVote ? opt.votes + 1 : Math.max(0, opt.votes - 1)
            };
          }
          return opt;
        });

        const newTotal = updatedOptions.reduce((acc, o) => acc + o.votes, 0);

        return {
          ...msg,
          poll: {
            ...msg.poll,
            options: updatedOptions,
            totalVotes: newTotal
          }
        };
      })
    );
    addToast("Vote updated", "info");
  };

  const handleToggleStar = (messageId: string) => {
    updateMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const next = !msg.isStarred;
        addToast(
          next ? "Message saved to starred notes" : "Message unstarred",
          "info"
        );
        return { ...msg, isStarred: next };
      })
    );
  };

  const handleDeleteMessage = (messageId: string) => {
    updateMessages((prev) => prev.filter((m) => m.id !== messageId));
    addToast("Message deleted", "info");
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    updateMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              content: newContent,
              edited: true,
              editedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          : m
      )
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      {/* ── Collapsed App Navigation Rail on the far left (68px) ───────── */}
      {!isChatEnlarged && (
        <DashboardSidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          currentNav="/chat"
        />
      )}

      {/* ── Unified Study Circles Channel & Category Sidebar ───────────── */}
      {!isChatEnlarged && (
        <UnifiedCircleSidebar
          circles={circles}
          activeCircle={activeCircle}
          onSelectCircle={handleSelectCircle}
          channels={channels}
          activeChannelId={activeChannel?.id || null}
          onSelectChannel={handleSelectChannel}
          activeVoiceId={activeVoice?.id || null}
          onJoinVoice={handleJoinVoice}
          onCreateChannel={handleCreateChannel}
          onCreateCircle={() => setIsCreateCircleOpen(true)}
          onExploreCircles={() => setIsExploreCirclesOpen(true)}
          onOpenGroupInfo={() => setIsGroupInfoOpen(true)}
          currentUser={user}
        />
      )}

      {/* ── Main Chat Stream & Conversation Viewport ───────────────────── */}
      {!activeCircle ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/50 dark:bg-[#09101f]/70">
          <div className="h-16 w-16 rounded-3xl bg-[#1E90FF]/10 text-[#1E90FF] flex items-center justify-center mb-4 shadow-sm">
            <Users size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No Study Circles Yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            Create your first study circle or explore public study circles created across campus to collaborate with classmates.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsCreateCircleOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E90FF] text-white font-semibold shadow-md shadow-[#1E90FF]/25 hover:bg-[#187bcd] transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>Create Study Circle</span>
            </button>
            <button
              onClick={() => setIsExploreCirclesOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-white/10 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 font-semibold hover:bg-slate-50 dark:hover:bg-white/15 transition-all cursor-pointer"
            >
              <Compass size={18} className="text-[#1E90FF]" />
              <span>Explore Campus Circles</span>
            </button>
          </div>
        </div>
      ) : !activeChannel ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/50 dark:bg-[#09101f]/70">
          <div className="h-14 w-14 rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF] flex items-center justify-center mb-4">
            <Hash size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            No Channels in #{activeCircle.name}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            Create a text or voice channel to start discussing subjects and coursework.
          </p>
          <button
            onClick={() => handleCreateChannel("general", "text")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E90FF] text-white text-sm font-semibold hover:bg-[#187bcd] transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create #general Channel</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-white/50 dark:bg-[#09101f]/70">
          {/* Header with Strict Study Mode Shield */}
          <ChannelHeader
            channel={activeChannel}
            circle={activeCircle}
            memberCount={members.length}
            isSearchOpen={isSearchOpen}
            onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
            onJoinVoice={() => {
              const firstVoice = channels.find((c) => c.type === "voice");
              if (firstVoice) handleJoinVoice(firstVoice);
            }}
            isGroupInfoOpen={isGroupInfoOpen}
            onToggleGroupInfo={() => setIsGroupInfoOpen(!isGroupInfoOpen)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isModeratorOrAdmin={true}
            isEnlarged={isChatEnlarged}
            onToggleEnlarge={() => setIsChatEnlarged((prev) => !prev)}
          />

          {/* Optional In-Channel Search Bar */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 py-2 border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/90 dark:bg-black/20 flex items-center gap-2"
              >
                <Search size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search messages, algorithms, code snippets or senders..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                  autoFocus
                />
                {chatSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setChatSearchQuery("")}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drop-in Voice Stage Visualizer Banner */}
          <AnimatePresence>
            {activeVoice && (
              <VoiceStage
                roomName={activeVoice.name}
                participants={voiceParticipants}
                onDisconnect={handleDisconnectVoice}
              />
            )}
          </AnimatePresence>

          {/* Message Stream */}
          <MessageList
            messages={displayedMessages}
            currentUser={user}
            onReply={(msg) => setReplyTarget({ senderName: msg.sender.name, content: msg.content })}
            onReact={handleReact}
            onDelete={handleDeleteMessage}
            onEdit={handleEditMessage}
            onVotePoll={handleVotePoll}
            onToggleStar={handleToggleStar}
            pinnedMessage={pinnedMessage}
          />

          {/* Floating Input Dock */}
          <ChatInput
            channelName={activeChannel.name}
            onSendMessage={handleSendMessage}
            typingUsers={typingUsers}
            replyTarget={replyTarget}
            onCancelReply={() => setReplyTarget(null)}
            onSwitchToChannel={(targetChanName) => {
              let targetChan = channels.find(
                (c) => c.name.toLowerCase() === targetChanName.toLowerCase()
              );
              if (!targetChan) {
                targetChan = channels.find(
                  (c) =>
                    c.name.toLowerCase().includes("general") ||
                    c.name.toLowerCase().includes("lounge")
                );
              }
              if (targetChan) {
                handleSelectChannel(targetChan);
                addToast(`Switched to #${targetChan.name} with your draft!`, "info");
              }
            }}
          />
        </div>
      )}

      {/* ── WhatsApp-Style Group & Faculty Info Slide-In Drawer ──────── */}
      {activeCircle && (
        <GroupInfoDrawer
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          circle={activeCircle}
          members={members}
          onUpdateCircleAvatar={handleUpdateCircleAvatar}
        />
      )}

      {/* ── Channel Strict Study Mode Settings Modal ─────────────────── */}
      {activeChannel && (
        <ChannelSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          channel={activeChannel}
          communityId={activeCircle?.id}
          onSaveSuccess={(updated) => {
            setChannels((prev) =>
              prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
            );
            setActiveChannel((prev) =>
              prev && prev.id === updated.id ? { ...prev, ...updated } : prev
            );
          }}
        />
      )}

      {/* ── Create Study Circle Modal ───────────────────────────────── */}
      <AnimatePresence>
        {isCreateCircleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl text-slate-900 dark:text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-xl">✨</span> Create Study Circle
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateCircleOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCircle} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Circle Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Systems Lab, AI & ML Hub"
                    value={newCircleName}
                    onChange={(e) => setNewCircleName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white focus:outline-none focus:border-[#1E90FF] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Academic Discipline / Category
                  </label>
                  <select
                    value={newCircleCategory}
                    onChange={(e) => setNewCircleCategory(e.target.value as CommunityCategory)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0c1424] text-slate-900 dark:text-white focus:outline-none focus:border-[#1E90FF] transition-colors"
                  >
                    {COMMUNITY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Description & Objectives
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe study objectives, subjects, and weekly goals..."
                    value={newCircleDescription}
                    onChange={(e) => setNewCircleDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white focus:outline-none focus:border-[#1E90FF] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Circle Emoji
                  </label>
                  <div className="flex items-center gap-2">
                    {["💻", "⚡", "🧠", "🔬", "📐", "🚀", "📚", "🎨"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCircleEmoji(emoji)}
                        className={`h-9 w-9 text-base rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                          newCircleEmoji === emoji
                            ? "border-[#1E90FF] bg-[#1E90FF]/15 scale-110"
                            : "border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateCircleOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-sm font-bold bg-[#1E90FF] text-white hover:bg-[#187bcd] shadow-md shadow-[#1E90FF]/25 transition-all cursor-pointer"
                  >
                    Create Circle
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Explore Campus Circles Modal ─────────────────────────────── */}
      <AnimatePresence>
        {isExploreCirclesOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-2xl shadow-2xl text-slate-900 dark:text-white flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#1E90FF]/15 text-[#1E90FF] flex items-center justify-center shadow-xs">
                    <Compass size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Explore Campus Study Circles</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Discover and join active study groups created across campus.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExploreCirclesOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="py-3.5 space-y-2.5">
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search circles by title, focus, or subject..."
                    value={exploreSearch}
                    onChange={(e) => setExploreSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] transition-colors"
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => setExploreCategory("all")}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                      exploreCategory === "all"
                        ? "bg-[#1E90FF] text-white shadow-xs"
                        : "bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08]"
                    }`}
                  >
                    All Disciplines
                  </button>
                  {COMMUNITY_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setExploreCategory(cat)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                        exploreCategory === cat
                          ? "bg-[#1E90FF] text-white shadow-xs"
                          : "bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Circles Grid / List */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 py-1 pr-1">
                {isLoadingCommunities ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <Sparkles className="animate-spin mx-auto mb-2 text-[#1E90FF]" size={24} />
                    <span>Loading campus study circles...</span>
                  </div>
                ) : (() => {
                  const filtered = circles.filter((c) => {
                    const matchesSearch =
                      !exploreSearch.trim() ||
                      c.name.toLowerCase().includes(exploreSearch.toLowerCase()) ||
                      c.dept.toLowerCase().includes(exploreSearch.toLowerCase());
                    const matchesCat =
                      exploreCategory === "all" || c.dept.toLowerCase() === exploreCategory.toLowerCase();
                    return matchesSearch && matchesCat;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                        <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          No matching study circles found
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          Be the first to create this study circle for your peers!
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsExploreCirclesOpen(false);
                            setIsCreateCircleOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-[#1E90FF] text-white text-xs font-bold hover:bg-[#187bcd] transition-colors cursor-pointer"
                        >
                          Create This Circle
                        </button>
                      </div>
                    );
                  }

                  return filtered.map((circle) => {
                    const rawComm = rawCommunities.find((rc) => rc._id === circle.id);
                    const isMemberAlready = rawComm?.isMember || rawComm?.owner?._id === user?._id;
                    const isSelected = activeCircle?.id === circle.id;

                    return (
                      <div
                        key={circle.id}
                        className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] hover:border-[#1E90FF]/40 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-11 w-11 rounded-2xl bg-gradient-to-tr ${circle.gradient} text-white flex items-center justify-center text-xl shrink-0 shadow-sm overflow-hidden`}
                          >
                            {circle.avatarUrl ? (
                              <img
                                src={circle.avatarUrl}
                                alt={circle.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              circle.emoji
                            )}
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
                              {rawComm?.description || `Collaborative study group for ${circle.name}.`}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                              <span className="flex items-center gap-1 font-medium">
                                <Users size={11} />
                                {circle.memberCount} Students
                              </span>
                              {rawComm?.owner?.fullName && (
                                <span>Created by {rawComm.owner.fullName}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1">
                              <Check size={12} />
                              <span>Active</span>
                            </span>
                          ) : isMemberAlready ? (
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectCircle(circle);
                                setIsExploreCirclesOpen(false);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-[#1E90FF] hover:text-white text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                            >
                              Open Circle
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isJoiningCircleId === circle.id}
                              onClick={() => handleJoinCircle(circle)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-xs shadow-[#1E90FF]/20 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            >
                              {isJoiningCircleId === circle.id ? (
                                <Sparkles size={12} className="animate-spin" />
                              ) : (
                                <Plus size={12} />
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
              <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between text-xs mt-2">
                <span className="text-[11px] text-slate-400">
                  {circles.length} campus circles available
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsExploreCirclesOpen(false);
                    setIsCreateCircleOpen(true);
                  }}
                  className="font-bold text-[#1E90FF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Create New Circle</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ChatPage;
