import { useState } from "react";
import { X, Search, ShieldAlert, ShieldCheck, Trash2, Users, FileText, Calendar, BookOpen } from "lucide-react";
import { useToastStore } from "../store/toast.store";
import type { Community } from "../types/community";

interface CommunityDetailsDrawerProps {
  community: Community | null;
  onClose: () => void;
  onUpdate?: () => void;
}

interface MemberItem {
  id: string;
  fullName: string;
  email: string;
  role: "MEMBER" | "MODERATOR" | "OWNER";
  department: string;
}

export function CommunityDetailsDrawer({ community, onClose }: CommunityDetailsDrawerProps) {
  const { addToast } = useToastStore();
  const [memberSearch, setMemberSearch] = useState("");

  // Mock list of community members for management
  const [members, setMembers] = useState<MemberItem[]>([
    { id: "m1", fullName: "Aarav Sharma", email: "aarav@college.edu", role: "MODERATOR", department: "Computer Science" },
    { id: "m2", fullName: "Meera Rao", email: "meera@college.edu", role: "MEMBER", department: "Computer Science" },
    { id: "m3", fullName: "Sohan Patel", email: "sohan@college.edu", role: "MEMBER", department: "Information Technology" },
    { id: "m4", fullName: "Priya Das", email: "priya@college.edu", role: "MEMBER", department: "Electrical Engineering" },
  ]);

  if (!community) return null;

  const initials = community.name
    ? community.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CM";

  // Filter members based on search
  const filteredMembers = members.filter(
    (m) =>
      m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const handlePromoteDemote = (member: MemberItem) => {
    const isMod = member.role === "MODERATOR";
    const nextRole = isMod ? "MEMBER" : "MODERATOR";

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, role: nextRole } : m))
    );

    if (isMod) {
      addToast(`Moderator status removed from ${member.fullName}`, "warning");
    } else {
      addToast(`${member.fullName} has been assigned as Moderator`, "success");
    }
  };

  const handleRemoveMember = (member: MemberItem) => {
    if (confirm(`Remove ${member.fullName} from the community?`)) {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      addToast(`${member.fullName} was removed from the community`, "warning");
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md transform bg-white p-6 shadow-2xl dark:bg-ink-900 transition-all duration-300 border-l border-slate-200 dark:border-white/5 flex flex-col justify-between h-full animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-150 pb-4 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Community Profile
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-white/[0.04] dark:hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto py-5 space-y-6 scrollbar-thin">
            {/* Banner & Logo */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-150 dark:border-white/5 bg-slate-100 dark:bg-white/[0.01]">
              <div className="h-28 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 opacity-80" />
              <div className="px-4 pb-4 pt-10 relative flex flex-col items-start">
                <div className="absolute -top-8 left-4 flex size-16 items-center justify-center rounded-2xl bg-white dark:bg-ink-900 p-1 shadow-md">
                  <div className="flex size-full items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-base font-bold text-white shadow-sm">
                    {initials}
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {community.name}
                </h3>
                <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wider">
                  {community.category}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-slate-150 p-2.5 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
                <Users size={14} className="text-indigo-500 mx-auto mb-1.5" />
                <span className="block text-base font-bold text-slate-900 dark:text-white leading-none">
                  {community.memberCount}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">Members</span>
              </div>

              <div className="rounded-xl border border-slate-150 p-2.5 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
                <FileText size={14} className="text-cyan-500 mx-auto mb-1.5" />
                <span className="block text-base font-bold text-slate-900 dark:text-white leading-none">
                  {community.name.length % 2 === 0 ? 42 : 18} {/* Mock post metric */}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">Posts</span>
              </div>

              <div className="rounded-xl border border-slate-150 p-2.5 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
                <Calendar size={14} className="text-violet-500 mx-auto mb-1.5" />
                <span className="block text-xs font-semibold text-slate-900 dark:text-white leading-none mt-1">
                  {new Date(community.createdAt).toLocaleDateString()}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">Created</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Description
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed bg-slate-50/50 dark:bg-white/[0.01] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                {community.description || "No description provided for this community."}
              </p>
            </div>

            {/* Creator & Owner */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Community Owner
              </h4>
              <div className="flex items-center gap-3 bg-slate-50/50 dark:bg-white/[0.01] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-500 text-xs font-bold text-white uppercase shadow-sm">
                  {community.owner?.fullName?.slice(0, 2).toUpperCase() || "OW"}
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {community.owner?.fullName || "Platform Admin"}
                  </span>
                  <span className="block text-[10px] text-slate-450 dark:text-slate-500">
                    Creator & Primary Owner
                  </span>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Community Rules
              </h4>
              <ul className="text-xs text-slate-650 dark:text-slate-350 space-y-2 bg-slate-50/50 dark:bg-white/[0.01] p-3.5 rounded-xl border border-slate-100 dark:border-white/5 list-decimal list-inside">
                <li>Respect other community members.</li>
                <li>Keep code reviews constructive and positive.</li>
                <li>No plagiarized coursework assignments allowed.</li>
                <li>Share files and resources in relevant folders.</li>
              </ul>
            </div>

            {/* Member Management Panel */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Member Moderation
                </h4>
                <span className="text-[10px] font-bold text-slate-450">
                  {filteredMembers.length} listed
                </span>
              </div>

              {/* Local search inside drawer */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members in community..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-900 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white"
                />
              </div>

              {/* Members List */}
              <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-60 overflow-y-auto pr-1">
                {filteredMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-2 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {member.fullName}
                        </span>
                        {member.role === "MODERATOR" && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400">
                            Mod
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-450 truncate">
                        {member.department}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Promote/Demote Toggle */}
                      <button
                        onClick={() => handlePromoteDemote(member)}
                        className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition-all ${
                          member.role === "MODERATOR"
                            ? "border-amber-250 bg-amber-50/50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-500/10 dark:text-amber-400"
                            : "border-slate-200 bg-white text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        {member.role === "MODERATOR" ? "Demote" : "Promote"}
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveMember(member)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {filteredMembers.length === 0 && (
                  <p className="text-center py-6 text-[11px] text-slate-450">No matches found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
