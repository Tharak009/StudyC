import { ShieldAlert, Clock, AlertOctagon, UserX, Inbox } from "lucide-react";
import type { ModeratedContent } from "../types/moderation";

export type QueueType = "ALL" | "PENDING" | "HIGH_PRIORITY" | "REPEAT_OFFENDERS" | "RECENT";

interface ModerationQueueProps {
  items: ModeratedContent[];
  activeQueue: QueueType;
  onChangeQueue: (queue: QueueType) => void;
}

export function ModerationQueue({ items, activeQueue, onChangeQueue }: ModerationQueueProps) {
  // Compute counts dynamically
  const counts = {
    ALL: items.length,
    PENDING: items.filter((item) => item.moderationStatus === "PENDING").length,
    HIGH_PRIORITY: items.filter((item) => item.reportsCount >= 4).length,
    REPEAT_OFFENDERS: items.filter(
      (item) => item.author.status === "WARNED" || item.author.status === "SUSPENDED"
    ).length,
    RECENT: items.filter((item) => {
      const oneDayAgo = new Date().getTime() - 24 * 60 * 60 * 1000;
      return new Date(item.createdAt).getTime() >= oneDayAgo;
    }).length
  };

  const queueTabs = [
    {
      id: "ALL" as QueueType,
      label: "All Content",
      icon: <Inbox size={15} />,
      count: counts.ALL,
      colorClass: "text-slate-500 bg-slate-100 dark:bg-white/5 dark:text-slate-400"
    },
    {
      id: "PENDING" as QueueType,
      label: "Awaiting Review",
      icon: <ShieldAlert size={15} />,
      count: counts.PENDING,
      colorClass: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400"
    },
    {
      id: "HIGH_PRIORITY" as QueueType,
      label: "High-Priority",
      icon: <AlertOctagon size={15} />,
      count: counts.HIGH_PRIORITY,
      colorClass: "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-450"
    },
    {
      id: "REPEAT_OFFENDERS" as QueueType,
      label: "Repeated Offenders",
      icon: <UserX size={15} />,
      count: counts.REPEAT_OFFENDERS,
      colorClass: "text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400"
    },
    {
      id: "RECENT" as QueueType,
      label: "Recently Reported",
      icon: <Clock size={15} />,
      count: counts.RECENT,
      colorClass: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400"
    }
  ];

  return (
    <div className="flex flex-wrap gap-2 pb-1">
      {queueTabs.map((tab) => {
        const isActive = activeQueue === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeQueue(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer hover:shadow-sm border border-slate-200/50 ${
              isActive
                ? "bg-indigo-600 text-white shadow dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500"
                : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-white/5 dark:bg-ink-900 dark:text-slate-350 dark:hover:bg-white/[0.03] dark:hover:text-white"
            }`}
          >
            <span className={isActive ? "text-white" : "text-slate-400 dark:text-slate-500"}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isActive ? "bg-white/20 text-white" : tab.colorClass
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
