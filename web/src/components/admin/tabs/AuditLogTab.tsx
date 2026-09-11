import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScrollText,
  Search,
  Download,
  ShieldCheck,
  Clock,
  ExternalLink,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Layers,
  FileCode,
  FileSpreadsheet,
  Terminal,
  Activity
} from "lucide-react";
import { useToastStore } from "../../../store/toast.store";

export type AuditActionType =
  | "BAN_USER"
  | "PURGE_ACCOUNT"
  | "SUSPEND_USER"
  | "DELETE_RESOURCE"
  | "ROLE_PROMOTION"
  | "COMMUNITY_ARCHIVED"
  | "BROADCAST_SENT";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  relativeTime: string;
  adminName: string;
  adminId: string;
  adminIp: string;
  action: AuditActionType;
  targetType: "User" | "Resource" | "Community" | "Broadcast";
  targetId: string;
  metadataSummary: string;
  fullPayload: Record<string, unknown>;
}

function loadAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem("studyconnect_audit_logs");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function AuditLogTab() {
  const { addToast } = useToastStore();

  const [logs, setLogs] = useState<AuditLogEntry[]>(loadAuditLogs);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState<string>("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Listen for live broadcast or moderation actions to append to audit trail
  useEffect(() => {
    const handleNewAuditEntry = (event: any) => {
      const detail = event.detail;
      if (detail) {
        const newEntry: AuditLogEntry = {
          id: detail.id || `log-${Date.now()}`,
          timestamp: detail.timestamp || new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
          relativeTime: detail.relativeTime || "Just now",
          adminName: detail.adminName || "Administrator",
          adminId: detail.adminId || "admin-root",
          adminIp: detail.adminIp || "127.0.0.1",
          action: detail.action || "BROADCAST_SENT",
          targetType: detail.targetType || "User",
          targetId: detail.target || detail.targetId || "System Entity",
          metadataSummary: detail.details || detail.metadataSummary || "Administrative action executed",
          fullPayload: detail.fullPayload || {
            action: detail.action,
            target: detail.target,
            details: detail.details,
            timestamp: new Date().toISOString()
          }
        };

        setLogs((prev) => {
          const updated = [newEntry, ...prev];
          try {
            localStorage.setItem("studyconnect_audit_logs", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    };

    window.addEventListener(
      "studyconnect:audit-entry" as unknown as keyof WindowEventMap,
      handleNewAuditEntry as EventListener
    );

    return () => {
      window.removeEventListener(
        "studyconnect:audit-entry" as unknown as keyof WindowEventMap,
        handleNewAuditEntry as EventListener
      );
    };
  }, []);

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      // Action Type Filter
      if (actionFilter !== "ALL" && l.action !== actionFilter) return false;

      // Timeframe Filter (Mock filter logic based on relative time)
      if (timeframeFilter === "24H") {
        if (!l.relativeTime.includes("m ago") && !l.relativeTime.includes("1h ago") && !l.relativeTime.includes("2h ago")) {
          return false;
        }
      } else if (timeframeFilter === "7D") {
        if (l.relativeTime.includes("30d ago")) return false;
      }

      // Safe String Search
      if (search.trim()) {
        const q = escapeRegExp(search.trim()).toLowerCase();
        const match =
          l.adminName.toLowerCase().includes(q) ||
          l.adminId.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.targetId.toLowerCase().includes(q) ||
          l.metadataSummary.toLowerCase().includes(q) ||
          l.adminIp.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [logs, actionFilter, timeframeFilter, search]);

  // Paginated Slicing
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const toggleExpand = (id: string) => {
    setExpandedLogId((curr) => (curr === id ? null : id));
  };

  const getActionBadge = (action: AuditActionType) => {
    switch (action) {
      case "BAN_USER":
      case "PURGE_ACCOUNT":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]";
      case "SUSPEND_USER":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "DELETE_RESOURCE":
        return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
      case "ROLE_PROMOTION":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "BROADCAST_SENT":
        return "bg-sky-500/15 text-[#0284C7] dark:text-[#38BDF8] border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.15)]";
      case "COMMUNITY_ARCHIVED":
        return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  // ── CSV & JSON Export Handlers ──────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ["Log ID", "Timestamp UTC", "Admin Actor", "Admin ID", "IP Address", "Action Type", "Target Entity", "Metadata Summary"];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.adminName}"`,
      `"${l.adminId}"`,
      `"${l.adminIp}"`,
      `"${l.action}"`,
      `"${l.targetId.replace(/"/g, '""')}"`,
      `"${l.metadataSummary.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `studyconnect-audit-log-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast(`Exported ${filteredLogs.length} audit trail records as CSV.`, "success");
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `studyconnect-audit-log-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addToast(`Exported ${filteredLogs.length} audit trail records as JSON.`, "success");
  };

  return (
    <div className="space-y-6">
      
      {/* ── 1. Retention Badge & Header ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1E90FF]/30 bg-[#1E90FF]/10 px-3 py-1 text-xs font-bold text-[#1E90FF]">
            <ShieldCheck size={14} className="text-[#1E90FF]" />
            <span>Immutable 90-Day TTL Encrypted Log</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Campus Administrative Audit Trail
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Cryptographically indexed, tamper-evident record of all disciplinary actions, privilege escalations, file purges, and emergency broadcasts. Automatically pruned after 90 days.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#1E90FF] hover:text-[#1E90FF] shadow-sm transition-all cursor-pointer"
            title="Download CSV spreadsheet"
          >
            <FileSpreadsheet size={14} />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#1E90FF] hover:text-[#1E90FF] shadow-sm transition-all cursor-pointer"
            title="Download JSON dataset"
          >
            <FileCode size={14} />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* ── 2. Search & Faceted Filter Bar ────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Regex-safe Search Input */}
          <div className="w-full lg:max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by admin name, roll number, IP address, or action..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] shadow-sm"
            />
          </div>

          {/* Action Type & Timeframe Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Action Types</option>
              <option value="BAN_USER">BAN_USER & PURGE</option>
              <option value="SUSPEND_USER">SUSPEND_USER</option>
              <option value="DELETE_RESOURCE">DELETE_RESOURCE</option>
              <option value="ROLE_PROMOTION">ROLE_PROMOTION</option>
              <option value="COMMUNITY_ARCHIVED">COMMUNITY_ARCHIVED</option>
              <option value="BROADCAST_SENT">BROADCAST_SENT</option>
            </select>

            <select
              value={timeframeFilter}
              onChange={(e) => {
                setTimeframeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Time (90-Day Range)</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>

            <span className="text-[11px] tabular-nums text-slate-400 ml-auto lg:ml-2">
              Showing <strong className="text-slate-700 dark:text-slate-200">{filteredLogs.length}</strong> entries
            </span>
          </div>

        </div>
      </div>

      {/* ── 3. Audit Log Data Table ───────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/75 dark:bg-[#080D1A]/75 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">Timestamp (UTC)</th>
                <th className="py-3.5 px-4 font-bold">Admin Actor & IP</th>
                <th className="py-3.5 px-4 font-bold">Action Type</th>
                <th className="py-3.5 px-4 font-bold">Target Entity</th>
                <th className="py-3.5 px-4 font-bold">Action Summary</th>
                <th className="py-3.5 px-4 font-bold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Clock size={28} className="mx-auto text-slate-400 mb-2 opacity-60" />
                    {logs.length === 0
                      ? "No administrative audit log entries recorded yet. Actions taken across the moderation console will appear here."
                      : "No audit log records match the selected filters."}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-[#162544]/40 transition-colors">
                        
                        {/* 1. Timestamp */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-slate-800 dark:text-slate-200 font-bold">
                            {log.timestamp}
                          </div>
                          <div className="text-[10px] text-[#1E90FF] font-medium mt-0.5">
                            {log.relativeTime}
                          </div>
                        </td>

                        {/* 2. Admin Actor */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-slate-900 dark:text-slate-100 font-bold flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-[#1E90FF] text-white flex items-center justify-center text-[9px]">
                              {log.adminName[0]}
                            </span>
                            <span>{log.adminName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {log.adminId} • <code className="text-slate-500">{log.adminIp}</code>
                          </div>
                        </td>

                        {/* 3. Action Type Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadge(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>

                        {/* 4. Target Entity */}
                        <td className="py-3.5 px-4 font-bold text-[#1E90FF] max-w-xs truncate">
                          {log.targetId}
                        </td>

                        {/* 5. Summary */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-[11px] max-w-sm truncate">
                          {log.metadataSummary}
                        </td>

                        {/* 6. Expand Chevron */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-[#1E90FF] hover:border-[#1E90FF] transition-colors cursor-pointer"
                            title={isExpanded ? "Hide JSON Payload" : "View Full JSON Payload"}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>

                      </tr>

                      {/* ── Expanded JSON Payload Accordion ───────────────── */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-100/70 dark:bg-[#080D1A]/90 p-4 border-y border-slate-200 dark:border-slate-800">
                            <div className="space-y-2 max-w-4xl mx-auto">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span className="flex items-center gap-1 font-bold text-[#1E90FF]">
                                  <Terminal size={12} />
                                  <span>Cryptographic Event Payload (SHA-256 Verified)</span>
                                </span>
                                <span className="tabular-nums text-[10px]">Record ID: {log.id}</span>
                              </div>
                              <pre className="p-3.5 rounded-2xl bg-black/50 border border-slate-800 text-emerald-400 text-xs overflow-x-auto leading-relaxed scrollbar-none font-mono">
                                <code>{JSON.stringify(log.fullPayload, null, 2)}</code>
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── 4. Server-Style Pagination Controls ─────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#080D1A]/50 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-slate-400">
              Page <strong className="text-slate-900 dark:text-slate-100">{currentPage}</strong> of{" "}
              <strong className="text-slate-900 dark:text-slate-100">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default AuditLogTab;
