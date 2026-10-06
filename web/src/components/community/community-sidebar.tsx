import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import {
  ChevronDown,
  LayoutDashboard,
  Megaphone,
  Plus,
  Users,
  BookOpen,
  FolderKanban,
  GraduationCap,
  MessageCircle,
  Lock,
  ArrowLeft,
  Shield,
  Settings,
  Sparkles
} from "lucide-react";
import type { Community } from "../../types/community";
import type { CommunityGroup, GroupType } from "../../types/community-group";
import { CommunityHeaderDropdown } from "./community-header-dropdown";
import { useAuthStore } from "../../store/auth.store";

interface CommunitySidebarProps {
  community: Community;
  groups: CommunityGroup[];
  activeItemId?: string; // "overview" | "announcements" | "members" | groupId
  isLoadingGroups?: boolean;
  onOpenCreateGroup?: () => void;
  onOpenAttachGroup?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
  className?: string;
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

function getGroupIconColor(type: GroupType | string, isActive: boolean) {
  if (isActive) return "text-white";
  switch (type) {
    case "STUDY":
      return "text-emerald-500 dark:text-emerald-400";
    case "PROJECT":
      return "text-purple-500 dark:text-purple-400";
    case "SUBJECT":
      return "text-amber-500 dark:text-amber-400";
    case "DISCUSSION":
    default:
      return "text-[#1E90FF] dark:text-[#38BDF8]";
  }
}

export function CommunitySidebar({
  community,
  groups,
  activeItemId = "overview",
  isLoadingGroups = false,
  onOpenCreateGroup,
  onOpenAttachGroup,
  onArchive,
  onRestore,
  onDelete,
  onLeave,
  className = ""
}: CommunitySidebarProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const announcementTargetId = announcementGroup?._id || community.announcementGroupId;
  const isAnnouncementActive =
    activeItemId === "announcements" ||
    Boolean(announcementTargetId && activeItemId === announcementTargetId);

  // Group regular groups into categories
  const categorizedGroups = useMemo(() => {
    const categories: Record<string, CommunityGroup[]> = {
      DISCUSSION: [],
      STUDY: [],
      PROJECT: [],
      SUBJECT: []
    };

    regularGroups.forEach((g) => {
      const t = (g.type || "DISCUSSION").toUpperCase();
      if (categories[t]) {
        categories[t].push(g);
      } else {
        categories.DISCUSSION.push(g);
      }
    });

    return categories;
  }, [regularGroups]);

  return (
    <aside
      className={`w-72 shrink-0 h-full flex flex-col bg-white dark:bg-[#0B132B] border-r border-slate-200/80 dark:border-white/10 select-none transition-colors ${className}`}
    >
      {/* 1. Community Identity Header & Action Menu */}
      <div className="relative shrink-0 p-3.5 border-b border-slate-200/80 dark:border-white/10">
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-left group cursor-pointer"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          <div className="flex items-center gap-3 min-w-0">
            {community.icon ? (
              <img
                src={community.icon}
                alt={community.name}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E90FF] to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm shrink-0">
                {community.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {community.name}
                </h2>
                {community.visibility === "COLLEGE_ONLY" && (
                  <span title="College Verified">
                    <Shield size={12} className="text-[#1E90FF] shrink-0" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block" />
                <span>{community.memberCount || 1} members</span>
              </p>
            </div>
          </div>

          <div
            className={`p-1.5 rounded-lg text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${
              isDropdownOpen ? "rotate-180 bg-slate-100 dark:bg-white/10" : ""
            }`}
          >
            <ChevronDown size={15} />
          </div>
        </button>

        {/* Dropdown Popover */}
        <CommunityHeaderDropdown
          community={community}
          isOpen={isDropdownOpen}
          onClose={() => setIsDropdownOpen(false)}
          isOwner={isOwner}
          canManage={canManage}
          onOpenCreateGroup={onOpenCreateGroup}
          onOpenAttachGroup={onOpenAttachGroup}
          onArchive={onArchive}
          onRestore={onRestore}
          onDelete={onDelete}
          onLeave={onLeave}
        />
      </div>

      {/* 2. Scrollable Channels & Groups Navigation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
        {/* OVERVIEW & BROADCASTS */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate(`/communities/${community._id}`)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeItemId === "overview"
                ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25 font-bold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <LayoutDashboard
              size={15}
              className={activeItemId === "overview" ? "text-white" : "text-slate-400"}
            />
            <span className="truncate">Overview</span>
          </button>

          {announcementTargetId ? (
            <button
              type="button"
              onClick={() =>
                navigate(`/communities/${community._id}/groups/${announcementTargetId}`)
              }
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isAnnouncementActive
                  ? "bg-[#F59E0B] text-white shadow-sm shadow-[#F59E0B]/25 font-bold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 dark:hover:bg-amber-500/10"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Megaphone
                  size={15}
                  className={isAnnouncementActive ? "text-white" : "text-[#F59E0B]"}
                />
                <span className="truncate">Announcements</span>
              </div>
              <div className="flex items-center gap-1">
                {!isOwner && (
                  <span title="Read-only announcement broadcast">
                    <Lock
                      size={11}
                      className={isAnnouncementActive ? "text-white/80" : "text-slate-400"}
                    />
                  </span>
                )}
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                    isAnnouncementActive
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}
                >
                  Official
                </span>
              </div>
            </button>
          ) : null}
        </div>

        {/* CATEGORIZED GROUPS (DISCUSSION, STUDY, PROJECT, SUBJECT) */}
        <div className="space-y-4 pt-1">
          {(["DISCUSSION", "STUDY", "PROJECT", "SUBJECT"] as const).map((categoryKey) => {
            const categoryList = categorizedGroups[categoryKey] || [];
            if (categoryList.length === 0 && regularGroups.length > 0) return null;

            const categoryTitle =
              categoryKey === "DISCUSSION"
                ? "Discussion"
                : categoryKey === "STUDY"
                ? "Study & Homework"
                : categoryKey === "PROJECT"
                ? "Project Team"
                : "Subject Specific";

            return (
              <div key={categoryKey} className="space-y-1">
                <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span>{categoryTitle}</span>
                    {categoryList.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 font-mono text-[9px]">
                        {categoryList.length}
                      </span>
                    )}
                  </span>
                </div>

                {categoryList.map((group) => {
                  const isGroupActive = activeItemId === group._id;
                  const Icon = getGroupIcon(group.type);
                  const iconColor = getGroupIconColor(group.type, isGroupActive);

                  return (
                    <button
                      key={group._id}
                      type="button"
                      onClick={() =>
                        navigate(`/communities/${community._id}/groups/${group._id}`)
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                        isGroupActive
                          ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25 font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={15} className={`shrink-0 ${iconColor}`} />
                        <span className="truncate">{group.name}</span>
                      </div>

                      <span
                        className={`text-[9px] font-mono px-1 rounded uppercase tracking-wider ${
                          isGroupActive
                            ? "bg-white/20 text-white"
                            : "text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300"
                        }`}
                      >
                        {group.type === "DISCUSSION" ? "chat" : group.type.toLowerCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Fallback empty groups state */}
          {regularGroups.length === 0 && !isLoadingGroups && (
            <div className="p-3.5 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 my-1">
              <p className="text-[11px] text-slate-400">No discussion groups yet</p>
              {canManage && (
                <button
                  type="button"
                  onClick={onOpenCreateGroup}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#1E90FF] hover:underline cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Create First Group</span>
                </button>
              )}
            </div>
          )}

          {/* Quick Add Group button */}
          {canManage && regularGroups.length > 0 && (
            <button
              type="button"
              onClick={onOpenCreateGroup}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-[#1E90FF] hover:bg-[#1E90FF]/10 dark:text-slate-400 dark:hover:text-[#1E90FF] dark:hover:bg-[#1E90FF]/10 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Group</span>
            </button>
          )}
        </div>

        {/* 3. MEMBERS & SETTINGS SECTION */}
        <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-white/10">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Community
          </div>

          <button
            type="button"
            onClick={() => navigate(`/communities/${community._id}/members`)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeItemId === "members"
                ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25 font-bold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Users
                size={15}
                className={activeItemId === "members" ? "text-white" : "text-slate-400"}
              />
              <span className="truncate">Members</span>
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                activeItemId === "members"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              {community.memberCount || 1}
            </span>
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => navigate(`/communities/${community._id}/edit`)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              <Settings size={15} className="text-slate-400" />
              <span className="truncate">Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Bottom Footer Navigation */}
      <div className="shrink-0 p-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-black/15">
        <Link
          to="/communities"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>All Communities</span>
        </Link>
      </div>
    </aside>
  );
}
