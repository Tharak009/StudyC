import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Search, UserPlus, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { usersApi } from "../api/users.api";
import type { User } from "../types/auth";
import { Avatar } from "./avatar";

interface UserSearchProps {
  onSelect: (user: User) => void;
  excludeIds?: string[];
}

export function UserSearch({ onSelect, excludeIds = [] }: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const search = useQuery({
    queryKey: ["users", "search", query],
    queryFn: () => usersApi.search(query),
    enabled: query.length >= 2
  });

  const results = (search.data ?? []).filter(
    (user) => !excludeIds.includes(user._id)
  );

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          className="field pl-9"
          placeholder="Search users..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            className="icon-button absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => { setQuery(""); setOpen(false); }}
            type="button"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div
          ref={panelRef}
          className="absolute top-full z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-ink-800"
        >
          {search.isLoading && (
            <div className="flex items-center justify-center py-6">
              <LoaderCircle className="animate-spin" size={20} />
            </div>
          )}

          {search.isError && (
            <p className="px-4 py-6 text-center text-sm text-red-500">
              Search failed. Try again.
            </p>
          )}

          {!search.isLoading && !search.isError && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No users found
            </p>
          )}

          {results.length > 0 && (
            <ul className="max-h-60 overflow-y-auto py-2">
              {results.map((user) => (
                <li key={user._id}>
                  <button
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                    type="button"
                    onClick={() => {
                      onSelect(user);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <Avatar name={user.fullName} src={user.profilePicture} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{user.fullName}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {user.rollNumber} &middot; {user.department}
                      </p>
                    </div>
                    <UserPlus size={16} className="shrink-0 text-slate-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
