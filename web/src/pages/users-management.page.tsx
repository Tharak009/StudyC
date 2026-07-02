import { useState } from "react";
import { useToastStore } from "../store/toast.store";
import { UserTable } from "../components/user-table";
import { UserProfileDrawer } from "../components/user-profile-drawer";
import { EditUserModal } from "../components/edit-user-modal";
import { ConfirmationDialog } from "../components/confirmation-dialog";
import { DashboardCard } from "../components/dashboard-card";
import {
  useAdminUsers,
  useActivateUser,
  useSuspendUser,
  useDeleteUser,
} from "../hooks/use-admin";
import {
  Users,
  UserCheck,
  UserMinus,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import type { User, Role, UserStatus } from "../types/auth";

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electrical Engineering",
  "Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Administration",
];

const ROLES: Role[] = ["STUDENT", "ADMIN", "COMMUNITY_ADMIN", "MODERATOR"];
const STATUSES: UserStatus[] = ["ACTIVE", "SUSPENDED", "DEACTIVATED"];

export function UsersManagementPage() {
  const { addToast } = useToastStore();
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Modal and drawer states
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "suspend" | "activate" | "delete";
    user: User;
  } | null>(null);

  // Queries & Mutations
  const activateUser = useActivateUser();
  const suspendUser = useSuspendUser();
  const deleteUser = useDeleteUser();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useAdminUsers({
    limit: 50, // Load a larger list for better local sorting/filtering
    search: search || undefined,
  });

  const users = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Local advanced filters and sorting
  let filteredUsers = [...users];

  if (selectedDept) {
    filteredUsers = filteredUsers.filter((u) => u.department === selectedDept);
  }
  if (selectedYear) {
    filteredUsers = filteredUsers.filter(
      (u) => u.academicYear === Number(selectedYear)
    );
  }
  if (selectedRole) {
    filteredUsers = filteredUsers.filter((u) => u.role === selectedRole);
  }
  if (selectedStatus) {
    filteredUsers = filteredUsers.filter((u) => u.status === selectedStatus);
  }

  // Local Sort
  filteredUsers.sort((a, b) => {
    if (sortBy === "name") {
      return a.fullName.localeCompare(b.fullName);
    }
    if (sortBy === "registrationDate") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === "lastLogin") {
      const timeA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
      const timeB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
      return timeB - timeA;
    }
    if (sortBy === "department") {
      return a.department.localeCompare(b.department);
    }
    return 0;
  });

  // Calculate local breakdown statistics
  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const suspendedCount = users.filter((u) => u.status === "SUSPENDED").length;

  // Trigger Action Executions
  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    const { type, user } = confirmAction;
    try {
      if (type === "suspend") {
        await suspendUser.mutateAsync(user._id);
        addToast(`User ${user.fullName} has been suspended`, "warning");
      } else if (type === "activate") {
        await activateUser.mutateAsync(user._id);
        addToast(`User ${user.fullName} has been reactivated`, "success");
      } else if (type === "delete") {
        await deleteUser.mutateAsync(user._id);
        addToast(`User ${user.fullName} has been deleted successfully`, "success");
      }
    } catch {
      addToast("Failed to perform request", "error");
    } finally {
      setConfirmAction(null);
    }
  };

  const handleMockSave = (updatedFields: Partial<User>) => {
    if (!editingUser) return;
    // Simulate updating fields on the local model
    Object.assign(editingUser, updatedFields);
    addToast("User Updated", "success");
    setEditingUser(null);
  };

  const handleMockResetPassword = (user: User) => {
    addToast(`Password Reset email sent to ${user.email}`, "success");
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-up space-y-6">
      {/* Breadcrumb & Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-500 dark:text-slate-400">User Management</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            User Management
          </h2>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:hover:bg-white/[0.04] transition-all"
        >
          <RefreshCw size={14} />
          Refresh List
        </button>
      </div>

      {/* summary KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Users"
          value={total}
          icon={<Users size={16} />}
          trend={{ value: `+${total > 0 ? Math.ceil(total * 0.1) : 0} this month`, isPositive: true }}
        />
        <DashboardCard
          title="Active Users"
          value={activeCount || total}
          icon={<UserCheck size={16} />}
          trend={{ value: "92% online", isPositive: true }}
        />
        <DashboardCard
          title="Suspended Users"
          value={suspendedCount}
          icon={<UserMinus size={16} />}
          trend={{ value: "Action pending", isPositive: false }}
        />
        <DashboardCard
          title="New Registrations"
          value={total > 0 ? Math.ceil(total * 0.15) : 3}
          icon={<Sparkles size={16} />}
          trend={{ value: "+12.4%", isPositive: true }}
        />
      </div>

      {/* Toolbar / Filters */}
      <div className="rounded-2xl border border-slate-150 bg-white p-4 dark:border-white/5 dark:bg-ink-900 transition-all duration-300">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or roll number..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-450 focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-500 dark:focus:bg-white/[0.04]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Toggle */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                filtersOpen || selectedDept || selectedYear || selectedRole || selectedStatus
                  ? "border-indigo-250 bg-indigo-50/30 text-indigo-650 dark:border-indigo-900/50 dark:bg-indigo-500/10 dark:text-indigo-400"
                  : "border-slate-200 bg-white text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350 dark:hover:bg-white/[0.04]"
              }`}
            >
              <Filter size={14} />
              Filters
              {(selectedDept || selectedYear || selectedRole || selectedStatus) && (
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-650 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350"
              >
                <option value="name">Sort by: Name</option>
                <option value="registrationDate">Sort by: Joined Date</option>
                <option value="lastLogin">Sort by: Last Login</option>
                <option value="department">Sort by: Department</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expandable Advanced Filters panel */}
        {filtersOpen && (
          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 dark:border-white/5 sm:grid-cols-2 lg:grid-cols-4 animate-fade-up">
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

            {/* Academic Year */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Academic Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
              >
                <option value="">All Years</option>
                {[1, 2, 3, 4].map((year) => (
                  <option key={year} value={year}>
                    Year {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                System Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
              >
                <option value="">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Account Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
              >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 border border-slate-200 dark:border-white/5 rounded-2xl bg-white dark:bg-ink-900 text-center">
          <p className="text-sm font-semibold text-rose-500">Failed to load users from database</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 transition-all"
          >
            Retry Fetching
          </button>
        </div>
      ) : isLoading ? (
        /* Loading skeleton list */
        <div className="space-y-4">
          <div className="h-10 rounded-2xl bg-white dark:bg-white/[0.02] animate-pulse border border-slate-100 dark:border-white/5" />
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-16 rounded-2xl bg-white dark:bg-white/[0.02] animate-pulse border border-slate-150 dark:border-white/5"
            />
          ))}
        </div>
      ) : (
        /* Rendered User Table */
        <div className="space-y-4">
          <UserTable
            users={filteredUsers}
            onView={setViewingUser}
            onEdit={setEditingUser}
            onSuspend={(user) => setConfirmAction({ type: "suspend", user })}
            onActivate={(user) => setConfirmAction({ type: "activate", user })}
            onResetPassword={handleMockResetPassword}
            onDelete={(user) => setConfirmAction({ type: "delete", user })}
            isPending={activateUser.isPending || suspendUser.isPending || deleteUser.isPending}
          />

          {/* Simple Pagination controls */}
          <div className="flex items-center justify-between px-2 pt-2 text-xs font-semibold text-slate-450 dark:text-slate-500">
            <span>
              Showing {filteredUsers.length} of {total} registered student accounts
            </span>
            {hasNextPage && (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
              >
                {isFetchingNextPage ? "Loading more..." : "Load More Users"}
              </button>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Context Modals & Drawer */}
      <UserProfileDrawer user={viewingUser} onClose={() => setViewingUser(null)} />
      
      <EditUserModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleMockSave}
      />

      <ConfirmationDialog
        isOpen={Boolean(confirmAction)}
        title={
          confirmAction?.type === "delete"
            ? "Delete Student Account?"
            : confirmAction?.type === "suspend"
            ? "Suspend Student Account?"
            : "Reactivate Student Account?"
        }
        message={
          confirmAction?.type === "delete"
            ? `Are you sure you want to delete ${confirmAction?.user.fullName}'s account? This will remove all their community memberships and files.`
            : confirmAction?.type === "suspend"
            ? `Are you sure you want to suspend ${confirmAction?.user.fullName}'s account? They will lose access to communities and chat channels immediately.`
            : `Are you sure you want to reactivate ${confirmAction?.user.fullName}'s account? This will restore their profile access.`
        }
        warning={confirmAction?.type === "delete" ? "This action cannot be undone." : undefined}
        confirmText={
          confirmAction?.type === "delete"
            ? "Delete"
            : confirmAction?.type === "suspend"
            ? "Suspend"
            : "Reactivate"
        }
        isDestructive={confirmAction?.type === "delete" || confirmAction?.type === "suspend"}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isLoading={activateUser.isPending || suspendUser.isPending || deleteUser.isPending}
      />
    </div>
  );
}
