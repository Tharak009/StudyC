import type { User } from "../types/auth";

interface UserTableProps {
  users: User[];
  onBan?: (userId: string) => void;
  onUnban?: (userId: string) => void;
  onSuspend?: (userId: string) => void;
  onActivate?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  isPending?: boolean;
}

export function UserTable({ users, onSuspend, onActivate, onDelete, isPending }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No users found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Roll number</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
              <td className="px-4 py-3 font-medium">{user.fullName}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{user.rollNumber}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{user.email}</td>
              <td className="px-4 py-3">
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-white/[0.06]">
                  {user.role}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={user.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {user.status !== "ACTIVE" && onActivate && (
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                      onClick={() => onActivate(user._id)}
                      disabled={isPending}
                    >
                      Activate
                    </button>
                  )}
                  {user.status === "ACTIVE" && onSuspend && (
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                      onClick={() => onSuspend(user._id)}
                      disabled={isPending}
                    >
                      Suspend
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      onClick={() => { if (confirm("Delete this user?")) onDelete(user._id); }}
                      disabled={isPending}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    SUSPENDED: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    DEACTIVATED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
  };
  return (
    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${colors[status] ?? ""}`}>
      {status}
    </span>
  );
}
