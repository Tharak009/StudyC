import { Ban, Clock, ShieldMinus, UserMinus } from "lucide-react";
import { Avatar } from "./avatar";
import type { CommunityMember, CommunityRole } from "../types/community";

interface CommunityMembersListProps {
  members: CommunityMember[];
  viewerRole: CommunityRole | null;
  onRemoveMember?: (userId: string) => void;
  onRemoveModerator?: (userId: string) => void;
  onBanMember?: (userId: string) => void;
  onSuspendMember?: (userId: string) => void;
}

export function CommunityMembersList({
  members,
  viewerRole,
  onRemoveMember,
  onRemoveModerator,
  onBanMember,
  onSuspendMember
}: CommunityMembersListProps) {
  const canManage = viewerRole === "OWNER" || viewerRole === "MODERATOR";
  const isOwner = viewerRole === "OWNER";

  return (
    <div className="divide-y divide-slate-200 dark:divide-white/10">
      {members.map((member) => {
        const isTargetOwner = member.role === "OWNER";
        const isTargetModerator = member.role === "MODERATOR";

        return (
          <div key={member._id} className="flex items-center justify-between gap-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                name={member.userId.fullName}
                src={member.userId.profilePicture}
                className="size-11"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{member.userId.fullName}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {member.userId.department} · {member.userId.rollNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                {member.role}
              </span>
              {member.status && member.status !== "ACTIVE" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    member.status === "BANNED"
                      ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                      : member.status === "SUSPENDED"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                        : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
                  }`}
                >
                  {member.status}
                </span>
              )}
              {isOwner && isTargetModerator && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Remove moderator"
                  title="Remove moderator"
                  onClick={() => onRemoveModerator?.(member.userId._id)}
                >
                  <ShieldMinus size={16} />
                </button>
              )}
              {canManage && !isTargetOwner && (
                <>
                  {onSuspendMember && (!isTargetModerator || isOwner) && (
                    <button
                      type="button"
                      className="icon-button hover:text-amber-600 dark:hover:text-amber-400"
                      aria-label="Suspend member"
                      title="Suspend member (24h)"
                      onClick={() => onSuspendMember?.(member.userId._id)}
                    >
                      <Clock size={16} />
                    </button>
                  )}
                  {isOwner && onBanMember && (
                    <button
                      type="button"
                      className="icon-button hover:text-red-600 dark:hover:text-red-400"
                      aria-label="Ban member"
                      title="Ban member"
                      onClick={() => onBanMember?.(member.userId._id)}
                    >
                      <Ban size={16} />
                    </button>
                  )}
                  {(!isTargetModerator || isOwner) && (
                    <button
                      type="button"
                      className="icon-button hover:text-red-600 dark:hover:text-red-400"
                      aria-label="Remove member"
                      title="Remove member"
                      onClick={() => onRemoveMember?.(member.userId._id)}
                    >
                      <UserMinus size={16} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
