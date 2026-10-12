import React, { useMemo } from "react";
import { Link, useLocation } from "react-router";
import { BookOpen, ChevronDown, Compass, FolderKanban, GraduationCap, Hash, Megaphone, Plus, Search, Users, X } from "lucide-react";
import type { Community } from "../../types/community";
import type { CommunityGroup } from "../../types/community-group";

interface CommunityDirectorySidebarProps {
  communities: Community[];
  activeCommunityId?: string;
  loading?: boolean;
  sidebarWidth?: number;
  expandedCommunityId?: string;
  groups?: CommunityGroup[];
  groupsLoading?: boolean;
  groupsError?: boolean;
  selectedGroupId?: string;
  onCreateCommunity?: () => void;
  onSelectCommunity?: (communityId: string) => void;
  onSelectGroup?: (communityId: string, groupId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function CommunityDirectorySidebar({
  communities,
  activeCommunityId,
  loading = false,
  sidebarWidth = 360,
  expandedCommunityId,
  groups = [],
  groupsLoading = false,
  groupsError = false,
  selectedGroupId,
  onCreateCommunity,
  onSelectCommunity,
  onSelectGroup,
  search,
  onSearchChange
}: CommunityDirectorySidebarProps) {
  const location = useLocation();
  const groupIcon = (group: CommunityGroup) => {
    if (group.isAnnouncement || group.type === "ANNOUNCEMENT") return <Megaphone size={14} />;
    if (group.type === "STUDY") return <BookOpen size={14} />;
    if (group.type === "PROJECT") return <FolderKanban size={14} />;
    if (group.type === "SUBJECT") return <GraduationCap size={14} />;
    return <Hash size={14} />;
  };
  const visibleCommunities = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return communities;
    return communities.filter((community) =>
      `${community.name} ${community.category || ""}`.toLowerCase().includes(query)
    );
  }, [communities, search]);

  return (
    <aside
      className="flex h-full w-full min-w-0 flex-col border-r border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-[#0B132B] dark:text-slate-100 lg:w-[var(--communities-sidebar-width)] lg:shrink-0"
      style={{ "--communities-sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
    >
      <header className="flex h-[68px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 dark:border-white/10">
        <h1 className="text-lg font-bold tracking-tight">Study Circles</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/communities"
            aria-label="Discover Study Circles"
            aria-current={location.pathname === "/communities" ? "page" : undefined}
            title="Discover Study Circles"
            className={`flex size-9 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] ${
              location.pathname === "/communities"
                ? "bg-[#1E90FF]/10 text-[#1E90FF] dark:bg-[#1E90FF]/15 dark:text-[#38BDF8]"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            <Compass size={17} />
          </Link>
          {onCreateCommunity && (
            <button
              type="button"
              onClick={onCreateCommunity}
              className="flex size-9 items-center justify-center rounded-xl bg-[#1E90FF] text-white transition-colors hover:bg-[#187BCD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF]"
              aria-label="Create Study Circle"
              title="Create Study Circle"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </header>

      <div className="shrink-0 border-b border-slate-100 p-3 dark:border-white/5">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search study circles"
            aria-label="Search study circles"
            className="w-full rounded-xl border border-transparent bg-slate-100 py-2.5 pl-10 pr-9 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[#1E90FF]/40 focus:bg-white dark:bg-[#080D1A] dark:text-white dark:focus:bg-[#0B132B]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear study circle search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span>Joined</span>
          <span className="tabular-nums">{communities.length}</span>
        </div>
        <nav aria-label="Joined Study Circles" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3 scrollbar-none">
          {loading ? (
            <div className="space-y-2 p-2" aria-label="Loading communities">
              {[0, 1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />)}
            </div>
          ) : visibleCommunities.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {search ? "No study circles match your search." : "Joined study circles will appear here."}
            </p>
          ) : visibleCommunities.map((community) => {
            const isActive = community._id === activeCommunityId;
            const isExpanded = community._id === expandedCommunityId;
            return (
              <div key={community._id}>
                <button
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  aria-expanded={isExpanded}
                  onClick={() => onSelectCommunity?.(community._id)}
                  className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-[#1E90FF]/10 text-[#1E90FF] dark:bg-[#1E90FF]/15 dark:text-[#38BDF8]"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                  }`}
                >
                  {community.icon && (community.icon.startsWith("http") || community.icon.startsWith("/") || community.icon.startsWith("data:")) ? (
                    <img src={community.icon} alt="" className="size-10 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1E90FF]/10 text-sm font-bold text-[#1E90FF] dark:bg-[#1E90FF]/15">
                      {community.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{community.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      <Users size={12} className="shrink-0" />
                      {community.memberCount ?? 0} members
                      {community.category && <><span>·</span><span className="truncate">{community.category}</span></>}
                    </span>
                  </span>
                  <ChevronDown size={15} className={`shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {isExpanded && (
                  <div className="ml-5 mt-1 space-y-0.5 border-l border-slate-200 pl-3 dark:border-white/10">
                    {groupsLoading ? (
                      <p className="px-2 py-2 text-xs text-slate-400">Loading groups…</p>
                    ) : groupsError ? (
                      <p className="px-2 py-2 text-xs text-rose-500">Unable to load groups</p>
                    ) : groups.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-slate-400">No groups available</p>
                    ) : groups.map((group) => {
                      const isSelectedGroup = selectedGroupId === group._id && location.pathname.includes("/groups/");
                      return (
                        <button
                          key={group._id}
                          type="button"
                          onClick={() => onSelectGroup?.(community._id, group._id)}
                          className={`flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                            isSelectedGroup
                              ? "bg-[#1E90FF]/10 font-semibold text-[#1E90FF] dark:bg-[#1E90FF]/15 dark:text-[#38BDF8]"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                          }`}
                          title={group.name}
                        >
                          <span className={group.isAnnouncement || group.type === "ANNOUNCEMENT" ? "shrink-0 text-amber-500" : "shrink-0 text-slate-400"}>{groupIcon(group)}</span>
                          <span className="truncate">{group.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

    </aside>
  );
}
