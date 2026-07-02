import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Sparkles, TrendingUp, Users } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "react-router";
import { communitiesApi } from "../api/communities.api";
import { CommunityCard } from "../components/community-card";
import { CommunityFilters } from "../components/community-filters";
import { LoadingScreen } from "../components/loading-screen";
import type { CommunityCategory } from "../types/community";

type TabType = "joined" | "recommended" | "trending";

export function CommunitiesListPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CommunityCategory | "">("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>("joined");

  const query = useQuery({
    queryKey: ["communities", { search, category, page }],
    queryFn: () => communitiesApi.list({ search: search || undefined, category, page, limit: 24 })
  });

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const updateCategory = (value: CommunityCategory | "") => {
    setCategory(value);
    setPage(1);
  };

  const data = query.data;

  const filteredItems = useMemo(() => {
    if (!data) return [];
    let items = [...data.items];

    if (activeTab === "joined") {
      items = items.filter((c) => c.isMember);
    } else if (activeTab === "recommended") {
      items = items.filter((c) => !c.isMember);
    } else if (activeTab === "trending") {
      items.sort((a, b) => b.memberCount - a.memberCount);
    }

    return items;
  }, [data, activeTab]);

  return (
    <div className="animate-fade-up space-y-8">
      <header className="flex flex-col justify-between gap-5 pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-signal-500 dark:text-signal-300">
            Student Workspace
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white sm:text-5xl">
            Find your study circles.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Discover academic communities for programming, placement prep, security, data, and more.
          </p>
        </div>
        <Link to="/communities/new" className="primary-button shrink-0 shadow-md">
          <Plus size={17} />
          Create community
        </Link>
      </header>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 dark:border-white/5 pb-px">
        <button
          onClick={() => setActiveTab("joined")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "joined"
              ? "border-indigo-600 text-indigo-650 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <Users size={14} />
          Joined
        </button>
        <button
          onClick={() => setActiveTab("recommended")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "recommended"
              ? "border-indigo-600 text-indigo-650 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <Sparkles size={14} />
          Recommended
        </button>
        <button
          onClick={() => setActiveTab("trending")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "trending"
              ? "border-indigo-600 text-indigo-650 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <TrendingUp size={14} />
          Trending
        </button>
      </div>

      <CommunityFilters
        search={search}
        category={category}
        onSearch={updateSearch}
        onCategory={updateCategory}
      />

      {query.isLoading ? (
        <LoadingScreen />
      ) : query.isError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
          Could not load communities.
        </p>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((community) => (
              <CommunityCard key={community._id} community={community} />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="py-16 text-center border border-dashed border-slate-200 dark:border-white/5 rounded-2xl bg-white dark:bg-ink-900">
              <Users size={32} className="mx-auto text-slate-350 dark:text-slate-600 mb-3" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">No communities found</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {activeTab === "joined"
                  ? "You haven't joined any communities matching these filters."
                  : activeTab === "recommended"
                  ? "No new recommended communities found."
                  : "No communities found matching these filters."}
              </p>
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-5 text-sm dark:border-white/10">
              <span className="text-slate-550 dark:text-slate-450 text-xs">
                Page {data.page} of {data.pages}
              </span>
              <div className="flex gap-2">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={page >= data.pages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
