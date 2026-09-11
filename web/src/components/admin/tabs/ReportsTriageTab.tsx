import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Ban,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  FileText,
  User,
  Clock,
  Check,
  AlertCircle,
  ExternalLink,
  Filter,
  Search,
  FileWarning,
  Flame,
  Archive,
  Tag,
  Sparkles,
  Plus,
  X
} from "lucide-react";
import { ReportDetailModal } from "../modals/ReportDetailModal";
import { useToastStore } from "../../../store/toast.store";

export interface ReportItem {
  id: string;
  category: "Hate Speech" | "Academic Dishonesty" | "Malware / Phishing" | "Copyright Violation";
  targetType: "Message" | "Vault File" | "Voice Stage" | "User Profile";
  severity: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  
  // Reporter
  reporterName: string;
  reporterRoll: string;
  reporterDept: string;
  reporterHistoryCount: number;

  // Offender
  reportedName: string;
  reportedRoll: string;
  reportedDept: string;
  reportedPriorWarnings: number;

  channelOrResource: string;
  contextSnippet: string;
  createdAt: string;
}

function loadContentReports(): ReportItem[] {
  try {
    const raw = localStorage.getItem("studyconnect_content_reports");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export interface FocusInterceptionItem {
  id: string;
  userId: string;
  userName: string;
  userRoll: string;
  userDepartment: string;
  channelId: string;
  originalContent: string;
  reason: string;
  confidence: number;
  matchedKeywords: string[];
  flaggedViolations: string[];
  strikes: number;
  timestamp: string;
}

const SAMPLE_INTERCEPTIONS: FocusInterceptionItem[] = [
  {
    id: "int-101",
    userId: "u-dev",
    userName: "Rohan Verma",
    userRoll: "CS24-108",
    userDepartment: "Computer Science",
    channelId: "algorithms-lab",
    originalContent: "Anyone playing valorant competitive tonight? Need 2 for full lobby",
    reason: "Strict Study Mode: Off-topic banter or casual content (GAMING:valorant) was detected.",
    confidence: 0.05,
    matchedKeywords: [],
    flaggedViolations: ["GAMING:valorant", "CASUAL_BANTER:lobby"],
    strikes: 1,
    timestamp: "10 mins ago"
  },
  {
    id: "int-102",
    userId: "u-stu2",
    userName: "Ananya Patel",
    userRoll: "CS24-214",
    userDepartment: "Data Science",
    channelId: "os-kernel",
    originalContent: "Can we bunk tomorrow's 8 AM lecture and go to the canteen instead?",
    reason: "Strict Study Mode: Off-topic banter or casual content (CASUAL_BANTER:bunk, CASUAL_BANTER:canteen) was detected.",
    confidence: 0.12,
    matchedKeywords: [],
    flaggedViolations: ["CASUAL_BANTER:bunk", "CASUAL_BANTER:canteen"],
    strikes: 2,
    timestamp: "25 mins ago"
  },
  {
    id: "int-103",
    userId: "u-stu3",
    userName: "Devansh Rao",
    userRoll: "CS24-301",
    userDepartment: "Information Tech",
    channelId: "dbms-sql",
    originalContent: "Bro did you check out the new episode of that anime series lmao",
    reason: "Strict Study Mode: Off-topic banter or casual content (SLANG:bro, SLANG:lmao) was detected.",
    confidence: 0.08,
    matchedKeywords: [],
    flaggedViolations: ["SLANG:bro", "SLANG:lmao"],
    strikes: 1,
    timestamp: "1 hour ago"
  }
];

function loadInterceptions(): FocusInterceptionItem[] {
  try {
    const raw = localStorage.getItem("studyconnect_focus_interceptions");
    return raw ? JSON.parse(raw) : SAMPLE_INTERCEPTIONS;
  } catch {
    return SAMPLE_INTERCEPTIONS;
  }
}

export function ReportsTriageTab() {
  const { addToast } = useToastStore();

  const [reports, setReports] = useState<ReportItem[]>(loadContentReports);
  const [interceptions, setInterceptions] = useState<FocusInterceptionItem[]>(loadInterceptions);
  const [activeStatusTab, setActiveStatusTab] = useState<
    "PENDING" | "RESOLVED" | "DISMISSED" | "ALL" | "INTERCEPTIONS"
  >("PENDING");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Add Tag Modal state
  const [tagModal, setTagModal] = useState<{
    isOpen: boolean;
    channelId: string;
    tagInput: string;
  }>({ isOpen: false, channelId: "", tagInput: "" });

  // Detail Modal
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  const pendingCount = reports.filter((r) => r.status === "PENDING").length;
  const resolvedCount = reports.filter((r) => r.status === "RESOLVED").length;
  const dismissedCount = reports.filter((r) => r.status === "DISMISSED").length;
  const interceptionCount = interceptions.length;

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Status Tab
      if (activeStatusTab !== "ALL" && r.status !== activeStatusTab) return false;
      // Category Filter
      if (categoryFilter !== "ALL" && r.category !== categoryFilter) return false;
      // Target Type Filter
      if (targetTypeFilter !== "ALL" && r.targetType !== targetTypeFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          r.id.toLowerCase().includes(q) ||
          r.reportedName.toLowerCase().includes(q) ||
          r.reportedRoll.toLowerCase().includes(q) ||
          r.reporterName.toLowerCase().includes(q) ||
          r.contextSnippet.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [reports, activeStatusTab, categoryFilter, targetTypeFilter, searchQuery]);

  const filteredInterceptions = useMemo(() => {
    return interceptions.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.id.toLowerCase().includes(q) ||
        item.userName.toLowerCase().includes(q) ||
        item.userRoll.toLowerCase().includes(q) ||
        item.channelId.toLowerCase().includes(q) ||
        item.originalContent.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q)
      );
    });
  }, [interceptions, searchQuery]);

  const handleAddTagSubmit = (channelId: string, tagToAdd: string) => {
    if (!tagToAdd.trim()) return;
    const cleanTag = tagToAdd.trim().toLowerCase().replace(/^[#,\s]+/, "");

    // Update local storage channel configs
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("studyconnect_channels_")) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const chans = JSON.parse(raw);
            const updatedChans = chans.map((c: any) => {
              if (c.id === channelId || c.name?.toLowerCase() === channelId.toLowerCase()) {
                const existingTags = c.academicContextTags || [];
                if (!existingTags.includes(cleanTag)) {
                  return { ...c, academicContextTags: [...existingTags, cleanTag] };
                }
              }
              return c;
            });
            localStorage.setItem(key, JSON.stringify(updatedChans));
          }
        }
      }
    } catch {}

    addToast(
      `Added tag "#${cleanTag}" to #${channelId}. Future messages will be permitted!`,
      "success"
    );
    setTagModal({ isOpen: false, channelId: "", tagInput: "" });
  };

  const handleDismissInterception = (id: string) => {
    setInterceptions((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem("studyconnect_focus_interceptions", JSON.stringify(next));
      } catch {}
      return next;
    });
    addToast("Interception record cleared.", "info");
  };

  const updateReports = (next: ReportItem[]) => {
    setReports(next);
    try {
      localStorage.setItem("studyconnect_content_reports", JSON.stringify(next));
    } catch {}
  };

  const handleDismiss = (id: string) => {
    const next = reports.map((r) => (r.id === id ? { ...r, status: "DISMISSED" as const } : r));
    updateReports(next);
    addToast(`Report #${id} dismissed as false positive.`, "info");
  };

  const handlePurgeAndWarn = (id: string, reportedName: string) => {
    const next = reports.map((r) => (r.id === id ? { ...r, status: "RESOLVED" as const } : r));
    updateReports(next);
    addToast(`Flagged content purged and warning issued to ${reportedName}.`, "warning");
  };

  const handleInstantBan = (id: string, reportedName: string) => {
    const next = reports.map((r) => (r.id === id ? { ...r, status: "RESOLVED" as const } : r));
    updateReports(next);
    addToast(`Enforced 7-day timeout and revoked token for ${reportedName}.`, "error");
  };

  const handleResolveFromModal = (reportId: string, actionTaken: string, notes: string) => {
    const next = reports.map((r) => (r.id === reportId ? { ...r, status: "RESOLVED" as const } : r));
    updateReports(next);
  };

  const handleBulkDismissSpam = () => {
    const next = reports.map((r) => (r.category === "Malware / Phishing" ? { ...r, status: "DISMISSED" as const } : r));
    updateReports(next);
    addToast("All spam reports marked as dismissed.", "info");
  };

  return (
    <div className="space-y-6">
      
      {/* ── 1. Controls, Triage Status Switcher & Filter Toolbar ──────── */}
      <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
        
        {/* Status Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveStatusTab("PENDING")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStatusTab === "PENDING"
                  ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              <span>Pending Review</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] tabular-nums font-bold animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveStatusTab("RESOLVED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStatusTab === "RESOLVED"
                  ? "bg-[#1E90FF] text-white"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              Resolved ({resolvedCount})
            </button>

            <button
              onClick={() => setActiveStatusTab("DISMISSED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStatusTab === "DISMISSED"
                  ? "bg-[#1E90FF] text-white"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              Dismissed ({dismissedCount})
            </button>

            <button
              onClick={() => setActiveStatusTab("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStatusTab === "ALL"
                  ? "bg-[#1E90FF] text-white"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              All Reports
            </button>

            <button
              onClick={() => setActiveStatusTab("INTERCEPTIONS")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStatusTab === "INTERCEPTIONS"
                  ? "bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm shadow-rose-950/30"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              <ShieldAlert
                size={14}
                className={activeStatusTab === "INTERCEPTIONS" ? "text-white" : "text-rose-500"}
              />
              <span>Study Mode Interceptions</span>
              {interceptionCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] tabular-nums font-bold">
                  {interceptionCount}
                </span>
              )}
            </button>
          </div>

          {/* Bulk Action */}
          <button
            onClick={handleBulkDismissSpam}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer self-start sm:self-auto"
          >
            Mark All Spam as Dismissed
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="w-full sm:max-w-xs relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports by ID, name, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF]"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Hate Speech">Hate Speech & Harassment</option>
              <option value="Academic Dishonesty">Academic Dishonesty</option>
              <option value="Malware / Phishing">Malware / Phishing</option>
              <option value="Copyright Violation">Copyright Violation</option>
            </select>

            {/* Target Type Filter */}
            <select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Scopes</option>
              <option value="Message">Messages</option>
              <option value="Vault File">Vault Files</option>
              <option value="Voice Stage">Voice Stage</option>
            </select>
          </div>

        </div>

      </div>

      {/* ── 2. Interactive Reports Queue ─────────────────────────────── */}
      {activeStatusTab === "INTERCEPTIONS" ? (
        filteredInterceptions.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              No Intercepted Messages Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              All students are adhering to channel syllabus guidelines, or all focus interception events have been addressed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredInterceptions.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 rounded-3xl border border-rose-500/20 dark:border-rose-500/30 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

                  {/* Top Row: Interception ID, Shield badge, channel, Time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20 tabular-nums">
                        #{item.id}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">
                        <ShieldAlert size={11} />
                        BLOCKED PRE-BROADCAST
                      </span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Channel: <span className="font-bold text-[#1E90FF]">#{item.channelId}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/25">
                        Strike {item.strikes}/3
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {item.timestamp}
                      </span>
                      <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-700 bg-slate-900/60 text-slate-300">
                        Relevance: {Math.round(item.confidence * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Offender Profile */}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                      {item.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.userName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({item.userRoll})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Dept: {item.userDepartment}
                      </span>
                    </div>
                  </div>

                  {/* Intercepted Message Quotation */}
                  <div className="space-y-2">
                    <div className="p-3.5 rounded-2xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 text-xs text-slate-700 dark:text-slate-200 font-mono leading-relaxed">
                      <span className="text-rose-500 font-bold block mb-1 text-[10px] uppercase font-sans">
                        Attempted Message Content:
                      </span>
                      "{item.originalContent}"
                    </div>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                      <AlertTriangle size={12} className="shrink-0" />
                      <span>{item.reason}</span>
                    </p>
                  </div>

                  {/* Flagged tokens */}
                  {item.flaggedViolations.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Flagged Tokens:
                      </span>
                      {item.flaggedViolations.map((tok, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        >
                          {tok}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Triage Action Buttons */}
                  <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Sparkles size={13} className="text-[#1E90FF]" />
                      <span>False positive? Whitelist the coursework term to allow discussion.</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDismissInterception(item.id)}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Check size={13} />
                        <span>Dismiss</span>
                      </button>

                      <button
                        onClick={() =>
                          setTagModal({
                            isOpen: true,
                            channelId: item.channelId,
                            tagInput: ""
                          })
                        }
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#1E90FF]/90 text-white text-xs font-bold shadow-md shadow-[#1E90FF]/20 transition-all cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add Tag to #{item.channelId}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      ) : filteredReports.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
            All Clear! Zero Pending Safety Reports
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            The student safety and content moderation queue is completely up to date.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredReports.map((report) => (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4"
              >
                {/* Top Row: Report ID, Severity, Category, Time */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded-lg border border-[#1E90FF]/20 tabular-nums">
                      #{report.id}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        report.severity === "HIGH"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {report.severity} SEVERITY
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <AlertTriangle size={13} className="text-rose-500" />
                      <span>{report.category}</span>
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 flex items-center gap-1 tabular-nums">
                    <Clock size={11} />
                    <span>Reported {report.createdAt}</span>
                  </span>
                </div>

                {/* Reporter vs. Offender Split Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Reporter Box */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#080D1A]/70 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Submitted By (Verified Student)
                    </span>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {report.reporterName}
                        </div>
                        <div className="text-[10px] text-[#1E90FF]">
                          {report.reporterRoll} • {report.reporterDept}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {report.reporterHistoryCount} reports filed
                      </span>
                    </div>
                  </div>

                  {/* Reported Offender Box */}
                  <div className="p-3.5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-500/20 space-y-1">
                    <span className="text-[10px] text-rose-500 uppercase tracking-wider block font-bold">
                      Reported Target Entity
                    </span>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {report.reportedName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {report.reportedRoll} • {report.reportedDept}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 tabular-nums">
                        {report.reportedPriorWarnings} Prior Warnings
                      </span>
                    </div>
                  </div>
                </div>

                {/* Evidence Context Snapshot Block */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Incident Location: <strong className="text-[#1E90FF]">{report.channelOrResource}</strong></span>
                    <span className="text-slate-400">Type: {report.targetType}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#080D1A] border border-slate-800 text-xs text-slate-200 leading-relaxed shadow-inner">
                    <span className="text-rose-400 font-bold block mb-1 text-[10px] uppercase">
                      Captured Evidence Snippet:
                    </span>
                    "{report.contextSnippet}"
                  </div>

                  {/* Student Privacy Guard Badge */}
                  <div className="flex items-center gap-1.5 text-[10px] text-[#1E90FF] pt-0.5">
                    <ShieldCheck size={12} className="shrink-0" />
                    <span>Context strictly scoped to flagged event only. Private DMs remain end-to-end protected.</span>
                  </div>
                </div>

                {/* Triage Action Buttons Group */}
                <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#1E90FF] hover:underline cursor-pointer"
                  >
                    <ExternalLink size={13} />
                    <span>Open Full Chat Evidence (±3 Messages)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDismiss(report.id)}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Dismiss</span>
                    </button>

                    <button
                      onClick={() => handlePurgeAndWarn(report.id, report.reportedName)}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <AlertCircle size={13} />
                      <span>Purge & Warn</span>
                    </button>

                    <button
                      onClick={() => handleInstantBan(report.id, report.reportedName)}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                    >
                      <Ban size={13} />
                      <span>Instant Timeout</span>
                    </button>
                  </div>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── 3. Detail Evidence Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {selectedReport && (
          <ReportDetailModal
            isOpen={!!selectedReport}
            onClose={() => setSelectedReport(null)}
            report={selectedReport}
            onResolve={handleResolveFromModal}
          />
        )}
      </AnimatePresence>

      {/* ── 4. Quick Add Tag Modal (False-Positive Resolver) ──────────── */}
      <AnimatePresence>
        {tagModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#0F1A30] p-6 shadow-2xl text-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/30">
                    <Tag size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Whitelist Coursework Tag
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Channel: #{tagModal.channelId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTagModal({ isOpen: false, channelId: "", tagInput: "" })}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                If a legitimate coursework discussion was blocked, enter the topic, keyword, or course module below to whitelist it across the classifier.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Academic Tag / Topic Keyword
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                    #
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. dynamic-programming, sql, robotics"
                    value={tagModal.tagInput}
                    onChange={(e) =>
                      setTagModal((prev) => ({ ...prev, tagInput: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTagSubmit(tagModal.channelId, tagModal.tagInput);
                      }
                    }}
                    autoFocus
                    className="w-full rounded-xl border border-slate-700 bg-[#080D1A] pl-7 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#1E90FF]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => setTagModal({ isOpen: false, channelId: "", tagInput: "" })}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!tagModal.tagInput.trim()}
                  onClick={() => handleAddTagSubmit(tagModal.channelId, tagModal.tagInput)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#1E90FF]/90 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Tag & Whitelist</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default ReportsTriageTab;
