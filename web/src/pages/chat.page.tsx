import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Radio
} from "lucide-react";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { CircleSwitcher, type StudyCircle } from "../components/chat/CircleSwitcher";
import { CircleSidebar } from "../components/study-circles/CircleSidebar";
import { ChatContainer } from "../components/chat/ChatContainer";
import { ChatInspectorDrawer } from "../components/chat/ChatInspectorDrawer";
import { VoiceStageDock } from "../components/study-circles/VoiceStageDock";
import { useChatStore } from "../store/chat.store";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { socketService } from "../services/socket.service";
import { communitiesApi } from "../api/communities.api";
import { chatApi } from "../api/chat.api";
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

export function ChatPage() {
  const user = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();

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

  // Layout sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Communities and circles
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

  // Modals
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
    if (!activeCircle || !activeChannel) return;

    let isMounted = true;
    const chanId = activeChannel._id || activeChannel.name;

    // Fetch message history from backend
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

    // Connect socket and join channel room
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
  }, [activeCircle, activeChannel, setMessages]);

  // ── 4. Global Socket Event Listeners ───────────────────────────────────────
  useEffect(() => {
    const socket = socketService.get();
    if (!socket) return;

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
    };
  }, [
    addMessage,
    addThreadReply,
    updateMessagePin,
    markMessageAccepted,
    setActiveSprint,
    updateSprintParticipants,
    updateVoicePeers,
    addToast
  ]);

  // ── 5. Send Message Dispatcher ─────────────────────────────────────────────
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

    // If files are attached, upload via REST endpoint
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

    // Standard / Code / Intent message via Socket.IO
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

  // ── 6. Create Channel Handler ──────────────────────────────────────────────
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

  // ── 7. Create Circle Handler ───────────────────────────────────────────────
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

  // ── 8. Join Circle Handler ─────────────────────────────────────────────────
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#080D1A] text-gray-100 font-sans">
      {/* ── App Navigation Sidebar ── */}
      <DashboardSidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* ── High-Density Slack / Discord Grade Split Layout ── */}
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Rail: Discord-Style Circle Switcher */}
        <CircleSwitcher
          circles={circles}
          activeCircleId={activeCircle?.id || ""}
          onSelectCircle={(circle) => setActiveCircle(circle)}
          onExploreCircles={() => setIsExploreCirclesOpen(true)}
          onCreateCircle={() => setIsCreateCircleOpen(true)}
        />

        {activeCircle && activeChannel ? (
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#080D1A]">
            <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 shadow-xl">
              <Compass className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Select or Discover a Study Circle</h2>
            <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
              Study Circles are collaborative campus workspaces with synchronized study sprints, LaTeX
              math rendering, and drop-in audio stages.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsExploreCirclesOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 transition-all"
              >
                Explore Campus Circles
              </button>
              <button
                onClick={() => setIsCreateCircleOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#0F1A30] hover:bg-[#162544] text-gray-200 border border-[#162544] font-bold text-xs transition-all"
              >
                Create Circle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Drop-in Voice & Screen Stage Floating Dock ── */}
      <VoiceStageDock
        currentUserId={user?._id}
        currentUserName={user?.fullName}
      />

      {/* ── Create Channel Modal ── */}
      <AnimatePresence>
        {isCreateChannelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0B132B] border border-[#162544] rounded-3xl p-6 w-full max-w-md shadow-2xl text-gray-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#162544] mb-4">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">Create Study Channel</h3>
                </div>
                <button
                  onClick={() => setIsCreateChannelOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. dynamic-programming"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full bg-[#080D1A] border border-[#162544] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
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
                            ? "bg-blue-600/20 text-blue-300 border-blue-500/40"
                            : "bg-[#080D1A] text-gray-400 border-[#162544]"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Topic & Objectives (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Discussions on recursion and trees"
                    value={newChannelTopic}
                    onChange={(e) => setNewChannelTopic(e.target.value)}
                    className="w-full bg-[#080D1A] border border-[#162544] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#080D1A] border border-[#162544]">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Strict Study Mode</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Off-topic messages are intercepted by AI classifier
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newChannelStrict}
                    onChange={(e) => setNewChannelStrict(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateChannelOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30"
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
              className="bg-[#0B132B] border border-[#162544] rounded-3xl p-6 w-full max-w-md shadow-2xl text-gray-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#162544] mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">Establish Study Circle</h3>
                </div>
                <button
                  onClick={() => setIsCreateCircleOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCircle} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Circle Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Systems Lab, AI & ML Hub"
                    value={newCircleName}
                    onChange={(e) => setNewCircleName(e.target.value)}
                    className="w-full bg-[#080D1A] border border-[#162544] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Academic Discipline
                  </label>
                  <select
                    value={newCircleCategory}
                    onChange={(e) => setNewCircleCategory(e.target.value as CommunityCategory)}
                    className="w-full bg-[#080D1A] border border-[#162544] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {COMMUNITY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Objectives & Syllabus
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe coursework, weekly problem solving goals..."
                    value={newCircleDescription}
                    onChange={(e) => setNewCircleDescription(e.target.value)}
                    className="w-full bg-[#080D1A] border border-[#162544] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
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
                            ? "border-blue-500 bg-blue-500/20 scale-110"
                            : "border-[#162544] bg-[#080D1A] hover:bg-[#162544]"
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
                    className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30"
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
              className="bg-[#0B132B] border border-[#162544] rounded-3xl p-6 w-full max-w-2xl shadow-2xl text-gray-200 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#162544]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      Explore Campus Study Circles
                    </h3>
                    <p className="text-xs text-gray-400">
                      Join active student workspaces across departments.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExploreCirclesOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#162544]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search & Categories */}
              <div className="py-3.5 space-y-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search circles by title or subject..."
                    value={exploreSearch}
                    onChange={(e) => setExploreSearch(e.target.value)}
                    className="w-full bg-[#080D1A] border border-[#162544] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setExploreCategory("all")}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 ${
                      exploreCategory === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-[#080D1A] text-gray-400 hover:text-white"
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
                          ? "bg-blue-600 text-white"
                          : "bg-[#080D1A] text-gray-400 hover:text-white"
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
                  <div className="py-12 text-center text-xs text-gray-400">
                    <Sparkles className="animate-spin mx-auto mb-2 text-blue-400 w-6 h-6" />
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
                      <div className="py-12 text-center text-xs text-gray-400 space-y-3">
                        <Users className="w-8 h-8 mx-auto text-gray-600" />
                        <p className="font-semibold text-gray-300">
                          No matching study circles found
                        </p>
                        <button
                          onClick={() => {
                            setIsExploreCirclesOpen(false);
                            setIsCreateCircleOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500"
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
                        className="p-3.5 rounded-2xl border border-[#162544] bg-[#080D1A]/80 hover:border-blue-500/40 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-11 w-11 rounded-2xl bg-gradient-to-tr ${circle.gradient} text-white flex items-center justify-center text-xl shrink-0`}
                          >
                            {circle.emoji}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white truncate">
                                {circle.name}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 shrink-0">
                                {circle.dept}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                              {rawComm?.description || `Collaborative study circle for ${circle.name}.`}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1">
                              <span className="flex items-center gap-1 font-medium">
                                <Users className="w-3 h-3" />
                                {circle.memberCount} Scholars
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          ) : isMemberAlready ? (
                            <button
                              onClick={() => {
                                setActiveCircle(circle);
                                setIsExploreCirclesOpen(false);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-[#162544] hover:bg-blue-600 hover:text-white text-gray-200 text-xs font-bold transition-all"
                            >
                              Open Circle
                            </button>
                          ) : (
                            <button
                              disabled={isJoiningCircleId === circle.id}
                              onClick={() => handleJoinCircle(circle)}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
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
              <div className="pt-3 border-t border-[#162544] flex items-center justify-between text-xs mt-2">
                <span className="text-[11px] text-gray-400">
                  {circles.length} campus circles available
                </span>
                <button
                  onClick={() => {
                    setIsExploreCirclesOpen(false);
                    setIsCreateCircleOpen(true);
                  }}
                  className="font-bold text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
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
