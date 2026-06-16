import { Lock, UsersRound } from "lucide-react";
import { Link } from "react-router";
import type { Community } from "../types/community";

export function CommunityCard({ community }: { community: Community }) {
  return (
    <Link
      to={`/communities/${community._id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-signal-300 hover:shadow-xl hover:shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-signal-400/60 dark:hover:shadow-none"
    >
      <div className="h-24 overflow-hidden rounded-xl bg-slate-950">
        {community.bannerImage ? (
          <img src={community.bannerImage} alt="" className="size-full object-cover opacity-85" />
        ) : (
          <div className="size-full bg-[linear-gradient(135deg,#0f172a,#155e75,#16a34a)]" />
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-[-0.025em] group-hover:text-signal-600 dark:group-hover:text-signal-300">
            {community.name}
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {community.category}
          </p>
        </div>
        {community.visibility === "private" && <Lock size={16} className="mt-1 text-slate-400" />}
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-400">
        {community.description || "A campus community for focused academic collaboration."}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <UsersRound size={14} />
          {community.memberCount} members
        </span>
        <span className="font-semibold text-signal-600 dark:text-signal-300">
          {community.membershipRole ?? "Discover"}
        </span>
      </div>
    </Link>
  );
}
