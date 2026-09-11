import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Sun,
  Moon,
  FolderPlus,
  Sparkles,
  Flame,
  MessageSquare,
  BookOpen,
  Users,
  ArrowRight,
  Clock,
  Download,
  FileText,
  FileCode,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Plus
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { ModernNotificationHub } from "../components/modern-notification-hub";
import { UniversalSearchMenu } from "../components/search/UniversalSearchMenu";
import { communitiesApi } from "../api/communities.api";
import { friendsApi } from "../api/friends.api";
import { useAuthStore } from "../store/auth.store";
import { useThemeStore } from "../store/theme.store";
import { useToastStore } from "../store/toast.store";
import { getStreakDisplay, recordStudyActivity, STREAK_EVENT } from "../utils/streak";

// ── Types & Dynamic LocalStorage Loaders ──────────────────────────────────────

interface CircleItem {
  id: string;
  name: string;
  dept?: string;
  emoji?: string;
  activeCount?: number;
  latestMsg?: string;
  href?: string;
}

interface VaultItem {
  id: string;
  title: string;
  uploader?: string;
  uploaderName?: string;
  dept?: string;
  department?: string;
  size?: string;
  fileSize?: string;
  downloads?: number;
  downloadCount?: number;
  type?: string;
  fileType?: string;
}

interface DeadlineItem {
  id: string;
  code?: string;
  subjectCode?: string;
  title: string;
  due?: string;
  dateStr?: string;
  urgency?: "urgent" | "warning" | "normal";
  daysLeft?: string;
  category?: string;
}

const loadCircles = (): CircleItem[] => {
  try {
    const raw = localStorage.getItem("studyconnect_user_circles");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((c: any) => ({
          id: c.id || String(Math.random()),
          name: c.name || "Study Circle",
          dept: c.dept || "General",
          emoji: c.emoji || "📚",
          activeCount: c.activeCount || c.members?.length || 1,
          latestMsg: c.latestMsg || c.description || "Active study room channel",
          href: "/chat"
        }))
      : [];
  } catch {
    return [];
  }
};

const loadVaultResources = (): VaultItem[] => {
  try {
    const raw = localStorage.getItem("studyconnect_vault_resources");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((r: any) => ({
          id: r.id || String(Math.random()),
          title: r.title || "Academic Document",
          uploader: r.uploaderName || r.uploader || "Campus Scholar",
          dept: r.department || r.dept || "Academic Vault",
          size: r.fileSize || r.size || "1.2 MB",
          downloads: r.downloadCount ?? r.downloads ?? 0,
          type:
            (r.fileType || r.type || "").toLowerCase().includes("code") ||
            (r.fileType || r.type || "").toLowerCase().includes("ipynb")
              ? "code"
              : "pdf"
        }))
      : [];
  } catch {
    return [];
  }
};

const loadUpcomingDeadlines = (): DeadlineItem[] => {
  try {
    const raw = localStorage.getItem("studyconnect_campus_events");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e: any) => e.category === "deadlines" || e.urgency === "urgent" || e.urgency === "warning")
      .map((e: any) => ({
        id: e.id || String(Math.random()),
        code: e.subjectCode || e.code || "ACAD",
        title: e.title || "Campus Deadline",
        due: e.dateStr ? `${e.dateStr} ${e.timeStr || ""}`.trim() : (e.due || "Upcoming"),
        urgency: e.urgency || "warning",
        daysLeft: e.daysLeft || "Upcoming",
        category: e.category || "deadlines"
      }));
  } catch {
    return [];
  }
};

