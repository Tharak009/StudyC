import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  GraduationCap,
  ShieldCheck,
  Mail,
  MapPin,
  Clock,
  BookOpen,
  MessageCircle,
  FileText,
  Users,
  Bell,
  BellOff,
  Star,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Camera,
  Upload,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router";
import type { StudyCircle } from "./CircleSwitcher";
import type { ChatMember } from "./ChatMemberList";

export interface FacultyMentorInfo {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  officeLocation: string;
  officeHours: string;
  courseSubject: string;
  avatarGradient: string;
  bio?: string;
  isOnline?: boolean;
}

export interface TeachingAssistantInfo {
  id: string;
  name: string;
  roll: string;
  department: string;
  email: string;
  labHours: string;
  labLocation: string;
  responsibilities: string;
  isOnline?: boolean;
}

interface GroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  circle: StudyCircle;
  members: ChatMember[];
  onUpdateCircleAvatar?: (circleId: string, avatarUrl: string | undefined) => void;
}

// Real faculty & TA data for active circle (empty until assigned)
const facultyMembers: FacultyMentorInfo[] = [];
const teachingAssistants: TeachingAssistantInfo[] = [];

export function GroupInfoDrawer({
  isOpen,
  onClose,
  circle,
  members,
  onUpdateCircleAvatar
}: GroupInfoDrawerProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "faculty" | "members">("overview");
  const [memberSearch, setMemberSearch] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onUpdateCircleAvatar?.(circle.id, result);
    };
    reader.readAsDataURL(file);
  };

  const filteredMembers = members.filter((m) =>
    (m.name.toLowerCase().includes(memberSearch.toLowerCase().trim()) ||
    m.roll.toLowerCase().includes(memberSearch.toLowerCase().trim())) &&
    m.role !== "FACULTY"
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop on mobile/tablet */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 lg:hidden"
          />

          {/* WhatsApp-Style Slide-In Info Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 35 }}
            className="w-full sm:w-[420px] h-full border-l border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c1424] text-slate-800 dark:text-slate-200 flex flex-col shrink-0 z-40 shadow-2xl overflow-hidden"
          >
            {/* ── WhatsApp Drawer Header ───────────────────────────────── */}
            <div className="h-16 px-4 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between bg-slate-50/80 dark:bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Group Information
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  title={isMuted ? "Unmute notifications" : "Mute notifications"}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isMuted
                      ? "text-rose-500 bg-rose-500/10"
                      : "text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
                </button>
              </div>
            </div>

            {/* ── Drawer Scrollable Content ────────────────────────────── */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 p-4">
              {/* ── 1. Group Cover & Identity Card ─────────────────────── */}
              <div className="flex flex-col items-center text-center p-5 rounded-3xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.06]">
                {/* Group Avatar with Camera Hover Overlay */}
                <div className="relative group mb-3">
                  <div
                    className={`h-20 w-20 rounded-3xl bg-gradient-to-tr ${circle.gradient} text-white flex items-center justify-center text-3xl shadow-xl shadow-[#1E90FF]/20 overflow-hidden relative`}
                  >
                    {circle.avatarUrl ? (
                      <img
                        src={circle.avatarUrl}
                        alt={circle.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      circle.emoji
                    )}

                    {/* Camera Overlay on Hover */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload custom group photo"
                      className="absolute inset-0 bg-black/55 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
                    >
                      <Camera size={20} />
                      <span className="text-[10px] font-bold mt-1">Change</span>
                    </button>
                  </div>

                  {/* Quick Camera Action Badge on Corner */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload custom group photo"
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[#1E90FF] hover:bg-[#187bcd] text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#0c1424] transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Camera size={13} />
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />

                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {circle.name}
                </h4>

                <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                  <span className="text-xs tabular-nums text-slate-400">
                    {circle.dept} • {circle.memberCount} Verified Students
                  </span>
                </div>

                {/* Upload & Revert Photo Actions */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-bold text-[#1E90FF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Upload size={12} />
                    <span>{circle.avatarUrl ? "Change group photo" : "Upload custom photo"}</span>
                  </button>
                  {circle.avatarUrl && (
                    <>
                      <span className="text-slate-400 text-xs">•</span>
                      <button
                        type="button"
                        onClick={() => onUpdateCircleAvatar?.(circle.id, undefined)}
                        className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={11} />
                        <span>Remove photo</span>
                      </button>
                    </>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-xs">
                  Official campus academic circle. Multi-channel syllabus coordination, peer doubt clearance, and live study stages.
                </p>

                <div className="flex items-center gap-2 mt-4 w-full">
                  <button
                    type="button"
                    onClick={() => setActiveTab("faculty")}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 text-xs font-bold hover:bg-[#1E90FF]/15 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <GraduationCap size={14} />
                    <span>Faculty & Mentors</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/resources")}
                    className="py-2 px-3 rounded-xl bg-slate-200/60 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300/60 dark:hover:bg-white/[0.1] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen size={14} />
                    <span>Vault</span>
                  </button>
                </div>
              </div>

              {/* ── 2. Navigation Tabs (Overview | Faculty & Mentors | Members) ── */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200/80 dark:border-white/[0.06] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === "overview"
                      ? "bg-white dark:bg-[#162544] text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("faculty")}
                  className={`py-1.5 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTab === "faculty"
                      ? "bg-white dark:bg-[#162544] text-amber-500 dark:text-amber-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <GraduationCap size={13} />
                  <span>Faculty</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("members")}
                  className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === "members"
                      ? "bg-white dark:bg-[#162544] text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Peers ({members.length})
                </button>
              </div>

              {/* ── TAB CONTENT: FACULTY & MENTORS (Requested Feature) ── */}
              {activeTab === "faculty" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E90FF] flex items-center gap-1.5">
                      <GraduationCap size={14} />
                      Course Professors & Mentors
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      Verified Faculty
                    </span>
                  </div>

                  {facultyMembers.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 rounded-3xl bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 space-y-2">
                      <GraduationCap size={28} className="mx-auto text-slate-400 opacity-60" />
                      <h5 className="font-bold text-slate-800 dark:text-slate-200">No Faculty Mentors Assigned</h5>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Course coordinators and faculty mentors have not been assigned to this study circle yet.
                      </p>
                    </div>
                  ) : (
                    facultyMembers.map((fac) => (
                    <div
                      key={fac.id}
                      className="p-4 rounded-3xl bg-slate-50 dark:bg-black/30 border border-slate-200/60 dark:border-white/5 space-y-3.5 shadow-sm"
                    >
                      {/* Faculty Header Card */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-12 w-12 rounded-2xl bg-gradient-to-tr ${fac.avatarGradient} text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md`}
                        >
                          PR
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {fac.name}
                            </h5>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/20">
                              Faculty Mentor
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                            {fac.designation}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {fac.department}
                          </p>
                        </div>
                      </div>

                      {/* Bio / Guidance Note */}
                      {fac.bio && (
                        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                          "{fac.bio}"
                        </div>
                      )}

                      {/* Contact & Consultation Table */}
                      <div className="space-y-2 text-xs divide-y divide-slate-200/60 dark:divide-white/[0.05]">
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <BookOpen size={12} className="text-[#1E90FF]" />
                            Course Subject:
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate max-w-[200px]">
                            {fac.courseSubject}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 text-[11px]">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Clock size={12} className="text-emerald-500" />
                            Office Hours:
                          </span>
                          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400 text-right">
                            {fac.officeHours}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 text-[11px]">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <MapPin size={12} className="text-rose-500" />
                            Cabin Location:
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-right">
                            {fac.officeLocation}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 text-[11px]">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Mail size={12} className="text-[#1E90FF]" />
                            Official Email:
                          </span>
                          <a
                            href={`mailto:${fac.email}`}
                            className="font-medium text-[#1E90FF] hover:underline"
                          >
                            {fac.email}
                          </a>
                        </div>
                      </div>

                      {/* 1-Click Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <a
                          href={`mailto:${fac.email}`}
                          className="py-2 px-3 rounded-xl bg-slate-200/70 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-white/[0.1] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Mail size={13} />
                          <span>Send Email</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            navigate("/direct-messages");
                            onClose();
                          }}
                          className="py-2 px-3 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-sm shadow-[#1E90FF]/20 hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle size={13} />
                          <span>Direct Message</span>
                        </button>
                      </div>
                    </div>
                  ))
                  )}

                  {/* ── Teaching Assistants Section ──────────────────────── */}
                  {teachingAssistants.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <ShieldCheck size={14} />
                          Teaching Assistants (TAs)
                        </span>
                      </div>

                      {teachingAssistants.map((ta) => (
                        <div
                          key={ta.id}
                          className="p-4 rounded-3xl bg-slate-50 dark:bg-black/30 border border-emerald-500/25 space-y-3 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                              DS
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h5 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                  {ta.name}
                                </h5>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  {ta.roll}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {ta.department}
                              </p>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/15">
                            <span className="font-bold">Doubt Hours:</span> {ta.labHours} ({ta.labLocation})
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              navigate("/direct-messages");
                              onClose();
                            }}
                            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/20"
                          >
                            <MessageCircle size={13} />
                            <span>Message TA for Lab Help</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB CONTENT: OVERVIEW ────────────────────────────── */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Syllabus & Notes Locker */}
                  <div className="p-4 rounded-3xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.06] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <BookOpen size={14} className="text-[#1E90FF]" />
                        Official Subject Materials
                      </span>
                      <button
                        onClick={() => navigate("/resources")}
                        className="text-[11px] font-bold text-[#1E90FF] hover:underline flex items-center gap-0.5"
                      >
                        <span>View Vault</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.04] border border-dashed border-slate-300 dark:border-white/10 text-center space-y-1">
                      <FileText size={18} className="mx-auto text-slate-400 opacity-60" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Materials Uploaded Yet</p>
                      <p className="text-[10px] text-slate-400">Course materials and files shared in this circle will appear here.</p>
                    </div>
                  </div>

                  {/* Community Guidelines */}
                  <div className="p-4 rounded-3xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      Academic Integrity & Guidelines
                    </span>
                    <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 list-disc pl-4 leading-relaxed">
                      <li>Use respectful language; this circle is monitored by department faculty.</li>
                      <li>Sharing problem set solution logic is encouraged; sharing raw exam keys during active evaluations is prohibited.</li>
                      <li>Voice stages are recorded for student review.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* ── TAB CONTENT: PEERS & MEMBERS ────────────────────── */}
              {activeTab === "members" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search classmates by name or roll no..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E90FF]"
                    />
                  </div>

                  <div className="space-y-1">
                    {filteredMembers.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        No members found in this circle.
                      </div>
                    ) : (
                      filteredMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-[#1E90FF] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {m.name}
                              </span>
                              {m.role !== "STUDENT" && (
                                <span className="text-[9px] font-bold px-1 rounded bg-amber-500/10 text-amber-500">
                                  {m.role}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              {m.roll} • {m.dept}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            navigate("/direct-messages");
                            onClose();
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#1E90FF] hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                          title="Direct Message"
                        >
                          <MessageCircle size={13} />
                        </button>
                      </div>
                    ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default GroupInfoDrawer;
