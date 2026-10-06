import React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  COMMUNITY_CATEGORIES,
  type CommunityCategory,
  type CommunityType
} from "../types/community";

const COMMUNITY_TYPES: { label: string; value: CommunityType }[] = [
  { label: "Academic", value: "ACADEMIC" },
  { label: "Study Group", value: "STUDY_GROUP" },
  { label: "College", value: "COLLEGE" },
  { label: "Club", value: "CLUB" },
  { label: "Interest", value: "INTEREST" },
  { label: "Project", value: "PROJECT" }
];

interface CommunityFiltersProps {
  search: string;
  category: CommunityCategory | "";
  type?: CommunityType | "";
  onSearch: (value: string) => void;
  onCategory: (value: CommunityCategory | "") => void;
  onType?: (value: CommunityType | "") => void;
}

export function CommunityFilters({
  search,
  category,
  type,
  onSearch,
  onCategory,
  onType
}: CommunityFiltersProps) {
  const hasActiveFilters = Boolean(search || category || type);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/5">
      {/* Search Input Bar */}
      <div className="relative flex-1 max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by community name, description, tags..."
          className="w-full pl-10 pr-9 py-2 rounded-xl text-xs bg-white dark:bg-[#0B132B] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1E90FF] focus:border-[#1E90FF] transition-all shadow-2xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md"
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Select Dropdown Filters */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 sm:pb-0">
        {onType && (
          <select
            value={type || ""}
            onChange={(e) => onType(e.target.value as CommunityType | "")}
            aria-label="Filter by community type"
            className="px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-[#0B132B] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all cursor-pointer shadow-2xs"
          >
            <option value="">All Types</option>
            {COMMUNITY_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        )}

        <select
          value={category}
          onChange={(e) => onCategory(e.target.value as CommunityCategory | "")}
          aria-label="Filter by category"
          className="px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-[#0B132B] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all cursor-pointer shadow-2xs max-w-[200px]"
        >
          <option value="">All Categories</option>
          {COMMUNITY_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onSearch("");
              onCategory("");
              if (onType) onType("");
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            <X size={12} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
