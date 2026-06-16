import { useAdminDashboard } from "../hooks/use-admin";
import { StatisticsCards } from "../components/statistics-cards";

export function AdminDashboard() {
  const { data: stats, isLoading } = useAdminDashboard();

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Admin dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Platform overview and moderation tools
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="mb-3 size-10 rounded-xl bg-slate-200 dark:bg-white/10" />
              <div className="h-6 w-16 rounded bg-slate-200 dark:bg-white/10" />
              <div className="mt-2 h-3 w-20 rounded bg-slate-200 dark:bg-white/10" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          <StatisticsCards stats={stats} />

          <div className="mt-8">
            <h2 className="mb-4 text-sm font-semibold">Recent admin activity</h2>
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {stats.recentActivity.map((log) => (
                  <div
                    key={log._id}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          <span className="text-signal-600 dark:text-signal-300">
                            {log.adminId?.fullName ?? "Unknown"}
                          </span>{" "}
                          performed{" "}
                          <span className="font-semibold">{log.action.replace(/_/g, " ")}</span>
                          {log.targetType ? (
                            <>
                              {" "}on {log.targetType.toLowerCase()}
                            </>
                          ) : null}
                        </p>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
