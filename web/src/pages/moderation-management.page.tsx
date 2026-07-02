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
  Image as ImageIcon,
  ShieldAlert,
  Clock,
  Trash2,
  EyeOff,
  CornerDownRight,
  Inbox,
  AlertTriangle
} from "lucide-react";
import { DashboardCard } from "../components/dashboard-card";
import { ConfirmationDialog } from "../components/confirmation-dialog";
import { ModerationTable } from "../components/moderation-table";
import { ContentPreviewDrawer } from "../components/content-preview-drawer";
import { ModerationQueue, type QueueType } from "../components/moderation-queue";
import { useToastStore } from "../store/toast.store";
import type { ModeratedContent, VisibilityStatus, ModerationStatus } from "../types/moderation";

// Pre-seeded mock content database
const INITIAL_MODERATION_ITEMS: ModeratedContent[] = [
  {
    _id: "mod-1",
    title: "Leak: Final Exams Questions for CSE-302",
    content: "Hey guys, I got a screenshot of the final exam paper for Computer Networks. Send me a DM with your student ID if you want a copy before tomorrow morning!",
    contentType: "POST",
    author: {
      _id: "u-101",
      fullName: "Kabir Mehta",
      email: "kabir.mehta@college.edu",
      department: "Computer Science",
      status: "ACTIVE"
    },
    community: {
      _id: "c-1",
      name: "CSE-302 Study Group"
    },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hrs ago
    reportsCount: 5,
    reports: [
      { id: "r-1", reporter: "Aarav Sharma", reason: "Academic Dishonesty", date: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString() },
      { id: "r-2", reporter: "Diya Roy", reason: "Academic Dishonesty", date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
      { id: "r-3", reporter: "Professor Sen", reason: "Academic Dishonesty", date: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString() },
      { id: "r-4", reporter: "Rohan Das", reason: "Academic Dishonesty", date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { id: "r-5", reporter: "Swetha Lakshmi", reason: "Spam", date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() }
    ],
    visibilityStatus: "VISIBLE",
    moderationStatus: "PENDING",
    pinned: false,
    commentsLocked: false,
    moderationHistory: []
  },
  {
    _id: "mod-2",
    content: "Shut up, you have no idea what you're talking about. Go back to primary school. Your code is absolute garbage.",
    contentType: "COMMENT",
    author: {
      _id: "u-102",
      fullName: "Vikram Malhotra",
      email: "vikram@college.edu",
      department: "Information Technology",
      status: "WARNED"
    },
    community: {
      _id: "c-2",
      name: "React Builders"
    },
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    reportsCount: 3,
    reports: [
      { id: "r-6", reporter: "Aanya Gupta", reason: "Harassment", date: new Date(Date.now() - 7.5 * 60 * 60 * 1000).toISOString() },
      { id: "r-7", reporter: "Dev Patel", reason: "Harassment", date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
      { id: "r-8", reporter: "Nikhil Rao", reason: "Hate Speech", date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() }
    ],
    visibilityStatus: "VISIBLE",
    moderationStatus: "PENDING",
    moderationHistory: []
  },
  {
    _id: "mod-3",
    title: "Leaked PDF Textbook: Introduction to Algorithms 4th Edition",
    content: "Found the official digital copy of the CLRS textbook. Uploading the PDF here so you guys don't have to spend $80 at the bookstore. Happy studying!",
    contentType: "FILE",
    author: {
      _id: "u-103",
      fullName: "Rohan Sharma",
      email: "rohan.sharma@college.edu",
      department: "Computer Science",
      status: "ACTIVE"
    },
    community: {
      _id: "c-3",
      name: "Algorithms Forum"
    },
    createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(), // 28 hrs ago
    reportsCount: 2,
    reports: [
      { id: "r-9", reporter: "Library Admin", reason: "Copyright Violation", date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      { id: "r-10", reporter: "Professor Sen", reason: "Copyright Violation", date: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() }
    ],
    visibilityStatus: "VISIBLE",
    moderationStatus: "PENDING",
    attachments: [
      { name: "CLRS_algorithms_4th_ed.pdf", type: "file", url: "#", size: "45.2 MB" }
    ],
    moderationHistory: []
  },
  {
    _id: "mod-4",
    title: "Cryptocurrency Airdrop & Easy Money Hack",
    content: "🔥 Earn $500 instantly by clicking this link and verifying your university email address. Limited spots available! 🚀 LINK: http://univ-airdrop.scam/claim",
    contentType: "POST",
    author: {
      _id: "u-104",
      fullName: "Spammy Student",
      email: "spam.student@college.edu",
      department: "Business Administration",
      status: "SUSPENDED"
    },
    community: {
      _id: "c-4",
      name: "Campus Marketplace"
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reportsCount: 6,
    reports: [
      { id: "r-11", reporter: "System Bot", reason: "Spam", date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { id: "r-12", reporter: "Ananya Roy", reason: "Spam", date: new Date(Date.now() - 1.8 * 60 * 60 * 1000).toISOString() },
      { id: "r-13", reporter: "Rahul Sen", reason: "Spam", date: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString() }
    ],
    visibilityStatus: "HIDDEN",
    moderationStatus: "REJECTED",
    moderationHistory: [
      { moderator: "Admin Swetha", actionTaken: "HIDE_CONTENT", reason: "Phishing spam link detected", timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString() }
    ]
  },
  {
    _id: "mod-5",
    title: "Awesome React 19 features coming soon",
    content: "Just read the official react blog. The new Server Actions and useOptimistic hooks are going to simplify async state transitions completely. Who is ready to upgrade?",
    contentType: "POST",
    author: {
      _id: "u-105",
      fullName: "Isha Patel",
      email: "isha.patel@college.edu",
      department: "Information Technology",
      status: "ACTIVE"
    },
    community: {
      _id: "c-2",
      name: "React Builders"
    },
    createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    reportsCount: 0,
    reports: [],
    visibilityStatus: "VISIBLE",
    moderationStatus: "APPROVED",
    pinned: true,
    commentsLocked: false,
    moderationHistory: [
      { moderator: "Admin Swetha", actionTaken: "APPROVE_CONTENT", reason: "High quality informative post", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
    ]
  },
  {
    _id: "mod-6",
    content: "Meme contest flyer submission for next weekend's campus fest.",
    contentType: "IMAGE",
    author: {
      _id: "u-106",
      fullName: "Tanmay Das",
      email: "tanmay.das@college.edu",
      department: "Mechanical Engineering",
      status: "ACTIVE"
    },
    community: {
      _id: "c-5",
      name: "College Memes"
    },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    reportsCount: 4,
    reports: [
      { id: "r-14", reporter: "Diya Roy", reason: "Inappropriate Content", date: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString() },
      { id: "r-15", reporter: "Aarav Sharma", reason: "Inappropriate Content", date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
      { id: "r-16", reporter: "Prof. Das", reason: "Inappropriate Content", date: new Date(Date.now() - 3.8 * 60 * 60 * 1000).toISOString() },
      { id: "r-17", reporter: "Library Staff", reason: "Inappropriate Content", date: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString() }
    ],
    visibilityStatus: "VISIBLE",
    moderationStatus: "PENDING",
    attachments: [
      { name: "inappropriate_meme.jpg", type: "image", url: "#" }
    ],
    moderationHistory: []
  }
];

export function EventsManagementPage() {
  // Wait, let's export as ModerationManagementPage
  return null;
}

export function ModerationManagementPage() {
  const { addToast } = useToastStore();
  const [items, setItems] = useState<ModeratedContent[]>(INITIAL_MODERATION_ITEMS);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeQueue, setActiveQueue] = useState<QueueType>("ALL");

  // Advanced Filters
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterCommunity, setFilterCommunity] = useState<string>("ALL");
  const [filterDept, setFilterDept] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterReports, setFilterReports] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("ALL");

  // Drawer / Modals State
  const [selectedItem, setSelectedItem] = useState<ModeratedContent | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "HIDE" | "RESTORE" | "DELETE" | "LOCK" | "UNLOCK" | "PIN" | "UNPIN" | "WARN" | "SUSPEND" | "APPROVE";
    itemId: string;
    userId?: string;
    userName?: string;
  } | null>(null);

  const [warnReason, setWarnReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Reset Filters handler
  const handleResetFilters = () => {
    setFilterType("ALL");
    setFilterCommunity("ALL");
    setFilterDept("ALL");
    setFilterStatus("ALL");
    setFilterReports("ALL");
    setFilterDate("ALL");
    setSearchTerm("");
  };

  // List of unique communities & departments for filter selectors
  const communitiesList = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.community.name)));
  }, [items]);

  const departmentsList = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.author.department)));
  }, [items]);

  // Moderation Logic Mutators
  const executeApprove = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item._id === id
          ? {
              ...item,
              moderationStatus: "APPROVED",
              moderationHistory: [
                ...item.moderationHistory,
                {
                  moderator: "Admin Swetha",
                  actionTaken: "APPROVE_CONTENT",
                  reason: "Content approved and cleared of reports",
                  timestamp: new Date().toISOString()
                }
              ]
            }
          : item
      )
    );
    // Sync active drawer inspection view
    setSelectedItem((curr) =>
      curr && curr._id === id
        ? {
            ...curr,
            moderationStatus: "APPROVED",
            moderationHistory: [
              ...curr.moderationHistory,
              {
                moderator: "Admin Swetha",
                actionTaken: "APPROVE_CONTENT",
                reason: "Content approved and cleared of reports",
                timestamp: new Date().toISOString()
              }
            ]
          }
        : curr
    );
    addToast("Content Approved Successfully", "success");
  };

  const executeHide = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item._id === id
          ? {
              ...item,
              visibilityStatus: "HIDDEN",
              moderationStatus: "REJECTED",
              moderationHistory: [
                ...item.moderationHistory,
                {
                  moderator: "Admin Swetha",
                  actionTaken: "HIDE_CONTENT",
                  reason: "Flagged content hidden from community view",
                  timestamp: new Date().toISOString()
                }
              ]
            }
          : item
      )
    );
    setSelectedItem((curr) =>
      curr && curr._id === id
        ? {
            ...curr,
            visibilityStatus: "HIDDEN",
            moderationStatus: "REJECTED",
            moderationHistory: [
              ...curr.moderationHistory,
              {
                moderator: "Admin Swetha",
                actionTaken: "HIDE_CONTENT",
                reason: "Flagged content hidden from community view",
                timestamp: new Date().toISOString()
              }
            ]
          }
        : curr
    );
    addToast("Content Hidden from feed", "warning");
  };

  const executeRestore = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item._id === id
          ? {
              ...item,
              visibilityStatus: "VISIBLE",
              moderationStatus: "APPROVED",
              moderationHistory: [
                ...item.moderationHistory,
                {
                  moderator: "Admin Swetha",
                  actionTaken: "RESTORE_CONTENT",
                  reason: "Content restored by administrator",
                  timestamp: new Date().toISOString()
                }
              ]
            }
          : item
      )
    );
    setSelectedItem((curr) =>
      curr && curr._id === id
        ? {
            ...curr,
            visibilityStatus: "VISIBLE",
            moderationStatus: "APPROVED",
            moderationHistory: [
              ...curr.moderationHistory,
              {
                moderator: "Admin Swetha",
                actionTaken: "RESTORE_CONTENT",
                reason: "Content restored by administrator",
                timestamp: new Date().toISOString()
              }
            ]
          }
        : curr
    );
    addToast("Content Restored successfully", "success");
  };

  const executeDelete = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item._id === id
          ? {
              ...item,
              visibilityStatus: "DELETED",
              moderationStatus: "REJECTED",
              moderationHistory: [
                ...item.moderationHistory,
                {
                  moderator: "Admin Swetha",
                  actionTaken: "DELETE_CONTENT",
                  reason: "Content deleted permanently from workspace",
                  timestamp: new Date().toISOString()
                }
              ]
            }
          : item
      )
    );
    setSelectedItem((curr) =>
      curr && curr._id === id
        ? {
            ...curr,
            visibilityStatus: "DELETED",
            moderationStatus: "REJECTED",
            moderationHistory: [
              ...curr.moderationHistory,
              {
                moderator: "Admin Swetha",
                actionTaken: "DELETE_CONTENT",
                reason: "Content deleted permanently from workspace",
                timestamp: new Date().toISOString()
              }
            ]
          }
        : curr
    );
    addToast("Content Deleted permanently", "success");
  };

  const executeTogglePin = (id: string) => {
    let newPinned = false;
    setItems((current) =>
      current.map((item) => {
        if (item._id === id) {
          newPinned = !item.pinned;
          return { ...item, pinned: newPinned };
        }
        return item;
      })
    );
    addToast(newPinned ? "Post Pinned in Community" : "Post Unpinned", "success");
  };

  const executeToggleLock = (id: string) => {
    let newLocked = false;
    setItems((current) =>
      current.map((item) => {
        if (item._id === id) {
          newLocked = !item.commentsLocked;
          return { ...item, commentsLocked: newLocked };
        }
        return item;
      })
    );
    addToast(newLocked ? "Comments Locked" : "Comments Unlocked", "warning");
  };

  const executeWarnUser = (userId: string, userName: string, reason: string) => {
    setItems((current) =>
      current.map((item) =>
        item.author._id === userId
          ? { ...item, author: { ...item.author, status: "WARNED" } }
          : item
      )
    );
    setSelectedItem((curr) =>
      curr && curr.author._id === userId
        ? { ...curr, author: { ...curr.author, status: "WARNED" } }
        : curr
    );
    addToast(`User ${userName} warned: "${reason}"`, "warning");
  };

  const executeSuspendUser = (userId: string, userName: string, reason: string) => {
    setItems((current) =>
      current.map((item) =>
        item.author._id === userId
          ? { ...item, author: { ...item.author, status: "SUSPENDED" } }
          : item
      )
    );
    setSelectedItem((curr) =>
      curr && curr.author._id === userId
        ? { ...curr, author: { ...curr.author, status: "SUSPENDED" } }
        : curr
    );
    addToast(`User ${userName} suspended: "${reason}"`, "error");
  };

  // Confirm Actions Handler
  const handleConfirmAction = () => {
    if (!confirmDialog) return;
    const { type, itemId, userId, userName } = confirmDialog;

    switch (type) {
      case "APPROVE":
        executeApprove(itemId);
        break;
      case "HIDE":
        executeHide(itemId);
        break;
      case "RESTORE":
        executeRestore(itemId);
        break;
      case "DELETE":
        executeDelete(itemId);
        break;
      case "PIN":
      case "UNPIN":
        executeTogglePin(itemId);
        break;
      case "LOCK":
      case "UNLOCK":
        executeToggleLock(itemId);
        break;
      case "WARN":
        if (userId && userName) executeWarnUser(userId, userName, warnReason || "Violation of code of conduct");
        setWarnReason("");
        break;
      case "SUSPEND":
        if (userId && userName) executeSuspendUser(userId, userName, suspendReason || "Severe policy violation");
        setSuspendReason("");
        break;
      default:
        break;
    }

    setConfirmDialog(null);
  };

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search Query Match
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query) ?? false;
        const matchesContent = item.content.toLowerCase().includes(query);
        const matchesAuthor = item.author.fullName.toLowerCase().includes(query);
        const matchesCommunity = item.community.name.toLowerCase().includes(query);
        const matchesId = item._id.toLowerCase().includes(query);
        if (!matchesTitle && !matchesContent && !matchesAuthor && !matchesCommunity && !matchesId) {
          return false;
        }
      }

      // 2. Queue Tab Filter
      if (activeQueue === "PENDING" && item.moderationStatus !== "PENDING") return false;
      if (activeQueue === "HIGH_PRIORITY" && item.reportsCount < 4) return false;
      if (activeQueue === "REPEAT_OFFENDERS" && item.author.status === "ACTIVE") return false;
      if (activeQueue === "RECENT") {
        const oneDayAgo = new Date().getTime() - 24 * 60 * 60 * 1000;
        if (new Date(item.createdAt).getTime() < oneDayAgo) return false;
      }

      // 3. Advanced Toolbar Filters
      if (filterType !== "ALL" && item.contentType !== filterType) return false;
      if (filterCommunity !== "ALL" && item.community.name !== filterCommunity) return false;
      if (filterDept !== "ALL" && item.author.department !== filterDept) return false;
      if (filterStatus !== "ALL") {
        if (filterStatus === "PENDING" && item.moderationStatus !== "PENDING") return false;
        if (filterStatus === "APPROVED" && item.moderationStatus !== "APPROVED") return false;
        if (filterStatus === "REJECTED" && item.moderationStatus !== "REJECTED") return false;
      }
      if (filterReports !== "ALL") {
        const reports = item.reportsCount;
        if (filterReports === "1+" && reports < 1) return false;
        if (filterReports === "3+" && reports < 3) return false;
        if (filterReports === "5+" && reports < 5) return false;
      }
      if (filterDate !== "ALL") {
        const itemTime = new Date(item.createdAt).getTime();
        const now = Date.now();
        if (filterDate === "TODAY" && now - itemTime > 24 * 60 * 60 * 1000) return false;
        if (filterDate === "WEEK" && now - itemTime > 7 * 24 * 60 * 60 * 1000) return false;
        if (filterDate === "MONTH" && now - itemTime > 30 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [items, searchTerm, activeQueue, filterType, filterCommunity, filterDept, filterStatus, filterReports, filterDate]);

  // Statistics KPI computation
  const stats = useMemo(() => {
    return {
      totalPosts: items.filter((i) => i.contentType === "POST").length,
      totalComments: items.filter((i) => i.contentType === "COMMENT").length,
      flaggedContent: items.filter((i) => i.reportsCount > 0).length,
      hiddenContent: items.filter((i) => i.visibilityStatus === "HIDDEN").length,
      deletedContent: items.filter((i) => i.visibilityStatus === "DELETED").length,
      pendingCount: items.filter((i) => i.moderationStatus === "PENDING").length
    };
  }, [items]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  return (
    <div className="space-y-6">
      {/* Animated page wrapper */}
      <div className="animate-fade-up space-y-6">
        {/* Breadcrumb & Title Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Admin</span>
              <span>/</span>
              <span className="text-slate-500 dark:text-slate-400">Content Moderation</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Content Moderation
            </h2>
          </div>
        </div>

        {/* Statistics Cards Grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <DashboardCard
            title="Total Posts"
            value={stats.totalPosts}
            icon={<FileText size={16} />}
            trend={{ value: "Seeded feed", isPositive: true }}
          />
          <DashboardCard
            title="Total Comments"
            value={stats.totalComments}
            icon={<MessageSquare size={16} />}
            trend={{ value: "Thread replies", isPositive: true }}
          />
          <DashboardCard
            title="Flagged Content"
            value={stats.flaggedContent}
            icon={<ShieldAlert size={16} />}
            trend={{ value: "Reported items", isPositive: false }}
          />
          <DashboardCard
            title="Hidden Content"
            value={stats.hiddenContent}
            icon={<EyeOff size={16} />}
            trend={{ value: "Hidden visibility", isPositive: true }}
          />
          <DashboardCard
            title="Deleted Content"
            value={stats.deletedContent}
            icon={<Trash2 size={16} />}
            trend={{ value: "Removed logs", isPositive: true }}
          />
          <DashboardCard
            title="Pending Review"
            value={stats.pendingCount}
            icon={<Clock size={16} />}
            trend={{ value: "Awaiting Action", isPositive: false }}
          />
        </div>

        {/* Priority Queues Toggle */}
        <ModerationQueue
          items={items}
          activeQueue={activeQueue}
          onChangeQueue={(q) => {
            setActiveQueue(q);
            setCurrentPage(1);
          }}
        />

        {/* Search, Filter Bar and Action Toolbar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
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
                placeholder="Search by post title, content, author, community, or ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-450 focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-500"
              />
            </div>

            {/* Toggle Filters & Reset buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold shadow-sm transition cursor-pointer ${
                  showFilters
                    ? "border-indigo-500 bg-indigo-50 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350 dark:hover:bg-white/[0.04]"
                }`}
              >
                <Filter size={14} />
                Filters
              </button>
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-4 py-2 text-xs font-semibold shadow-sm transition dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350 dark:hover:bg-white/[0.04] cursor-pointer"
              >
                <RefreshCw size={14} />
                Reset
              </button>
            </div>
          </div>

          {/* Advanced Filter Selector Grid */}
          {showFilters && (
            <div className="grid gap-3 pt-3 border-t border-slate-100 dark:border-white/5 grid-cols-2 md:grid-cols-3 xl:grid-cols-6 animate-fade-down">
              {/* Type Select */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Content Type
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
                  <option value="POST">Post</option>
                  <option value="COMMENT">Comment</option>
                  <option value="IMAGE">Image</option>
                  <option value="FILE">File</option>
                </select>
              </div>

              {/* Community Select */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Community
                </label>
                <select
                  value={filterCommunity}
                  onChange={(e) => {
                    setFilterCommunity(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
                >
                  <option value="ALL">All Communities</option>
                  {communitiesList.map((comm, idx) => (
                    <option key={idx} value={comm}>
                      {comm}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Select */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Department
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

              {/* Status Select */}
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
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Reports Count Select */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Reports Count
                </label>
                <select
                  value={filterReports}
                  onChange={(e) => {
                    setFilterReports(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
                >
                  <option value="ALL">Any Count</option>
                  <option value="1+">1+ Reports</option>
                  <option value="3+">3+ Reports</option>
                  <option value="5+">5+ Reports</option>
                </select>
              </div>

              {/* Date Select */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Created Date
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
            </div>
          )}
        </div>

        {/* Content Moderation Queue/Table Area */}
        {filteredItems.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white py-16 px-6 text-center dark:border-white/5 dark:bg-ink-900 shadow-sm">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Inbox size={26} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white leading-none">
              No content requires moderation
            </h3>
            <p className="mt-2 max-w-sm text-xs text-slate-450 dark:text-slate-500 leading-relaxed">
              Everything is clean! Flagged content has been resolved, or no new user-generated reports have been logged.
            </p>
          </div>
        ) : (
          /* Data Listing Table */
          <div className="space-y-4">
            <ModerationTable
              items={paginatedItems}
              onView={(item) => setSelectedItem(item)}
              onHide={(id) => setConfirmDialog({ isOpen: true, type: "HIDE", itemId: id })}
              onRestore={(id) => setConfirmDialog({ isOpen: true, type: "RESTORE", itemId: id })}
              onDelete={(id) => setConfirmDialog({ isOpen: true, type: "DELETE", itemId: id })}
              onTogglePin={(id) => setConfirmDialog({ isOpen: true, type: "PIN", itemId: id })}
              onToggleLock={(id) => setConfirmDialog({ isOpen: true, type: "LOCK", itemId: id })}
              onWarnUser={(userId, userName) => setConfirmDialog({ isOpen: true, type: "WARN", itemId: "", userId, userName })}
              onSuspendUser={(userId, userName) => setConfirmDialog({ isOpen: true, type: "SUSPEND", itemId: "", userId, userName })}
              onViewProfile={(userId) => {
                const user = items.find(i => i.author._id === userId)?.author;
                if (user) {
                  addToast(`Opening Admin Profile for student: ${user.fullName}`, "success");
                }
              }}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white dark:bg-ink-900 border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                <span className="text-xs text-slate-450 dark:text-slate-500">
                  Showing <span className="font-semibold text-slate-700 dark:text-slate-350">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    {Math.min(currentPage * itemsPerPage, filteredItems.length)}
                  </span>{" "}
                  of <span className="font-semibold text-slate-700 dark:text-slate-350">{filteredItems.length}</span> results
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
      </div>

      {/* Slide-out details drawer */}
      <ContentPreviewDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onApprove={(id) => setConfirmDialog({ isOpen: true, type: "APPROVE", itemId: id })}
        onHide={(id) => setConfirmDialog({ isOpen: true, type: "HIDE", itemId: id })}
        onRestore={(id) => setConfirmDialog({ isOpen: true, type: "RESTORE", itemId: id })}
        onDelete={(id) => setConfirmDialog({ isOpen: true, type: "DELETE", itemId: id })}
        onWarnUser={(userId, userName) => setConfirmDialog({ isOpen: true, type: "WARN", itemId: "", userId, userName })}
        onSuspendUser={(userId, userName) => setConfirmDialog({ isOpen: true, type: "SUSPEND", itemId: "", userId, userName })}
      />

      {/* Confirmation Dialogs Portal */}
      {confirmDialog && (
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={
            confirmDialog.type === "APPROVE"
              ? "Approve Content?"
              : confirmDialog.type === "HIDE"
              ? "Hide Content?"
              : confirmDialog.type === "RESTORE"
              ? "Restore Content?"
              : confirmDialog.type === "DELETE"
              ? "Delete Content Permanently?"
              : confirmDialog.type === "PIN"
              ? "Pin Post?"
              : confirmDialog.type === "UNPIN"
              ? "Unpin Post?"
              : confirmDialog.type === "LOCK"
              ? "Lock Comments?"
              : confirmDialog.type === "UNLOCK"
              ? "Unlock Comments?"
              : confirmDialog.type === "WARN"
              ? `Warn User: ${confirmDialog.userName}?`
              : `Suspend User: ${confirmDialog.userName}?`
          }
          message={
            confirmDialog.type === "DELETE"
              ? "Are you sure you want to delete this content? This action cannot be undone, and the content will be permanently removed from all feeds."
              : confirmDialog.type === "SUSPEND"
              ? `Are you sure you want to suspend student ${confirmDialog.userName}? This will block their campus account from participating in communities.`
              : confirmDialog.type === "WARN"
              ? `Are you sure you want to issue a formal warning to ${confirmDialog.userName}? This will be logged on their account file.`
              : `Confirm that you wish to perform the "${confirmDialog.type.toLowerCase()}" action on this content item.`
          }
          warning={
            confirmDialog.type === "DELETE"
              ? "Warning: Permanent database cleanup will occur."
              : confirmDialog.type === "SUSPEND"
              ? "Warning: The student will lose access to the platform."
              : undefined
          }
          confirmText={
            confirmDialog.type === "DELETE"
              ? "Delete permanently"
              : confirmDialog.type === "SUSPEND"
              ? "Suspend student"
              : confirmDialog.type === "WARN"
              ? "Issue Warning"
              : "Confirm action"
          }
          isDestructive={
            confirmDialog.type === "DELETE" ||
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
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-455">
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                Reason for Warning
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              Describe the violation that will be sent to the user.
            </p>
            <textarea
              value={warnReason}
              onChange={(e) => setWarnReason(e.target.value)}
              placeholder="e.g. Inappropriate language in React Builders community channel."
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
              placeholder="e.g. Academic dishonesty / posting exam answers in CSE study group."
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
