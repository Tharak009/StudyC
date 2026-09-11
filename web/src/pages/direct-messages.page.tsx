import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router";
import {
  MessageCircle,
  Sparkles,
  ShieldCheck,
  Search,
  Plus,
  Users,
  Send,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  X,
  Volume2
} from "lucide-react";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { ConversationList, type ConversationItem, type PeerSearchResult } from "../components/dm/ConversationList";
import { ConversationHeader, type ActivePeer } from "../components/dm/ConversationHeader";
import { DirectMessageStream, type DirectMessageItem } from "../components/dm/DirectMessageStream";
import { DirectMessageInput } from "../components/dm/DirectMessageInput";
import { ContactInfoDrawer } from "../components/dm/ContactInfoDrawer";
import { socketService } from "../services/socket.service";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";

// ── Local Storage Data Keys, Seed Data & Helpers ──────────────────────────────

const LOCAL_STORAGE_CONVERSATIONS_KEY = "studyconnect_dm_conversations";
const LOCAL_STORAGE_DIRECTORY_KEY = "studyconnect_peer_directory";
const LOCAL_STORAGE_MESSAGES_PREFIX = "studyconnect_dm_messages_";

const MOCK_SEED_IDS = new Set([
  "conv-meera",
  "conv-rohan",
  "u-meera",
  "u-rohan",
  "u-ananya",
  "u-devansh",
  "u-priya",
  "u-kabir"
]);

const loadSavedConversations = (): ConversationItem[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_CONVERSATIONS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (c: ConversationItem) =>
            c &&
            !MOCK_SEED_IDS.has(c.id) &&
            !MOCK_SEED_IDS.has(c.peer?.id) &&
            !c.peer?.name?.includes("Meera Patel") &&
            !c.peer?.name?.includes("Rohan Verma")
        );
      }
    }
  } catch {}
  return [];
};

const loadSavedDirectory = (): PeerSearchResult[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_DIRECTORY_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (p: PeerSearchResult) =>
            p &&
            !MOCK_SEED_IDS.has(p.id) &&
            !p.name?.includes("Meera Patel") &&
            !p.name?.includes("Rohan Verma")
        );
      }
    }
  } catch {}
  return [];
};

