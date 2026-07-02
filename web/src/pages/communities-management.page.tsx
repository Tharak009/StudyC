import { useState, useEffect } from "react";
import { useToastStore } from "../store/toast.store";
import { CommunityTable } from "../components/community-table";
import { CommunityDetailsDrawer } from "../components/community-details-drawer";
import { CommunityFormModal } from "../components/community-form-modal";
import { ConfirmationDialog } from "../components/confirmation-dialog";
import { DashboardCard } from "../components/dashboard-card";
import { Button } from "../components/button";
import { useAdminCommunities, useDeleteCommunity } from "../hooks/use-admin";
import {
  Compass,
  Zap,
  Archive,
  Users,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  RefreshCw,
} from "lucide-react";
import type { Community, CommunityVisibility, CommunityCategory } from "../types/community";

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electrical Engineering",
  "Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Multidisciplinary",
];

const CATEGORIES = [
  "Java Programming",
  "Python Programming",
  "Web Development",
  "Cyber Security",
  "Data Science",
  "Competitive Programming",
  "Placement Preparation",
  "Other",
];

export function CommunitiesManagementPage() {
  const { addToast } = useToastStore();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedVisibility, setSelectedVisibility] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // local simulation states for CRUD operations
  const [createdList, setCreatedList] = useState<Community[]>([]);
  const [editedList, setEditedList] = useState<Record<string, Partial<Community>>>({});
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  // Dialog controllers
  const [viewingCommunity, setViewingCommunity] = useState<Community | null>(null);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "archive" | "restore";
    community: Community;
  } | null>(null);

  const deleteCommunityMutation = useDeleteCommunity();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useAdminCommunities({
    limit: 50,
    search: search || undefined,
  });

  const apiCommunities = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Merge API data with locally simulated creations, edits, and deletions
  let mergedCommunities = [...createdList, ...apiCommunities]
    .filter((c) => !deletedIds.includes(c._id))
    .map((c) => {
      if (editedList[c._id]) {
        return { ...c, ...editedList[c._id] };
      }
      return c;
    });

  // Apply search filtering locally (covering name, category, description, creator)
  let filteredCommunities = mergedCommunities;
  if (search) {
    const q = search.toLowerCase();
    filteredCommunities = filteredCommunities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.owner?.fullName?.toLowerCase().includes(q)
    );
  }

  // Apply filters locally
  if (selectedCategory) {
    filteredCommunities = filteredCommunities.filter((c) => c.category === selectedCategory);
  }
  if (selectedVisibility) {
    filteredCommunities = filteredCommunities.filter((c) => c.visibility === selectedVisibility);
  }
  if (selectedDept) {
    filteredCommunities = filteredCommunities.filter((c) => c.tags?.includes(selectedDept));
  }
  if (selectedStatus) {
    const isArchived = selectedStatus === "archived";
    filteredCommunities = filteredCommunities.filter((c) => archivedIds.includes(c._id) === isArchived);
  }

  // Local sorting
  filteredCommunities.sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "memberCount") {
      return b.memberCount - a.memberCount;
    }
    if (sortBy === "createdDate") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === "lastActivity") {
      // Fallback sorting
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    return 0;
  });

  // Calculate statistics totals
  const totalCount = mergedCommunities.length;
  const archivedCount = archivedIds.filter((id) => mergedCommunities.some((c) => c._id === id)).length;
  const activeCount = totalCount - archivedCount;
  const totalMembers = mergedCommunities.reduce((sum, c) => sum + (c.memberCount || 0), 0);

  // Handle Form Save Actions (Create and Edit modes)
  const handleSaveForm = (values: any) => {
    if (editingCommunity) {
      // Edit Mode
      setEditedList((prev) => ({
        ...prev,
        [editingCommunity._id]: values,
      }));
      addToast("Community Updated", "success");
      setEditingCommunity(null);
    } else {
      // Create Mode
      const newComm: Community = {
        _id: `mock-comm-${Math.random().toString(36).substring(2, 9)}`,
        name: values.name,
        slug: values.name.toLowerCase().replace(/ /g, "-"),
        description: values.description,
        category: values.category,
        tags: values.tags,
        visibility: values.visibility,
        owner: {
          _id: "admin-owner-id",
          fullName: "Platform Admin",
          rollNumber: "ADMIN",
        },
        moderators: [],
        memberCount: 1,
        membershipRole: "OWNER",
        isMember: true,
        extensionPoints: {
          chatEnabled: true,
          resourcesEnabled: true,
          notificationsEnabled: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCreatedList((prev) => [newComm, ...prev]);
      addToast("Community Created", "success");
      setFormOpen(false);
    }
  };

  // Dispatch API and Mock Actions
  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    const { type, community } = confirmAction;

    try {
      if (type === "delete") {
        // Run API delete if it's from the database
        if (!community._id.startsWith("mock-comm")) {
          await deleteCommunityMutation.mutateAsync(community._id);
        }
        setDeletedIds((prev) => [...prev, community._id]);
        addToast("Community Deleted", "success");
      } else if (type === "archive") {
        setArchivedIds((prev) => [...prev, community._id]);
        addToast("Community Archived", "success");
      } else if (type === "restore") {
        setArchivedIds((prev) => prev.filter((id) => id !== community._id));
        addToast("Community Restored", "success");
      }
    } catch {
      addToast("Failed to complete community action", "error");
    } finally {
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-up space-y-6">
      {/* Breadcrumb & Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-500 dark:text-slate-400">Community Management</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Community Management
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:hover:bg-white/[0.04] transition-all"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          
          <Button
            onClick={() => {
              setEditingCommunity(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md cursor-pointer min-h-0"
          >
            <Plus size={15} />
            Create Community
          </Button>
        </div>
      </div>

      {/* summary KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Communities"
          value={totalCount}
          icon={<Compass size={16} />}
          trend={{ value: "+2.4% this month", isPositive: true }}
        />
        <DashboardCard
          title="Active Channels"
          value={activeCount}
          icon={<Zap size={16} />}
          trend={{ value: `${Math.round((activeCount / (totalCount || 1)) * 100)}% active`, isPositive: true }}
        />
        <DashboardCard
          title="Archived Channels"
          value={archivedCount}
          icon={<Archive size={16} />}
          trend={{ value: "Pending review", isPositive: false }}
        />
        <DashboardCard
          title="Total Members enrolled"
          value={totalMembers}
          icon={<Users size={16} />}
          trend={{ value: "+18.9%", isPositive: true }}
        />
      </div>

      {/* Search and Filters panel */}
      <div className="rounded-2xl border border-slate-150 bg-white p-4 dark:border-white/5 dark:bg-ink-900 transition-all duration-300">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by community name, owner or category..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-450 focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:placeholder:text-slate-650"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Toggle */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                filtersOpen || selectedCategory || selectedStatus || selectedVisibility || selectedDept
                  ? "border-indigo-250 bg-indigo-50/30 text-indigo-650 dark:border-indigo-900/50 dark:bg-indigo-500/10 dark:text-indigo-400"
                  : "border-slate-200 bg-white text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-355"
              }`}
            >
              <Filter size={14} />
              Filters
              {(selectedCategory || selectedStatus || selectedVisibility || selectedDept) && (
                <span className="flex size-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] text-white dark:bg-indigo-500">
                  !
                </span>
              )}
            </button>

            {/* Sort Selector */}
            <div className="relative flex items-center gap-2">
              <ArrowUpDown size={14} className="text-slate-400 dark:text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-650 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-355"
              >
                <option value="name">Sort by: Name</option>
                <option value="memberCount">Sort by: Members</option>
                <option value="createdDate">Sort by: Created Date</option>
                <option value="lastActivity">Sort by: Last Activity</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expandable filter details */}
        {filtersOpen && (
          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 dark:border-white/5 sm:grid-cols-2 lg:grid-cols-4 animate-fade-up">
            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Visibility
              </label>
              <select
                value={selectedVisibility}
                onChange={(e) => setSelectedVisibility(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
              >
                <option value="">All Visibilities</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Department
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 border border-slate-200 dark:border-white/5 rounded-2xl bg-white dark:bg-ink-900 text-center">
          <p className="text-sm font-semibold text-rose-500">Failed to load communities from database</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 transition-all"
          >
            Retry Fetching
          </button>
        </div>
      ) : isLoading ? (
        /* Loading skeleton rows */
        <div className="space-y-4">
          <div className="h-10 rounded-2xl bg-white dark:bg-white/[0.02] animate-pulse border border-slate-100 dark:border-white/5" />
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="h-16 rounded-2xl bg-white dark:bg-white/[0.02] animate-pulse border border-slate-150 dark:border-white/5"
            />
          ))}
        </div>
      ) : (
        /* Community Table */
        <div className="space-y-4">
          <CommunityTable
            communities={filteredCommunities}
            archivedIds={archivedIds}
            onView={setViewingCommunity}
            onEdit={(comm) => {
              setEditingCommunity(comm);
              setFormOpen(true);
            }}
            onArchive={(community) => setConfirmAction({ type: "archive", community })}
            onRestore={(community) => setConfirmAction({ type: "restore", community })}
            onDelete={(community) => setConfirmAction({ type: "delete", community })}
            isPending={deleteCommunityMutation.isPending}
          />

          {/* Pagination bar */}
          <div className="flex items-center justify-between px-2 pt-2 text-xs font-semibold text-slate-450 dark:text-slate-500">
            <span>
              Showing {filteredCommunities.length} of {total} registered student communities
            </span>
            {hasNextPage && (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
              >
                {isFetchingNextPage ? "Loading more..." : "Load More"}
              </button>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Drawer and Modal triggers */}
      <CommunityDetailsDrawer
        community={viewingCommunity}
        onClose={() => setViewingCommunity(null)}
      />

      {formOpen && (
        <CommunityFormModal
          community={editingCommunity}
          onClose={() => {
            setFormOpen(false);
            setEditingCommunity(null);
          }}
          onSave={handleSaveForm}
        />
      )}

      <ConfirmationDialog
        isOpen={Boolean(confirmAction)}
        title={
          confirmAction?.type === "delete"
            ? "Permanently Delete Community?"
            : confirmAction?.type === "archive"
            ? "Archive Study Channel?"
            : "Restore Study Channel?"
        }
        message={
          confirmAction?.type === "delete"
            ? `Are you sure you want to delete ${confirmAction?.community.name}? Deleting this community will permanently remove all associated data.`
            : confirmAction?.type === "archive"
            ? `Are you sure you want to archive ${confirmAction?.community.name}? It will hide the community channel from the public student list.`
            : `Are you sure you want to restore ${confirmAction?.community.name} to active? It will make it searchable in the campus list again.`
        }
        warning={confirmAction?.type === "delete" ? "This action cannot be undone." : undefined}
        confirmText={
          confirmAction?.type === "delete"
            ? "Delete Permanently"
            : confirmAction?.type === "archive"
            ? "Archive"
            : "Restore Channel"
        }
        isDestructive={confirmAction?.type === "delete" || confirmAction?.type === "archive"}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isLoading={deleteCommunityMutation.isPending}
      />
    </div>
  );
}
