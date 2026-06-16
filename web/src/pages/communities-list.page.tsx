import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { communitiesApi } from "../api/communities.api";
import { CommunityCard } from "../components/community-card";
import { CommunityFilters } from "../components/community-filters";
import { LoadingScreen } from "../components/loading-screen";
import type { CommunityCategory } from "../types/community";

export function CommunitiesListPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CommunityCategory | "">("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["communities", { search, category, page }],
    queryFn: () => communitiesApi.list({ search: search || undefined, category, page, limit: 9 })
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

  return (
    <div className="animate-fade-up">
      <header className="flex flex-col justify-between gap-5 pb-7 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-signal-500 dark:text-signal-300">
            Communities
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Find your study circles.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Discover academic communities for programming, placement prep, security, data, and more.
          </p>
        </div>
        <Link to="/communities/new" className="primary-button shrink-0">
          <Plus size={17} />
          Create community
        </Link>
      </header>

      <CommunityFilters
        search={search}
        category={category}
        onSearch={updateSearch}
        onCategory={updateCategory}
      />

      {query.isLoading ? (
        <LoadingScreen />
      ) : query.isError ? (
        <p role="alert" className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
          Could not load communities.
        </p>
      ) : data ? (
        <>
          <div className="grid gap-5 py-7 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((community) => (
              <CommunityCard key={community._id} community={community} />
            ))}
          </div>
          {data.items.length === 0 && (
            <div className="py-16 text-center">
              <h2 className="text-xl font-semibold">No communities found</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Try a different search or create the first community in this category.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-200 pt-5 text-sm dark:border-white/10">
            <span className="text-slate-500 dark:text-slate-400">
              Page {data.page} of {data.pages}
            </span>
            <div className="flex gap-2">
              <button
                className="secondary-button"
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={page >= data.pages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