const loadSavedMessages = (convId: string): DirectMessageItem[] => {
  try {
    const data = localStorage.getItem(`${LOCAL_STORAGE_MESSAGES_PREFIX}${convId}`);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

export function DirectMessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();

  const [conversations, setConversations] = useState<ConversationItem[]>(loadSavedConversations);
  const [directory, setDirectory] = useState<PeerSearchResult[]>(loadSavedDirectory);
  const [activeConvId, setActiveConvId] = useState<string | null>(
    conversationId || (loadSavedConversations()[0]?.id ?? null)
  );
  const [messagesMap, setMessagesMap] = useState<Record<string, DirectMessageItem[]>>({});
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ senderName: string; content: string } | null>(null);

  // Sync route conversationId param to activeConvId
  useEffect(() => {
    if (conversationId && conversationId !== activeConvId) {
      setActiveConvId(conversationId);
    }
  }, [conversationId]);

  // WhatsApp-style Drawer & Search & Call simulation state
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

  // Keyboard shortcut: Esc exits enlarged subpage mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isChatEnlarged) {
        setIsChatEnlarged(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isChatEnlarged]);

  // Sync conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch {
      // ignore
    }
  }, [conversations]);

  // Sync directory to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_DIRECTORY_KEY, JSON.stringify(directory));
    } catch {
      // ignore
    }
  }, [directory]);

  // Load messages from localStorage when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;
    setMessagesMap((prev) => {
      if (prev[activeConvId]) return prev;
      return {
        ...prev,
        [activeConvId]: loadSavedMessages(activeConvId)
      };
    });
  }, [activeConvId]);

  // Sync messages to localStorage whenever they update for the active conversation
  useEffect(() => {
    if (!activeConvId || !messagesMap[activeConvId]) return;
    try {
      localStorage.setItem(
        `${LOCAL_STORAGE_MESSAGES_PREFIX}${activeConvId}`,
        JSON.stringify(messagesMap[activeConvId])
      );
    } catch {
      // ignore
    }
  }, [messagesMap, activeConvId]);

  const activeConversation = conversations.find((c) => c.id === activeConvId);
  const activeMessages = activeConvId ? messagesMap[activeConvId] || [] : [];

  // Update dynamic page title
  useEffect(() => {
    if (activeConversation) {
      document.title = `${activeConversation.peer.name} • Direct Messages | StudyConnect`;
    } else {
      document.title = "Direct Messages | StudyConnect";
    }
  }, [activeConversation]);

  // ── Socket.IO Lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketService.connect();

    if (socket && activeConvId) {
      const handleDirectMessage = (data: any) => {
        const newMsg: DirectMessageItem = {
          id: data._id || `dm-${Date.now()}`,
          senderId: data.senderId?._id || data.senderId || "u-peer",
          senderName: data.senderId?.fullName || "Classmate",
          content: data.content || "",
          attachments: data.attachments,
          codeSnippet: data.codeSnippet,
          isRead: false,
          isDelivered: true,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: new Date().toISOString()
        };

        setMessagesMap((prev) => ({
          ...prev,
          [activeConvId]: [...(prev[activeConvId] || []), newMsg]
        }));
      };

      const handleTyping = () => setIsPeerTyping(true);
      const handleStopTyping = () => setIsPeerTyping(false);

      socket.on("directMessageReceived", handleDirectMessage);
      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);

      return () => {
        socket.off("directMessageReceived", handleDirectMessage);
        socket.off("typing", handleTyping);
        socket.off("stopTyping", handleStopTyping);
      };
    }
  }, [activeConvId]);

  // ── Custom Peer Avatar Upload Handler ────────────────────────────────────
  const handleUpdatePeerAvatar = (peerId: string, avatarUrl: string | undefined) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.peer.id === peerId
          ? {
              ...c,
              peer: {
                ...c.peer,
                avatar: avatarUrl
              }
            }
          : c
      )
    );

    addToast(avatarUrl ? "Contact photo updated" : "Contact photo reset", "success");
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    navigate(`/direct-messages/${id}`);
    setSearchInChatOpen(false);
    setChatSearchQuery("");
    // Clear unread
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleStartNewChat = (
    peerId: string,
    customPeer?: { name: string; roll?: string; dept?: string }
  ) => {
    let targetPeer = directory.find((p) => p.id === peerId);

    if (!targetPeer && customPeer) {
      targetPeer = {
        id: peerId,
        name: customPeer.name,
        roll: customPeer.roll || "CS24-001",
        dept: customPeer.dept || "CSE",
        isOnline: true
      };
      setDirectory((prev) => [targetPeer!, ...prev.filter((p) => p.id !== peerId)]);
    }

    if (!targetPeer) return;

    // Check if conversation already exists
    const existing = conversations.find((c) => c.peer.id === targetPeer!.id);
    if (existing) {
      handleSelectConversation(existing.id);
      return;
    }

    const newConvId = `conv-${Date.now()}`;
    const newConv: ConversationItem = {
      id: newConvId,
      peer: {
        id: targetPeer.id,
        name: targetPeer.name,
        roll: targetPeer.roll,
        dept: targetPeer.dept,
        isOnline: targetPeer.isOnline
      },
      lastMessage: {
        text: "New peer connection established",
        senderId: "system",
        time: "Just now",
        isRead: true,
        isDelivered: true
      },
      unreadCount: 0
    };

    const initialWelcomeMsg: DirectMessageItem = {
      id: `dm-sys-${Date.now()}`,
      senderId: "system",
      senderName: "Campus Verification Network",
      content: `🔒 Direct message connection established with ${targetPeer.name} (${targetPeer.roll} • ${targetPeer.dept}). End-to-end verified academic discussion.`,
      isRead: true,
      isDelivered: true,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: new Date().toISOString()
    };

    setConversations((prev) => [newConv, ...prev.filter((c) => c.peer.id !== targetPeer!.id)]);
    setMessagesMap((prev) => ({
      ...prev,
      [newConvId]: [initialWelcomeMsg]
    }));
    setActiveConvId(newConvId);
    navigate(`/direct-messages/${newConvId}`);
    addToast(`Started conversation with ${targetPeer.name}`, "success");
  };

  const handleSendMessage = (
    content: string,
    codeSnippet?: { language: string; code: string },
    files?: File[],
    voiceNote?: { duration: string; url?: string }
  ) => {
    if (!activeConvId) return;

    const student = user?.fullName || "Aarav Sharma";
    const studentId = user?._id || "u-me";

    const newMsg: DirectMessageItem = {
      id: `dm-${Date.now()}`,
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
      replyTo: replyTarget || undefined,
      isRead: false,
      isDelivered: true,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: new Date().toISOString()
    };

    setMessagesMap((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg]
    }));

    // Update conversation card preview
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
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

    // Socket.IO emission
    const socket = socketService.get();
    if (socket && activeConversation) {
      socket.emit("sendDirectMessage", {
        receiverId: activeConversation.peer.id,
        conversationId: activeConvId,
        content,
        codeSnippet
      });
    }

    // Interactive Demo Simulation: If socket is not connected or in standalone dev mode,
    // generate an active peer response after a brief delay so the interaction is visibly responsive
    if ((!socket || !socket.connected) && activeConversation && activeConversation.peer.id !== studentId) {
      setTimeout(() => {
        setIsPeerTyping(true);
        setTimeout(() => {
          setIsPeerTyping(false);
          const simulatedResponse: DirectMessageItem = {
            id: `dm-reply-${Date.now()}`,
            senderId: activeConversation.peer.id,
            senderName: activeConversation.peer.name,
            content: `Hey Aarav! Got your note regarding ${activeConversation.peer.dept} coursework. Let me check the solution and get back to you in a bit!`,
            isRead: true,
            isDelivered: true,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            createdAt: new Date().toISOString()
          };
          setMessagesMap((prev) => ({
            ...prev,
            [activeConvId]: [...(prev[activeConvId] || []), simulatedResponse]
          }));
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConvId
                ? {
                    ...c,
                    lastMessage: {
                      text: simulatedResponse.content,
                      senderId: simulatedResponse.senderId,
                      time: simulatedResponse.time,
                      isRead: true,
                      isDelivered: true
                    }
                  }
                : c
            )
          );
        }, 1800);
      }, 1200);
    }
  };

  const handleReact = (messageId: string, emoji: string) => {
    if (!activeConvId) return;

    const student = user?.fullName || "Aarav Sharma";

    setMessagesMap((prev) => {
      const currentList = prev[activeConvId] || [];
      const updated = currentList.map((m) => {
        if (m.id !== messageId) return m;

        const currentReactions = { ...(m.reactions || {}) };
        const users = currentReactions[emoji] || [];

        if (users.includes(student)) {
          // Remove reaction
          const filtered = users.filter((u) => u !== student);
          if (filtered.length === 0) {
            delete currentReactions[emoji];
          } else {
            currentReactions[emoji] = filtered;
          }
        } else {
          // Add reaction
          currentReactions[emoji] = [...users, student];
        }

        return {
          ...m,
          reactions: currentReactions
        };
      });

      return {
        ...prev,
        [activeConvId]: updated
      };
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      
      {/* ── 1. Leftmost Workspace Sidebar ─────────────────────────────── */}
      {!isChatEnlarged && <DashboardSidebar />}

      {/* ── 2. Conversations & Peer Directory List (320px) ────────────── */}
      <div
        className={`${
          isChatEnlarged ? "hidden" : activeConvId ? "hidden md:flex" : "flex"
        } w-full md:w-80 shrink-0`}
      >
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConvId}
          onSelectConversation={handleSelectConversation}
          currentUser={user}
          onStartNewChat={handleStartNewChat}
          directoryPeers={directory}
        />
      </div>

      {/* ── 3. Right Active Peer Chat Window (Flex 1) ─────────────────── */}
      <div
        className={`flex-1 flex flex-row min-w-0 h-screen overflow-hidden ${
          !activeConvId && !isChatEnlarged ? "hidden md:flex" : "flex"
        }`}
      >
        
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {activeConversation ? (
            <>
              {/* WhatsApp Active Header */}
              <ConversationHeader
                peer={activeConversation.peer}
                onBack={() => {
                  setActiveConvId(null);
                  setIsChatEnlarged(false);
                }}
                onOpenContactInfo={() => setIsContactInfoOpen(true)}
                onStartCall={handleStartCall}
                onSearchInChat={() => setSearchInChatOpen((prev) => !prev)}
                isPeerTyping={isPeerTyping}
                isEnlarged={isChatEnlarged}
                onToggleEnlarge={() => setIsChatEnlarged((prev) => !prev)}
              />

              {/* In-Chat Message Search Bar */}
              <AnimatePresence>
                {searchInChatOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-2.5 px-4 bg-slate-100 dark:bg-[#0c1424] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 z-10"
                  >
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder={`Search messages in chat with ${activeConversation.peer.name}...`}
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#080D1A] pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF]"
                        autoFocus
                      />
                      {chatSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setChatSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Close
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Real-time Message Stream */}
              <DirectMessageStream
                messages={activeMessages}
                currentUser={user}
                onReply={(msg) =>
                  setReplyTarget({ senderName: msg.senderName, content: msg.content })
                }
                onReact={handleReact}
                searchQuery={chatSearchQuery}
              />

              {/* WhatsApp-Style Input Dock */}
              <DirectMessageInput
                peerName={activeConversation.peer.name}
                onSendMessage={handleSendMessage}
                onTyping={(isTyping) => {
                  const socket = socketService.get();
                  if (socket && activeConversation) {
                    socket.emit(isTyping ? "typing" : "stopTyping", {
                      conversationId: activeConvId,
                      receiverId: activeConversation.peer.id
                    });
                  }
                }}
                isPeerTyping={isPeerTyping}
                replyTarget={replyTarget}
                onCancelReply={() => setReplyTarget(null)}
              />
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-[#080D1A]/50">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 mb-4">
                <MessageCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                {conversations.length === 0 ? "No Direct Messages Yet" : "Select a Classmate Conversation"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-6">
                {conversations.length === 0
                  ? "Start a new 1-on-1 peer conversation to collaborate on assignments, share resources, and exchange code snippets."
                  : "Collaborate 1-on-1 on course homework, share lecture notes securely, and review exam questions."}
              </p>
            </div>
          )}
        </div>

        {/* ── 4. WhatsApp-Style Contact Info Drawer ─────────────────────── */}
        {activeConversation && (
          <ContactInfoDrawer
            isOpen={isContactInfoOpen}
            onClose={() => setIsContactInfoOpen(false)}
            peer={activeConversation.peer}
            messages={activeMessages}
            onUpdatePeerAvatar={handleUpdatePeerAvatar}
            onStartCall={handleStartCall}
            onSearchInChat={() => {
              setIsContactInfoOpen(false);
              setSearchInChatOpen(true);
            }}
          />
        )}

      </div>

      {/* ── 5. WhatsApp-Style Call Simulation Modal ────────────────────── */}
      <AnimatePresence>
        {activeCall && activeCall.isOpen && activeConversation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm rounded-3xl border border-slate-700/80 bg-[#0c1424] text-white p-8 shadow-2xl flex flex-col items-center text-center"
            >
              {/* Top status */}
              <span className="text-[11px] font-bold text-[#1E90FF] uppercase tracking-wider mb-6 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#1E90FF] animate-ping" />
                {activeCall.type === "video" ? "StudyConnect Video Call" : "StudyConnect Voice Call"}
              </span>

              {/* Peer Avatar */}
              <div className="relative mb-4">
                <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-[#1E90FF]/30 bg-[#1E90FF] flex items-center justify-center text-2xl font-black shadow-xl">
                  {activeConversation.peer.avatar ? (
                    <img
                      src={activeConversation.peer.avatar}
                      alt={activeConversation.peer.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    activeConversation.peer.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="absolute inset-0 rounded-full border border-[#1E90FF]/50 animate-ping pointer-events-none" />
              </div>

              {/* Peer info */}
              <h3 className="text-lg font-bold text-white mb-0.5">
                {activeConversation.peer.name}
              </h3>
              <p className="text-xs text-slate-400 font-medium mb-6">
                {activeConversation.peer.roll} • {activeConversation.peer.dept}
              </p>

              <div className="text-xs text-[#1E90FF]/80 font-medium mb-8">
                Ringing... (End-to-End Encrypted)
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                {/* Mute Mic */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveCall((prev) => prev ? { ...prev, isMuted: !prev.isMuted } : null)
                  }
                  className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
                    activeCall.isMuted
                      ? "bg-rose-500 text-white"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                  title={activeCall.isMuted ? "Unmute" : "Mute"}
                >
                  {activeCall.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* End Call Button */}
                <button
                  type="button"
                  onClick={() => setActiveCall(null)}
                  className="h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform hover:scale-105"
                  title="End Call"
                >
                  <PhoneOff size={24} />
                </button>

                {/* Video toggle */}
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
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
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

    </div>
  );
}

export default DirectMessagesPage;