const loadPeerCount = (): number => {
  try {
    const raw = localStorage.getItem("studyconnect_peer_directory");
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === "dark";
  const { addToast } = useToastStore();

  const [copilotPrompt, setCopilotPrompt] = useState("");

  // Dynamic state loaded from localStorage
  const [joinedCommunities, setJoinedCommunities] = useState<CircleItem[]>(() => loadCircles());
  const [recentResources, setRecentResources] = useState<VaultItem[]>(() => loadVaultResources());
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<DeadlineItem[]>(() => loadUpcomingDeadlines());
  const [peerCount, setPeerCount] = useState<number>(() => loadPeerCount());
  const [streakDisplay, setStreakDisplay] = useState(() => getStreakDisplay());

  // Record daily study activity on dashboard visit & re-sync with localStorage
  useEffect(() => {
    // Record study activity for today
    const actResult = recordStudyActivity();
    setStreakDisplay(getStreakDisplay());
    if (actResult.extended && actResult.streakCount > 1) {
      addToast(`Study Streak Extended! You're on a ${actResult.streakCount}-day study streak 🔥`, "success");
    }

    const syncData = () => {
      setJoinedCommunities(loadCircles());
      setRecentResources(loadVaultResources());
      setUpcomingDeadlines(loadUpcomingDeadlines());
      setPeerCount(loadPeerCount());
      setStreakDisplay(getStreakDisplay());
    };

    window.addEventListener("storage", syncData);
    window.addEventListener("focus", syncData);
    window.addEventListener(STREAK_EVENT, syncData);

    // Sync live circles & peer count from MongoDB Atlas
    communitiesApi
      .list({ limit: 20 })
      .then((res) => {
        if (res?.items?.length) {
          setJoinedCommunities(
            res.items.map((c) => ({
              id: c._id,
              name: c.name,
              dept: c.category || "General",
              emoji: "📚",
              activeCount: c.memberCount || 1,
              latestMsg: c.description || "Active study room channel",
              href: `/chat?circle=${c._id}`
            }))
          );
        }
      })
      .catch(() => {});

    friendsApi
      .getFriends()
      .then((friendsList) => {
        if (Array.isArray(friendsList)) {
          setPeerCount(friendsList.length);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("storage", syncData);
      window.removeEventListener("focus", syncData);
      window.removeEventListener(STREAK_EVENT, syncData);
    };
  }, []);

  const handleCopilotQuickAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotPrompt.trim()) return;
    addToast(`AI Copilot processing: "${copilotPrompt}"`, "info");
    setCopilotPrompt("");
  };

  const studentName = user?.fullName || "Student";
  const studentRoll = user?.rollNumber || "Enrolled Scholar";
  const studentDept = user?.department || "Academic Department";
  const urgentDeadlinesCount = upcomingDeadlines.filter((d) => d.urgency === "urgent").length;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      {/* ── Left Sticky Collapsible Sidebar ───────────────────────────── */}
      <DashboardSidebar />

      {/* ── Main Scrollable Dashboard Content ─────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* ── Top Header Bar ──────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 h-16 shrink-0 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/85 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between gap-4">
          
          {/* Universal Search Menu */}
          <UniversalSearchMenu />

          {/* Top Actions */}
          <div className="flex items-center gap-3">
            {/* Upload Note Action Button */}
            <Link to="/resources">
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="hidden sm:inline-flex items-center gap-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(30,144,255,0.35)] hover:shadow-[0_0_25px_rgba(30,144,255,0.45)] transition-all cursor-pointer"
              >
                <FolderPlus size={14} />
                <span>Upload Note</span>
              </motion.button>
            </Link>

            {/* Modern Campus Notification Hub */}
            <ModernNotificationHub />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            >
              {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-700" />}
            </button>
          </div>
        </header>

        {/* ── Dashboard Body Feed ──────────────────────────────────────── */}
        <main className="p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
          
          {/* ── 1. Personalized Welcome Banner ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-3xl border border-[#1E90FF]/30 dark:border-[#1E90FF]/25 bg-gradient-to-r from-white via-[#1E90FF]/5 to-white dark:from-[#0F1A30] dark:via-[#162544] dark:to-[#0F1A30] p-6 sm:p-8 shadow-xl"
          >
            {/* Ambient Radial Aura */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#1E90FF]/15 dark:bg-[#1E90FF]/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-1/3 h-40 w-40 rounded-full bg-[#1E90FF]/10 blur-2xl" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                {/* Academic Identity Pill */}
                <div className="inline-flex items-center gap-2 rounded-full border border-[#1E90FF]/30 dark:border-[#1E90FF]/30 bg-[#1E90FF]/10 px-3 py-1 text-xs font-bold text-[#1E90FF] mb-3">
                  <Sparkles size={12} />
                  <span>{studentDept} • {studentRoll}</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                  Welcome back, {studentName} 👋
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                  {urgentDeadlinesCount > 0 && joinedCommunities.length > 0 ? (
                    <>
                      You have <strong className="text-rose-500">{urgentDeadlinesCount} urgent deadline{urgentDeadlinesCount > 1 ? "s" : ""}</strong> pending and <strong className="text-[#1E90FF]">{joinedCommunities.length} study room{joinedCommunities.length > 1 ? "s" : ""}</strong> active in your batch.
                    </>
                  ) : urgentDeadlinesCount > 0 ? (
                    <>
                      You have <strong className="text-rose-500">{urgentDeadlinesCount} urgent deadline{urgentDeadlinesCount > 1 ? "s" : ""}</strong> scheduled for submission.
                    </>
                  ) : joinedCommunities.length > 0 ? (
                    <>
                      You have <strong className="text-[#1E90FF]">{joinedCommunities.length} study room{joinedCommunities.length > 1 ? "s" : ""}</strong> actively collaborating in your department.
                    </>
                  ) : (
                    "Welcome to your campus workspace. Join study circles, share course handouts, and organize semester deadlines."
                  )}
                </p>
              </div>

              {/* Quick Jump Action */}
              <div className="flex items-center gap-3 shrink-0">
                <Link to="/chat">
                  <motion.button
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] px-5 py-3 text-xs font-bold text-white shadow-[0_0_20px_rgba(30,144,255,0.35)] hover:shadow-[0_0_25px_rgba(30,144,255,0.45)] transition-all cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>Enter Study Rooms</span>
                    <ArrowRight size={14} />
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ── 2. 4 KPI Metric Cards Grid ─────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Study Streak */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              whileHover={{ y: -3 }}
              onClick={() => navigate("/profile")}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 p-5 backdrop-blur-xl shadow-md cursor-pointer group"
              title={`Consecutive study days: ${streakDisplay.count}. Click to view academic milestones.`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/25 group-hover:scale-110 transition-transform">
                  <Flame size={18} className={streakDisplay.isActiveToday ? "animate-pulse" : ""} />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  {streakDisplay.isActiveToday && (
                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                  🔥 Streak
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                {streakDisplay.text}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {streakDisplay.subtitle}
              </div>
            </motion.div>

            {/* Card 2: Active Rooms */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              whileHover={{ y: -3 }}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 p-5 backdrop-blur-xl shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/25">
                  <MessageSquare size={18} />
                </div>
                <span className="text-[10px] font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded-full">
                  {joinedCommunities.length > 0 ? `● ${joinedCommunities.length} Active` : "None active"}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                {joinedCommunities.length} Joined
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Subject Channels</div>
            </motion.div>

            {/* Card 3: Shared Vault Files */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              whileHover={{ y: -3 }}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 p-5 backdrop-blur-xl shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/25">
                  <BookOpen size={18} />
                </div>
                <span className="text-[10px] font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded-full">
                  Vault
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                {recentResources.length} Upload{recentResources.length === 1 ? "" : "s"}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Notes & Notebooks</div>
            </motion.div>

            {/* Card 4: Classmates Network */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              whileHover={{ y: -3 }}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 p-5 backdrop-blur-xl shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                  <Users size={18} />
                </div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                {peerCount} Peer{peerCount === 1 ? "" : "s"}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Batch Connections</div>
            </motion.div>
          </div>

          {/* ── 3. Main 2-Column Responsive Feed ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* ── LEFT COLUMN: Main Feed (8 cols) ─────────────────────── */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Section: My Joined Study Circles */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#1E90FF]" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                      My Joined Study Circles
                    </h3>
                  </div>
                  <Link to="/chat" className="text-xs font-bold text-[#1E90FF] hover:underline flex items-center gap-1">
                    <span>View all rooms</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>

                {joinedCommunities.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#0F1A30]/50 p-8 text-center backdrop-blur-xl">
                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF] mb-3">
                      <MessageSquare size={22} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                      No Joined Study Circles Yet
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
                      Collaborate with classmates from your department in real-time voice stages, code channels, and study groups.
                    </p>
                    <Link
                      to="/chat"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#1E90FF]/25 transition-all"
                    >
                      <Plus size={14} />
                      <span>Explore & Join Circles</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {joinedCommunities.slice(0, 3).map((c) => (
                      <motion.div
                        key={c.id}
                        whileHover={{ y: -3 }}
                        className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 p-5 backdrop-blur-xl shadow-md flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl">{c.emoji || "📚"}</span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {c.activeCount || 1} active
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                            {c.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {c.latestMsg || "Active study circle"}
                          </p>
                        </div>

                        <Link
                          to={c.href || "/chat"}
                          className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold text-[#1E90FF] hover:underline"
                        >
                          <span>Open Channel</span>
                          <ArrowRight size={13} />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section: Recent Resource Drop Feed */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#1E90FF]" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                      Recent Resource Drops
                    </h3>
                  </div>
                  <Link to="/resources" className="text-xs font-bold text-[#1E90FF] hover:underline flex items-center gap-1">
                    <span>Browse Vault</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>

                {recentResources.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#0F1A30]/50 p-8 text-center backdrop-blur-xl">
                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF] mb-3">
                      <BookOpen size={22} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                      No Study Resources Shared Yet
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
                      Upload lecture notes, problem sets, or cheatsheets to share with your peers in the Resource Vault.
                    </p>
                    <Link
                      to="/resources"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#1E90FF]/25 transition-all"
                    >
                      <FolderPlus size={14} />
                      <span>Upload First Note</span>
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 p-5 backdrop-blur-xl shadow-md divide-y divide-slate-200/80 dark:divide-slate-800/60">
                    {recentResources.slice(0, 4).map((res) => (
                      <div
                        key={res.id}
                        className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20">
                            {res.type === "pdf" ? <FileText size={18} /> : <FileCode size={18} />}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-[#1E90FF] transition-colors cursor-pointer">
                              {res.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>Uploaded by {res.uploader}</span>
                              <span>•</span>
                              <span>{res.size}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Download size={10} /> {res.downloads || 0} downloads
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <Link
                            to="/resources"
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1E90FF] transition-colors"
                          >
                            Preview
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* ── RIGHT COLUMN: Academic Hub & Deadlines (4 cols) ───────── */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Upcoming Campus Deadlines */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 p-6 backdrop-blur-xl shadow-md">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#1E90FF]" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Upcoming Deadlines
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                    {urgentDeadlinesCount > 0 ? `${urgentDeadlinesCount} Urgent` : "Schedule"}
                  </span>
                </div>

                {upcomingDeadlines.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#080D1A]/50">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                      All Caught Up!
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                      No pending assignment or exam deadlines scheduled.
                    </p>
                    <Link
                      to="/events"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E90FF] hover:underline"
                    >
                      <span>+ Add Campus Event</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingDeadlines.slice(0, 4).map((d) => (
                      <div
                        key={d.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          d.urgency === "urgent"
                            ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-500/10"
                            : d.urgency === "warning"
                            ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10"
                            : "border-[#1E90FF]/30 bg-[#1E90FF]/5 dark:bg-[#1E90FF]/10"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 tabular-nums">
                            {d.code || "ACAD"}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              d.urgency === "urgent"
                                ? "text-rose-500"
                                : d.urgency === "warning"
                                ? "text-amber-500"
                                : "text-[#1E90FF]"
                            }`}
                          >
                            {d.daysLeft || "Scheduled"}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {d.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Due: {d.due}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick AI Study Copilot Card */}
              <div className="rounded-3xl border border-[#1E90FF]/30 dark:border-[#1E90FF]/20 bg-gradient-to-br from-[#1E90FF]/10 via-[#1E90FF]/5 to-transparent p-6 shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#1E90FF] text-white shadow-[0_0_15px_rgba(30,144,255,0.35)]">
                    <Bot size={15} />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Quick AI Copilot
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Ask questions bound directly to your course syllabus and professor handouts.
                </p>

                <form onSubmit={handleCopilotQuickAsk} className="space-y-2">
                  <input
                    type="text"
                    placeholder="e.g. Solve Question 3 from Lab 4..."
                    value={copilotPrompt}
                    onChange={(e) => setCopilotPrompt(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] focus:ring-1 focus:ring-[#1E90FF]"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-[0_0_15px_rgba(30,144,255,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={12} />
                    <span>Ask Study Copilot</span>
                  </button>
                </form>
              </div>

            </div>

          </div>

        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
