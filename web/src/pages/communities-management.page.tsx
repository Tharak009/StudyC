import { useState } from "react";
import { CommunityTable } from "../components/community-table";
import { SearchBar } from "../components/search-bar";
import { useAdminCommunities, useDeleteCommunity } from "../hooks/use-admin";

export function CommunitiesManagementPage() {
  const [search, setSearch] = useState("");
  const deleteCommunity = useDeleteCommunity();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminCommunities({
    limit: 20,
    search: search || undefined
  });

  const communities = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Communities</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total} communit{total !== 1 ? "ies" : "y"}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <SearchBar value={search} onChange={setSearch} placeholder="Search communities..." />
        </div>
      </div>

      <CommunityTable
        communities={communities}
        onDelete={(id) => deleteCommunity.mutate(id)}
        isPending={deleteCommunity.isPending}
      />

      {hasNextPage && (
        <div className="mt-6 text-center">
          <button
            type="button"
            className="primary-button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
