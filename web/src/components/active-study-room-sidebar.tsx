import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Users,
  MessageSquare,
  FileText,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Hand,
  Wifi,
  WifiOff,
  MoreVertical,
  Pin,
  Smile,
  Send,
  Plus,
  ExternalLink,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { HostWaitingPanel, type JoinRequest } from "./active-study-room-waiting-room";

export type SidebarTab = "participants" | "chat" | "notes";

interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isSpeaking: boolean;
  isMicOn: boolean;
  isCameraOn: boolean;
  hasRaisedHand: boolean;
  reaction?: string;
  isScreenSharing: boolean;
  networkStrength: "good" | "fair" | "poor";
  joinTime: string;
  isOnline: boolean;
}

interface ChatMessage {
  id: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

interface StudyNote {
  id: string;
  title: string;
  content: string;
  category: "announcement" | "resource" | "link" | "note";
  author: string;
  timestamp: string;
  isPinned?: boolean;
  url?: string;
}

interface ActiveStudyRoomSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  participants: Participant[];
  isCurrentUserHost?: boolean;
  pendingRequests?: JoinRequest[];
  onApproveRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string) => void;
  onOpenModeration?: (participantId: string) => void;
}

export function ActiveStudyRoomSidebar({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  participants,
  isCurrentUserHost = true,
  pendingRequests = [],
  onApproveRequest,
  onRejectRequest,
  onOpenModeration,
}: ActiveStudyRoomSidebarProps) {
  // --- STATE FOR PARTICIPANTS TAB ---
  const [pSearch, setPSearch] = useState("");
  const [pFilter, setPFilter] = useState<"all" | "hosts" | "guests">("all");
  const [pSort, setPSort] = useState<"name" | "time">("name");

  // --- STATE FOR CHAT TAB ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Advanced Mathematics Session started by Alex Johnson.",
      timestamp: "2h ago",
      isSystem: true,
    },
    {
      id: "2",
      senderId: "2",
      senderName: "Sarah Chen",
      text: "Hey everyone! Does anyone have the textbook reference for chapter 5?",
      timestamp: "10:12 AM",
    },
    {
      id: "3",
      senderId: "3",
      senderName: "Marcus Rodriguez",
      text: "I think it starts on page 142. Let me verify.",
      timestamp: "10:14 AM",
    },
    {
      id: "4",
      senderId: "3",
      senderName: "Marcus Rodriguez",
      text: "Yes, verified! It is section 5.2.",
      timestamp: "10:14 AM",
    },
    {
      id: "5",
      text: "Emma Williams joined the session.",
      timestamp: "5m ago",
      isSystem: true,
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUser] = useState<string | null>("Emma Williams");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- STATE FOR NOTES TAB ---
  const [notes, setNotes] = useState<StudyNote[]>([
    {
      id: "1",
      title: "Reading Assignment",
      content: "Complete chapters 5 through 7 before Tuesday's review class.",
      category: "announcement",
      author: "Alex Johnson",
      timestamp: "1h ago",
      isPinned: true,
    },
    {
      id: "2",
      title: "Formula Reference Sheet PDF",
      content: "Shared formulas and reference notes for calculations.",
      category: "resource",
      author: "Sarah Chen",
      timestamp: "45m ago",
      url: "formulas_ch5.pdf",
    },
    {
      id: "3",
      title: "React Router Documentation",
      content: "Official routing documentation.",
      category: "link",
      author: "Marcus Rodriguez",
      timestamp: "30m ago",
      url: "https://reactrouter.com",
    },
    {
      id: "4",
      title: "My Lecture Notes",
      content: "These are some quick scribbles from the theorem proof overview.",
      category: "note",
      author: "Sarah Chen",
      timestamp: "10m ago",
    },
  ]);
  const [nSearch, setNSearch] = useState("");
  const [nCategory, setNCategory] = useState<"all" | "announcement" | "resource" | "link" | "note">("all");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState<"announcement" | "resource" | "link" | "note">("note");
  const [newNoteUrl, setNewNoteUrl] = useState("");

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  if (!isOpen) return null;

  // --- FILTERS & SORTS ---
  const filteredParticipants = participants
    .filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(pSearch.toLowerCase());
      if (pFilter === "hosts") return matchSearch && p.isHost;
      if (pFilter === "guests") return matchSearch && !p.isHost;
      return matchSearch;
    })
    .sort((a, b) => {
      if (pSort === "name") return a.name.localeCompare(b.name);
      return a.joinTime.localeCompare(b.joinTime); // simple joinTime comparison
    });

  const filteredNotes = notes.filter((n) => {
    const matchSearch =
      n.title.toLowerCase().includes(nSearch.toLowerCase()) ||
      n.content.toLowerCase().includes(nSearch.toLowerCase());
    const matchCategory = nCategory === "all" || n.category === nCategory;
    return matchSearch && matchCategory;
  });

  // --- HANDLERS ---
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: "1", // Current user
      senderName: "Alex Johnson",
      text: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    const note: StudyNote = {
      id: Date.now().toString(),
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      category: newNoteCategory,
      author: "Alex Johnson",
      timestamp: "Just now",
      url: newNoteUrl.trim() || undefined,
    };

    setNotes((prev) => [note, ...prev]);
    setNewNoteTitle("");
    setNewNoteContent("");
    setNewNoteCategory("note");
    setNewNoteUrl("");
    setIsAddingNote(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden"
        onClick={onClose}
      />

      <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[360px] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-900 transition-all duration-300 lg:sticky lg:h-[calc(100vh-70px)] lg:shadow-none animate-slide-in-right">
        {/* Sidebar Header: Tab Selection */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("participants")}
              className={`flex items-center gap-1.5 border-b-2 px-2.5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === "participants"
                  ? "border-signal-500 text-signal-600 dark:text-signal-300"
                  : "border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
              }`}
              aria-label="Participants tab"
            >
              <Users size={15} />
              <span>Room</span>
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 border-b-2 px-2.5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === "chat"
                  ? "border-signal-500 text-signal-600 dark:text-signal-300"
                  : "border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
              }`}
              aria-label="Chat tab"
            >
              <MessageSquare size={15} />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`flex items-center gap-1.5 border-b-2 px-2.5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === "notes"
                  ? "border-signal-500 text-signal-600 dark:text-signal-300"
                  : "border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
              }`}
              aria-label="Notes tab"
            >
              <FileText size={15} />
              <span>Notes</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/[0.06] dark:hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-signal-500"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <X size={17} />
          </button>
        </div>

        {/* Sidebar Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* TAB 1: PARTICIPANTS */}
          {activeTab === "participants" && (
            <div className="flex flex-col h-full animate-fade-in p-4 space-y-4">
              {/* Counts */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wide uppercase">
                <span>Total: {participants.length}</span>
                <span className="text-green-600 dark:text-green-400">
                  Online: {participants.filter((p) => p.isOnline).length}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search participants..."
                  className="field py-2.5 pl-9 text-xs"
                  value={pSearch}
                  onChange={(e) => setPSearch(e.target.value)}
                />
              </div>
              
              {/* Host Waiting room pending entries */}
              {isCurrentUserHost && pendingRequests.length > 0 && (
                <div className="mb-3 animate-scale-up">
                  <HostWaitingPanel
                    requests={pendingRequests}
                    onApprove={onApproveRequest || (() => {})}
                    onReject={onRejectRequest || (() => {})}
                  />
                </div>
              )}

              {/* Filter and Sort Selectors */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    className="field py-2 pl-3 pr-8 text-xs appearance-none"
                    value={pFilter}
                    onChange={(e) => setPFilter(e.target.value as "all" | "hosts" | "guests")}
                    aria-label="Filter participants"
                  >
                    <option value="all">All Roles</option>
                    <option value="hosts">Hosts Only</option>
                    <option value="guests">Guests Only</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative flex-1">
                  <select
                    className="field py-2 pl-3 pr-8 text-xs appearance-none"
                    value={pSort}
                    onChange={(e) => setPSort(e.target.value as "name" | "time")}
                    aria-label="Sort participants"
                  >
                    <option value="name">Sort A-Z</option>
                    <option value="time">Join Time</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Participant Cards List */}
              <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
                {filteredParticipants.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                    No participants match your query.
                  </div>
                ) : (
                  filteredParticipants.map((p) => (
                    <div
                      key={p.id}
                      className={`relative flex items-center justify-between rounded-xl border p-3 transition hover:bg-slate-50 dark:hover:bg-white/[0.02] ${
                        p.isSpeaking
                          ? "border-signal-500/40 bg-signal-500/[0.02] dark:border-signal-400/30"
                          : "border-slate-100 bg-white dark:border-white/5 dark:bg-white/[0.01]"
                      }`}
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`relative flex size-9 items-center justify-center rounded-full text-xs font-bold text-white shadow bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 ${
                            p.isSpeaking ? "ring-2 ring-signal-500 ring-offset-1 dark:ring-offset-ink-950" : ""
                          }`}
                        >
                          {p.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}

                          {/* Online status indicator */}
                          <span
                            className={`absolute bottom-0 right-0 size-2.5 rounded-full border border-white dark:border-ink-900 ${
                              p.isOnline ? "bg-green-500" : "bg-slate-400"
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900 dark:text-white leading-none">
                            {p.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {p.isHost && (
                              <span className="rounded bg-signal-500/10 px-1 py-0.5 text-[9px] font-bold text-signal-600 dark:text-signal-300 uppercase leading-none">
                                Host
                              </span>
                            )}
                            <span className="text-[10px] text-slate-450 dark:text-slate-500">Joined {p.joinTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Icons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {p.hasRaisedHand && <Hand size={13} className="text-yellow-500 animate-bounce" />}
                        {p.isScreenSharing && <Monitor size={13} className="text-signal-500" />}

                        {/* Mic & Cam indicators */}
                        {p.isMicOn ? (
                          <Mic size={13} className="text-green-500" />
                        ) : (
                          <MicOff size={13} className="text-red-500" />
                        )}
                        {p.isCameraOn ? (
                          <Video size={13} className="text-green-500" />
                        ) : (
                          <VideoOff size={13} className="text-slate-400" />
                        )}

                        {/* Wifi strength symbol */}
                        {p.networkStrength === "good" ? (
                          <Wifi size={13} className="text-green-500" />
                        ) : (
                          <WifiOff size={13} className="text-yellow-500" />
                        )}

                        {/* Reaction bubble preview */}
                        {p.reaction && (
                          <span className="absolute -top-1 -left-1 text-base animate-bounce">{p.reaction}</span>
                        )}

                        {/* Action menu trigger */}
                        <button
                          type="button"
                          onClick={() => onOpenModeration?.(p.id)}
                          className="rounded-lg p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/[0.06] transition focus:outline-none focus:ring-2 focus:ring-signal-500"
                          aria-label="Participant options"
                        >
                          <MoreVertical size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CHAT */}
          {activeTab === "chat" && (
            <div className="flex flex-col h-full animate-fade-in p-4 space-y-3 justify-between">
              {/* Pinned Message */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5 text-xs text-indigo-950 dark:border-indigo-500/20 dark:bg-indigo-500/[0.04] dark:text-indigo-300 flex items-start gap-2 shadow-sm">
                <Pin size={13} className="mt-0.5 text-indigo-500 rotate-45 flex-shrink-0" />
                <div className="flex-1 leading-relaxed">
                  <span className="font-bold">Pinned:</span> Today we Proof Theorem 4. PDF reference notes are available in the Notes section.
                </div>
              </div>

              {/* Chat Message Logs */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[300px] max-h-[calc(100vh-270px)]">
                {/* Date separator */}
                <div className="relative text-center my-3">
                  <div className="absolute inset-0 top-1/2 h-px bg-slate-100 dark:bg-white/5" />
                  <span className="relative bg-white px-2.5 text-[10px] font-bold text-slate-400 dark:bg-ink-900 uppercase">
                    Today
                  </span>
                </div>

                {/* Messages list */}
                {chatMessages.map((msg, index) => {
                  if (msg.isSystem) {
                    return (
                      <p
                        key={msg.id}
                        className="text-center text-[10px] font-semibold text-slate-450 dark:text-slate-500 italic"
                      >
                        ℹ️ {msg.text} • {msg.timestamp}
                      </p>
                    );
                  }

                  // Message grouping optimization
                  const prevMsg = index > 0 ? chatMessages[index - 1] : null;
                  const isGrouped = prevMsg && prevMsg.senderId === msg.senderId && !prevMsg.isSystem;

                  return (
                    <div key={msg.id} className={`flex items-start gap-2.5 ${isGrouped ? "mt-1 pl-[34px]" : "mt-4"}`}>
                      {!isGrouped && (
                        <div className="flex size-7 items-center justify-center rounded-full text-[10px] font-bold text-white bg-gradient-to-br from-indigo-500 to-cyan-500">
                          {msg.senderName
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {!isGrouped && (
                          <div className="flex items-baseline justify-between mb-0.5">
                            <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                              {msg.senderName}
                            </span>
                            <span className="text-[9px] text-slate-450 dark:text-slate-500 font-semibold">
                              {msg.timestamp}
                            </span>
                          </div>
                        )}
                        <div className="rounded-2xl rounded-tl-sm bg-slate-50 border border-slate-100/50 px-3 py-2 text-xs text-slate-950 dark:bg-white/[0.02] dark:border-white/5 dark:text-slate-200 leading-relaxed shadow-sm">
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Typing indicator */}
              {typingUser && (
                <div className="flex items-center gap-1.5 pl-9 text-[10px] font-semibold text-slate-450 dark:text-slate-500 animate-pulse">
                  <div className="flex gap-0.5">
                    <span className="size-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="size-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="size-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>{typingUser} is typing...</span>
                </div>
              )}

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center border-t border-slate-100 pt-2 dark:border-white/5">
                <button
                  type="button"
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white transition focus:outline-none focus:ring-2 focus:ring-signal-500"
                  title="Insert emoji"
                  aria-label="Insert emoji"
                >
                  <Smile size={18} />
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="field py-2 text-xs flex-1"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-950 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-ink-950 dark:hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-signal-500"
                  aria-label="Send message"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: NOTES */}
          {activeTab === "notes" && (
            <div className="flex flex-col h-full animate-fade-in p-4 space-y-4">
              {/* Add Note Button */}
              {!isAddingNote && (
                <button
                  type="button"
                  onClick={() => setIsAddingNote(true)}
                  className="primary-button min-h-0 w-full py-2.5 text-xs font-semibold gap-1.5 shadow-md shadow-indigo-500/10"
                >
                  <Plus size={15} />
                  Add Study Note
                </button>
              )}

              {/* Add Note Form Container */}
              {isAddingNote && (
                <form onSubmit={handleAddNote} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 dark:border-white/10 dark:bg-white/[0.02] shadow-inner animate-scale-up">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-200/50 dark:border-white/5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-250 uppercase">New Note</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(false)}
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.06]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      placeholder="Note Title"
                      className="field py-2 text-xs"
                      required
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                    />
                    <textarea
                      placeholder="Note Content..."
                      rows={3}
                      className="field py-2 text-xs resize-none"
                      required
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <select
                        className="field py-1.5 px-2 text-xs"
                        value={newNoteCategory}
                        onChange={(e) =>
                          setNewNoteCategory(e.target.value as "announcement" | "resource" | "link" | "note")
                        }
                        aria-label="Note category"
                      >
                        <option value="note">Private Note</option>
                        <option value="announcement">Announcement</option>
                        <option value="resource">Shared Resource</option>
                        <option value="link">Quick Link</option>
                      </select>
                    </div>
                    {(newNoteCategory === "resource" || newNoteCategory === "link") && (
                      <input
                        type="url"
                        placeholder="Attach URL (e.g. file path or website)"
                        className="field py-1.5 text-xs"
                        value={newNoteUrl}
                        onChange={(e) => setNewNoteUrl(e.target.value)}
                      />
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(false)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-ink-950 dark:hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}

              {/* Search & Category Filter */}
              <div className="space-y-2 border-b border-slate-100 pb-3 dark:border-white/5">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    className="field py-2 pl-9 text-xs"
                    value={nSearch}
                    onChange={(e) => setNSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: "all", label: "All" },
                    { id: "announcement", label: "📢 Alerts" },
                    { id: "resource", label: "📂 Files" },
                    { id: "link", label: "🔗 Links" },
                    { id: "note", label: "📝 Notes" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNCategory(cat.id as any)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        nCategory === cat.id
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-white/[0.02] dark:border-white/5 dark:text-slate-400"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes List Container */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
                {filteredNotes.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                    No notes found.
                  </div>
                ) : (
                  filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`group rounded-2xl border p-3.5 space-y-2 transition-all shadow-sm ${
                        note.isPinned
                          ? "border-indigo-200 bg-indigo-50/20 dark:border-indigo-500/20 dark:bg-indigo-500/[0.02]"
                          : "border-slate-100 bg-white dark:border-white/5 dark:bg-white/[0.01]"
                      }`}
                    >
                      {/* Note Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="truncate text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {note.title}
                          </h4>
                          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5">
                            By {note.author} • {note.timestamp}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {note.isPinned && <Pin size={11} className="text-indigo-500 rotate-45" />}
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-650 dark:hover:bg-red-500/10 transition"
                            title="Delete note"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Note Content */}
                      <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed font-medium">
                        {note.content}
                      </p>

                      {/* Attachment URL / External links */}
                      {note.url && (
                        <a
                          href={note.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-950 dark:bg-white/[0.04] dark:border-white/5 dark:text-slate-300 dark:hover:bg-white/[0.08]"
                        >
                          {note.category === "resource" ? "Download PDF" : "Visit Link"}
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
