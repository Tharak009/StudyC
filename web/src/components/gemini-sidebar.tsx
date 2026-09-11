import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Plus,
  MessageSquare,
  MoreVertical,
  Pencil,
  Trash2,
  Pin,
  HelpCircle,
  History,
  Settings,
  Sparkles,
  X,
  Compass,
  ChevronRight,
  ExternalLink,
  Bot
} from "lucide-react";
import { Link } from "react-router";

export interface ChatItem {
  id: string;
  title: string;
  timestamp: string;
  isPinned?: boolean;
}

export interface GeminiSidebarProps {
  /** Controlled desktop collapsed state */
  isCollapsed?: boolean;
  /** Callback when desktop collapse state changes */
  onToggleCollapse?: (collapsed: boolean) => void;
  /** Controlled mobile open state */
  isOpenMobile?: boolean;
  /** Callback when mobile drawer opens/closes */
  onToggleMobile?: (open: boolean) => void;
  /** Initial or external list of chats */
  chats?: ChatItem[];
  /** Current active chat ID */
  activeChatId?: string;
  /** Callback when a chat is selected */
  onSelectChat?: (chatId: string) => void;
  /** Callback when user clicks 'New chat' */
  onNewChat?: () => void;
  /** Callback when renaming a chat */
  onRenameChat?: (chatId: string, newTitle: string) => void;
  /** Callback when deleting a chat */
  onDeleteChat?: (chatId: string) => void;
}

const defaultChats: ChatItem[] = [
  { id: "1", title: "Distributed Consensus & Raft Invariants", timestamp: "Today", isPinned: true },
  { id: "2", title: "React 19 Server Components Explained", timestamp: "Today" },
  { id: "3", title: "Compiler SSA Form & Register Allocation", timestamp: "Yesterday" },
  { id: "4", title: "Operating Systems Virtual Memory Lab Prep", timestamp: "Yesterday" },
  { id: "5", title: "Database Indexing B-Trees vs LSM Trees", timestamp: "Previous 7 Days" },
  { id: "6", title: "Graph Neural Networks Architectures", timestamp: "Previous 7 Days" },
  { id: "7", title: "Tailwind CSS Grid vs Flexbox Layouts", timestamp: "Previous 30 Days" },
  { id: "8", title: "Quantum Computing Grover's Search Algorithm", timestamp: "Previous 30 Days" },
];

