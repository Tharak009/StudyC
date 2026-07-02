import { Bell, BookOpen, ChevronRight, MessageCircle, MessagesSquare, ShieldCheck, Video, Megaphone, Download, AlertOctagon, X, Eye, Calendar, User, Users, Plus, ArrowRight, Award, Compass, GraduationCap } from "lucide-react";
import { Link } from "react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "../components/avatar";
import { useAuthStore } from "../store/auth.store";
import { useAnnouncementStore } from "../store/announcement.store";
import { useStudentDashboard } from "../hooks/use-student-dashboard";
import { communitiesApi } from "../api/communities.api";
import type { Announcement } from "../types/announcement";

const MOCK_MESSAGES = [
  { id: "msg-1", sender: "Aarav Sharma", preview: "Are we meeting today for the group project?", time: "10m ago" },
  { id: "msg-2", sender: "Meera Patel", preview: "I shared the notes in the Java community.", time: "1h ago" },
  { id: "msg-3", sender: "Kabir Mehta", preview: "Thanks for the workshop details!", time: "4h ago" }
];

const MOCK_EVENTS = [
  { id: "evt-1", title: "National Coding Challenge 2026", date: "2026-07-10", time: "09:00", category: "Hackathon", venue: "Main Auditorium" },
  { id: "evt-2", title: "AI & ML Technical Seminar", date: "2026-06-30", time: "14:00", category: "Seminar", venue: "Seminar Hall B" }
];

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)!;
  const firstName = user.fullName.split(" ")[0];

  const { announcements, incrementViews } = useAnnouncementStore();
  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);

  const { data: dashData, isLoading: isDashLoading } = useStudentDashboard();

  const { data: communitiesData } = useQuery({
    queryKey: ["communities-dashboard-rec"],
    queryFn: () => communitiesApi.list({ page: 1, limit: 12 })
  });

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const studentAnnouncements = useMemo(() => {
    return announcements
      .filter((ann) => {
        if (ann.status !== "PUBLISHED") return false;
        if (ann.targetAudience === "ENTIRE_COLLEGE") return true;
        if (ann.targetAudience === "DEPARTMENT" && ann.targetDepartment === user.department) return true;
        if (ann.targetAudience === "ACADEMIC_YEAR" && ann.targetAcademicYear === user.academicYear) return true;
        return false;
      })
      .sort((a, b) => {
        const aCritical = a.priority === "CRITICAL" ? 1 : 0;
        const bCritical = b.priority === "CRITICAL" ? 1 : 0;
        if (aCritical !== bCritical) return bCritical - aCritical;
        return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
      });
  }, [announcements, user]);

  const recommendedCommunities = useMemo(() => {
    if (!communitiesData) return [];
    return communitiesData.items
      .filter((c) => !c.isMember)
      .slice(0, 3);
  }, [communitiesData]);

  const stats = dashData?.stats ?? {
    communitiesJoined: 0,
    upcomingEvents: 0,
    unreadMessages: 0,
    unreadNotifications: 0,
    projectsShared: 0
  };

  const profileCompletion = dashData?.profileCompletion ?? 0;

  return (
    <div className="animate-fade-up space-y-8">
      {/* Welcome & Profile Summary Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-ink-900 md:p-8">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -mb-20 size-80 rounded-full bg-violet-500/5 blur-3xl" />

        <div className="relative flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
            <Avatar name={user.fullName} src={user.profilePicture} className="size-20 ring-4 ring-indigo-50 dark:ring-indigo-950/40" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                Welcome back
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white sm:text-4xl">
                {greeting}, {firstName}!
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <span className="inline-flex items-center gap-1 text-indigo-650 dark:text-indigo-400 font-semibold">
                  <GraduationCap size={15} /> {user.department}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>Year {user.academicYear} Student</span>
              </p>
            </div>
          </div>

          {/* Profile Completion Dial */}
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-50/50 p-4 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5">
            <div className="relative flex size-16 items-center justify-center">
              <svg className="absolute size-full -rotate-90">
                <circle cx="32" cy="32" r="28" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="4" fill="transparent" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  className="stroke-indigo-600 dark:stroke-indigo-500 transition-all duration-500"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={175.9}
                  strokeDashoffset={175.9 - (175.9 * profileCompletion) / 100}
                />
              </svg>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">{profileCompletion}%</span>
            </div>
            <div className="text-center">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-350">Profile Completion</span>
              <Link to="/profile" className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-0.5 mt-0.5">
                Complete now <ChevronRight size={10} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Action Shortcuts */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link to="/communities" className="flex items-center gap-3 rounded-2xl border border-slate-250 bg-white p-4 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm dark:border-white/5 dark:bg-ink-900 dark:text-slate-300 dark:hover:bg-white/[0.02] dark:hover:text-white transition-all duration-200">
          <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Compass size={18} />
          </span>
          <span className="text-xs font-bold leading-none">Join Community</span>
        </Link>
        <Link to="/communities" className="flex items-center gap-3 rounded-2xl border border-slate-250 bg-white p-4 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm dark:border-white/5 dark:bg-ink-900 dark:text-slate-300 dark:hover:bg-white/[0.02] dark:hover:text-white transition-all duration-200">
          <span className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-650 dark:bg-violet-500/10 dark:text-violet-400">
            <Calendar size={18} />
          </span>
          <span className="text-xs font-bold leading-none">Browse Events</span>
        </Link>
        <Link to="/direct-messages" className="flex items-center gap-3 rounded-2xl border border-slate-250 bg-white p-4 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm dark:border-white/5 dark:bg-ink-900 dark:text-slate-300 dark:hover:bg-white/[0.02] dark:hover:text-white transition-all duration-200">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-650 dark:bg-emerald-500/10 dark:text-emerald-400">
            <MessagesSquare size={18} />
          </span>
          <span className="text-xs font-bold leading-none">Open Messages</span>
        </Link>
        <Link to="/profile" className="flex items-center gap-3 rounded-2xl border border-slate-250 bg-white p-4 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm dark:border-white/5 dark:bg-ink-900 dark:text-slate-300 dark:hover:bg-white/[0.02] dark:hover:text-white transition-all duration-200">
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <User size={18} />
          </span>
          <span className="text-xs font-bold leading-none">View Profile</span>
        </Link>
      </section>

      {/* Quick Statistics Cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Joined</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{stats.communitiesJoined}</span>
            <span className="text-slate-400"><Users size={16} /></span>
          </div>
          <span className="mt-1 block text-[10px] text-slate-500">Communities Joined</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Events</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{stats.upcomingEvents}</span>
            <span className="text-slate-400"><Calendar size={16} /></span>
          </div>
          <span className="mt-1 block text-[10px] text-slate-500">Upcoming Events</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Chats</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{stats.unreadMessages}</span>
            <span className="text-slate-400"><MessageCircle size={16} /></span>
          </div>
          <span className="mt-1 block text-[10px] text-slate-500">Unread Messages</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Alerts</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{stats.unreadNotifications}</span>
            <span className="text-slate-400"><Bell size={16} /></span>
          </div>
          <span className="mt-1 block text-[10px] text-slate-500">Notifications</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Shared</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{stats.projectsShared}</span>
            <span className="text-slate-400"><BookOpen size={16} /></span>
          </div>
          <span className="mt-1 block text-[10px] text-slate-500">Projects Shared</span>
        </div>
      </section>

      {/* Main Grid Content */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        
        {/* Left main pane */}
        <div className="space-y-8">
          
          {/* Announcements Feed */}
          {studentAnnouncements.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Campus Announcements
                  </h2>
                </div>
              </div>
              <div className="grid gap-3">
                {studentAnnouncements.map((ann) => {
                  const isCritical = ann.priority === "CRITICAL";
                  return (
                    <div
                      key={ann._id}
                      onClick={() => {
                        setSelectedAnn(ann);
                        incrementViews(ann._id);
                      }}
                      className={`group relative rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:shadow cursor-pointer ${
                        isCritical
                          ? "bg-rose-50/40 border-rose-250 dark:bg-rose-950/15 dark:border-rose-900/30 hover:border-rose-350"
                          : "bg-white border-slate-200 dark:bg-ink-900 dark:border-white/5 hover:border-slate-350"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`rounded px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider ${
                              isCritical
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                                : "bg-indigo-50 text-indigo-750 dark:bg-white/5 dark:text-indigo-400"
                            }`}>
                              {ann.category}
                            </span>
                            {isCritical && (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-600 px-1.5 py-0.2 text-[8px] font-bold text-white uppercase tracking-wider animate-pulse">
                                <AlertOctagon size={8} /> Urgent
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-slate-450 dark:text-slate-500">
                              {new Date(ann.publishDate).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className={`font-bold text-sm tracking-tight group-hover:text-indigo-650 transition-colors ${
                            isCritical ? "text-rose-900 dark:text-rose-455" : "text-slate-900 dark:text-white"
                          }`}>
                            {ann.title}
                          </h3>
                          <div
                            className="mt-1 text-xs text-slate-550 dark:text-slate-400 line-clamp-1 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: ann.content }}
                          />
                        </div>
                        <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition-transform mt-5 shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming Registered Events */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Your Upcoming Events
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {MOCK_EVENTS.map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900 flex flex-col justify-between gap-4">
                  <div className="min-w-0">
                    <span className="inline-block rounded bg-indigo-50 px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider text-indigo-750 dark:bg-white/5 dark:text-indigo-400 mb-2">
                      {event.category}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{event.title}</h3>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">Venue: {event.venue}</p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase">
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                    <span>{event.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Communities */}
          {recommendedCommunities.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Recommended Communities
                  </h2>
                </div>
                <Link to="/communities" className="text-xs font-bold text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-0.5">
                  Browse all <ArrowRight size={13} />
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {recommendedCommunities.map((c) => (
                  <div key={c._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900 flex flex-col justify-between h-40">
                    <div className="min-w-0">
                      <span className="inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider text-slate-600 dark:bg-white/5 dark:text-slate-400 mb-2">
                        {c.category}
                      </span>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate">{c.name}</h3>
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{c.description}</p>
                    </div>
                    <Link to={`/communities/${c._id}`} className="mt-3 block text-center rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] py-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-slate-150 dark:border-white/5">
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar pane */}
        <aside className="space-y-6">
          
          {/* Recent Messages */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-white/5">
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Recent Chats
              </h2>
              <Link to="/direct-messages" className="text-[10px] font-bold text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                View Box
              </Link>
            </div>
            <div className="space-y-3">
              {MOCK_MESSAGES.map((msg) => (
                <Link to="/direct-messages" key={msg.id} className="flex items-start gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                  <Avatar name={msg.sender} className="size-8 text-[10px] ring-2 ring-indigo-50 dark:ring-indigo-950/20" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate group-hover:text-indigo-650 transition-colors">{msg.sender}</span>
                      <span className="text-[9px] text-slate-400 shrink-0">{msg.time}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-550 dark:text-slate-450 truncate leading-normal">{msg.preview}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Recent Activity Timeline */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4 dark:border-white/5">
              Activity History
            </h2>
            <div className="space-y-4">
              {dashData?.recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-3 relative">
                  <div className="flex flex-col items-center shrink-0">
                    <span className="z-10 flex size-2.5 items-center justify-center rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    <span className="absolute bottom-0 top-2.5 w-0.5 bg-slate-100 dark:bg-slate-800" />
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <p className="text-[11px] text-slate-650 dark:text-slate-350 leading-relaxed">{activity.content}</p>
                    <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">{activity.timestamp}</span>
                  </div>
                </div>
              ))}
              {(!dashData?.recentActivity || dashData.recentActivity.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4">No recent activities logged</p>
              )}
            </div>
          </section>

        </aside>
      </div>

      {/* Expanded Student Announcement Overlay Modal */}
      {selectedAnn && (
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4 bg-slate-950/20 backdrop-blur-[2px]">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedAnn(null)}
          />
          <div className="relative my-8 w-full max-w-xl transform rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/5 dark:bg-ink-900 overflow-hidden animate-scale-up">
            {/* Colored Header Banner */}
            <div className={`h-24 bg-gradient-to-tr ${
              selectedAnn.category === "EMERGENCY"
                ? "from-rose-500 to-red-600"
                : selectedAnn.category === "PLACEMENT"
                ? "from-amber-500 to-orange-600"
                : selectedAnn.category === "ACADEMIC"
                ? "from-blue-500 to-indigo-600"
                : selectedAnn.category === "EVENTS"
                ? "from-emerald-500 to-teal-600"
                : selectedAnn.category === "CLUBS"
                ? "from-violet-500 to-purple-600"
                : "from-slate-500 to-slate-700"
            } p-5 flex items-end relative`}>
              <button
                onClick={() => setSelectedAnn(null)}
                className="absolute right-4 top-4 rounded-full bg-black/25 p-1.5 text-white hover:bg-black/45 transition cursor-pointer"
              >
                <X size={16} />
              </button>
              <span className="rounded bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white border border-white/10 backdrop-blur-sm">
                {selectedAnn.category} Announcement
              </span>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                {selectedAnn.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 pb-3 dark:border-white/5">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Published: {new Date(selectedAnn.publishDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User size={12} />
                  <span>By: {selectedAnn.createdBy}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye size={12} />
                  <span>{selectedAnn.viewsCount + 1} views</span>
                </div>
              </div>

              {/* HTML Description Body */}
              <div
                className="prose prose-sm text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-line space-y-2 dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: selectedAnn.content }}
              />

              {/* Attachments */}
              {selectedAnn.attachments && selectedAnn.attachments.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-white/5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Downloadable Attachments
                  </span>
                  <div className="space-y-1.5">
                    {selectedAnn.attachments.map((attach, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl bg-slate-50 border p-3 dark:bg-black/15 dark:border-white/5 text-xs text-slate-700"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen size={14} className="text-indigo-650 shrink-0" />
                          <span className="truncate flex-1 font-semibold dark:text-slate-350">{attach.name}</span>
                        </div>
                        <button className="flex size-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/5 text-slate-550 hover:bg-slate-100 cursor-pointer">
                          <Download size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer close button */}
            <div className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-ink-950 flex justify-end">
              <button
                onClick={() => setSelectedAnn(null)}
                className="rounded-xl border border-slate-250 bg-white hover:bg-slate-100 px-5 py-2 text-xs font-bold text-slate-750 cursor-pointer shadow-sm"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
