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
    <aside className="hidden w-72 border-l border-border bg-card p-5 xl:block">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Online Members</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground font-medium">
            {online.size} active now
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-500 text-[10px] font-bold">
          Live
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {members.map((member) => (
          <div key={member._id} className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-muted/50 transition-colors">
            <div className="relative">
              <Avatar
                name={member.userId.fullName}
                src={member.userId.profilePicture}
                className="size-9 ring-2 ring-sky-400/20"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${
                  online.has(member.userId._id) ? "bg-emerald-500" : "bg-muted-foreground/30"
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">{member.userId.fullName}</p>
              <span className="inline-block text-[10px] font-medium text-muted-foreground">
                {member.role === "OWNER" || member.role === "MODERATOR" ? (
                  <span className="text-violet-500 font-bold">Moderator</span>
                ) : (
                  "Member"
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
