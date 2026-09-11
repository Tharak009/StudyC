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
  Plus
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

// ── Persistent Storage Keys for User Created Data ────────────────────────────

const CIRCLES_STORAGE_KEY = "studyconnect_user_circles";
const CHANNELS_STORAGE_PREFIX = "studyconnect_channels_";
const MESSAGES_STORAGE_PREFIX = "studyconnect_messages_";

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

  // Circle & Channel state (clean slate, only user-created items)
  const [circles, setCircles] = useState<StudyCircle[]>(loadSavedCircles);
  const [activeCircle, setActiveCircle] = useState<StudyCircle | null>(() => {
    const saved = loadSavedCircles();
    return saved[0] || null;
  });

  const [channels, setChannels] = useState<Channel[]>(() => {
    const saved = loadSavedCircles();
    if (saved[0]) return loadSavedChannels(saved[0].id);
    return [];
  });

  const [activeChannel, setActiveChannel] = useState<Channel | null>(() => {
    const saved = loadSavedCircles();
    if (saved[0]) {
      const chans = loadSavedChannels(saved[0].id);
      return chans[0] || null;
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

  // Chat stream state (empty by default until user creates/sends messages)
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    const saved = loadSavedCircles();
    if (saved[0]) {
      const chans = loadSavedChannels(saved[0].id);
      if (chans[0]) return loadSavedMessages(chans[0].id);
    }
    return [];
  });

  // Real authenticated members only
  const members = useMemo<ChatMember[]>(() => {
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
  }, [user]);

  // Create Circle Modal state
  const [isCreateCircleOpen, setIsCreateCircleOpen] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleDept, setNewCircleDept] = useState("");
  const [newCircleEmoji, setNewCircleEmoji] = useState("💻");

  // Settings & Search modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");

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
      const circleChans = loadSavedChannels(activeCircle.id);
      setChannels(circleChans);
      setActiveChannel(circleChans[0] || null);
    } else {
      setChannels([]);
      setActiveChannel(null);
      setMessages([]);
    }
  }, [activeCircle?.id]);

  // Switch messages when active channel changes
  useEffect(() => {
    if (activeChannel) {
      setMessages(loadSavedMessages(activeChannel.id));
    } else {
      setMessages([]);
    }
  }, [activeChannel?.id]);

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
    if (!activeChannel) return;
    const socket = socketService.connect();

    if (socket) {
      socket.emit("joinRoom", { roomId: activeChannel.id });

      const handleNewMessage = (data: any) => {
        const newMsg: ChatMessageItem = {
          id: data._id || `m-${Date.now()}`,
          sender: {
            id: data.senderId?._id || data.sender?.id || "u-anon",
            name: data.senderId?.fullName || data.sender?.name || "Classmate",
            roll: data.senderId?.rollNumber || data.sender?.roll || "",
            dept: data.senderId?.department || "Campus",
            isVerified: true,
            roleTag: data.senderId?.role === "ADMIN" ? "FACULTY" : "STUDENT"
          },
          content: data.content || "",
          codeSnippet: data.codeSnippet,
          attachments: data.attachments,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        updateMessages((prev) => [...prev, newMsg]);
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
      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);
      socket.on("channel:studyModeUpdated", handleStudyModeUpdated);

      return () => {
        socket.emit("leaveRoom", { roomId: activeChannel.id });
        socket.off("newMessage", handleNewMessage);
        socket.off("typing", handleTyping);
        socket.off("stopTyping", handleStopTyping);
        socket.off("channel:studyModeUpdated", handleStudyModeUpdated);
      };
    }
  }, [activeChannel?.id, addToast]);

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

  const handleCreateCircle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCircleName.trim()) {
      addToast("Please enter a circle name", "error");
      return;
    }
    const newId = `circle-${Date.now()}`;
    const trimmedName = newCircleName.trim();
    const newCircle: StudyCircle = {
      id: newId,
      name: trimmedName,
      shortName: trimmedName.slice(0, 3).toUpperCase(),
      dept: newCircleDept.trim() || "General",
      memberCount: 1,
      emoji: newCircleEmoji || "💻",
      gradient: "from-[#1E90FF] to-[#187bcd]",
      unreadCount: 0
    };
    const defaultChannel: Channel = {
      id: `c-gen-${Date.now()}`,
      name: "general",
      type: "text",
      unread: 0
    };

    const updatedCircles = [...circles, newCircle];
    setCircles(updatedCircles);
    setActiveCircle(newCircle);

    const updatedChannels = [defaultChannel];
    setChannels(updatedChannels);
    setActiveChannel(defaultChannel);

    setMessages([]);

    try {
      localStorage.setItem(CIRCLES_STORAGE_KEY, JSON.stringify(updatedCircles));
      localStorage.setItem(`${CHANNELS_STORAGE_PREFIX}${newId}`, JSON.stringify(updatedChannels));
      localStorage.setItem(`${MESSAGES_STORAGE_PREFIX}${defaultChannel.id}`, JSON.stringify([]));
    } catch {}

    setIsCreateCircleOpen(false);
    setNewCircleName("");
    setNewCircleDept("");
    setNewCircleEmoji("💻");

    dispatchCampusNotification({
      type: "COMMUNITY_UPDATE",
      title: `Joined Circle: #${newCircle.name}`,
      message: `You created and joined the #${newCircle.name} study circle (${newCircle.dept}).`,
      categoryTag: newCircle.dept,
      href: "/chat",
      senderName: user?.fullName || "Student"
    });

    addToast(`Study Circle "${newCircle.name}" created!`, "success");
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

  const handleSendMessage = (
    content: string,
    codeSnippet?: { language: string; code: string },
    files?: File[],
    poll?: ChatPoll,
    voiceNote?: ChatVoiceNote
  ) => {
    if (!activeChannel) return;

    const student = user?.fullName || "Student";
    const roll = user?.rollNumber || "";

    const newMsg: ChatMessageItem = {
      id: `m-${Date.now()}`,
      sender: {
        id: user?._id || "u-me",
        name: student,
        roll: roll,
        dept: user?.department || "CSE",
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

    const socket = socketService.get();
    if (socket) {
      socket.emit("sendMessage", {
        communityId: activeChannel.id,
        content,
        codeSnippet
      });
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
            Create your first study circle to begin collaborating with your peers, sharing notes, and hosting voice study rooms.
          </p>
          <button
            onClick={() => setIsCreateCircleOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E90FF] text-white font-semibold shadow-md shadow-[#1E90FF]/25 hover:bg-[#187bcd] transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Create Study Circle</span>
          </button>
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
              className="bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] focus:outline-none focus:border-[#1E90FF] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Department / Focus
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science, Mathematics, Mechanical"
                    value={newCircleDept}
                    onChange={(e) => setNewCircleDept(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] focus:outline-none focus:border-[#1E90FF] transition-colors"
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
    </div>
  );
}

export default ChatPage;
