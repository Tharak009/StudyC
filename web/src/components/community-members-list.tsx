import { ShieldMinus, UserMinus } from "lucide-react";
import { Avatar } from "./avatar";
import type { CommunityMember, CommunityRole } from "../types/community";

interface CommunityMembersListProps {
  members: CommunityMember[];
  viewerRole: CommunityRole | null;
  onRemoveMember?: (userId: string) => void;
  onRemoveModerator?: (userId: string) => void;
}

export function CommunityMembersList({
  members,
  viewerRole,
  onRemoveMember,
  onRemoveModerator
}: CommunityMembersListProps) {
  const canManage = viewerRole === "OWNER" || viewerRole === "MODERATOR";
  const isOwner = viewerRole === "OWNER";

  return (
    <div className="divide-y divide-slate-200 dark:divide-white/10">
      {members.map((member) => (
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
            {isOwner && member.role === "MODERATOR" && (
              <button
                type="button"
                className="icon-button"
                aria-label="Remove moderator"
                onClick={() => onRemoveModerator?.(member.userId._id)}
              >
                <ShieldMinus size={16} />
              </button>
            )}
            {canManage && member.role !== "OWNER" && (
              <button
                type="button"
                className="icon-button hover:text-red-600 dark:hover:text-red-400"
                aria-label="Remove member"
                onClick={() => onRemoveMember?.(member.userId._id)}
              >
                <UserMinus size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
