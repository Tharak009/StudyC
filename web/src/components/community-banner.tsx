import { BookOpen } from "lucide-react";
import type { Community } from "../types/community";

export function CommunityBanner({ community }: { community: Community }) {
  return (
    <div className="relative min-h-56 overflow-hidden rounded-2xl bg-slate-950 text-white">
      {community.bannerImage ? (
        <img
          src={community.bannerImage}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-70"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(52,120,246,0.45),transparent_30%),linear-gradient(135deg,#020617,#0f766e)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/45 to-transparent" />
      <div className="relative flex min-h-56 flex-col justify-end p-6 sm:p-8">
        <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur">
          <BookOpen size={14} />
          {community.category}
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          {community.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">{community.description}</p>
      </div>
    </div>
  );
}