export function GeminiSidebar({
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  isOpenMobile: controlledMobileOpen,
  onToggleMobile,
  chats: initialChats = defaultChats,
  activeChatId: controlledActiveChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
}: GeminiSidebarProps) {
  // Uncontrolled fallback state
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [internalActiveId, setInternalActiveId] = useState<string>("1");
  const [chatList, setChatList] = useState<ChatItem[]>(initialChats);

  // Kebab menu action state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const isMobileOpen = controlledMobileOpen !== undefined ? controlledMobileOpen : internalMobileOpen;
  const activeChatId = controlledActiveChatId !== undefined ? controlledActiveChatId : internalActiveId;

  const toggleCollapse = () => {
    const next = !isCollapsed;
    if (onToggleCollapse) onToggleCollapse(next);
    else setInternalCollapsed(next);
  };

  const closeMobile = () => {
    if (onToggleMobile) onToggleMobile(false);
    else setInternalMobileOpen(false);
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    if (menuOpenId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpenId]);

  // Handle selecting chat
  const handleSelectChat = (id: string) => {
    if (onSelectChat) onSelectChat(id);
    else setInternalActiveId(id);
    closeMobile();
  };

  // Handle New Chat
  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      const newId = `chat-${Date.now()}`;
      const newChat: ChatItem = {
        id: newId,
        title: "New study session",
        timestamp: "Just now",
      };
      setChatList([newChat, ...chatList]);
      setInternalActiveId(newId);
    }
    closeMobile();
  };

  // Handle Rename Submit
  const handleSaveRename = (id: string) => {
    if (!editTitleValue.trim()) {
      setEditingChatId(null);
      return;
    }
    if (onRenameChat) {
      onRenameChat(id, editTitleValue.trim());
    } else {
      setChatList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: editTitleValue.trim() } : c))
      );
    }
    setEditingChatId(null);
  };

  // Handle Delete
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteChat) {
      onDeleteChat(id);
    } else {
      setChatList((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id && chatList.length > 1) {
        const next = chatList.find((c) => c.id !== id);
        if (next) setInternalActiveId(next.id);
      }
    }
    setMenuOpenId(null);
  };

  return (
    <>
      {/* ── 1. Mobile Backdrop Blur ───────────────────────────────────── */}
      {isMobileOpen && (
        <div
          role="presentation"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          aria-label="Close sidebar backdrop"
        />
      )}

      {/* ── 2. Sidebar Shell ──────────────────────────────────────────── */}
      <aside
        aria-label="Gemini Sidebar"
        aria-expanded={!isCollapsed}
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden select-none
          bg-[#f0f4f9] dark:bg-[#1e1f20] text-slate-700 dark:text-slate-300
          border-r border-slate-200/60 dark:border-white/[0.05]
          transition-[width,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] will-change-[width]
          ${isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "md:w-[72px]" : "w-[280px]"}
        `}
      >
        {/* ── Top Header & Hamburger Control ──────────────────────────── */}
        <div className="flex items-center justify-between h-16 px-4 shrink-0">
          <div className="flex items-center gap-2">
            {/* Hamburger / Collapse Button */}
            <button
              onClick={toggleCollapse}
              className="p-2.5 rounded-full hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer group relative"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu size={20} />
              {isCollapsed && (
                <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  Expand menu
                </span>
              )}
            </button>

            {/* Brand / Logo (only visible when expanded or mobile) */}
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex items-center gap-2 select-none">
                <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Gemini
                </span>
                <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold">
                  2.5 Flash
                </span>
              </div>
            )}
          </div>

          {/* Close button on mobile drawer */}
          <button
            onClick={closeMobile}
            className="md:hidden p-2 rounded-full hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-500"
            aria-label="Close mobile sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── New Chat Button ─────────────────────────────────────────── */}
        <div className="px-3 pt-2 pb-3 shrink-0">
          {isCollapsed ? (
            <div className="flex justify-center">
              <button
                onClick={handleNewChat}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-slate-200/80 hover:bg-slate-300/80 dark:bg-[#282a2c] dark:hover:bg-[#37393b] text-slate-800 dark:text-slate-100 transition-colors shadow-sm group relative cursor-pointer"
                aria-label="New chat"
              >
                <Plus size={20} />
                <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  New chat
                </span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-200/70 hover:bg-slate-200 dark:bg-[#131314] dark:hover:bg-[#282a2c] text-slate-800 dark:text-slate-200 text-sm font-medium transition-all shadow-sm hover:shadow group cursor-pointer border border-transparent dark:border-white/[0.04]"
              aria-label="Start new chat"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full text-slate-700 dark:text-slate-300">
                <Plus size={18} />
              </div>
              <span className="truncate">New chat</span>
            </button>
          )}
        </div>

        {/* ── Center Content: Recents & Navigation ────────────────────── */}
        <div className={`flex-1 px-3 py-2 select-none no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          isCollapsed ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"
        }`}>
          {isCollapsed ? (
            /* Icon-only collapsed rail */
            <div className="flex flex-col items-center space-y-3 pt-2">
              <div className="group relative">
                <button
                  onClick={toggleCollapse}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors"
                  aria-label="Recent chats"
                >
                  <MessageSquare size={18} />
                </button>
                <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  Recent chats
                </span>
              </div>

              <div className="group relative">
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors"
                  aria-label="Explore Gems"
                >
                  <Compass size={18} />
                </button>
                <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  Explore Gems
                </span>
              </div>
            </div>
          ) : (
            /* Expanded full Recent chat history list */
            <div className="space-y-4">
              <div className="px-3 pt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                Recent
              </div>

              <div className="space-y-0.5">
                {chatList.map((chat) => {
                  const isActive = chat.id === activeChatId;
                  const isMenuOpen = menuOpenId === chat.id;
                  const isEditing = editingChatId === chat.id;

                  return (
                    <div
                      key={chat.id}
                      onClick={() => !isEditing && handleSelectChat(chat.id)}
                      className={`group relative flex items-center justify-between px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none ${
                        isActive
                          ? "bg-[#d3e3fd]/70 dark:bg-[#004a77]/40 text-[#041e49] dark:text-[#c2e7ff] font-semibold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      {/* Left Title / Edit Input */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <MessageSquare
                          size={15}
                          className={`shrink-0 ${
                            isActive
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        />

                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(chat.id);
                              if (e.key === "Escape") setEditingChatId(null);
                            }}
                            onBlur={() => handleSaveRename(chat.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-white dark:bg-[#131314] text-xs px-2 py-0.5 rounded border border-sky-400 text-slate-900 dark:text-slate-100 focus:outline-none"
                          />
                        ) : (
                          <span className="truncate">{chat.title}</span>
                        )}
                      </div>

                      {/* Right Kebab Menu trigger (appears on hover or if active/menu open) */}
                      {!isEditing && (
                        <div className="relative shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(isMenuOpen ? null : chat.id);
                            }}
                            className={`p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity ${
                              isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}
                            aria-label="Chat options"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {/* Kebab Context Popover */}
                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-7 z-50 w-36 py-1.5 rounded-xl bg-white dark:bg-[#282a2c] shadow-xl border border-slate-200/80 dark:border-white/[0.08] text-xs font-normal text-slate-700 dark:text-slate-200"
                            >
                              <button
                                onClick={() => {
                                  setEditingChatId(chat.id);
                                  setEditTitleValue(chat.title);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.08] text-left transition-colors"
                              >
                                <Pencil size={13} className="text-slate-400" />
                                <span>Rename</span>
                              </button>

                              <button
                                onClick={(e) => handleDelete(chat.id, e)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left transition-colors"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom Utility Area ─────────────────────────────────────── */}
        <div className="shrink-0 p-3 border-t border-slate-200/60 dark:border-white/[0.05] space-y-1 overflow-hidden">
          {/* Help & FAQ */}
          <div className="relative group">
            <Link
              to="/help"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
                isCollapsed ? "justify-center px-0" : ""
              }`}
              aria-label="Help & FAQ"
            >
              <HelpCircle size={17} className="shrink-0 text-slate-500" />
              {!isCollapsed && <span className="truncate">Help & FAQ</span>}
            </Link>
            {isCollapsed && (
              <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                Help & FAQ
              </span>
            )}
          </div>

          {/* Activity / History */}
          <div className="relative group">
            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
                isCollapsed ? "justify-center px-0" : ""
              }`}
              aria-label="Gemini Activity"
            >
              <History size={17} className="shrink-0 text-slate-500" />
              {!isCollapsed && <span className="truncate">Gemini Activity</span>}
            </button>
            {isCollapsed && (
              <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                Gemini Activity
              </span>
            )}
          </div>

          {/* Settings */}
          <div className="relative group">
            <Link
              to="/settings"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
                isCollapsed ? "justify-center px-0" : ""
              }`}
              aria-label="Settings"
            >
              <Settings size={17} className="shrink-0 text-slate-500" />
              {!isCollapsed && <span className="truncate">Settings</span>}
            </Link>
            {isCollapsed && (
              <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                Settings
              </span>
            )}
          </div>

          {/* Location & Connectivity Indicator (Gemini subtle footer) */}
          {!isCollapsed && (
            <div className="pt-2 px-3 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 select-none font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">From your verified IP • India</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default GeminiSidebar;
