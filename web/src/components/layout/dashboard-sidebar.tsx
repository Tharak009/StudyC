import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Plus,
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  Send,
  BookOpen,
  Calendar,
  User,
  Settings,
  ShieldAlert,
  HelpCircle,
  History,
  LogOut,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Radio,
  Users,
  Compass,
  Check,
  Bot,
  Bell
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuthStore } from "../../store/auth.store";
import { useToastStore } from "../../store/toast.store";
import { useNotificationStore } from "../../store/notification.store";

export interface RecentChatSession {
  id: string;
  title: string;
  timestamp: string;
  href: string;
}

export interface DashboardSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  currentNav?: string;
  onNavigate?: (route: any) => void;
  className?: string;
}

const RECENT_SESSIONS_STORAGE_KEY = "studyconnect_recent_sessions";

function loadSavedRecentSessions(): RecentChatSession[] {
  try {
    const raw = localStorage.getItem(RECENT_SESSIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function DashboardSidebar({
  collapsed: controlledCollapsed,
  onToggleCollapse,
  currentNav,
  onNavigate,
  className = ""
}: DashboardSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { addToast } = useToastStore();
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  // ── 1. LocalStorage Persisted Collapse State ────────────────────────────────
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("studyconnect_sidebar_collapsed");
      return saved === "true";
    }
    return false;
  });

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem("studyconnect_sidebar_collapsed", String(next));
        return next;
      });
    }
  };

  // ── 2. Mobile Drawer State ──────────────────────────────────────────────────
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggleMobile = () => setIsMobileOpen((prev) => !prev);
    const handleCloseMobile = () => setIsMobileOpen(false);

    window.addEventListener("studyconnect:toggle-sidebar", handleToggleMobile);
    window.addEventListener("studyconnect:close-sidebar", handleCloseMobile);

    return () => {
      window.removeEventListener("studyconnect:toggle-sidebar", handleToggleMobile);
      window.removeEventListener("studyconnect:close-sidebar", handleCloseMobile);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // ── 3. Recent Chat History State (Gemini Style) ─────────────────────────────
  const [recentSessions, setRecentSessions] = useState<RecentChatSession[]>(loadSavedRecentSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context kebab menu when clicking outside
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

  // Handle New Session / Chat
  const handleNewChat = () => {
    const newId = `s-${Date.now()}`;
    const newSession: RecentChatSession = {
      id: newId,
      title: "New AI Study Circle",
      timestamp: "Just now",
      href: "/chat"
    };
    const updated = [newSession, ...recentSessions];
    setRecentSessions(updated);
    try {
      localStorage.setItem(RECENT_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    setActiveSessionId(newId);
    navigate("/chat");
    addToast("Started new AI Study Session.", "info");
    setIsMobileOpen(false);
  };

  // Rename Session
  const handleSaveRename = (id: string) => {
    if (!editTitleValue.trim()) {
      setEditingSessionId(null);
      return;
    }
    const updated = recentSessions.map((s) => (s.id === id ? { ...s, title: editTitleValue.trim() } : s));
    setRecentSessions(updated);
    try {
      localStorage.setItem(RECENT_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    setEditingSessionId(null);
    addToast("Session renamed successfully.", "success");
  };

  // Delete Session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSessions.filter((s) => s.id !== id);
    setRecentSessions(updated);
    try {
      localStorage.setItem(RECENT_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    setMenuOpenId(null);
    addToast("Study session removed.", "info");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "SC";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const primaryNavItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Study Circles", href: "/chat", icon: MessageSquare },
    { label: "Direct Messages", href: "/chat?mode=dms", icon: Send },
    { label: "Resource Vault", href: "/resources", icon: BookOpen },
    { label: "Campus Events", href: "/events", icon: Calendar },
    {
      label: "Notifications",
      href: "/notifications",
      icon: Bell,
      badge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : String(unreadCount)) : undefined
    },
    { label: "Profile", href: "/profile", icon: User },
    ...(user?.role === "ADMIN" || user?.role === "MODERATOR"
      ? [{ label: "Admin Panel", href: "/admin", icon: ShieldAlert, badge: "Admin" }]
      : [])
  ];

  return (
    <>
      {/* ── 1. Mobile Backdrop Blur ───────────────────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden cursor-pointer"
            aria-label="Close sidebar overlay"
          />
        )}
      </AnimatePresence>

      {/* ── 2. Sidebar Shell ──────────────────────────────────────────── */}
      <aside
        aria-label="StudyConnect Gemini Sidebar"
        aria-expanded={!isCollapsed}
        className={`h-screen flex flex-col justify-between select-none z-40 overflow-hidden
          bg-[#f0f4f9] dark:bg-[#131722]/95 backdrop-blur-2xl
          text-slate-700 dark:text-slate-300
          border-r border-slate-200/70 dark:border-slate-800/80
          fixed top-0 bottom-0 left-0 lg:relative shrink-0
          transition-[width,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] will-change-[width]
          ${isCollapsed ? "w-[68px]" : "w-[260px]"}
          ${isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}
          ${className}`}
      >
        {/* ── Top Header with Gemini-Style Hamburger & Brand ──────────── */}
        <div className="h-14 flex items-center px-3 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            {/* Hamburger Collapse Toggle Button */}
            <button
              onClick={toggleCollapse}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand menu" : "Collapse sidebar"}
              className="p-2 rounded-full hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
            >
              <Menu size={20} />
            </button>

            {/* Brand Logo & Name */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 overflow-hidden transition-all duration-200 whitespace-nowrap ${
                isCollapsed ? "opacity-0 w-0 pointer-events-none hidden" : "opacity-100 min-w-0"
              }`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/30">
                <Sparkles size={14} />
              </div>
              <div className="flex flex-col whitespace-nowrap">
                <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                  StudyConnect
                </span>
                <span className="text-[9px] font-bold tracking-wider text-[#1E90FF] uppercase -mt-0.5">
                  Gemini Campus OS
                </span>
              </div>
            </Link>
          </div>

          {/* Close drawer button on mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-full hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-500 shrink-0"
            aria-label="Close mobile sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── "New Chat" Gemini Pill Button ───────────────────────────── */}
        <div className="px-3 pt-2.5 pb-2 shrink-0">
          <div className="flex justify-center">
            <button
              onClick={handleNewChat}
              title={isCollapsed ? "New study session" : undefined}
              className={`flex items-center transition-all duration-200 cursor-pointer overflow-hidden ${
                isCollapsed
                  ? "w-10 h-10 justify-center rounded-full bg-slate-200/80 hover:bg-slate-300/80 dark:bg-[#1c2438] dark:hover:bg-[#25304a]"
                  : "w-full gap-3 px-4 py-2.5 rounded-full bg-slate-200/70 hover:bg-slate-200 dark:bg-[#1a233a] dark:hover:bg-[#232e4d]"
              } text-slate-800 dark:text-slate-100 shadow-sm`}
              aria-label="New study session"
            >
              <div className="flex items-center justify-center shrink-0 w-5 h-5 text-[#1E90FF]">
                <Plus size={18} />
              </div>
              <span
                className={`truncate text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                  isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100"
                }`}
              >
                New study session
              </span>
            </button>
          </div>
        </div>

        {/* ── Scrollable Body: Workspace Nav & Recents ────────────────── */}
        <div
          className={`flex-1 px-2 py-1 space-y-4 select-none no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            isCollapsed ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"
          }`}
        >
          {/* Primary Navigation Items */}
          <div className="space-y-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isDms = item.label === "Direct Messages";
              const isCircles = item.label === "Study Circles";
              const searchMode = new URLSearchParams(location.search).get("mode");

              let isActive = false;
              if (location.pathname === "/chat") {
                if (isDms) {
                  isActive = searchMode === "dms";
                } else if (isCircles) {
                  isActive = searchMode !== "dms";
                }
              } else {
                const basePath = item.href.split("?")[0];
                isActive =
                  location.pathname === basePath ||
                  (basePath !== "/dashboard" && location.pathname.startsWith(basePath));
              }

              return (
                <div key={item.href} className="flex justify-center">
                  <Link
                    to={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer overflow-hidden ${
                      isActive
                        ? "bg-[#1E90FF]/15 dark:bg-[#1E90FF]/25 text-[#1E90FF] font-bold shadow-sm"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.05]"
                    } ${
                      isCollapsed
                        ? "w-10 h-10 justify-center p-0"
                        : "w-full gap-3 px-3 py-2"
                    }`}
                  >
                    <div className="relative shrink-0 flex items-center justify-center">
                      <Icon
                        size={17}
                        className={`shrink-0 transition-transform group-hover:scale-105 ${
                          isActive
                            ? "text-[#1E90FF]"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      />
                      {isCollapsed && item.badge && (
                        <span className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-[#1E90FF] ring-2 ring-[#f0f4f9] dark:ring-[#131722]" />
                      )}
                    </div>

                    <div
                      className={`flex items-center justify-between min-w-0 transition-all duration-200 overflow-hidden whitespace-nowrap ${
                        isCollapsed ? "opacity-0 w-0 pointer-events-none hidden" : "opacity-100 flex-1"
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/25 tabular-nums">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* ── Gemini "Recent" Chat History Section ───────────────────── */}
          <div
            className={`space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 transition-all duration-200 overflow-hidden ${
              isCollapsed ? "opacity-0 max-h-0 pointer-events-none hidden" : "opacity-100 max-h-[800px]"
            }`}
          >
            <div className="flex items-center justify-between px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Recent</span>
              <span className="text-[9px] text-[#1E90FF] font-medium">Active Circles</span>
            </div>

            <div className="space-y-0.5">
              {recentSessions.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                  No recent study sessions
                </div>
              ) : (
                recentSessions.map((session) => {
                  const isActive = activeSessionId === session.id;
                  const isMenuOpen = menuOpenId === session.id;
                  const isEditing = editingSessionId === session.id;

                  return (
                    <div
                      key={session.id}
                      onClick={() => {
                        if (!isEditing) {
                          setActiveSessionId(session.id);
                          navigate(session.href);
                          setIsMobileOpen(false);
                        }
                      }}
                      className={`group relative flex items-center justify-between px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-colors ${
                        isActive
                          ? "bg-[#1E90FF]/15 text-[#1E90FF] font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MessageSquare
                          size={12}
                          className={`shrink-0 ${
                            isActive ? "text-[#1E90FF]" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                          }`}
                        />

                        {isEditing ? (
                          <input
                            type="text"
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(session.id);
                              if (e.key === "Escape") setEditingSessionId(null);
                            }}
                            onBlur={() => handleSaveRename(session.id)}
                            autoFocus
                            className="w-full bg-white dark:bg-slate-800 text-xs px-1.5 py-0.5 rounded border border-[#1E90FF] outline-none text-slate-800 dark:text-slate-100"
                          />
                        ) : (
                          <span className="truncate">{session.title}</span>
                        )}
                      </div>

                      {/* Context Menu Trigger */}
                      {!isEditing && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(isMenuOpen ? null : session.id);
                            }}
                            className={`p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-300/50 dark:hover:bg-white/10 transition-opacity ${
                              isMenuOpen ? "!opacity-100" : ""
                            }`}
                          >
                            <MoreVertical size={12} />
                          </button>

                          {/* Kebab Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSessionId(session.id);
                                  setEditTitleValue(session.title);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-left transition-colors"
                              >
                                <Pencil size={12} />
                                <span>Rename</span>
                              </button>

                              <button
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left transition-colors"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom Pinned Utility Area (Gemini Style) ───────────────── */}
        <div className="shrink-0 p-2.5 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1 bg-slate-100/40 dark:bg-[#0c0f17]/40 overflow-hidden">
          {/* Help & Support */}
          <div className="flex justify-center">
            <Link
              to="/help"
              title={isCollapsed ? "Help & FAQ" : undefined}
              className={`flex items-center rounded-full text-xs font-medium transition-all duration-200 cursor-pointer overflow-hidden ${
                location.pathname === "/help"
                  ? "bg-[#1E90FF]/15 dark:bg-[#1E90FF]/25 text-[#1E90FF] font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
              } ${
                isCollapsed
                  ? "w-10 h-10 justify-center p-0"
                  : "w-full gap-3 px-3 py-1.5"
              }`}
              aria-label="Help & FAQ"
            >
              <HelpCircle
                size={16}
                className={`shrink-0 ${location.pathname === "/help" ? "text-[#1E90FF]" : "text-slate-500"}`}
              />
              <span
                className={`truncate transition-all duration-200 whitespace-nowrap ${
                  isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100"
                }`}
              >
                Help & FAQ
              </span>
            </Link>
          </div>

          {/* Settings */}
          <div className="flex justify-center">
            <Link
              to="/settings"
              title={isCollapsed ? "Settings" : undefined}
              className={`flex items-center rounded-full text-xs font-medium transition-all duration-200 cursor-pointer overflow-hidden ${
                location.pathname === "/settings"
                  ? "bg-[#1E90FF]/15 dark:bg-[#1E90FF]/25 text-[#1E90FF] font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
              } ${
                isCollapsed
                  ? "w-10 h-10 justify-center p-0"
                  : "w-full gap-3 px-3 py-1.5"
              }`}
              aria-label="Settings"
            >
              <Settings
                size={16}
                className={`shrink-0 ${location.pathname === "/settings" ? "text-[#1E90FF]" : "text-slate-500"}`}
              />
              <span
                className={`truncate transition-all duration-200 whitespace-nowrap ${
                  isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100"
                }`}
              >
                Settings
              </span>
            </Link>
          </div>

          {/* Connected User Card (Direct Link to Profile) */}
          <div
            className={`flex items-center gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 transition-all duration-200 ${
              isCollapsed ? "justify-center px-0" : "px-2"
            }`}
          >
            <Link
              to="/profile"
              title={isCollapsed ? (user?.fullName || "Profile") : undefined}
              className="relative shrink-0 group cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E90FF] text-white font-bold text-xs shadow-sm overflow-hidden group-hover:ring-2 group-hover:ring-[#1E90FF]/40 transition-all">
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(user?.fullName)
                )}
              </div>
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white dark:border-[#0F1A30] bg-emerald-500" />
            </Link>

            <div
              className={`flex items-center justify-between flex-1 min-w-0 overflow-hidden transition-all duration-200 whitespace-nowrap ${
                isCollapsed ? "opacity-0 w-0 pointer-events-none hidden" : "opacity-100"
              }`}
            >
              <Link to="/profile" className="overflow-hidden pr-1 min-w-0 flex-1 hover:opacity-80 transition-opacity">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user?.fullName || "Student"}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  {user?.rollNumber || "Enrolled Scholar"}
                </p>
              </Link>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>

          {/* Gemini Subtle Location/Network Footer Tag */}
          <div
            className={`pt-1 px-2 text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 select-none font-medium transition-all duration-200 overflow-hidden whitespace-nowrap ${
              isCollapsed ? "opacity-0 max-h-0 hidden" : "opacity-100 max-h-6"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">From your verified IP • Campus Network</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default DashboardSidebar;
