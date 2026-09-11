import React from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  MessageSquare,
  Award,
  Clock,
  ThumbsUp,
  Flame,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Link } from "react-router";
import { getStreakDisplay, STREAK_EVENT } from "../../utils/streak";

function loadEnrolledCircles(): any[] {
  try {
    const raw = localStorage.getItem("studyconnect_user_circles");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((c: any) => ({
      code: c.subjectCode || (c.name ? c.name.slice(0, 5).toUpperCase().replace(/\s/g, "") : "CIR101"),
      title: c.name,
      instructor: c.faculty || "Study Circle Mentor",
      credits: c.credits || 4,
      chatRoom: "/chat",
      progress: 75
    }));
  } catch {
    return [];
  }
}

function loadVaultStats() {
  try {
    const raw = localStorage.getItem("studyconnect_vault_resources");
    if (!raw) return { count: 0, downloads: 0 };
    const parsed = JSON.parse(raw);
    const downloads = parsed.reduce((sum: number, r: any) => sum + (r.downloadCount || 0), 0);
    return { count: parsed.length, downloads };
  } catch {
    return { count: 0, downloads: 0 };
  }
}

export function OverviewTab() {
  const [enrolledCourses] = React.useState<any[]>(loadEnrolledCircles);
  const [vaultStats] = React.useState(loadVaultStats);
  const [streak, setStreak] = React.useState(() => getStreakDisplay());

  React.useEffect(() => {
    const handleSync = () => setStreak(getStreakDisplay());
    window.addEventListener(STREAK_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(STREAK_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const achievements = [
    {
      id: "ach-1",
      title: "Active Vault Contributor",
      desc: vaultStats.count > 0 ? `Uploaded ${vaultStats.count} verified study materials.` : "Contribute notes to unlock contributor recognition.",
      icon: Sparkles,
      color: "bg-[#1E90FF]"
    },
    {
      id: "ach-2",
      title: "Study Collaboration Pioneer",
      desc: streak.count >= 3 ? `${streak.count}-day study streak achieved! 🔥` : "Maintain a 3-day study streak to unlock.",
      icon: Flame,
      color: streak.count >= 3 ? "bg-amber-500" : "bg-slate-400 dark:bg-slate-700"
    },
    {
      id: "ach-3",
      title: "Peer Scholar",
      desc: "Actively exchanging verified academic materials.",
      icon: Award,
      color: "bg-emerald-600"
    }
  ];

  return (
    <div className="space-y-8">
      
      {/* ── Active Enrolled Courses ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#1E90FF]" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Active Enrolled Study Circles
            </h3>
          </div>
          <span className="text-xs font-bold tabular-nums text-slate-400">
            {enrolledCourses.length} Circles Active
          </span>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="p-8 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 mb-2.5">
              <BookOpen size={22} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              No Enrolled Study Circles Yet
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              Join your course channels and peer study rooms to track your academic progress and discussion threads.
            </p>
            <Link
              to="/chat"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-xs font-bold text-white shadow-md shadow-[#1E90FF]/25 cursor-pointer"
            >
              <MessageSquare size={14} />
              <span>Explore Study Circles</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrolledCourses.map((course) => (
              <motion.div
                key={course.code}
                whileHover={{ y: -3 }}
                className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20">
                      {course.code}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {course.credits} Credits
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {course.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Instructor: {course.instructor}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] tabular-nums text-slate-400 mb-1">
                    <span>Active Engagement</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {course.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-[#080D1A] overflow-hidden mb-3">
                    <div
                      style={{ width: `${course.progress}%` }}
                      className="h-full bg-[#1E90FF]"
                    />
                  </div>

                  <Link
                    to={course.chatRoom}
                    className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800/60 text-xs font-bold text-[#1E90FF] hover:underline"
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageSquare size={13} />
                      <span>Open Study Room</span>
                    </span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Weekly Collaboration Stats & Milestones ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Collaboration Breakdown (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-[#1E90FF]" />
            <span>Academic Collaboration Metrics</span>
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#080D1A]/50">
              <span className="text-[11px] text-slate-400 font-medium">Study Sessions</span>
              <div className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {enrolledCourses.length > 0 ? `${enrolledCourses.length * 3} hrs` : "0 hrs"}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                Active student
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#080D1A]/50">
              <span className="text-[11px] text-slate-400 font-medium">Notes Shared</span>
              <div className="text-xl font-extrabold tabular-nums text-[#1E90FF] mt-1">
                {vaultStats.count} Docs
              </div>
              <span className="text-[10px] text-[#1E90FF]/80 mt-0.5 block tabular-nums">
                {vaultStats.downloads} downloads
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#080D1A]/50">
              <span className="text-[11px] text-slate-400 font-medium">Study Streak</span>
              <div className="text-xl font-extrabold tabular-nums text-amber-500 mt-1 flex items-center gap-1.5">
                <span>{streak.badge}</span>
                {streak.isActiveToday && <span className="size-2 rounded-full bg-amber-500 animate-pulse" />}
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 block tabular-nums">
                {streak.subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Academic Achievements & Badges (1 col) */}
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-3">
            <Award size={16} className="text-[#1E90FF]" />
            <span>Academic Milestones</span>
          </h3>

          {achievements.map((ach) => {
            const Icon = ach.icon;
            return (
              <div
                key={ach.id}
                className="p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/60 dark:bg-[#080D1A]/60 flex items-start gap-3"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${ach.color} text-white shrink-0 shadow-sm`}
                >
                  <Icon size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {ach.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    {ach.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}

export default OverviewTab;
