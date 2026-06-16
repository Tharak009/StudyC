import { Library, UsersRound, Building2, Flag, Activity } from "lucide-react";

interface Stat {
  label: string;
  value: number;
  icon: typeof UsersRound;
  color: string;
}

interface StatisticsCardsProps {
  stats: {
    userCount: number;
    communityCount: number;
    resourceCount: number;
    reportCount: number;
    activeUsers: number;
  };
}

export function StatisticsCards({ stats }: StatisticsCardsProps) {
  const cards: Stat[] = [
    { label: "Users", value: stats.userCount, icon: UsersRound, color: "text-signal-600 bg-signal-50 dark:text-signal-300 dark:bg-signal-500/10" },
    { label: "Communities", value: stats.communityCount, icon: Building2, color: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10" },
    { label: "Resources", value: stats.resourceCount, icon: Library, color: "text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/10" },
    { label: "Pending reports", value: stats.reportCount, icon: Flag, color: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10" },
    { label: "Active (7d)", value: stats.activeUsers, icon: Activity, color: "text-cyan-600 bg-cyan-50 dark:text-cyan-300 dark:bg-cyan-500/10" }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]"
        >
          <div className={`mb-3 grid size-10 place-items-center rounded-xl ${color}`}>
            <Icon size={18} />
          </div>
          <p className="text-2xl font-semibold tracking-[-0.03em]">{value.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      ))}
    </div>
  );
}
