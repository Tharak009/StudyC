import React from "react";
import { Link } from "react-router";
import {
  Archive,
  FileEdit,
  Lock,
  Users,
  Layers,
  Shield,
  ArrowRight
} from "lucide-react";
import type { Community } from "../types/community";

export function CommunityCard({ community }: { community: Community }) {
  const normVisibility = (community.visibility || "PUBLIC").toUpperCase();
  const isPrivate = normVisibility === "PRIVATE" || normVisibility === "INVITE_ONLY";
  const isCollegeOnly = normVisibility === "COLLEGE_ONLY";
  const isArchived = community.status === "ARCHIVED";
  const isDraft = community.status === "DRAFT";
  const banner = community.bannerImage || community.banner;

  const roleText =
    community.membershipRole === "OWNER"
      ? "Owner"
      : community.membershipRole === "MODERATOR"
      ? "Moderator"
      : community.membershipRole === "MEMBER"
      ? "Member"
      : community.isPending || community.membershipStatus === "PENDING"
      ? "Pending"
      : null;

  return (
    <Link
      to={`/communities/${community._id}`}
      className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-1 select-none ${
        isArchived
          ? "border-amber-200/80 bg-amber-50/20 dark:border-amber-500/20 dark:bg-amber-950/10"
          : "border-slate-200/80 bg-white hover:border-[#1E90FF]/40 hover:shadow-lg dark:border-white/10 dark:bg-[#0B132B] dark:hover:border-[#1E90FF]/40 dark:hover:shadow-[0_8px_30px_rgba(30,144,255,0.12)]"
      }`}
    >
      <div>
        {/* Banner with subtle ambient texture */}
        <div className="relative h-28 w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#080D1A] via-[#0F1A30] to-[#162544]">
          {banner ? (
            <img
              src={banner}
              alt=""
              className="size-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="size-full opacity-20 bg-[radial-gradient(#1E90FF_1px,transparent_1px)] [background-size:12px_12px]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top Status & Category Badges */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
            {isArchived && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs backdrop-blur-xs">
                <Archive size={10} />
                Archived
              </span>
            )}
            {isDraft && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-700/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs backdrop-blur-xs">
                <FileEdit size={10} />
                Draft
              </span>
            )}
            {community.type && (
              <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-xs border border-white/10">
                {community.type.replace("_", " ")}
              </span>
            )}
          </div>

          {/* Bottom Left Community Icon Avatar */}
          <div className="absolute bottom-2 left-2 flex items-center gap-2 z-10">
            {community.icon ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white dark:border-[#0B132B] shadow-md bg-white dark:bg-[#0B132B] shrink-0">
                <img src={community.icon} alt="" className="size-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl border-2 border-white dark:border-[#0B132B] bg-gradient-to-br from-[#1E90FF] to-indigo-600 flex items-center justify-center text-white text-base font-black shadow-md shrink-0">
                {community.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base font-bold text-slate-900 dark:text-white group-hover:text-[#1E90FF] transition-colors tracking-tight">
              {community.name}
            </h3>
            {isPrivate ? (
              <Lock size={14} className="mt-1 shrink-0 text-slate-400" />
            ) : isCollegeOnly ? (
              <Shield size={14} className="mt-1 shrink-0 text-[#1E90FF]" />
            ) : null}
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1E90FF] dark:text-[#38BDF8]">
            {community.category}
          </p>

          <p className="line-clamp-2 min-h-[36px] text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {community.description || "A campus community for focused academic collaboration and study."}
          </p>
        </div>
      </div>

      {/* Footer Info & Action */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
          <span className="flex items-center gap-1">
            <Users size={13} className="text-slate-400" />
            <span>{community.memberCount || 1} members</span>
          </span>
          {community.groupCount !== undefined && community.groupCount > 0 && (
            <span className="flex items-center gap-1">
              <Layers size={13} className="text-slate-400" />
              <span>{community.groupCount} groups</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {roleText ? (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                roleText === "Owner"
                  ? "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20"
                  : roleText === "Moderator"
                  ? "bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 border border-sky-500/20"
                  : roleText === "Member"
                  ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              {roleText}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E90FF] group-hover:translate-x-0.5 transition-transform">
              <span>View</span>
              <ArrowRight size={11} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
