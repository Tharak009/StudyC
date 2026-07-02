import { useState, useRef, useEffect } from "react";
import { MoreVertical, Eye, Edit2, Archive, ArchiveRestore, Trash2, ShieldAlert } from "lucide-react";
import type { Community } from "../types/community";

interface CommunityTableProps {
  communities: Community[];
  archivedIds: string[]; // State tracking archived communities locally
  onView: (community: Community) => void;
  onEdit: (community: Community) => void;
  onArchive: (community: Community) => void;
  onRestore: (community: Community) => void;
  onDelete: (community: Community) => void;
  isPending?: boolean;
}

export function CommunityTable({
  communities,
  archivedIds,
  onView,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  isPending = false,
}: CommunityTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (communities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-slate-200 dark:border-white/5 rounded-2xl bg-white dark:bg-ink-900">
        <ShieldAlert size={36} className="text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No communities found</h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Create a new community or change search filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-ink-900 transition-colors duration-300">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold tracking-wider text-slate-400 dark:border-white/5 dark:bg-white/[0.01] dark:text-slate-500 uppercase">
            <th className="px-6 py-4">Community Details</th>
            <th className="px-6 py-4">Category</th>
            <th className="px-6 py-4">Department</th>
            <th className="px-6 py-4">Creator / Owner</th>
            <th className="px-6 py-4">Members</th>
            <th className="px-6 py-4">Posts</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Visibility</th>
            <th className="px-6 py-4">Created Date</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {communities.map((community) => {
            const initials = community.name
              ? community.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "CM";

            const isArchived = archivedIds.includes(community._id);

            return (
              <tr
                key={community._id}
                className="hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-colors"
              >
                {/* Community avatar and name */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 text-[11px] font-bold text-indigo-650 dark:text-indigo-400">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <span className="block font-semibold text-slate-900 dark:text-white truncate">
                        {community.name}
                      </span>
                      <span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {community.slug}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="px-6 py-4">
                  <span className="rounded bg-indigo-50 px-2 py-0.5 font-bold uppercase text-[9px] tracking-wider text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {community.category}
                  </span>
                </td>

                {/* Department / Primary Tag */}
                <td className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-450">
                  {community.tags?.[0] || "General"}
                </td>

                {/* Owner */}
                <td className="px-6 py-4">
                  <div className="min-w-0">
                    <span className="block font-medium text-slate-700 dark:text-slate-355 truncate">
                      {community.owner?.fullName || "Platform Admin"}
                    </span>
                    <span className="block text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {community.owner?.rollNumber || "ADMIN"}
                    </span>
                  </div>
                </td>

                {/* Members */}
                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                  {community.memberCount}
                </td>

                {/* Posts */}
                <td className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-450">
                  {community.name.length % 2 === 0 ? 42 : 18} {/* Mock posts metric */}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span
                    className={`rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      isArchived
                        ? "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-none"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-none"
                    }`}
                  >
                    {isArchived ? "Archived" : "Active"}
                  </span>
                </td>

                {/* Visibility */}
                <td className="px-6 py-4">
                  <VisibilityBadge visibility={community.visibility} />
                </td>

                {/* Created Date */}
                <td className="px-6 py-4 text-slate-500 dark:text-slate-450 font-medium">
                  {new Date(community.createdAt).toLocaleDateString()}
                </td>

                {/* Actions Dropdown */}
                <td className="px-6 py-4 text-right relative">
                  <button
                    onClick={() =>
                      setActiveMenuId(activeMenuId === community._id ? null : community._id)
                    }
                    disabled={isPending}
                    className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all hover:shadow-sm"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {/* Context menu */}
                  {activeMenuId === community._id && (
                    <div
                      ref={menuRef}
                      className="absolute right-6 top-12 z-20 w-44 origin-top-right rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl dark:border-white/5 dark:bg-ink-900 animate-fade-up text-left"
                    >
                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          onView(community);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-white/[0.03] transition-all"
                      >
                        <Eye size={13} />
                        View Community
                      </button>

                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          onEdit(community);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-white/[0.03] transition-all"
                      >
                        <Edit2 size={13} />
                        Edit Community
                      </button>

                      {!isArchived ? (
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onArchive(community);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-450 dark:hover:bg-amber-500/10 transition-all"
                        >
                          <Archive size={13} />
                          Archive Community
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onRestore(community);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-450 dark:hover:bg-emerald-500/10 transition-all"
                        >
                          <ArchiveRestore size={13} />
                          Restore Community
                        </button>
                      )}

                      <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          onDelete(community);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                      >
                        <Trash2 size={13} />
                        Delete Community
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const isPublic = visibility === "public";
  return (
    <span
      className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
        isPublic
          ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-none"
          : "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-none"
      }`}
    >
      {visibility}
    </span>
  );
}
