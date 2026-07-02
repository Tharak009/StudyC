import { type ReactNode } from "react";

interface DashboardCardProps {
  icon?: ReactNode;
  title: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function DashboardCard({ icon, title, value, trend, className = "" }: DashboardCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-150 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-350 dark:border-white/5 dark:bg-ink-900 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start">
        <span
          title={title}
          className="min-w-0 text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1"
        >
          {title}
        </span>
        {icon ? (
          <div className="absolute right-5 top-5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-white/[0.03] text-indigo-500 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-none">
            {icon}
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white block leading-none">
          {value}
        </span>
        {trend && (
          <div className="mt-2 flex items-center">
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                trend.isPositive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-none"
                  : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-450 dark:border-none"
              }`}
            >
              {trend.value}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
