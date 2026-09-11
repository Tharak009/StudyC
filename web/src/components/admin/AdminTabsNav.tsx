import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Users,
  AlertTriangle,
  FileCheck,
  MessageSquare,
  ScrollText,
  ShieldCheck
} from "lucide-react";

export type AdminTabKey =
  | "overview"
  | "users"
  | "reports"
  | "resources"
  | "communities"
  | "audit"
  | "profile";

interface AdminTabsNavProps {
  activeTab: AdminTabKey;
  onSelectTab: (tab: AdminTabKey) => void;
  pendingReportsCount?: number;
  totalUsersCount?: string;
}

export function AdminTabsNav({
  activeTab,
  onSelectTab,
  pendingReportsCount = 4,
  totalUsersCount = "2.4K"
}: AdminTabsNavProps) {
  const tabs = [
    {
      id: "overview" as AdminTabKey,
      label: "Overview & Metrics",
      icon: Activity,
      count: null
    },
    {
      id: "users" as AdminTabKey,
      label: "User Directory & Roles",
      icon: Users,
      count: totalUsersCount
    },
    {
      id: "reports" as AdminTabKey,
      label: "Content Reports & Flags",
      icon: AlertTriangle,
      count: pendingReportsCount > 0 ? `${pendingReportsCount} Pending` : null,
      isDanger: true
    },
    {
      id: "resources" as AdminTabKey,
      label: "Resource Moderation",
      icon: FileCheck,
      count: null
    },
    {
      id: "communities" as AdminTabKey,
      label: "Community Governance",
      icon: MessageSquare,
      count: null
    },
    {
      id: "audit" as AdminTabKey,
      label: "90-Day Audit Trail",
      icon: ScrollText,
      count: null
    },
    {
      id: "profile" as AdminTabKey,
      label: "Admin Profile",
      icon: ShieldCheck,
      count: null
    }
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? "text-white shadow-md shadow-[#1E90FF]/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162544]/60"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="adminTabIndicator"
                className="absolute inset-0 rounded-2xl bg-[#1E90FF]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}

            <Icon size={14} className="relative z-10" />
            <span className="relative z-10">{tab.label}</span>

            {tab.count !== null && (
              <span
                className={`relative z-10 px-2 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                  tab.isDanger
                    ? "bg-rose-500 text-white"
                    : isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default AdminTabsNav;
