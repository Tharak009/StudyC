import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  Megaphone,
  Plus,
  ArrowRight,
  BookOpen,
  FolderKanban,
  GraduationCap,
  MessageCircle,
  Users,
  Calendar,
  Tag,
  Shield,
  Lock,
  Globe,
  School,
  KeyRound,
  Share2,
  Sparkles,
  Layers,
  Search
} from "lucide-react";
import type { Community, CommunityVisibility } from "../../types/community";
import type { CommunityGroup, GroupType } from "../../types/community-group";
import { Avatar } from "../avatar";
import { useAuthStore } from "../../store/auth.store";
import { useToastStore } from "../../store/toast.store";

interface CommunityOverviewViewProps {
  community: Community;
  groups: CommunityGroup[];
  onOpenCreateGroup?: () => void;
}

function VisibilityBadge({ visibility }: { visibility: CommunityVisibility }) {
  const norm = (visibility || "PUBLIC").toUpperCase();
  if (norm === "PRIVATE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
        <Lock size={12} />
        Private
      </span>
    );
  }
  if (norm === "COLLEGE_ONLY") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/25">
        <School size={12} />
        College Only
      </span>
    );
  }
  if (norm === "INVITE_ONLY") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <KeyRound size={12} />
        Invite Only
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
      <Globe size={12} />
      Public
    </span>
  );
}

function GroupTypeBadge({ type }: { type: GroupType | string }) {
  switch (type) {
    case "STUDY":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <BookOpen size={10} />
          Study
        </span>
      );
    case "PROJECT":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <FolderKanban size={10} />
          Project
        </span>
      );
    case "SUBJECT":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <GraduationCap size={10} />
          Subject
        </span>
      );
    case "DISCUSSION":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/25">
          <MessageCircle size={10} />
          Discussion
        </span>
      );
  }
}

function getGroupIcon(type: GroupType | string) {
  switch (type) {
    case "STUDY":
      return BookOpen;
    case "PROJECT":
      return FolderKanban;
    case "SUBJECT":
      return GraduationCap;
    case "DISCUSSION":
    default:
      return MessageCircle;
  }
}

function getGroupIconColor(type: GroupType | string) {
  switch (type) {
    case "STUDY":
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    case "PROJECT":
      return "text-purple-500 bg-purple-500/10 border-purple-500/20";
    case "SUBJECT":
      return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    case "DISCUSSION":
    default:
      return "text-[#1E90FF] bg-[#1E90FF]/10 border-[#1E90FF]/20";
  }
}

