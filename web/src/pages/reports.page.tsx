import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  MessageSquare,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  Inbox,
  AlertOctagon,
  AlertTriangle,
  UserCheck
} from "lucide-react";
import { DashboardCard } from "../components/dashboard-card";
import { ConfirmationDialog } from "../components/confirmation-dialog";
import { ReportsTable } from "../components/reports-table";
import { ReportDetailsDrawer } from "../components/report-details-drawer";
import { useToastStore } from "../store/toast.store";
import type { ModeratedReport, ReportPriority, ReportStatus, ReportType } from "../types/report";

// Pre-seeded high-fidelity reports database
const INITIAL_REPORTS: ModeratedReport[] = [
  {
    _id: "rep-1",
    reportType: "USER",
    reason: "Harassment",
    description: "This student is sending insulting messages in the React Builders channel. Direct personal attacks and inappropriate language.",
    priority: "CRITICAL",
    status: "PENDING",
    reporter: {
      _id: "u-201",
      fullName: "Ananya Roy",
      email: "ananya.roy@college.edu",
      department: "Information Technology"
    },
    reportedUser: {
      _id: "u-102",
      fullName: "Vikram Malhotra",
      email: "vikram@college.edu",
      department: "Information Technology",
      status: "WARNED"
    },
    linkedContent: {
      body: "Shut up, you have no idea what you're talking about. Go back to primary school. Your code is absolute garbage.",
      communityName: "React Builders",
      commentId: "c-102"
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hrs ago
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    timeline: [
      { status: "SUBMITTED", label: "Report Submitted", date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), details: "Flagged by Ananya Roy for Harassment" }
    ],
    internalNotes: []
  },
  {
    _id: "rep-2",
    reportType: "POST",
    reason: "Academic Dishonesty",
    description: "The user is attempting to leak and sell exam questions for the final CSE-302 exam paper scheduled for tomorrow morning.",
    priority: "HIGH",
    status: "UNDER_INVESTIGATION",
    assignedModerator: "Moderator Swetha",
    reporter: {
      _id: "u-202",
      fullName: "Professor Sen",
      email: "sen.prof@college.edu",
      department: "Computer Science"
    },
    reportedUser: {
      _id: "u-101",
      fullName: "Kabir Mehta",
      email: "kabir.mehta@college.edu",
      department: "Computer Science",
      status: "ACTIVE"
    },
    linkedContent: {
      title: "Leak: Final Exams Questions for CSE-302",
      body: "Hey guys, I got a screenshot of the final exam paper for Computer Networks. Send me a DM with your student ID if you want a copy before tomorrow morning!",
      communityName: "CSE-3 study group",
      postId: "p-301"
    },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hrs ago
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    timeline: [
      { status: "SUBMITTED", label: "Report Submitted", date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), details: "Flagged by Professor Sen for Academic Dishonesty" },
      { status: "UNDER_INVESTIGATION", label: "Investigation Started", date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), moderator: "Moderator Swetha", details: "Reviewing CSE community feed logs" }
    ],
    internalNotes: [
      { id: "n-1", author: "Moderator Swetha", content: "Exam cell has been notified. We need to verify if these questions are authentic.", date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() }
    ]
  },
  {
    _id: "rep-3",
    reportType: "COMMENT",
    reason: "Spam",
    description: "Phishing links promoting easy money schemes are being posted under academic resource threads. User appears compromised.",
    priority: "LOW",
    status: "RESOLVED",
    assignedModerator: "Moderator Swetha",
    reporter: {
      _id: "u-203",
      fullName: "Rahul Das",
      email: "rahul.das@college.edu",
      department: "Computer Science"
    },
    reportedUser: {
      _id: "u-104",
      fullName: "Spammy Student",
      email: "spam.student@college.edu",
      department: "Business Administration",
      status: "SUSPENDED"
    },
    linkedContent: {
      body: "🔥 Earn $500 instantly by clicking this link and verifying your university email address. LINK: http://univ-airdrop.scam/claim",
      communityName: "Freshers 2026",
      commentId: "c-401"
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    timeline: [
      { status: "SUBMITTED", label: "Report Submitted", date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), details: "Flagged by Rahul Das for Spam" },
      { status: "UNDER_INVESTIGATION", label: "Investigation Started", date: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(), moderator: "Moderator Swetha" },
      { status: "RESOLVED", label: "Resolution Completed", date: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), moderator: "Moderator Swetha", details: "User account suspended, related comments hidden" }
    ],
    internalNotes: [
      { id: "n-2", author: "Moderator Swetha", content: "Phishing link verified. Banned/Suspended user immediately.", date: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString() }
    ],
    resolutionNotes: "The phishing comment has been hidden and the user account has been suspended to prevent further spread of phishing links.",
    moderatorComments: "Suspended target account. Spammed comment removed."
  },
  {
    _id: "rep-4",
    reportType: "COMMUNITY",
    reason: "Inappropriate Content",
    description: "The College Memes community is hosting offensive memes about professors and campus administrators. Violates community guideline standards.",
    priority: "MEDIUM",
    status: "PENDING",
    reporter: {
      _id: "u-204",
      fullName: "Professor Sen",
      email: "sen.prof@college.edu",
      department: "Computer Science"
    },
    linkedContent: {
      body: "Community guidelines prohibit explicit jokes targetting faculty members. The memes posted here contain direct insults and cyberbullying.",
      communityName: "College Memes"
    },
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    timeline: [
      { status: "SUBMITTED", label: "Report Submitted", date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), details: "Flagged by Professor Sen for Inappropriate Content" }
    ],
    internalNotes: []
  },
  {
    _id: "rep-5",
    reportType: "EVENT",
    reason: "Noise Disturbance",
    description: "Students are complaining that the late-night music festival event in the mechanical yard is causing severe noise pollution near the girls hostel.",
    priority: "HIGH",
    status: "REJECTED",
    assignedModerator: "Moderator Swetha",
    reporter: {
      _id: "u-205",
      fullName: "Hostel Warden",
      email: "warden@college.edu",
      department: "Campus Administration"
    },
    linkedContent: {
      body: "Mechanical Yard Late Night DJ Fest",
      eventName: "Mech Fest Night Party"
    },
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 44 * 60 * 60 * 1000).toISOString(),
    timeline: [
      { status: "SUBMITTED", label: "Report Submitted", date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
      { status: "UNDER_INVESTIGATION", label: "Investigation Started", date: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(), moderator: "Moderator Swetha" },
      { status: "REJECTED", label: "Report Rejected", date: new Date(Date.now() - 44 * 60 * 60 * 1000).toISOString(), moderator: "Moderator Swetha", details: "Event was officially permitted and ended at 10 PM sharp" }
    ],
    internalNotes: [
      { id: "n-3", author: "Moderator Swetha", content: "Checked yard logs, party ended exactly at 10:00 PM as permitted. Rejecting disturbance claim.", date: new Date(Date.now() - 45 * 60 * 60 * 1000).toISOString() }
    ]
  }
];

