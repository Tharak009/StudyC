import { useAdminDashboard } from "../hooks/use-admin";
import { DashboardCard } from "../components/dashboard-card";
import { ChartCard } from "../components/chart-card";
import { Link } from "react-router";
import {
  Users,
  Activity,
  Compass,
  Calendar,
  FileText,
  MessageSquare,
  Flag,
  UserX,
  UserPlus,
  PlusCircle,
  Megaphone,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

export function AdminDashboard() {
  const { data: stats, isLoading } = useAdminDashboard();

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-4 w-72 rounded bg-slate-200 dark:bg-white/10" />
        </div>

        {/* Stats skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04] h-28"
            />
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10" />
          <div className="h-64 rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10" />
        </div>
      </div>
    );
  }

  // Fallback default values augmented by live API variables
  const userCount = stats?.userCount ?? 0;
  const activeUsers = stats?.activeUsers ?? 0;
  const communityCount = stats?.communityCount ?? 0;
  const reportCount = stats?.reportCount ?? 0;

  return (
    <div className="animate-fade-up space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Overview
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Perform administrative moderation, monitor metrics, and manage communities
        </p>
      </div>

      {/* 8 Statistic Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Students"
          value={userCount}
          icon={<Users size={18} />}
          trend={{ value: "+12.5%", isPositive: true }}
        />
        <DashboardCard
          title="Active Users"
          value={activeUsers}
          icon={<Activity size={18} />}
          trend={{ value: "+4.2%", isPositive: true }}
        />
        <DashboardCard
          title="Communities"
          value={communityCount}
          icon={<Compass size={18} />}
          trend={{ value: "+8.1%", isPositive: true }}
        />
        <DashboardCard
          title="Events"
          value={24} // Mock metric
          icon={<Calendar size={18} />}
          trend={{ value: "+15.3%", isPositive: true }}
        />
        <DashboardCard
          title="Posts"
          value={1420} // Mock metric
          icon={<FileText size={18} />}
          trend={{ value: "+28.7%", isPositive: true }}
        />
        <DashboardCard
          title="Comments"
          value={4850} // Mock metric
          icon={<MessageSquare size={18} />}
          trend={{ value: "+18.4%", isPositive: true }}
        />
        <DashboardCard
          title="Pending Reports"
          value={reportCount}
          icon={<Flag size={18} />}
          trend={{ value: reportCount > 0 ? `+${reportCount} items` : "0 items", isPositive: false }}
        />
        <DashboardCard
          title="Suspended Users"
          value={3} // Mock metric
          icon={<UserX size={18} />}
          trend={{ value: "-25%", isPositive: true }} // Negative trend is positive for suspensions
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="User Growth (6 Months)" type="area" />
        <ChartCard title="Community Registration by Dept" type="bar" />
        <ChartCard title="Daily Active Users (DAU)" type="combo" />
        <ChartCard title="Weekly Event Activity" type="line" />
      </div>

      {/* Grid: Recent Activity & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity Logs */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-150 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-ink-900 transition-all duration-300">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-5">
            Recent Moderator Activity
          </h3>
          
          {!stats || stats.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldCheck size={36} className="text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs text-slate-400 dark:text-slate-500">No logs found on database.</p>
            </div>
          ) : (
            <div className="relative border-l border-slate-200 dark:border-white/5 pl-5 ml-2.5 space-y-6">
              {stats.recentActivity.slice(0, 5).map((log) => (
                <div key={log._id} className="relative">
                  {/* Timeline point */}
                  <span className="absolute -left-[27.5px] top-1.5 flex size-3 items-center justify-center rounded-full bg-indigo-500 ring-4 ring-white dark:ring-ink-900" />
                  
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {log.adminId?.fullName ?? "System"}
                        </span>{" "}
                        executed{" "}
                        <span className="bg-slate-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                          {log.action.replace(/_/g, " ")}
                        </span>
                        {log.targetType && (
                          <>
                            {" "}on <span className="font-semibold text-slate-700 dark:text-slate-300">{log.targetType.toLowerCase()}</span>
                          </>
                        )}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-lg">
                          Details: {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Action Buttons Card */}
        <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-ink-900 transition-all duration-300">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-5">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <Link
              to="/admin/users?action=new"
              className="flex items-center justify-between rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 px-4 py-3 dark:border-white/5 dark:bg-white/[0.01] dark:hover:bg-white/[0.03] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                  <UserPlus size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Add New User</span>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

            <Link
              to="/admin/communities?action=new"
              className="flex items-center justify-between rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 px-4 py-3 dark:border-white/5 dark:bg-white/[0.01] dark:hover:bg-white/[0.03] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-500 dark:text-violet-400">
                  <PlusCircle size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Create Community</span>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

            <Link
              to="/admin/events?action=new"
              className="flex items-center justify-between rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 px-4 py-3 dark:border-white/5 dark:bg-white/[0.01] dark:hover:bg-white/[0.03] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-500 dark:text-cyan-400">
                  <Calendar size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Create Campus Event</span>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

            <Link
              to="/admin/announcements?action=new"
              className="flex items-center justify-between rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 px-4 py-3 dark:border-white/5 dark:bg-white/[0.01] dark:hover:bg-white/[0.03] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                  <Megaphone size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Publish Announcement</span>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

            <Link
              to="/admin/reports"
              className="flex items-center justify-between rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 px-4 py-3 dark:border-white/5 dark:bg-white/[0.01] dark:hover:bg-white/[0.03] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-450">
                  <AlertTriangle size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Review Open Reports</span>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
