import { Avatar } from "./avatar";
import type { CommunityMember } from "../types/community";

export function OnlineMembersPanel({
  members,
  onlineUserIds
}: {
  members: CommunityMember[];
  onlineUserIds: string[];
}) {
  const online = new Set(onlineUserIds);
  return (
    <aside className="hidden w-72 border-l border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-ink-900 xl:block">
      <h2 className="text-sm font-semibold">Online members</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {online.size} active in this community
      </p>
      <div className="mt-5 space-y-3">
        {members.map((member) => (
          <div key={member._id} className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                name={member.userId.fullName}
                src={member.userId.profilePicture}
                className="size-9"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white dark:border-ink-900 ${
                  online.has(member.userId._id) ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{member.userId.fullName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{member.role}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
