import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  FileText,
  Archive,
  Trash2,
  AlertTriangle,
  Inbox
} from "lucide-react";
import { DashboardCard } from "../components/dashboard-card";
import { ConfirmationDialog } from "../components/confirmation-dialog";
import { AnnouncementsTable } from "../components/announcements-table";
import { AnnouncementDetailsDrawer } from "../components/announcement-details-drawer";
import { AnnouncementEditor } from "../components/announcement-editor";
import { Button } from "../components/button";
import { useAnnouncementStore } from "../store/announcement.store";
import { useToastStore } from "../store/toast.store";
import type { Announcement, AnnouncementCategory, AnnouncementAudience, AnnouncementPriority, AnnouncementStatus } from "../types/announcement";

export function AnnouncementsManagementPage() {
  const { addToast } = useToastStore();
  const {
    announcements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    archiveAnnouncement,
    unarchiveAnnouncement,
    duplicateAnnouncement
  } = useAnnouncementStore();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterAudience, setFilterAudience] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("ALL");

  // Editor Modal & Drawer States
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<Announcement | null>(null);
  const [selectedForView, setSelectedForView] = useState<Announcement | null>(null);

  // Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "DELETE" | "ARCHIVE" | "UNARCHIVE" | "PUBLISH";
    id: string;
    title: string;
  } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Listen to action parameter from admin dashboard (e.g. ?action=new)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "new") {
      setSelectedForEdit(null);
      setEditorOpen(true);
      // Clean query parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleResetFilters = () => {
    setFilterStatus("ALL");
    setFilterAudience("ALL");
    setFilterCategory("ALL");
    setFilterDate("ALL");
    setSearchTerm("");
  };

  // Mutators Handlers
  const handleSaveAnnouncement = (ann: Omit<Announcement, "_id" | "createdAt" | "updatedAt" | "viewsCount">) => {
    if (selectedForEdit) {
      updateAnnouncement(selectedForEdit._id, ann);
      addToast("Announcement Updated Successfully", "success");
    } else {
      addAnnouncement(ann);
      if (ann.status === "DRAFT") {
        addToast("Draft Saved Successfully", "success");
      } else if (ann.status === "SCHEDULED") {
        addToast("Announcement Scheduled Successfully", "success");
      } else {
        addToast("Announcement Published Successfully", "success");
      }
    }
    setEditorOpen(false);
    setSelectedForEdit(null);
  };

  const handlePublishImmediately = (id: string) => {
    updateAnnouncement(id, { status: "PUBLISHED" as AnnouncementStatus, publishDate: new Date().toISOString() });
    addToast("Announcement Published Successfully", "success");
  };

  const executeConfirmAction = () => {
    if (!confirmDialog) return;
    const { type, id } = confirmDialog;

    if (type === "DELETE") {
      deleteAnnouncement(id);
      addToast("Announcement Deleted Successfully", "success");
    } else if (type === "ARCHIVE") {
      archiveAnnouncement(id);
      addToast("Announcement Archived Successfully", "success");
    } else if (type === "UNARCHIVE") {
      unarchiveAnnouncement(id);
      addToast("Announcement Restored Successfully", "success");
    } else if (type === "PUBLISH") {
      handlePublishImmediately(id);
    }

    setConfirmDialog(null);
  };

  // Statistics KPI computation
  const stats = useMemo(() => {
    const now = new Date().getTime();
    return {
      total: announcements.length,
      published: announcements.filter((a) => a.status === "PUBLISHED").length,
      scheduled: announcements.filter((a) => a.status === "SCHEDULED").length,
      drafts: announcements.filter((a) => a.status === "DRAFT").length,
      archived: announcements.filter((a) => a.status === "ARCHIVED").length,
      expired: announcements.filter((a) => a.status === "EXPIRED").length
    };
  }, [announcements]);

  // Filtering Logic
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      // 1. Search Query Match
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = ann.title.toLowerCase().includes(query);
        const matchesCat = ann.category.toLowerCase().includes(query);
        const matchesAudience = ann.targetAudience.toLowerCase().includes(query);
        const matchesCreator = ann.createdBy.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCat && !matchesAudience && !matchesCreator) {
          return false;
        }
      }

      // 2. Filters matches
      if (filterStatus !== "ALL" && ann.status !== filterStatus) return false;
      if (filterAudience !== "ALL" && ann.targetAudience !== filterAudience) return false;
      if (filterCategory !== "ALL" && ann.category !== filterCategory) return false;
      if (filterDate !== "ALL") {
        const itemTime = new Date(ann.publishDate).getTime();
        const now = Date.now();
        if (filterDate === "TODAY" && now - itemTime > 24 * 60 * 60 * 1000) return false;
        if (filterDate === "WEEK" && now - itemTime > 7 * 24 * 60 * 60 * 1000) return false;
        if (filterDate === "MONTH" && now - itemTime > 30 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [announcements, searchTerm, filterStatus, filterAudience, filterCategory, filterDate]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage) || 1;
  const paginatedAnnouncements = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAnnouncements.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAnnouncements, currentPage]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-500 dark:text-slate-400">Announcements</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Announcements
          </h2>
        </div>

        <Button
          onClick={() => {
            setSelectedForEdit(null);
            setEditorOpen(true);
          }}
          className="px-4 py-2 text-xs shadow-sm shadow-indigo-600/15 dark:shadow-indigo-400/10"
        >
          Create Announcement
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6 animate-fade-up">
        <DashboardCard
          title="Total Announcements"
          value={stats.total}
          trend={{ value: "Seeded notifications", isPositive: true }}
        />
        <DashboardCard
          title="Published"
          value={stats.published}
          icon={<CheckCircle size={16} />}
          trend={{ value: "Live on board", isPositive: true }}
        />
        <DashboardCard
          title="Scheduled"
          value={stats.scheduled}
          icon={<Clock size={16} />}
          trend={{ value: "Future releases", isPositive: true }}
        />
        <DashboardCard
          title="Drafts"
          value={stats.drafts}
          icon={<FileText size={16} />}
          trend={{ value: "Work in progress", isPositive: true }}
        />
        <DashboardCard
          title="Archived"
          value={stats.archived}
          icon={<Archive size={16} />}
          trend={{ value: "Historical logs", isPositive: true }}
        />
        <DashboardCard
          title="Expired"
          value={stats.expired}
          icon={<Trash2 size={16} />}
          trend={{ value: "Outdated cards", isPositive: false }}
        />
      </div>

      {/* Toolbar Search & Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-4 animate-fade-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Bar */}
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
              placeholder="Search announcements by title, category, audience, creator..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-455 focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-indigo-500"
            />
          </div>

          {/* Toggle Filters & Reset buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold shadow-sm transition cursor-pointer ${
                showFilters
                  ? "border-indigo-500 bg-indigo-50 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-355 dark:hover:bg-white/[0.04]"
              }`}
            >
              <Filter size={14} />
              Filters
            </button>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-4 py-2 text-xs font-semibold shadow-sm transition dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-355 dark:hover:bg-white/[0.04] cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Filters dropdown panel */}
        {showFilters && (
          <div className="grid gap-3 pt-3 border-t border-slate-100 dark:border-white/5 grid-cols-2 md:grid-cols-4 animate-fade-down animate-duration-200">
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
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            {/* Target select */}
            <div>
              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Target Audience
              </label>
              <select
                value={filterAudience}
                onChange={(e) => {
                  setFilterAudience(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
              >
                <option value="ALL">All Audiences</option>
                <option value="ENTIRE_COLLEGE">Entire College</option>
                <option value="DEPARTMENT">Specific Department</option>
                <option value="ACADEMIC_YEAR">Academic Year</option>
                <option value="COMMUNITY">Community</option>
              </select>
            </div>

            {/* Category Select */}
            <div>
              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500"
              >
                <option value="ALL">All Categories</option>
                <option value="GENERAL">General</option>
                <option value="ACADEMIC">Academic</option>
                <option value="PLACEMENT">Placement</option>
                <option value="EVENTS">Events</option>
                <option value="CLUBS">Clubs</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>

            {/* Date Select */}
            <div>
              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Publish Date Range
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

      {/* Listing Content Table or Empty state */}
      {filteredAnnouncements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white py-16 px-6 text-center dark:border-white/5 dark:bg-ink-900 shadow-sm animate-fade-up">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Inbox size={26} />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white leading-none">
            No announcements available
          </h3>
          <p className="mt-2 max-w-sm text-xs text-slate-455 dark:text-slate-500 leading-relaxed">
            There are no announcements currently registered or matching your filters query.
          </p>
          <Button
            onClick={() => {
              setSelectedForEdit(null);
              setEditorOpen(true);
            }}
            className="mt-5 px-4 py-2 text-xs shadow-sm shadow-indigo-600/15 dark:shadow-indigo-400/10"
          >
            Create Announcement
          </Button>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-up">
          <AnnouncementsTable
            announcements={paginatedAnnouncements}
            onView={(ann) => setSelectedForView(ann)}
            onEdit={(ann) => {
              setSelectedForEdit(ann);
              setEditorOpen(true);
            }}
            onPublishImmediately={(id) => setConfirmDialog({ isOpen: true, type: "PUBLISH", id, title: "Publish Immediately?" })}
            onArchive={(id) => setConfirmDialog({ isOpen: true, type: "ARCHIVE", id, title: "Archive Announcement?" })}
            onUnarchive={(id) => setConfirmDialog({ isOpen: true, type: "UNARCHIVE", id, title: "Restore Announcement?" })}
            onDuplicate={duplicateAnnouncement}
            onDelete={(id) => setConfirmDialog({ isOpen: true, type: "DELETE", id, title: "Delete Announcement?" })}
          />

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-ink-900 border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm">
              <span className="text-xs text-slate-455 dark:text-slate-500">
                Showing <span className="font-semibold text-slate-700 dark:text-slate-350">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-350">
                  {Math.min(currentPage * itemsPerPage, filteredAnnouncements.length)}
                </span>{" "}
                of <span className="font-semibold text-slate-700 dark:text-slate-350">{filteredAnnouncements.length}</span> announcements
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
                          : "border-slate-250 dark:border-white/5 text-slate-655 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-white/[0.02]"
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

      {/* Editor Modal */}
      <AnnouncementEditor
        isOpen={editorOpen}
        announcement={selectedForEdit}
        onClose={() => {
          setEditorOpen(false);
          setSelectedForEdit(null);
        }}
        onSave={handleSaveAnnouncement}
      />

      {/* Details side drawer */}
      <AnnouncementDetailsDrawer
        announcement={selectedForView}
        onClose={() => setSelectedForView(null)}
        onPublishImmediately={handlePublishImmediately}
      />

      {/* Confirmation Dialogs */}
      {confirmDialog && (
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={
            confirmDialog.type === "DELETE"
              ? "Are you sure you want to delete this announcement permanently? This action cannot be undone."
              : confirmDialog.type === "ARCHIVE"
              ? "Confirm that you wish to archive this announcement. It will be hidden from student feeds."
              : confirmDialog.type === "UNARCHIVE"
              ? "Confirm that you wish to restore this announcement to the active list board."
              : "Confirm that you wish to publish this announcement immediately to the campus feed."
          }
          confirmText={
            confirmDialog.type === "DELETE"
              ? "Delete permanently"
              : confirmDialog.type === "ARCHIVE"
              ? "Archive announcement"
              : confirmDialog.type === "UNARCHIVE"
              ? "Restore announcement"
              : "Publish immediately"
          }
          isDestructive={confirmDialog.type === "DELETE" || confirmDialog.type === "ARCHIVE"}
          onConfirm={executeConfirmAction}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
