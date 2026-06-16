import { Search } from "lucide-react";
import { COMMUNITY_CATEGORIES, type CommunityCategory } from "../types/community";

interface CommunityFiltersProps {
  search: string;
  category: CommunityCategory | "";
  onSearch: (value: string) => void;
  onCategory: (value: CommunityCategory | "") => void;
}

export function CommunityFilters({
  search,
  category,
  onSearch,
  onCategory
}: CommunityFiltersProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 dark:border-white/10 lg:flex-row">
      <label className="relative flex-1">
        <Search
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className="field pl-10"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search communities"
        />
      </label>
      <select
        className="field lg:max-w-72"
        value={category}
        onChange={(event) => onCategory(event.target.value as CommunityCategory | "")}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {COMMUNITY_CATEGORIES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}
