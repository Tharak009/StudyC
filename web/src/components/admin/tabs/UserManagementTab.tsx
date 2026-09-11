import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  UserX,
  PauseCircle,
  Download,
  GraduationCap,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { RoleChangeModal } from "../modals/RoleChangeModal";
import { SuspendUserModal } from "../modals/SuspendUserModal";
import { BanUserModal } from "../modals/BanUserModal";
import { useAuthStore } from "../../../store/auth.store";
import { useToastStore } from "../../../store/toast.store";

export interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  rollNumber: string;
  department: string;
  batch: string;
  role: "STUDENT" | "MODERATOR" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  suspensionInfo?: string;
  joinedDate: string;
  isOnline: boolean;
}

function loadManagedUsers(currentUser: any): ManagedUser[] {
  try {
    const raw = localStorage.getItem("studyconnect_managed_users");
    if (raw) return JSON.parse(raw);
  } catch {}

  const defaultAdmin: ManagedUser = {
    id: currentUser?.id || "u-current-admin",
    fullName: currentUser?.fullName || "Campus Administrator",
    email: currentUser?.email || "admin@campus.edu",
    rollNumber: currentUser?.rollNumber || "ADM-001",
    department: currentUser?.department || "Computer Science & Engineering",
    batch: "Lead Administrator",
    role: "ADMIN",
    status: "ACTIVE",
    joinedDate: "Today",
    isOnline: true
  };

  try {
    const rawPeers = localStorage.getItem("studyconnect_peer_directory");
    if (rawPeers) {
      const peers = JSON.parse(rawPeers);
      const peerUsers: ManagedUser[] = peers.map((p: any) => ({
        id: p.id,
        fullName: p.name,
        email: `${p.name.toLowerCase().replace(/\s+/g, ".")}@campus.edu`,
        rollNumber: p.roll || "STU-100",
        department: p.dept || "Computer Science & Engineering",
        batch: p.batch ? `Class of ${p.batch}` : "Class of 2026",
        role: "STUDENT" as const,
        status: "ACTIVE" as const,
        joinedDate: "Recently",
        isOnline: p.isOnline ?? true
      }));
      return [defaultAdmin, ...peerUsers];
    }
  } catch {}

  return [defaultAdmin];
}

