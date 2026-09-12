import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShieldCheck,
  Shield,
  Mail,
  Phone,
  Video,
  User,
  Search,
  Eye,
  FileText,
  FileCode,
  Download,
  Copy,
  Check,
  Lock,
  Bell,
  BellOff,
  ExternalLink,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Calendar,
  Layers,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router";
import type { ActivePeer } from "./ConversationHeader";
import type { DirectMessageItem } from "./DirectMessageStream";
import { ImageViewerModal } from "../chat/media/ImageViewerModal";

interface ContactInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  peer: ActivePeer;
  messages: DirectMessageItem[];
  onStartCall?: (type: "audio" | "video") => void;
  onSearchInChat?: () => void;
}

export function ContactInfoDrawer({
  isOpen,
  onClose,
  peer,
  messages,
  onStartCall,
  onSearchInChat
}: ContactInfoDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "media" | "code" | "encryption">("overview");
  const [isMuted, setIsMuted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSafetyNumber, setCopiedSafetyNumber] = useState(false);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);

  // Derive shared media and documents from messages
  const sharedDocs = messages.flatMap((m) =>
    (m.attachments || []).map((att) => ({
      ...att,
      messageId: m.id,
      date: m.time,
      senderName: m.senderName
    }))
  );

  // Derive shared code snippets from messages
  const sharedSnippets = messages
    .filter((m) => m.codeSnippet)
    .map((m) => ({
      id: m.id,
      senderName: m.senderName,
      time: m.time,
      snippet: m.codeSnippet!
    }));

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };


  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopySnippet = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const institutionalEmail = `${peer.roll.toLowerCase()}@campus.edu`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 lg:hidden"
          />

          {/* Slide-in WhatsApp Style Contact Info Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 35 }}
            className="fixed lg:static top-0 right-0 h-full w-full sm:w-[400px] border-l border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1424] text-slate-800 dark:text-slate-200 flex flex-col shrink-0 z-40 shadow-2xl overflow-hidden"
          >
            {/* ── Top Header ────────────────────────────────────────────── */}
            <div className="h-16 px-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-[#0B1324] shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  title="Close Contact Info"
                >
                  <X size={18} />
                </button>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Contact Info
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/25">
                  <ShieldCheck size={11} />
                  Verified Peer
                </span>
              </div>
            </div>

            {/* ── Scrollable Body ───────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
              
              {/* ── 1. Hero Profile Card ─────────────────────────────────── */}
              <div className="p-6 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center text-center bg-gradient-to-b from-slate-50/50 to-transparent dark:from-[#0F1A30]/40 dark:to-transparent">
                
                {/* Peer Avatar with Live Ring & View Photo Click/Hover */}
                <div
                  className={`relative group mb-3 ${peer.avatar ? "cursor-pointer" : ""}`}
                  onClick={() => {
                    if (peer.avatar) setIsPhotoViewerOpen(true);
                  }}
                  title={peer.avatar ? "Click to view full profile photo" : undefined}
                >
                  <div className="h-24 w-24 rounded-3xl overflow-hidden shadow-xl shadow-blue-600/15 border-2 border-white dark:border-slate-800 bg-[#1E90FF] flex items-center justify-center text-white text-2xl font-black">
                    {peer.avatar ? (
                      <img
                        src={peer.avatar}
                        alt={peer.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      getInitials(peer.name)
                    )}
                  </div>

                  {/* Presence Ring */}
                  <span
                    className={`absolute bottom-0 right-0 h-5 w-5 rounded-full border-3 border-white dark:border-[#0c1424] ${
                      peer.isOnline ? "bg-emerald-500 ring-2 ring-emerald-500/30" : "bg-slate-400"
                    }`}
                    title={peer.isOnline ? "Active Now" : "Offline"}
                  />

                  {/* View Photo Overlay on Hover */}
                  {peer.avatar && (
                    <div className="absolute inset-0 rounded-3xl bg-slate-950/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                      <Eye size={22} className="mb-0.5 text-white" />
                      <span className="text-[10px] font-bold">View Photo</span>
                    </div>
                  )}
                </div>

                {/* View Profile Photo Button */}
                {peer.avatar && (
                  <button
                    type="button"
                    onClick={() => setIsPhotoViewerOpen(true)}
                    className="mb-2 px-3 py-1 rounded-full text-xs font-semibold text-[#1E90FF] bg-[#1E90FF]/10 hover:bg-[#1E90FF]/20 border border-[#1E90FF]/25 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="View full profile photo"
                  >
                    <Eye size={13} />
                    <span>View Profile Photo</span>
                  </button>
                )}

                {/* Peer Name & Roll */}
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>{peer.name}</span>
                  <ShieldCheck size={16} className="text-[#1E90FF]" />
                </h2>

                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>{peer.roll}</span>
                  <span>•</span>
                  <span className="font-bold text-[#1E90FF]">{peer.dept}</span>
                </div>

                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed">
                  Student in {peer.dept} • Campus peer collaborator
                </p>

                {/* ── WhatsApp Action Buttons (Call, Video, Search, Profile) ─ */}
                <div className="grid grid-cols-4 gap-2 w-full mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                  
                  {/* Audio Call */}
                  <button
                    type="button"
                    onClick={() => onStartCall?.("audio")}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                  >
                    <div className="h-10 w-10 rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF] group-hover:bg-[#1E90FF] group-hover:text-white transition-all flex items-center justify-center shadow-xs">
                      <Phone size={17} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      Audio Call
                    </span>
                  </button>

                  {/* Video Call */}
                  <button
                    type="button"
                    onClick={() => onStartCall?.("video")}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                  >
                    <div className="h-10 w-10 rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF] group-hover:bg-[#1E90FF] group-hover:text-white transition-all flex items-center justify-center shadow-xs">
                      <Video size={17} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      Video Call
                    </span>
                  </button>

                  {/* Search in Chat */}
                  <button
                    type="button"
                    onClick={onSearchInChat}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                  >
                    <div className="h-10 w-10 rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF] group-hover:bg-[#1E90FF] group-hover:text-white transition-all flex items-center justify-center shadow-xs">
                      <Search size={17} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      Search
                    </span>
                  </button>

                  {/* View Full Profile */}
                  <Link
                    to={`/profile?id=${peer.id}`}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                  >
                    <div className="h-10 w-10 rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF] group-hover:bg-[#1E90FF] group-hover:text-white transition-all flex items-center justify-center shadow-xs">
                      <User size={17} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      Profile
                    </span>
                  </Link>

                </div>
              </div>

              {/* ── 2. Navigation Tabs ───────────────────────────────────── */}
              <div className="flex border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0B1324]/50 px-2 pt-1">
                {[
                  { id: "overview", label: "About" },
                  { id: "media", label: `Docs (${sharedDocs.length})` },
                  { id: "code", label: `Code (${sharedSnippets.length})` },
                  { id: "encryption", label: "Security" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                      activeTab === tab.id
                        ? "border-[#1E90FF] text-[#1E90FF]"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── 3. Tab Contents ──────────────────────────────────────── */}
              <div className="p-4 space-y-4">

                {/* ──────── TAB: OVERVIEW / ACADEMIC INFO ──────── */}
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    
                    {/* About status */}
                    <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#080D1A]/50 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        About & Bio
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                        "Prepping for Distributed Systems viva and algorithms lab. Ping me for lecture notes."
                      </p>
                      <span className="text-[10px] text-slate-400 block pt-1">
                        Updated 3 days ago
                      </span>
                    </div>

                    {/* Academic Credentials Card */}
                    <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#080D1A]/50 space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <GraduationCap size={13} className="text-[#1E90FF]" />
                        Academic Standing
                      </span>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Department</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {peer.dept}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Roll Number</span>
                          <span className="tabular-nums font-bold text-[#1E90FF]">
                            {peer.roll}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Institutional Email Card */}
                    <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#080D1A]/50 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="p-2 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF] shrink-0">
                          <Mail size={15} />
                        </div>
                        <div className="truncate">
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            Campus Email
                          </span>
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate block">
                            {institutionalEmail}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyEmail(institutionalEmail)}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shrink-0"
                        title="Copy Email"
                      >
                        {copiedEmail ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>

                    {/* Shared Study Circles Card */}
                    <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#080D1A]/50 space-y-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Layers size={13} className="text-[#1E90FF]" />
                        Common Study Circles
                      </span>

                      {(() => {
                        let savedCircles: any[] = [];
                        try {
                          const raw = localStorage.getItem("studyconnect_user_circles");
                          if (raw) savedCircles = JSON.parse(raw);
                        } catch {}

                        if (savedCircles.length === 0) {
                          return (
                            <div className="p-3 text-center text-xs text-slate-400 italic">
                              No study circles joined yet
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-1.5">
                            {savedCircles.map((circle: any) => (
                              <div
                                key={circle.id}
                                className="flex items-center justify-between p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/50 bg-white/60 dark:bg-[#0c1424]/60"
                              >
                                <div>
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {circle.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 tabular-nums">
                                    {circle.dept}
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold bg-[#1E90FF]/10 text-[#1E90FF] px-1.5 py-0.5 rounded">
                                  {circle.shortName || "CIRCLE"}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Notifications Settings */}
                    <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#080D1A]/50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {isMuted ? <BellOff size={15} /> : <Bell size={15} />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Mute Notifications
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isMuted ? "Muted indefinitely" : "Push alerts enabled"}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          isMuted
                            ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {isMuted ? "Unmute" : "Mute"}
                      </button>
                    </div>

                  </div>
                )}

                {/* ──────── TAB: SHARED MEDIA & DOCS ──────── */}
                {activeTab === "media" && (
                  <div className="space-y-3">
                    {sharedDocs.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
                        <FileText size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          No Documents Shared Yet
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          Notes, lab manual PDFs, and study materials shared in this chat will appear here.
                        </p>
                      </div>
                    ) : (
                      sharedDocs.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#080D1A]/50 hover:border-[#1E90FF]/50 transition-all group"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className="h-10 w-10 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF] flex items-center justify-center shrink-0">
                              <FileText size={18} />
                            </div>
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block group-hover:text-[#1E90FF] transition-colors">
                                {doc.name}
                              </span>
                              <span className="text-[10px] text-slate-400 tabular-nums block">
                                {doc.size} • {doc.date}
                              </span>
                            </div>
                          </div>

                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl text-slate-400 hover:text-[#1E90FF] hover:bg-[#1E90FF]/10 transition-colors shrink-0"
                            title="Download Document"
                          >
                            <Download size={15} />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ──────── TAB: SHARED CODE SNIPPETS ──────── */}
                {activeTab === "code" && (
                  <div className="space-y-3">
                    {sharedSnippets.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
                        <FileCode size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          No Code Snippets Shared Yet
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          Code snippets formatted and shared in this conversation will be indexed here.
                        </p>
                      </div>
                    ) : (
                      sharedSnippets.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-900 text-slate-100 overflow-hidden shadow-md"
                        >
                          <div className="flex items-center justify-between px-3 py-2 bg-slate-950/60 border-b border-slate-800 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-[#1E90FF] text-[11px]">
                              <FileCode size={12} />
                              <span>{item.snippet.language}</span>
                              <span className="text-slate-500 tabular-nums">• {item.time}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopySnippet(item.id, item.snippet.code)}
                              className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Copy Code"
                            >
                              {copiedSnippetId === item.id ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>

                          <pre className="p-3 font-mono text-[11px] text-[#1E90FF]/90 overflow-x-auto max-h-40 scrollbar-none leading-relaxed">
                            <code>{item.snippet.code}</code>
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ──────── TAB: ENCRYPTION & SECURITY ──────── */}
                {activeTab === "encryption" && (
                  <div className="space-y-4">
                    
                    <div className="p-4 rounded-2xl border border-[#1E90FF]/25 bg-[#1E90FF]/5 dark:bg-[#1E90FF]/10 space-y-2.5">
                      <div className="flex items-center gap-2 text-[#1E90FF]">
                        <Lock size={16} />
                        <span className="text-xs font-bold">End-to-End Encrypted</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Messages and files sent to this chat are secured with 256-bit AES encryption. No one outside of this chat, not even campus administrators, can read them.
                      </p>
                    </div>

                    {/* WhatsApp-Style Safety Number / Fingerprint Verification */}
                    <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#080D1A]/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Verify Security Code
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("48291 03829 19482 01847 29103 84729");
                            setCopiedSafetyNumber(true);
                            setTimeout(() => setCopiedSafetyNumber(false), 2000);
                          }}
                          className="text-[10px] font-bold text-[#1E90FF] hover:underline flex items-center gap-1"
                        >
                          {copiedSafetyNumber ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedSafetyNumber ? "Copied" : "Copy"}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 p-2.5 rounded-xl bg-white dark:bg-slate-950 font-semibold tabular-nums tracking-widest text-[11px] text-center text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 select-all">
                        <span>48291</span>
                        <span>03829</span>
                        <span>19482</span>
                        <span>01847</span>
                        <span>29103</span>
                        <span>84729</span>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Compare this 60-digit number with {peer.name}'s device to verify 100% end-to-end security.
                      </p>
                    </div>

                    {/* Privacy & Safety Options */}
                    <div className="pt-2 space-y-2">
                      <button
                        type="button"
                        onClick={() => alert(`Reported user ${peer.name} to campus safety.`)}
                        className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <AlertCircle size={14} />
                        <span>Report or Block {peer.name}</span>
                      </button>
                    </div>

                  </div>
                )}

              </div>
            </div>
          </motion.aside>

          {/* Lightbox / Full Profile Photo Viewer */}
          {peer.avatar && (
            <ImageViewerModal
              isOpen={isPhotoViewerOpen}
              images={[
                {
                  url: peer.avatar,
                  originalName: `${peer.name}'s Profile Photo`,
                  caption: `${peer.name} (${peer.roll} • ${peer.dept})`
                }
              ]}
              onClose={() => setIsPhotoViewerOpen(false)}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

export default ContactInfoDrawer;
