import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Users,
  Shield,
  ShieldPlus,
  ShieldMinus,
  Crown,
  Ban,
  Clock,
  UserMinus,
  MoreVertical,
  ChevronLeft,
  X
} from "lucide-react";
import type { Community, CommunityMember, CommunityRole } from "../../types/community";
import { communitiesApi } from "../../api/communities.api";
import { Avatar } from "../avatar";
import { useAuthStore } from "../../store/auth.store";
import { useToastStore } from "../../store/toast.store";

interface CommunityMembersViewProps {
  community: Community;
  onBackToOverview?: () => void;
}

export function CommunityMembersView({
  community,
  onBackToOverview
}: CommunityMembersViewProps) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [activeMenuMemberId, setActiveMenuMemberId] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: ["community-members", community._id],
    queryFn: () => communitiesApi.members(community._id),
    enabled: Boolean(community._id)
  });

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["community-members", community._id]
    });
    queryClient.invalidateQueries({ queryKey: ["community", community._id] });
    queryClient.invalidateQueries({ queryKey: ["communities"] });
  };

  const addModeratorMutation = useMutation({
    mutationFn: (userId: string) =>
      communitiesApi.addModerator(community._id, userId),
    onSuccess: () => {
      addToast("Member promoted to moderator", "success");
      refresh();
    }
  });

  const removeModeratorMutation = useMutation({
    mutationFn: (userId: string) =>
      communitiesApi.removeModerator(community._id, userId),
    onSuccess: () => {
      addToast("Moderator role removed", "success");
      refresh();
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      communitiesApi.removeMember(community._id, userId),
    onSuccess: () => {
      addToast("Member removed from community", "success");
      refresh();
    }
  });

  const banMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      communitiesApi.banMember(community._id, userId),
    onSuccess: () => {
      addToast("Member has been banned", "success");
      refresh();
    }
  });

  const suspendMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      communitiesApi.suspendMember(community._id, userId, 24),
    onSuccess: () => {
      addToast("Member suspended for 24 hours", "success");
      refresh();
    }
  });

  const isOwner = Boolean(
    community.membershipRole === "OWNER" ||
      (currentUser?._id && community.owner?._id === currentUser._id)
  );
  const canManage = isOwner || community.membershipRole === "MODERATOR";

  const allMembers = membersQuery.data || [];

  // Filter members based on search and role
  const filteredMembers = useMemo(() => {
    return allMembers.filter((member) => {
      const u = member.userId;
      if (!u) return false;

      const matchesSearch =
        !search.trim() ||
        u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        u.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
        u.department?.toLowerCase().includes(search.toLowerCase());

      const matchesRole =
        roleFilter === "ALL" ||
        (roleFilter === "OWNER" && member.role === "OWNER") ||
        (roleFilter === "MODERATOR" && member.role === "MODERATOR") ||
        (roleFilter === "MEMBER" && member.role === "MEMBER");

      return matchesSearch && matchesRole;
    });
  }, [allMembers, search, roleFilter]);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 dark:bg-[#080D1A]">
      {/* 1. Members Directory Header & Search Controls */}
      <header className="shrink-0 p-4 sm:p-6 bg-white dark:bg-[#0B132B] border-b border-slate-200/80 dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {onBackToOverview && (
              <button
                type="button"
                onClick={onBackToOverview}
                className="md:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Back to Community"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF] flex items-center justify-center">
                <Users size={18} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Community Directory
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 font-mono">
                {allMembers.length}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Role Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, roll number, department..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "OWNER", "MODERATOR", "MEMBER"].map((rf) => (
              <button
                key={rf}
                type="button"
                onClick={() => setRoleFilter(rf)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  roleFilter === rf
                    ? "bg-[#1E90FF] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                {rf === "ALL"
                  ? "All Members"
                  : rf === "OWNER"
                  ? "Owners"
                  : rf === "MODERATOR"
                  ? "Moderators"
                  : "Students"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 2. Scrollable Members Directory */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
        <div className="max-w-4xl mx-auto space-y-3">
          {membersQuery.isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl bg-white dark:bg-[#0B132B] border border-slate-200/80 dark:border-white/10 animate-pulse"
                />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No members found
              </p>
              <p className="text-xs text-slate-400">
                {search
                  ? "No students matching your search criteria."
                  : "This community has no members yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member) => {
                const u = member.userId;
                if (!u) return null;

                const isTargetOwner = member.role === "OWNER";
                const isTargetModerator = member.role === "MODERATOR";
                const isSelf = currentUser?._id === u._id;

                return (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B132B] shadow-2xs hover:border-[#1E90FF]/30 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Avatar
                        src={u.profilePicture}
                        name={u.fullName}
                        className="size-11 rounded-xl"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {u.fullName}
                          </p>

                          {isTargetOwner ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Crown size={11} />
                              Owner
                            </span>
                          ) : isTargetModerator ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/25">
                              <Shield size={11} />
                              Moderator
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                              Student
                            </span>
                          )}

                          {isSelf && (
                            <span className="text-[10px] font-mono text-[#1E90FF] font-bold">
                              (You)
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {u.department || "Academic Student"}{" "}
                          {u.rollNumber ? (
                            <span className="font-mono text-slate-400">
                              · ID: {u.rollNumber}
                            </span>
                          ) : (
                            ""
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Moderation Actions Menu Popover */}
                    {canManage && !isSelf && !isTargetOwner && (
                      <div className="relative shrink-0 ml-3">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuMemberId((prev) =>
                              prev === member._id ? null : member._id
                            )
                          }
                          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuMemberId === member._id && (
                          <div className="absolute right-0 top-full mt-1 z-30 w-52 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#0E1726] animate-scale-up">
                            {isOwner && !isTargetModerator && (
                              <button
                                type="button"
                                onClick={() => {
                                  addModeratorMutation.mutate(u._id);
                                  setActiveMenuMemberId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                              >
                                <ShieldPlus size={14} className="text-[#1E90FF]" />
                                <span>Promote to Moderator</span>
                              </button>
                            )}

                            {isOwner && isTargetModerator && (
                              <button
                                type="button"
                                onClick={() => {
                                  removeModeratorMutation.mutate(u._id);
                                  setActiveMenuMemberId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                              >
                                <ShieldMinus size={14} className="text-amber-500" />
                                <span>Remove Moderator Role</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                suspendMemberMutation.mutate(u._id);
                                setActiveMenuMemberId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 cursor-pointer"
                            >
                              <Clock size={14} />
                              <span>Suspend (24 Hours)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Are you sure you want to ban ${u.fullName}?`
                                  )
                                ) {
                                  banMemberMutation.mutate(u._id);
                                  setActiveMenuMemberId(null);
                                }
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 cursor-pointer"
                            >
                              <Ban size={14} />
                              <span>Ban from Community</span>
                            </button>

                            <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Remove ${u.fullName} from this community?`
                                  )
                                ) {
                                  removeMemberMutation.mutate(u._id);
                                  setActiveMenuMemberId(null);
                                }
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 cursor-pointer"
                            >
                              <UserMinus size={14} />
                              <span>Remove Member</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
