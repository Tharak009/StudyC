import type { Community } from "../types/community";

interface CommunityTableProps {
  communities: Community[];
  onDelete?: (communityId: string) => void;
  isPending?: boolean;
}

export function CommunityTable({ communities, onDelete, isPending }: CommunityTableProps) {
  if (communities.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No communities found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Members</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Visibility</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {communities.map((community) => (
            <tr key={community._id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
              <td className="px-4 py-3 font-medium">{community.name}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{community.owner?.fullName ?? "Unknown"}</td>
              <td className="px-4 py-3">{community.memberCount}</td>
              <td className="px-4 py-3">
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-white/[0.06]">
                  {community.category}
                </span>
              </td>
              <td className="px-4 py-3">
                <VisibilityBadge visibility={community.visibility} />
              </td>
              <td className="px-4 py-3">
                {onDelete && (
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => { if (confirm("Delete this community?")) onDelete(community._id); }}
                    disabled={isPending}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const isPublic = visibility === "public";
  return (
    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
      isPublic
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
        : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
    }`}>
      {visibility}
    </span>
  );
}