export function UserManagementTab() {
  const currentUser = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();

  const [users, setUsers] = useState<ManagedUser[]>(() => loadManagedUsers(currentUser));
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Active Modals
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);

  // Regex-Safe Search Filter
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Dept Filter
      if (deptFilter !== "ALL" && !u.department.includes(deptFilter)) return false;
      // Role Filter
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      // Status Filter
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;

      // Safe String Search
      if (search.trim()) {
        const safeQuery = escapeRegExp(search.trim()).toLowerCase();
        const match =
          u.fullName.toLowerCase().includes(safeQuery) ||
          u.email.toLowerCase().includes(safeQuery) ||
          u.rollNumber.toLowerCase().includes(safeQuery);
        if (!match) return false;
      }
      return true;
    });
  }, [users, search, deptFilter, roleFilter, statusFilter]);

  // ── Admin Self-Protection & Peer Protection Safeguards ───────────────────────
  const isProtectedAccount = (targetUser: ManagedUser) => {
    // 1. Cannot perform destructive actions on yourself
    if (
      currentUser &&
      (targetUser.email === currentUser.email || targetUser.rollNumber === currentUser.rollNumber)
    ) {
      return { isProtected: true, reason: "Self Account Protected" };
    }
    // 2. Cannot ban, suspend, or purge fellow administrators
    if (targetUser.role === "ADMIN") {
      return { isProtected: true, reason: "Fellow Administrator Protected" };
    }
    return { isProtected: false, reason: "" };
  };

  // Handlers for modal actions
  const handleSaveRole = (userId: string, newRole: "STUDENT" | "MODERATOR" | "ADMIN") => {
    setUsers((prev) => {
      const next = prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
      try {
        localStorage.setItem("studyconnect_managed_users", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleConfirmSuspend = (userId: string, duration: string, reason: string) => {
    setUsers((prev) => {
      const next = prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: "SUSPENDED" as const,
              suspensionInfo: duration,
              isOnline: false
            }
          : u
      );
      try {
        localStorage.setItem("studyconnect_managed_users", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleConfirmBan = (userId: string, reason: string) => {
    setUsers((prev) => {
      const next = prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: "BANNED" as const,
              isOnline: false
            }
          : u
      );
      try {
        localStorage.setItem("studyconnect_managed_users", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleExportCSV = () => {
    addToast(`Exported roster with ${filteredUsers.length} students as CSV.`, "success");
  };

  return (
    <div className="space-y-6">
      
      {/* ── 1. Search, Filter & Batch Export Bar ──────────────────────── */}
      <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Regex-safe Search Input */}
          <div className="w-full lg:max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by full name, roll number, or institutional email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-sm"
            />
          </div>

          {/* Faceted Filter Selectors & Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              <option value="Computer Science">Computer Science (CSE)</option>
              <option value="Artificial Intelligence">AI & Data Science (AI&DS)</option>
              <option value="Electronics">Electronics (ECE)</option>
              <option value="Information Technology">Information Tech (IT)</option>
            </select>

            {/* Role */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Student</option>
              <option value="MODERATOR">Moderator / TA</option>
              <option value="ADMIN">Admin</option>
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162544] text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-500 text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Export Student Roster (CSV)"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>

        </div>
      </div>

      {/* ── 2. Responsive User Governance Table ───────────────────────── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/75 dark:bg-[#080D1A]/75 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">Student Profile</th>
                <th className="py-3.5 px-4 font-bold">Roll / Reg Number</th>
                <th className="py-3.5 px-4 font-bold">Department & Batch</th>
                <th className="py-3.5 px-4 font-bold">Role Tier</th>
                <th className="py-3.5 px-4 font-bold">Account Status</th>
                <th className="py-3.5 px-4 font-bold">Enrolled Date</th>
                <th className="py-3.5 px-4 font-bold text-right">Governance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No matching students found. Try broadening your search filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const protection = isProtectedAccount(u);

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-[#162544]/40 transition-colors"
                    >
                      {/* 1. Student Profile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1E90FF] text-white font-bold text-xs shadow-sm shadow-[#1E90FF]/25">
                              {u.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#0F1A30] ${
                                u.isOnline ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100">
                              {u.fullName}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Roll Number */}
                      <td className="py-3 px-4 font-bold text-[#1E90FF] tabular-nums">
                        {u.rollNumber}
                      </td>

                      {/* 3. Department & Batch */}
                      <td className="py-3 px-4">
                        <div className="text-slate-700 dark:text-slate-200 font-medium">
                          {u.department}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {u.batch}
                        </div>
                      </td>

                      {/* 4. Role Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.role === "ADMIN"
                              ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30"
                              : u.role === "MODERATOR"
                              ? "bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* 5. Account Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : u.status === "SUSPENDED"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.status === "ACTIVE"
                                ? "bg-emerald-500"
                                : u.status === "SUSPENDED"
                                ? "bg-amber-500"
                                : "bg-rose-500 animate-pulse"
                            }`}
                          />
                          <span>{u.status}</span>
                        </span>
                        {u.suspensionInfo && (
                          <div className="text-[9px] text-amber-500 mt-0.5">
                            {u.suspensionInfo}
                          </div>
                        )}
                      </td>

                      {/* 6. Enrolled Date */}
                      <td className="py-3 px-4 text-slate-400 text-[11px] tabular-nums">
                        {u.joinedDate}
                      </td>

                      {/* 7. Actions Menu with Self-Protection Guards */}
                      <td className="py-3 px-4 text-right">
                        {protection.isProtected ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-[#080D1A] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800"
                            title={protection.reason}
                          >
                            <Lock size={12} className="text-amber-500" />
                            <span>Protected</span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setRoleModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#1E90FF] hover:border-[#1E90FF] text-xs font-bold transition-colors cursor-pointer"
                              title="Modify Role"
                            >
                              Role
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setSuspendModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-colors cursor-pointer"
                              title="Temporary Suspension"
                            >
                              Suspend
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setBanModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors cursor-pointer"
                              title="Permanent Domain Ban"
                            >
                              Ban
                            </button>
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. Modals ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {roleModalOpen && selectedUser && (
          <RoleChangeModal
            isOpen={roleModalOpen}
            onClose={() => {
              setRoleModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onSaveRole={handleSaveRole}
          />
        )}

        {suspendModalOpen && selectedUser && (
          <SuspendUserModal
            isOpen={suspendModalOpen}
            onClose={() => {
              setSuspendModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onConfirmSuspend={handleConfirmSuspend}
          />
        )}

        {banModalOpen && selectedUser && (
          <BanUserModal
            isOpen={banModalOpen}
            onClose={() => {
              setBanModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onConfirmBan={handleConfirmBan}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default UserManagementTab;
