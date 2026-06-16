import { useState } from "react";
import { ReportsTable } from "../components/reports-table";
import { useAdminReports, useReviewReport } from "../hooks/use-admin";
import type { ReportStatus } from "../types/admin";

export function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const reviewReport = useReviewReport();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminReports({
    limit: 20,
    status: statusFilter || undefined
  });

  const reports = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Reports</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total} report{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["", "PENDING", "REVIEWED", "RESOLVED", "REJECTED"].map((status) => (
            <button
              key={status}
              type="button"
              className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? "bg-signal-50 text-signal-600 dark:bg-signal-500/10 dark:text-signal-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.1]"
              }`}
              onClick={() => setStatusFilter(status)}
            >
              {status || "All"}
            </button>
          ))}
        </div>
      </div>

      <ReportsTable
        reports={reports}
        onResolve={(id) => reviewReport.mutate({ reportId: id, status: "RESOLVED" as ReportStatus })}
        onReject={(id) => reviewReport.mutate({ reportId: id, status: "REJECTED" as ReportStatus })}
        isPending={reviewReport.isPending}
      />

      {hasNextPage && (
        <div className="mt-6 text-center">
          <button
            type="button"
            className="primary-button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
