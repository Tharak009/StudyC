import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

export function ComingSoonRow({
  icon: Icon,
  title,
  description,
  stage
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  stage: string;
}) {
  return (
    <div className="group flex items-center gap-4 border-t border-slate-200 py-5 first:border-t-0 dark:border-white/10">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-signal-500 group-hover:text-white dark:bg-white/[0.06] dark:text-slate-300">
        <Icon size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-950 dark:text-white">{title}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
            {stage}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <ArrowUpRight size={18} className="text-slate-300 dark:text-slate-700" />
    </div>
  );
}
