import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  MessageCircle,
  MoreVertical,
  GraduationCap,
  Sparkles,
  UserCheck,
  X,
  Mail,
  Share2
} from "lucide-react";
import { useNavigate } from "react-router";

export interface ChatMember {
  id: string;
  name: string;
  roll: string;
  dept: string;
  role: "ADMIN" | "MODERATOR" | "FACULTY" | "TA" | "STUDENT";
  isOnline: boolean;
  avatar?: string;
  statusText?: string;
}

interface ChatMemberListProps {
  members: ChatMember[];
}

export function ChatMemberList({ members }: ChatMemberListProps) {
  const navigate = useNavigate();
  const [selectedMember, setSelectedMember] = useState<ChatMember | null>(null);

  const faculty = members.filter((m) => m.role === "FACULTY" || m.role === "ADMIN");
  const tas = members.filter((m) => m.role === "TA" || m.role === "MODERATOR");
  const onlineStudents = members.filter(
    (m) => m.isOnline && m.role === "STUDENT"
  );
  const offlineStudents = members.filter(
    (m) => !m.isOnline && m.role === "STUDENT"
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const renderMember = (m: ChatMember) => (
    <div
      key={m.id}
      onClick={() => setSelectedMember(m)}
      className="group flex items-center justify-between p-2 rounded-2xl hover:bg-slate-100/90 dark:hover:bg-[#162544]/60 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
        {/* Avatar with Status Dot */}
        <div className="relative shrink-0">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl text-white font-bold text-[11px] shadow-sm ${
              m.role === "TA" || m.role === "MODERATOR"
                ? "bg-gradient-to-tr from-emerald-500 to-teal-400"
                : "bg-[#1E90FF]"
            }`}
          >
            {getInitials(m.name)}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#0B1324] ${
              m.isOnline ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />
        </div>

        {/* Member Details */}
        <div className="flex flex-col overflow-hidden min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {m.name}
            </span>
            {(m.role === "FACULTY" || m.role === "ADMIN") && (
              <GraduationCap size={12} className="text-amber-500 shrink-0" />
            )}
            {(m.role === "TA" || m.role === "MODERATOR") && (
              <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
            )}
          </div>
          <span className="text-[10px] text-slate-400 tabular-nums truncate">
            {m.statusText ? m.statusText : `${m.roll} • ${m.dept}`}
          </span>
        </div>
      </div>

      {/* Quick Direct Message Shortcut */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/direct-messages`);
        }}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-[#1E90FF] hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
        title={`Message ${m.name}`}
      >
        <MessageCircle size={13} />
      </button>
    </div>
  );

  return (
    <aside className="w-60 h-full border-l border-slate-200/80 dark:border-white/[0.06] bg-white/90 dark:bg-[#0B1324]/90 backdrop-blur-xl p-3 shrink-0 overflow-y-auto no-scrollbar select-none space-y-4">
      {/* ── FACULTY & INSTRUCTORS ────────────────────────────────────── */}
      {faculty.length > 0 && (
        <div>
          <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <GraduationCap size={12} />
            <span>Faculty & Mentors ({faculty.length})</span>
          </div>
          <div className="space-y-0.5">{faculty.map(renderMember)}</div>
        </div>
      )}

      {/* ── TEACHING ASSISTANTS & MODERATORS ─────────────────────────── */}
      {tas.length > 0 && (
        <div>
          <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ShieldCheck size={12} />
            <span>Teaching Assistants ({tas.length})</span>
          </div>
          <div className="space-y-0.5">{tas.map(renderMember)}</div>
        </div>
      )}

      {/* ── ONLINE PEERS ─────────────────────────────────────────────── */}
      <div>
        <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span>Online Peers ({onlineStudents.length})</span>
        </div>
        <div className="space-y-0.5">{onlineStudents.map(renderMember)}</div>
      </div>

      {/* ── OFFLINE PEERS ────────────────────────────────────────────── */}
      {offlineStudents.length > 0 && (
        <div>
          <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Offline ({offlineStudents.length})
          </div>
          <div className="space-y-0.5 opacity-65">{offlineStudents.map(renderMember)}</div>
        </div>
      )}

      {/* ── Discord-Style Member Profile Card Modal ──────────────────── */}
      <AnimatePresence>
        {selectedMember && (
          <div
            onClick={() => setSelectedMember(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1322] shadow-2xl overflow-hidden"
            >
              {/* Top Banner */}
              <div className="h-20 bg-[#1E90FF] p-3 flex justify-end">
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-1 rounded-full bg-black/20 text-white hover:bg-black/40"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Profile Details */}
              <div className="p-4 -mt-10 space-y-3">
                <div className="flex items-end justify-between">
                  <div className="h-16 w-16 rounded-2xl bg-[#1E90FF] text-white flex items-center justify-center font-black text-xl shadow-lg ring-4 ring-white dark:ring-[#0c1322]">
                    {getInitials(selectedMember.name)}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedMember.isOnline
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-500/15 text-slate-500"
                    }`}
                  >
                    {selectedMember.isOnline ? "Active on Campus" : "Offline"}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    {selectedMember.name}
                    <ShieldCheck size={14} className="text-[#1E90FF]" />
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {selectedMember.roll} • {selectedMember.dept}
                  </p>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/[0.06] text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>Institutional Domain:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">@campus.edu</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>Campus Role:</span>
                    <span className="font-bold text-[#1E90FF]">
                      {selectedMember.role}
                    </span>
                  </div>
                </div>

                {/* Direct Action */}
                <button
                  type="button"
                  onClick={() => navigate(`/direct-messages`)}
                  className="w-full py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle size={14} />
                  <span>Send Direct Message</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}

export default ChatMemberList;
