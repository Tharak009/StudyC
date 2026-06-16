import { useState } from "react";
import { SearchBar } from "../components/search-bar";
import { UserTable } from "../components/user-table";
import { useAdminUsers, useActivateUser, useDeleteUser, useSuspendUser } from "../hooks/use-admin";

export function UsersManagementPage() {
  const [search, setSearch] = useState("");
  const activateUser = useActivateUser();
  const suspendUser = useSuspendUser();
  const deleteUser = useDeleteUser();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminUsers({
    limit: 20,
    search: search || undefined
  });

  const users = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const isPending = activateUser.isPending || suspendUser.isPending || deleteUser.isPending;

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Users</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total} user{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
        </div>
      </div>

      <UserTable
        users={users}
        onActivate={(id) => activateUser.mutate(id)}
        onSuspend={(id) => suspendUser.mutate(id)}
        onDelete={(id) => deleteUser.mutate(id)}
        isPending={isPending}
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
