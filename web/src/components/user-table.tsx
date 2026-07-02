import { useState, useRef, useEffect } from "react";
import { MoreVertical, Eye, Edit2, ShieldOff, ShieldAlert, Key, Trash2 } from "lucide-react";
import type { User } from "../types/auth";

interface UserTableProps {
  users: User[];
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onSuspend: (user: User) => void;
  onActivate: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDelete: (user: User) => void;
  isPending?: boolean;
}

export function UserTable({
  users,
  onView,
  onEdit,
  onSuspend,
  onActivate,
  onResetPassword,
  onDelete,
  isPending = false,
}: UserTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-slate-200 dark:border-white/5 rounded-2xl bg-white dark:bg-ink-900">
        <ShieldAlert size={36} className="text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No users found</h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try resetting search or filter terms.</p>
      </div>
    );
  }

  const roleColors = {
    STUDENT: "bg-slate-50 text-slate-600 dark:bg-white/[0.02] dark:text-slate-400 border-slate-200/50",
    ADMIN: "bg-indigo-50/70 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-100/50",
    COMMUNITY_ADMIN: "bg-violet-50/70 text-violet-750 dark:bg-violet-500/10 dark:text-violet-400 border-violet-100/50",
    MODERATOR: "bg-cyan-50/70 text-cyan-750 dark:bg-cyan-500/10 dark:text-cyan-400 border-cyan-100/50",
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-ink-900 transition-colors duration-300">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold tracking-wider text-slate-400 dark:border-white/5 dark:bg-white/[0.01] dark:text-slate-500 uppercase">
            <th className="px-6 py-4">Student Profile</th>
            <th className="px-6 py-4">Department</th>
            <th className="px-6 py-4">Academic Year</th>
            <th className="px-6 py-4">System Role</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Joined Date</th>
            <th className="px-6 py-4">Last Login</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {users.map((user) => {
            const initials = user.fullName
              ? user.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "ST";

            return (
              <tr
                key={user._id}
                className="hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-colors"
              >
                {/* Profile brief */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <span className="block font-semibold text-slate-900 dark:text-white truncate">
                        {user.fullName}
                      </span>
                      <span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Department */}
                <td className="px-6 py-4 font-medium text-slate-650 dark:text-slate-350">
                  {user.department}
                </td>

                {/* Academic Year */}
                <td className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-450">
                  Year {user.academicYear}
                </td>

                {/* System Role */}
                <td className="px-6 py-4">
                  <span
                    className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      roleColors[user.role] || roleColors.STUDENT
                    }`}
                  >
                    {user.role}
                  </span>
                </td>

                {/* Status Badge */}
                <td className="px-6 py-4">
                  <StatusBadge status={user.status} />
                </td>

                {/* Joined Date */}
                <td className="px-6 py-4 text-slate-500 dark:text-slate-450 font-medium">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>

                {/* Last Login */}
                <td className="px-6 py-4 text-slate-500 dark:text-slate-450 font-medium">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                </td>

                {/* Actions Dropdown Button */}
                <td className="px-6 py-4 text-right relative">
                  <button
                    onClick={() =>
                      setActiveMenuId(activeMenuId === user._id ? null : user._id)
                    }
                    disabled={isPending}
                    className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all hover:shadow-sm"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {/* Context Dropdown menu */}
                  {activeMenuId === user._id && (
                    <div
                      ref={menuRef}
                      className="absolute right-6 top-12 z-20 w-44 origin-top-right rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl dark:border-white/5 dark:bg-ink-900 animate-fade-up text-left"
                    >
                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          onView(user);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-white/[0.03] transition-all"
                      >
                        <Eye size={13} />
                        View Profile
                      </button>

                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          onEdit(user);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-white/[0.03] transition-all"
                      >
                        <Edit2 size={13} />
                        Edit User
                      </button>

                      {user.status === "ACTIVE" ? (
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onSuspend(user);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-450 dark:hover:bg-amber-500/10 transition-all"
                        >
                          <ShieldOff size={13} />
                          Suspend User
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onActivate(user);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-450 dark:hover:bg-emerald-500/10 transition-all"
                        >
                          <ShieldAlert size={13} />
                          Reactivate User
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          onResetPassword(user);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-white/[0.03] transition-all"
                      >
                        <Key size={13} />
                        Reset Password
                      </button>

                      <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          onDelete(user);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                      >
                        <Trash2 size={13} />
                        Delete User
                      </button>
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-none",
    SUSPENDED: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-none",
    DEACTIVATED: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-none",
  };
  return (
    <span
      className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        colors[status] || colors.ACTIVE
      }`}
    >
      {status}
    </span>
  );
}
