import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Trash2,
  EyeOff,
  User,
  ExternalLink,
  ShieldAlert,
  Clock
} from "lucide-react";
import type { ModeratedReport, ReportPriority } from "../types/report";

interface ReportsTableProps {
  reports: ModeratedReport[];
  onView: (report: ModeratedReport) => void;
  onAssignPriority: (id: string, priority: ReportPriority) => void;
  onStartInvestigation: (id: string) => void;
  onResolve: (id: string) => void;
  onReject: (id: string) => void;
  onWarnUser: (userId: string, userName: string) => void;
  onSuspendUser: (userId: string, userName: string) => void;
  onDeleteContent: (itemId: string) => void;
  onHideContent: (itemId: string) => void;
  onOpenProfile: (userId: string) => void;
}

export function ReportsTable({
  reports,
  onView,
  onAssignPriority,
  onStartInvestigation,
  onResolve,
  onReject,
  onWarnUser,
  onSuspendUser,
  onDeleteContent,
  onHideContent,
  onOpenProfile
}: ReportsTableProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPriorityBadgeStyles = (priority: ReportPriority) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-none";
      case "HIGH":
        return "bg-orange-100 text-orange-850 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-none";
      case "MEDIUM":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-none";
      case "LOW":
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-none";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-none";
      case "UNDER_INVESTIGATION":
        return "bg-indigo-50 text-indigo-750 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-none";
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-none";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-450 dark:border-none";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/5 dark:bg-ink-900 shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold tracking-wider text-slate-400 dark:border-white/5 dark:bg-white/[0.01] dark:text-slate-500 uppercase">
            <th className="px-6 py-4">Report ID</th>
            <th className="px-6 py-4">Type</th>
            <th className="px-6 py-4">Reporter</th>
            <th className="px-6 py-4">Reported Target</th>
            <th className="px-6 py-4">Context / Area</th>
            <th className="px-6 py-4">Reason</th>
            <th className="px-6 py-4">Priority</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Assigned Moderator</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {reports.map((report) => {
            return (
              <tr
                key={report._id}
                className="hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-colors"
              >
                {/* ID */}
                <td className="px-6 py-4 font-mono font-bold text-slate-550 dark:text-slate-400">
                  #{report._id.slice(-6).toUpperCase()}
                </td>

                {/* Type */}
                <td className="px-6 py-4">
                  <span className="rounded bg-indigo-50 px-2 py-0.5 font-bold uppercase text-[9px] tracking-wider text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {report.reportType}
                  </span>
                </td>

                {/* Reporter */}
                <td className="px-6 py-4 font-semibold text-slate-750 dark:text-slate-350">
                  {report.reporter.fullName}
                </td>

                {/* Reported Target */}
                <td className="px-6 py-4">
                  {report.reportedUser ? (
                    <div className="min-w-0">
                      <span className="block font-semibold text-slate-750 dark:text-slate-300 truncate">
                        {report.reportedUser.fullName}
                      </span>
                      <span className="block text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {report.reportedUser.department}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">N/A (Non-User)</span>
                  )}
                </td>

                {/* Context Area */}
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                  {report.linkedContent?.communityName || report.linkedContent?.eventName || "General Workspace"}
                </td>

                {/* Reason */}
                <td className="px-6 py-4">
                  <span className="font-semibold text-slate-750 dark:text-slate-300 line-clamp-1 max-w-[120px]" title={report.reason}>
                    {report.reason}
                  </span>
                </td>

                {/* Priority */}
                <td className="px-6 py-4">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${getPriorityBadgeStyles(report.priority)}`}>
                    {report.priority}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span className={`rounded-lg px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${getStatusBadgeStyles(report.status)}`}>
                    {report.status.replace("_", " ")}
                  </span>
                </td>

                {/* Assigned Mod */}
                <td className="px-6 py-4 text-slate-500 dark:text-slate-450 font-semibold">
                  {report.assignedModerator || (
                    <span className="text-[10px] text-slate-400 font-medium italic">Unassigned</span>
                  )}
                </td>

                {/* Actions Dropdown */}
                <td className="px-6 py-4 text-right relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === report._id ? null : report._id);
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-150 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer hover:bg-slate-50 hover:shadow-sm"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {activeDropdown === report._id && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-6 mt-1.5 z-20 w-48 origin-top-right rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg dark:border-white/5 dark:bg-ink-950 text-left animate-fade-up animate-duration-200"
                    >
                      <button
                        onClick={() => {
                          onView(report);
                          setActiveDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer"
                      >
                        <Eye size={13} />
                        View report
                      </button>

                      {report.status === "PENDING" && (
                        <button
                          onClick={() => {
                            onStartInvestigation(report._id);
                            setActiveDropdown(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer font-medium"
                        >
                          <Clock size={13} />
                          Start investigation
                        </button>
                      )}

                      {report.status !== "RESOLVED" && (
                        <button
                          onClick={() => {
                            onResolve(report._id);
                            setActiveDropdown(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer font-medium"
                        >
                          <CheckCircle size={13} />
                          Resolve report
                        </button>
                      )}

                      {report.status !== "REJECTED" && (
                        <button
                          onClick={() => {
                            onReject(report._id);
                            setActiveDropdown(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer font-medium"
                        >
                          <XCircle size={13} />
                          Reject report
                        </button>
                      )}

                      {report.reportedUser && (
                        <>
                          <div className="my-1 border-t border-slate-100 dark:border-white/5" />
                          <button
                            onClick={() => {
                              onWarnUser(report.reportedUser!._id, report.reportedUser!.fullName);
                              setActiveDropdown(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer"
                          >
                            <AlertTriangle size={13} className="text-amber-500" />
                            Warn user
                          </button>
                          <button
                            onClick={() => {
                              onSuspendUser(report.reportedUser!._id, report.reportedUser!.fullName);
                              setActiveDropdown(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer font-medium"
                          >
                            <Ban size={13} />
                            Suspend user
                          </button>
                          <button
                            onClick={() => {
                              onOpenProfile(report.reportedUser!._id);
                              setActiveDropdown(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer"
                          >
                            <User size={13} />
                            Open user profile
                          </button>
                        </>
                      )}

                      {report.linkedContent && (
                        <>
                          <div className="my-1 border-t border-slate-100 dark:border-white/5" />
                          <button
                            onClick={() => {
                              onHideContent(report._id);
                              setActiveDropdown(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer"
                          >
                            <EyeOff size={13} />
                            Hide related content
                          </button>
                          <button
                            onClick={() => {
                              onDeleteContent(report._id);
                              setActiveDropdown(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer font-medium"
                          >
                            <Trash2 size={13} />
                            Delete related content
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