export function CommunityOverviewView({
  community,
  groups,
  onOpenCreateGroup
}: CommunityOverviewViewProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();
  const [groupFilter, setGroupFilter] = useState("");

  const isOwner = Boolean(
    community.membershipRole === "OWNER" ||
      (currentUser?._id && community.owner?._id === currentUser._id)
  );
  const canManage = isOwner || community.membershipRole === "MODERATOR";

  const announcementGroup = groups.find(
    (g) => g.isAnnouncement || g.type === "ANNOUNCEMENT"
  );
  const regularGroups = groups.filter(
    (g) => !g.isAnnouncement && g.type !== "ANNOUNCEMENT"
  );

  const filteredGroups = regularGroups.filter((g) =>
    groupFilter ? g.name.toLowerCase().includes(groupFilter.toLowerCase()) : true
  );

  const announcementTargetId = announcementGroup?._id || community.announcementGroupId;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + `/communities/${community._id}`
      );
      addToast("Community link copied to clipboard!", "success");
    } catch {
      addToast("Failed to copy link", "error");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto min-w-0 bg-slate-50 dark:bg-[#080D1A] no-scrollbar">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* 1. Modern Cobalt Mist Hero Surface */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B132B] shadow-xs">
          {/* Cover Graphic Banner */}
          <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-gradient-to-r from-[#080D1A] via-[#0F1A30] to-[#162544]">
            {community.bannerImage || community.banner ? (
              <img
                src={community.bannerImage || community.banner}
                alt={community.name}
                className="w-full h-full object-cover opacity-60"
              />
            ) : (
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#1E90FF_1px,transparent_1px)] [background-size:16px_16px]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          </div>

          {/* Identity & Metadata Surface */}
          <div className="relative px-6 pb-6 pt-0 -mt-12 sm:-mt-14 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-start sm:items-end gap-4">
              {/* Community Avatar Icon */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-[#0B132B] p-1 shadow-xl border-2 border-white dark:border-white/10 shrink-0">
                {community.icon ? (
                  <img
                    src={community.icon}
                    alt={community.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#1E90FF] to-indigo-600 flex items-center justify-center text-white text-2xl font-black">
                    {community.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Title & Category Row */}
              <div className="min-w-0 pt-2 sm:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {community.name}
                  </h1>
                  <VisibilityBadge visibility={community.visibility} />
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    {community.category}
                  </span>
                </div>

                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 max-w-xl leading-relaxed">
                  {community.description || "Welcome to our study community."}
                </p>

                {/* Key Metrics Row */}
                <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <strong className="text-slate-800 dark:text-slate-200">
                      {community.memberCount || 1}
                    </strong>{" "}
                    Members
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} className="text-slate-400" />
                    <strong className="text-slate-800 dark:text-slate-200">
                      {regularGroups.length}
                    </strong>{" "}
                    Discussion Groups
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    Established{" "}
                    {community.createdAt
                      ? new Date(community.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric"
                        })
                      : "Recently"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
              {announcementTargetId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/communities/${community._id}/groups/${announcementTargetId}`
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#F59E0B] hover:bg-amber-600 shadow-sm shadow-amber-500/25 transition-all cursor-pointer"
                >
                  <Megaphone size={14} />
                  <span>Announcements</span>
                </button>
              )}

              {canManage && (
                <button
                  type="button"
                  onClick={onOpenCreateGroup}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1E90FF] hover:bg-[#187bcd] shadow-sm shadow-[#1E90FF]/25 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Group</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyInvite}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Copy Community Link"
              >
                <Share2 size={14} />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. WhatsApp/Discord-Style Latest Announcement Preview Card */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-transparent p-5 dark:border-amber-500/20 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                <Megaphone size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    📢 Community Broadcast
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {announcementGroup
                      ? "Official Announcements Channel"
                      : "No announcements posted yet"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-200 leading-relaxed max-w-2xl font-medium">
                  {announcementGroup?.description ||
                    "Stay informed with official faculty updates, syllabus notices, and community broadcasts from admins."}
                </p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Lock size={11} className="text-amber-500" />
                    <span>
                      {isOwner
                        ? "You have publisher permissions"
                        : "Read-only for students"}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {announcementTargetId && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/communities/${community._id}/groups/${announcementTargetId}`
                  )
                }
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 dark:text-amber-950 dark:bg-amber-400 transition-all shrink-0 self-start sm:self-center shadow-2xs cursor-pointer"
              >
                <span>Open Channel</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 3. Community Groups Discovery Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <Layers size={18} className="text-[#1E90FF]" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Discussion & Study Groups
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 font-mono">
                {regularGroups.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {regularGroups.length > 4 && (
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    placeholder="Filter groups..."
                    className="w-40 sm:w-48 pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#0B132B] border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1E90FF]"
                  />
                </div>
              )}

              {canManage && (
                <button
                  type="button"
                  onClick={onOpenCreateGroup}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1E90FF] hover:bg-[#187bcd] transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus size={13} />
                  <span>New Group</span>
                </button>
              )}
            </div>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                <MessageCircle size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {groupFilter ? "No matching groups found" : "No groups yet"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                  {groupFilter
                    ? "Try searching for a different keyword"
                    : "Create specialized discussion spaces for study sessions, team projects, and coursework."}
                </p>
              </div>
              {canManage && !groupFilter && (
                <button
                  type="button"
                  onClick={onOpenCreateGroup}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1E90FF] hover:bg-[#187bcd] transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Create First Group</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredGroups.map((group) => {
                const Icon = getGroupIcon(group.type);
                const colorStyle = getGroupIconColor(group.type);

                return (
                  <div
                    key={group._id}
                    onClick={() =>
                      navigate(
                        `/communities/${community._id}/groups/${group._id}`
                      )
                    }
                    className="group relative flex flex-col justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B132B] hover:border-[#1E90FF]/40 hover:shadow-md transition-all cursor-pointer select-none"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${colorStyle}`}
                          >
                            <Icon size={17} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#1E90FF] truncate transition-colors">
                              {group.name}
                            </h3>
                            <GroupTypeBadge type={group.type} />
                          </div>
                        </div>

                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-[#1E90FF] group-hover:translate-x-0.5 transition-all shrink-0">
                          <ArrowRight size={13} />
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {group.description ||
                          "Active community study and discussion channel."}
                      </p>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Stream Realtime Chat</span>
                      </span>
                      <span className="font-semibold text-[#1E90FF] group-hover:underline">
                        Open Chat →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. About & Community Leadership Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* About description */}
          <div className="md:col-span-2 p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B132B] space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              About Community
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {community.description ||
                "No extended description provided for this community."}
            </p>

            {/* Academic topics tags */}
            {community.tags && community.tags.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Tag size={12} />
                  <span>Academic Topics</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {community.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Creator & Academic Leadership */}
          <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B132B] space-y-3.5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Community Leadership
            </h3>

            <div className="flex items-center gap-3">
              <Avatar
                src={community.owner?.profilePicture}
                name={community.owner?.fullName || "Owner"}
                className="size-11 rounded-xl"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {community.owner?.fullName || "StudyConnect Member"}
                </p>
                {community.owner?.rollNumber && (
                  <p className="text-xs font-mono text-slate-400 truncate">
                    ID: {community.owner.rollNumber}
                  </p>
                )}
                <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1E90FF]">
                  Community Owner
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Slug</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  @{community.slug}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Access</span>
                <span className="capitalize">{community.visibility.toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
