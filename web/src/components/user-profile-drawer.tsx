import { X, Mail, BookOpen, GraduationCap, Calendar, ShieldCheck, UserCheck, ShieldAlert, Award } from "lucide-react";
import type { User } from "../types/auth";

interface UserProfileDrawerProps {
  user: User | null;
  onClose: () => void;
}

export function UserProfileDrawer({ user, onClose }: UserProfileDrawerProps) {
  if (!user) return null;

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ST";

  const statusColors = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-emerald-900/30",
    SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-450 dark:border-amber-900/30",
    DEACTIVATED: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-450 dark:border-rose-900/30",
  };

  const roleColors = {
    STUDENT: "bg-slate-100 text-slate-700 dark:bg-white/[0.04] dark:text-slate-350",
    ADMIN: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
    COMMUNITY_ADMIN: "bg-violet-50 text-violet-750 dark:bg-violet-500/10 dark:text-violet-400",
    MODERATOR: "bg-cyan-50 text-cyan-750 dark:bg-cyan-500/10 dark:text-cyan-400",
  };

  // Mock data for joined communities and events based on user info
  const joinedCommunities = [
    { name: "Java Coding Club", role: "Member" },
    { name: "Python Explorers", role: "Moderator" },
    { name: "Web Wizards", role: "Member" },
  ].slice(0, user.fullName.length % 2 === 0 ? 3 : 1);

  const eventsParticipated = [
    { title: "React Workshop 2026", date: "Feb 10, 2026" },
    { title: "Spring Boot BootCamp", date: "Mar 22, 2026" },
    { title: "AI Hackathon", date: "May 04, 2026" },
  ].slice(0, user.fullName.length % 2 === 0 ? 2 : 1);

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md transform bg-white p-6 shadow-2xl dark:bg-ink-900 transition-all duration-300 border-l border-slate-200 dark:border-white/5 flex flex-col justify-between h-full animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-150 pb-4 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Student Details
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-white/[0.04] dark:hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto py-5 space-y-6 scrollbar-thin">
            {/* Profile Brief Card */}
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-150/40 dark:border-white/5">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-lg font-bold text-white shadow-lg overflow-hidden">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.fullName} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                {user.fullName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Roll Number: {user.rollNumber}
              </p>

              {/* Status and Role badges */}
              <div className="mt-3 flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColors[user.status]}`}>
                  {user.status}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleColors[user.role]}`}>
                  {user.role}
                </span>
              </div>
            </div>

            {/* Core Info */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Information
              </h4>

              <div className="grid gap-3.5 text-xs">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-slate-400 dark:text-slate-550 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500">Email Address</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{user.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <BookOpen size={16} className="text-slate-400 dark:text-slate-550 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500">Department</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{user.department}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <GraduationCap size={16} className="text-slate-400 dark:text-slate-550 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500">Academic Year</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Year {user.academicYear}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-slate-400 dark:text-slate-550 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500">Registration Date</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <UserCheck size={16} className="text-slate-400 dark:text-slate-550 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500">Last Login Activity</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never logged in"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio summary */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Bio Summary
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed italic bg-slate-50/50 dark:bg-white/[0.01] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                "{user.bio || "This user has not set a profile bio summary statement."}"
              </p>
            </div>

            {/* Skills / Interests */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Academic Interests & Skills
              </h4>
              {user.interests.length === 0 ? (
                <span className="text-xs text-slate-400 dark:text-slate-500">No interests tagged.</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {user.interests.map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-indigo-50/50 border border-indigo-100/50 px-2.5 py-1 text-[11px] font-semibold text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-none"
                    >
                      #{skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Communities Joined */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Joined Communities ({joinedCommunities.length})
              </h4>
              <div className="space-y-2">
                {joinedCommunities.map((club, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-150 p-2.5 text-xs dark:border-white/5 bg-slate-50/40 dark:bg-white/[0.01]"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-indigo-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{club.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{club.role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Events Participated */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Campus Events ({eventsParticipated.length})
              </h4>
              <div className="space-y-2">
                {eventsParticipated.map((ev, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-150 p-2.5 text-xs dark:border-white/5 bg-slate-50/40 dark:bg-white/[0.01]"
                  >
                    <div className="flex items-center gap-2">
                      <Award size={14} className="text-cyan-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{ev.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{ev.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
