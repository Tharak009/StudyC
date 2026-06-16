import type { Report } from "../types/admin";

interface ReportsTableProps {
  reports: Report[];
  onResolve?: (reportId: string) => void;
  onReject?: (reportId: string) => void;
  isPending?: boolean;
}

export function ReportsTable({ reports, onResolve, onReject, isPending }: ReportsTableProps) {
  if (reports.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No reports found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            <th className="px-4 py-3">Reporter</th>
            <th className="px-4 py-3">Target</th>
            <th className="px-4 py-3">Reason</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report._id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
              <td className="px-4 py-3 font-medium">{report.reporterId?.fullName ?? "Unknown"}</td>
              <td className="px-4 py-3">
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-white/[0.06]">
                  {report.targetType}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{report.reason}</td>
              <td className="px-4 py-3">
                <StatusBadge status={report.status} />
              </td>
              <td className="px-4 py-3 text-xs text-slate-400">
                {new Date(report.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {report.status === "PENDING" && (
                  <div className="flex items-center gap-1">
                    {onResolve && (
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                        onClick={() => onResolve(report._id)}
                        disabled={isPending}
                      >
                        Resolve
                      </button>
                    )}
                    {onReject && (
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        onClick={() => onReject(report._id)}
                        disabled={isPending}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                )}
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
    PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    REVIEWED: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    RESOLVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    REJECTED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
  };
  return (
    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${colors[status] ?? ""}`}>
      {status}
    </span>
  );
}
