import React from "react";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  Users,
  UploadCloud,
  Bookmark
} from "lucide-react";

export type ProfileTabType = "overview" | "network" | "contributions" | "bookmarks";

interface ProfileTabsProps {
  activeTab: ProfileTabType;
  onTabChange: (tab: ProfileTabType) => void;
  networkCount: number;
  contributionsCount: number;
  bookmarksCount: number;
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  networkCount,
  contributionsCount,
  bookmarksCount
}: ProfileTabsProps) {
  const tabs = [
    {
      id: "overview" as ProfileTabType,
      label: "Academic Overview",
      icon: LayoutGrid,
      count: null
    },
    {
      id: "network" as ProfileTabType,
      label: "Classmates & Network",
      icon: Users,
      count: networkCount
    },
    {
      id: "contributions" as ProfileTabType,
      label: "My Contributions",
      icon: UploadCloud,
      count: contributionsCount
    },
    {
      id: "bookmarks" as ProfileTabType,
      label: "Saved Vault Bookmarks",
      icon: Bookmark,
      count: bookmarksCount
    }
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200/80 dark:border-slate-800/80 pb-2 scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? "text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="profileActiveTab"
                className="absolute inset-0 rounded-2xl bg-[#1E90FF] shadow-md shadow-[#1E90FF]/25"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}

            <Icon size={14} className="relative z-10" />
            <span className="relative z-10">{tab.label}</span>

            {tab.count !== null && (
              <span
                className={`relative z-10 px-2 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                  isActive
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

export default ProfileTabs;