export function ReportsPage() {
  const { addToast } = useToastStore();
  const [reports, setReports] = useState<ModeratedReport[]>(INITIAL_REPORTS);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("ALL");
  const [filterDept, setFilterDept] = useState<string>("ALL");

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Drawer / Dialog State
  const [selectedReport, setSelectedReport] = useState<ModeratedReport | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "RESOLVE" | "REJECT" | "WARN" | "SUSPEND" | "DELETE_CONTENT" | "HIDE_CONTENT";
    reportId: string;
    userId?: string;
    userName?: string;
    resolutionNotes?: string;
    moderatorComments?: string;
  } | null>(null);

  const [warnReason, setWarnReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  // Unique departments for filter lists
  const departmentsList = useMemo(() => {
    return Array.from(new Set(reports.map((r) => r.reporter.department)));
  }, [reports]);

  // Simulate Refresh / Loading
  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => {
      setIsLoading(false);
      addToast("Reports queue refreshed from server", "success");
    }, 1200);
  };

  // Action Mutators
  const executeStartInvestigation = (id: string) => {
    setReports((current) =>
      current.map((r) =>
        r._id === id
          ? {
              ...r,
              status: "UNDER_INVESTIGATION",
              assignedModerator: "Moderator Swetha",
              timeline: [
                ...r.timeline,
                {
                  status: "UNDER_INVESTIGATION",
                  label: "Investigation Started",
                  date: new Date().toISOString(),
                  moderator: "Moderator Swetha",
                  details: "Assigned for review and investigation."
                }
              ]
            }
          : r
      )
    );
    // Sync Drawer
    setSelectedReport((curr) =>
      curr && curr._id === id
        ? {
            ...curr,
            status: "UNDER_INVESTIGATION",
            assignedModerator: "Moderator Swetha",
            timeline: [
              ...curr.timeline,
              {
                status: "UNDER_INVESTIGATION",
                label: "Investigation Started",
                date: new Date().toISOString(),
                moderator: "Moderator Swetha",
                details: "Assigned for review and investigation."
              }
            ]
          }
        : curr
    );
    addToast("Investigation Started", "info");
    addToast("Report Assigned to Moderator Swetha", "success");
  };

  const executeResolveReport = (id: string, notes: string, comments: string) => {
    setReports((current) =>
      current.map((r) =>
        r._id === id
          ? {
              ...r,
              status: "RESOLVED",
              resolutionNotes: notes,
              moderatorComments: comments,
              timeline: [
                ...r.timeline,
                {
                  status: "RESOLVED",
                  label: "Resolution Completed",
                  date: new Date().toISOString(),
                  moderator: "Moderator Swetha",
                  details: `Resolved: ${comments}`
                }
              ]
            }
          : r
      )
    );
    setSelectedReport((curr) =>
      curr && curr._id === id
        ? {
            ...curr,
            status: "RESOLVED",
            resolutionNotes: notes,
            moderatorComments: comments,
            timeline: [
              ...curr.timeline,
              {
                status: "RESOLVED",
                label: "Resolution Completed",
                date: new Date().toISOString(),
                moderator: "Moderator Swetha",
                details: `Resolved: ${comments}`
              }
            ]
          }
        : curr
    );
    addToast("Report Resolved successfully", "success");
  };

  const executeRejectReport = (id: string) => {
    setReports((current) =>
      current.map((r) =>
        r._id === id
          ? {
              ...r,
              status: "REJECTED",
              timeline: [
                ...r.timeline,
                {
                  status: "REJECTED",
                  label: "Report Rejected",
                  date: new Date().toISOString(),
                  moderator: "Moderator Swetha",
                  details: "Claim investigated and rejected by administrator."
                }
              ]
            }
          : r
      )
    );
    setSelectedReport((curr) =>
      curr && curr._id === id
        ? {
            ...curr,
            status: "REJECTED",
            timeline: [
              ...curr.timeline,
              {
                status: "REJECTED",
                label: "Report Rejected",
                date: new Date().toISOString(),
                moderator: "Moderator Swetha",
                details: "Claim investigated and rejected by administrator."
              }
            ]
          }
        : curr
    );
    addToast("Report Rejected", "warning");
  };

  const executeAddNote = (id: string, content: string) => {
    const newNote = {
      id: `note-${Date.now()}`,
      author: "Moderator Swetha",
      content,
      date: new Date().toISOString()
    };
    setReports((current) =>
      current.map((r) =>
        r._id === id
          ? { ...r, internalNotes: [...r.internalNotes, newNote] }
          : r
      )
    );
    setSelectedReport((curr) =>
      curr && curr._id === id
        ? { ...curr, internalNotes: [...curr.internalNotes, newNote] }
        : curr
    );
    addToast("Internal Note added", "success");
  };

  const executeWarnUser = (userId: string, userName: string, reason: string) => {
    setReports((current) =>
      current.map((r) =>
        r.reportedUser?._id === userId
          ? { ...r, reportedUser: { ...r.reportedUser, status: "WARNED" } }
          : r
      )
    );
    setSelectedReport((curr) =>
      curr && curr.reportedUser?._id === userId
        ? { ...curr, reportedUser: { ...curr.reportedUser, status: "WARNED" } }
        : curr
    );
    addToast(`User ${userName} warned: "${reason}"`, "warning");
  };

  const executeSuspendUser = (userId: string, userName: string, reason: string) => {
    setReports((current) =>
      current.map((r) =>
        r.reportedUser?._id === userId
          ? { ...r, reportedUser: { ...r.reportedUser, status: "SUSPENDED" } }
          : r
      )
    );
    setSelectedReport((curr) =>
      curr && curr.reportedUser?._id === userId
        ? { ...curr, reportedUser: { ...curr.reportedUser, status: "SUSPENDED" } }
        : curr
    );
    addToast(`User ${userName} suspended: "${reason}"`, "error");
  };

  const executeDeleteContent = (reportId: string) => {
    setReports((current) =>
      current.map((r) =>
        r._id === reportId && r.linkedContent
          ? {
              ...r,
              linkedContent: { ...r.linkedContent, body: "[Deleted by Administrator]" },
              timeline: [
                ...r.timeline,
                {
                  status: "ACTION_TAKEN",
                  label: "Related Content Deleted",
                  date: new Date().toISOString(),
                  moderator: "Moderator Swetha"
                }
              ]
            }
          : r
      )
    );
    setSelectedReport((curr) =>
      curr && curr._id === reportId && curr.linkedContent
        ? {
            ...curr,
            linkedContent: { ...curr.linkedContent, body: "[Deleted by Administrator]" },
            timeline: [
              ...curr.timeline,
              {
                status: "ACTION_TAKEN",
                label: "Related Content Deleted",
                date: new Date().toISOString(),
                moderator: "Moderator Swetha"
              }
            ]
          }
        : curr
    );
    addToast("Reported Content Deleted from feed", "success");
  };

  const executeHideContent = (reportId: string) => {
    setReports((current) =>
      current.map((r) =>
        r._id === reportId && r.linkedContent
          ? {
              ...r,
              linkedContent: { ...r.linkedContent, body: "[Hidden by Administrator]" },
              timeline: [
                ...r.timeline,
                {
                  status: "ACTION_TAKEN",
                  label: "Related Content Hidden",
                  date: new Date().toISOString(),
                  moderator: "Moderator Swetha"
                }
              ]
            }
          : r
      )
    );
    setSelectedReport((curr) =>
      curr && curr._id === reportId && curr.linkedContent
        ? {
            ...curr,
            linkedContent: { ...curr.linkedContent, body: "[Hidden by Administrator]" },
            timeline: [
              ...curr.timeline,
              {
                status: "ACTION_TAKEN",
                label: "Related Content Hidden",
                date: new Date().toISOString(),
                moderator: "Moderator Swetha"
              }
            ]
          }
        : curr
    );
    addToast("Reported Content Hidden from feed", "warning");
  };

  const executeUpdatePriority = (id: string, priority: ReportPriority) => {
    setReports((current) => current.map((r) => (r._id === id ? { ...r, priority } : r)));
    setSelectedReport((curr) => (curr && curr._id === id ? { ...curr, priority } : curr));
    addToast(`Report priority updated to ${priority}`, "info");
  };

  // Confirm dialog processor
  const handleConfirmAction = () => {
    if (!confirmDialog) return;
    const { type, reportId, userId, userName, resolutionNotes, moderatorComments } = confirmDialog;

    switch (type) {
      case "RESOLVE":
        if (resolutionNotes) executeResolveReport(reportId, resolutionNotes, moderatorComments || "");
        break;
      case "REJECT":
        executeRejectReport(reportId);
        break;
      case "WARN":
        if (userId && userName) executeWarnUser(userId, userName, warnReason || "Violation of rules");
        setWarnReason("");
        break;
      case "SUSPEND":
        if (userId && userName) executeSuspendUser(userId, userName, suspendReason || "Severe policy breach");
        setSuspendReason("");
        break;
      case "DELETE_CONTENT":
        executeDeleteContent(reportId);
        break;
      case "HIDE_CONTENT":
        executeHideContent(reportId);
        break;
      default:
        break;
    }

    setConfirmDialog(null);
  };

  const handleResetFilters = () => {
    setFilterType("ALL");
    setFilterPriority("ALL");
    setFilterStatus("ALL");
    setFilterDate("ALL");
    setFilterDept("ALL");
    setSearchTerm("");
  };

  // Statistics Computations
  const stats = useMemo(() => {
    return {
      total: reports.length,
      pending: reports.filter((r) => r.status === "PENDING").length,
      investigating: reports.filter((r) => r.status === "UNDER_INVESTIGATION").length,
      resolved: reports.filter((r) => r.status === "RESOLVED").length,
      rejected: reports.filter((r) => r.status === "REJECTED").length,
      highPriority: reports.filter((r) => r.priority === "CRITICAL" || r.priority === "HIGH").length
    };
  }, [reports]);

  // Filtering Logic
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // 1. Search Query Match
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesId = report._id.toLowerCase().includes(query);
        const matchesReporter = report.reporter.fullName.toLowerCase().includes(query);
        const matchesReported = report.reportedUser?.fullName.toLowerCase().includes(query) ?? false;
        const matchesReason = report.reason.toLowerCase().includes(query);
        const matchesCommunity = report.linkedContent?.communityName?.toLowerCase().includes(query) ?? false;
        const matchesEvent = report.linkedContent?.eventName?.toLowerCase().includes(query) ?? false;
        const matchesPostTitle = report.linkedContent?.title?.toLowerCase().includes(query) ?? false;
        const matchesContent = report.linkedContent?.body?.toLowerCase().includes(query) ?? false;

        if (
          !matchesId &&
          !matchesReporter &&
          !matchesReported &&
          !matchesReason &&
          !matchesCommunity &&
          !matchesEvent &&
          !matchesPostTitle &&
          !matchesContent
        ) {
          return false;
        }
      }

      // 2. Filters matches
      if (filterType !== "ALL" && report.reportType !== filterType) return false;
      if (filterPriority !== "ALL" && report.priority !== filterPriority) return false;
      if (filterStatus !== "ALL" && report.status !== filterStatus) return false;
      if (filterDept !== "ALL" && report.reporter.department !== filterDept) return false;
      if (filterDate !== "ALL") {
        const itemTime = new Date(report.createdAt).getTime();
        const now = Date.now();
        if (filterDate === "TODAY" && now - itemTime > 24 * 60 * 60 * 1000) return false;
        if (filterDate === "WEEK" && now - itemTime > 7 * 24 * 60 * 60 * 1000) return false;
        if (filterDate === "MONTH" && now - itemTime > 30 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [reports, searchTerm, filterType, filterPriority, filterStatus, filterDate, filterDept]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, currentPage]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-500 dark:text-slate-400">Reports Management</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Reports Management
          </h2>
        </div>
      </div>

      {/* Error State Trigger (Simulated for validation checks) */}
      {hasError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-250 bg-rose-50/20 py-12 px-6 text-center dark:border-rose-950/20">
          <div className="flex size-11 items-center justify-center rounded-xl bg-rose-100 text-rose-650 dark:bg-rose-950 dark:text-rose-400">
            <AlertOctagon size={22} />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
            Failed to load reports queue
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            There was a connection issue loading report records from the database. Please try again.
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 rounded-xl bg-rose-650 hover:opacity-95 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {/* Stats KPI Section */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6 animate-fade-up">
            <DashboardCard
              title="Total Reports"
              value={stats.total}
              icon={<Shield size={16} />}
              trend={{ value: "Report tickets", isPositive: true }}
            />
            <DashboardCard
              title="Pending"
              value={stats.pending}
              icon={<Clock size={16} />}
              trend={{ value: "Awaiting Moderator", isPositive: false }}
            />
            <DashboardCard
              title="Under Investigation"
              value={stats.investigating}
              icon={<Search size={16} />}
              trend={{ value: "Active reviews", isPositive: true }}
            />
            <DashboardCard
              title="Resolved"
              value={stats.resolved}
              icon={<CheckCircle size={16} />}
              trend={{ value: "Cleared reports", isPositive: true }}
            />
            <DashboardCard
              title="Rejected"
              value={stats.rejected}
              icon={<XCircle size={16} />}
              trend={{ value: "Dismissed claims", isPositive: true }}
            />
            <DashboardCard
              title="High Priority"
              value={stats.highPriority}
              icon={<AlertTriangle size={16} />}
              trend={{ value: "Critical review", isPositive: false }}
            />
          </div>

          {/* Search & Filter Toolbar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-4 animate-fade-up">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search bar */}
              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by ID, reporter, reported user, community, post, reason..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-450 focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
                />
              </div>

              {/* Advanced buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold shadow-sm cursor-pointer transition ${
                    showFilters
                      ? "border-indigo-500 bg-indigo-50 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <Filter size={14} />
                  Filters
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350 dark:hover:bg-white/[0.04] cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-4 py-2 text-xs font-semibold shadow-sm transition dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350 dark:hover:bg-white/[0.04] cursor-pointer"
                >
                  Reset All
                </button>
              </div>
            </div>

            {/* Filter selectors grid */}
            {showFilters && (
              <div className="grid gap-3 pt-3 border-t border-slate-100 dark:border-white/5 grid-cols-2 md:grid-cols-5 animate-fade-down">
                {/* Type select */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Report Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
                  >
                    <option value="ALL">All Types</option>
                    <option value="USER">User</option>
                    <option value="POST">Post</option>
                    <option value="COMMENT">Comment</option>
                    <option value="COMMUNITY">Community</option>
                    <option value="EVENT">Event</option>
                  </select>
                </div>

                {/* Priority select */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={filterPriority}
                    onChange={(e) => {
                      setFilterPriority(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                {/* Status select */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="UNDER_INVESTIGATION">Under Investigation</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {/* Date select */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Date Range
                  </label>
                  <select
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
                  >
                    <option value="ALL">All Time</option>
                    <option value="TODAY">Today</option>
                    <option value="WEEK">Last 7 Days</option>
                    <option value="MONTH">Last 30 Days</option>
                  </select>
                </div>

                {/* Department select */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Reporter Dept
                  </label>
                  <select
                    value={filterDept}
                    onChange={(e) => {
                      setFilterDept(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
                  >
                    <option value="ALL">All Departments</option>
                    {departmentsList.map((dept, idx) => (
                      <option key={idx} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Skeleton Loaders during refresh trigger */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-14 rounded-2xl bg-slate-100 dark:bg-white/[0.02] animate-pulse border border-slate-200/50 dark:border-white/5" />
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white py-16 px-6 text-center dark:border-white/5 dark:bg-ink-900 shadow-sm animate-fade-up">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Inbox size={26} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white leading-none">
                No reports available
              </h3>
              <p className="mt-2 max-w-sm text-xs text-slate-450 dark:text-slate-500 leading-relaxed">
                No reports match your active search terms or advanced filter parameters. Please reset filters or reload.
              </p>
              <button
                onClick={handleRefresh}
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold shadow-sm transition dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350 dark:hover:bg-white/[0.04] cursor-pointer"
              >
                <RefreshCw size={12} />
                Refresh Queue
              </button>
            </div>
          ) : (
            /* Reports Listing Table */
            <div className="space-y-4 animate-fade-up">
              <ReportsTable
                reports={paginatedReports}
                onView={(report) => setSelectedReport(report)}
                onAssignPriority={executeUpdatePriority}
                onStartInvestigation={executeStartInvestigation}
                onResolve={(id) => setConfirmDialog({ isOpen: true, type: "RESOLVE", reportId: id, resolutionNotes: "Issue resolved successfully", moderatorComments: "Resolved reports claim." })}
                onReject={(id) => setConfirmDialog({ isOpen: true, type: "REJECT", reportId: id })}
                onWarnUser={(userId, userName) => setConfirmDialog({ isOpen: true, type: "WARN", reportId: "", userId, userName })}
                onSuspendUser={(userId, userName) => setConfirmDialog({ isOpen: true, type: "SUSPEND", reportId: "", userId, userName })}
                onDeleteContent={(id) => setConfirmDialog({ isOpen: true, type: "DELETE_CONTENT", reportId: id })}
                onHideContent={(id) => setConfirmDialog({ isOpen: true, type: "HIDE_CONTENT", reportId: id })}
                onOpenProfile={(userId) => {
                  const user = reports.find(r => r.reportedUser?._id === userId)?.reportedUser;
                  if (user) {
                    addToast(`Viewing student profile: ${user.fullName}`, "success");
                  }
                }}
              />

              {/* Pagination block */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-ink-900 border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                  <span className="text-xs text-slate-455 dark:text-slate-500">
                    Showing <span className="font-semibold text-slate-700 dark:text-slate-350">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-350">
                      {Math.min(currentPage * itemsPerPage, filteredReports.length)}
                    </span>{" "}
                    of <span className="font-semibold text-slate-700 dark:text-slate-350">{filteredReports.length}</span> reports
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex size-8 items-center justify-center rounded-lg border border-slate-250 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const page = idx + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`flex size-8 items-center justify-center rounded-lg text-xs font-bold transition cursor-pointer border ${
                            currentPage === page
                              ? "bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500"
                              : "border-slate-250 dark:border-white/5 text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-white/[0.02]"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="flex size-8 items-center justify-center rounded-lg border border-slate-250 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Slide-out details drawer */}
      <ReportDetailsDrawer
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onUpdatePriority={executeUpdatePriority}
        onStartInvestigation={executeStartInvestigation}
        onResolveReport={(id, notes, comments) => setConfirmDialog({ isOpen: true, type: "RESOLVE", reportId: id, resolutionNotes: notes, moderatorComments: comments })}
        onRejectReport={(id) => setConfirmDialog({ isOpen: true, type: "REJECT", reportId: id })}
        onAddNote={executeAddNote}
        onWarnUser={(userId, userName) => setConfirmDialog({ isOpen: true, type: "WARN", reportId: "", userId, userName })}
        onSuspendUser={(userId, userName) => setConfirmDialog({ isOpen: true, type: "SUSPEND", reportId: "", userId, userName })}
      />

      {/* Confirmation Dialogs Portal */}
      {confirmDialog && (
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={
            confirmDialog.type === "RESOLVE"
              ? "Resolve Report?"
              : confirmDialog.type === "REJECT"
              ? "Reject Report?"
              : confirmDialog.type === "DELETE_CONTENT"
              ? "Delete Linked Content?"
              : confirmDialog.type === "HIDE_CONTENT"
              ? "Hide Linked Content?"
              : confirmDialog.type === "WARN"
              ? `Warn User: ${confirmDialog.userName}?`
              : `Suspend User: ${confirmDialog.userName}?`
          }
          message={
            confirmDialog.type === "RESOLVE"
              ? "Confirm that you wish to resolve this report. This indicates that investigation has concluded and actions have been finalized."
              : confirmDialog.type === "REJECT"
              ? "Are you sure you want to reject this report? This will mark the ticket as invalid or dismissed."
              : confirmDialog.type === "DELETE_CONTENT"
              ? "Are you sure you want to delete the linked content reported in this ticket? This will permanently delete the post/comment."
              : confirmDialog.type === "SUSPEND"
              ? `Are you sure you want to suspend student ${confirmDialog.userName}? This will block their campus account from participating in communities.`
              : confirmDialog.type === "WARN"
              ? `Are you sure you want to issue a formal warning to ${confirmDialog.userName}? This will be logged on their account file.`
              : `Confirm that you wish to perform the "${confirmDialog.type.toLowerCase().replace("_", " ")}" action.`
          }
          warning={
            confirmDialog.type === "DELETE_CONTENT"
              ? "Warning: Linked post/comment will be permanently deleted from the database."
              : confirmDialog.type === "SUSPEND"
              ? "Warning: The student will lose access to the platform."
              : undefined
          }
          confirmText={
            confirmDialog.type === "RESOLVE"
              ? "Resolve Report"
              : confirmDialog.type === "REJECT"
              ? "Reject and Dismiss"
              : confirmDialog.type === "DELETE_CONTENT"
              ? "Delete Content"
              : confirmDialog.type === "SUSPEND"
              ? "Suspend student"
              : confirmDialog.type === "WARN"
              ? "Issue Warning"
              : "Confirm action"
          }
          isDestructive={
            confirmDialog.type === "REJECT" ||
            confirmDialog.type === "DELETE_CONTENT" ||
            confirmDialog.type === "SUSPEND"
          }
          onConfirm={handleConfirmAction}
          onCancel={() => {
            setConfirmDialog(null);
            setWarnReason("");
            setSuspendReason("");
          }}
        />
      )}

      {/* Secondary Warning Modal overlay for inputting Warning Reason */}
      {confirmDialog && confirmDialog.type === "WARN" && (
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4 bg-slate-950/20 backdrop-blur-[2px]">
          <div className="relative my-8 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/5 dark:bg-ink-900 animate-scale-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-650 dark:bg-amber-500/10 dark:text-amber-455">
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                Reason for Warning
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              Describe the violation that will be logged and sent to the student.
            </p>
            <textarea
              value={warnReason}
              onChange={(e) => setWarnReason(e.target.value)}
              placeholder="e.g. Using insulting terms under React Builders channel."
              className="w-full h-20 rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 dark:border-white/5 dark:bg-white/[0.02] dark:text-white resize-none outline-none focus:border-indigo-500"
            />
            <div className="mt-4 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={() => setConfirmDialog(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:text-slate-400 dark:hover:bg-white/[0.03] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={!warnReason.trim()}
                className="rounded-xl bg-indigo-650 text-white px-4 py-2 text-xs font-semibold hover:opacity-95 shadow cursor-pointer disabled:opacity-50"
              >
                Issue Warning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Warning Modal overlay for inputting Suspension Reason */}
      {confirmDialog && confirmDialog.type === "SUSPEND" && (
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4 bg-slate-950/20 backdrop-blur-[2px]">
          <div className="relative my-8 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/5 dark:bg-ink-900 animate-scale-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-455">
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                Reason for Suspension
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              Describe the reason for the account suspension.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="e.g. Attempted exam paper leak under CSE group."
              className="w-full h-20 rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 dark:border-white/5 dark:bg-white/[0.02] dark:text-white resize-none outline-none focus:border-indigo-500"
            />
            <div className="mt-4 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={() => setConfirmDialog(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:text-slate-400 dark:hover:bg-white/[0.03] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={!suspendReason.trim()}
                className="rounded-xl bg-rose-600 text-white px-4 py-2 text-xs font-semibold hover:opacity-95 shadow cursor-pointer disabled:opacity-50"
              >
                Suspend User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
