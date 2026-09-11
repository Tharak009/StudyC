import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  PlusCircle,
  Hash,
  Volume2,
  Users,
  ShieldCheck,
  Archive,
  Eraser,
  Lock,
  Unlock,
  Radio,
  Search,
  Filter,
  Check,
  Building2,
  Sparkles
} from "lucide-react";
import { CreateCommunityModal } from "../modals/CreateCommunityModal";
import { AssignModeratorModal } from "../modals/AssignModeratorModal";
import { ClearHistoryModal } from "../modals/ClearHistoryModal";
import { useToastStore } from "../../../store/toast.store";

export interface GovernanceCommunity {
  id: string;
  name: string;
  emoji: string;
  description: string;
  department: string;
  category: "BATCH_CIRCLE" | "LAB_ROOM" | "INTEREST_GROUP" | "ARCHIVED";
  textChannelsCount: number;
  voiceStagesCount: number;
  membersCount: number;
  onlineCount: number;
  activityScore: number;
  moderators: { name: string; role: string; roll: string }[];
  status: "ACTIVE" | "READ_ONLY" | "ARCHIVED";
  createdAt: string;
}

function loadGovernanceCommunities(): GovernanceCommunity[] {
  try {
    const raw = localStorage.getItem("studyconnect_user_circles");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any, idx: number) => {
      let channelsCount = 1;
      try {
        const rawChannels = localStorage.getItem(`studyconnect_channels_${item.id}`);
        if (rawChannels) {
          const channels = JSON.parse(rawChannels);
          if (Array.isArray(channels)) channelsCount = channels.length;
        }
      } catch {}

      return {
        id: item.id || `circ-${idx + 1}`,
        name: item.name || "Unnamed Circle",
        emoji: item.emoji || "🎓",
        description: item.description || `Campus academic circle for ${item.dept || "General"} cohort.`,
        department: item.dept || item.department || "Campus-Wide",
        category: item.category || "BATCH_CIRCLE",
        textChannelsCount: item.textChannelsCount || channelsCount,
        voiceStagesCount: item.voiceStagesCount || (item.hasLiveVoice ? 1 : 0),
        membersCount: item.memberCount || item.membersCount || 1,
        onlineCount: item.onlineCount || 1,
        activityScore: item.activityScore || 85,
        moderators: item.moderators || [
          { name: "Faculty Moderator", role: "Advisor", roll: "FAC-01" }
        ],
        status: item.status || "ACTIVE",
        createdAt: item.createdAt || "Recently"
      };
    });
  } catch {
    return [];
  }
}

export function CommunityGovernanceTab() {
  const { addToast } = useToastStore();

  const [communities, setCommunities] = useState<GovernanceCommunity[]>(loadGovernanceCommunities);
  const [activeCategoryTab, setActiveCategoryTab] = useState<"ALL" | "BATCH_CIRCLE" | "LAB_ROOM" | "INTEREST_GROUP" | "ARCHIVED">("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignModTarget, setAssignModTarget] = useState<GovernanceCommunity | null>(null);
  const [clearHistoryTarget, setClearHistoryTarget] = useState<GovernanceCommunity | null>(null);

  const batchCount = communities.filter((c) => c.category === "BATCH_CIRCLE").length;
  const labCount = communities.filter((c) => c.category === "LAB_ROOM").length;
  const sigCount = communities.filter((c) => c.category === "INTEREST_GROUP").length;
  const archivedCount = communities.filter((c) => c.category === "ARCHIVED").length;

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const filteredCommunities = useMemo(() => {
    return communities.filter((c) => {
      // Category Tab
      if (activeCategoryTab !== "ALL" && c.category !== activeCategoryTab) return false;
      // Dept Filter
      if (deptFilter !== "ALL" && !c.department.includes(deptFilter)) return false;
      // Search
      if (searchQuery.trim()) {
        const q = escapeRegExp(searchQuery.trim()).toLowerCase();
        const match =
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [communities, activeCategoryTab, deptFilter, searchQuery]);

  const updateGovernanceCommunities = (next: GovernanceCommunity[]) => {
    setCommunities(next);
    try {
      const raw = localStorage.getItem("studyconnect_user_circles");
      if (raw) {
        const parsed = JSON.parse(raw);
        const map = new Map(next.map((c) => [c.id, c]));
        const updated = parsed.map((item: any) => {
          const mod = map.get(item.id);
          return mod ? { ...item, status: mod.status, category: mod.category } : item;
        });
        localStorage.setItem("studyconnect_user_circles", JSON.stringify(updated));
      }
    } catch {}
  };

  const handleCreateCommunity = (newComm: GovernanceCommunity) => {
    const next = [newComm, ...communities];
    setCommunities(next);
    try {
      const raw = localStorage.getItem("studyconnect_user_circles");
      const existing = raw ? JSON.parse(raw) : [];
      const newStudyCircle = {
        id: newComm.id,
        name: newComm.name,
        shortName: newComm.name.slice(0, 4).toUpperCase(),
        emoji: newComm.emoji,
        dept: newComm.department,
        memberCount: newComm.membersCount,
        gradient: "from-blue-600 to-indigo-600"
      };
      localStorage.setItem("studyconnect_user_circles", JSON.stringify([newStudyCircle, ...existing]));
    } catch {}
    window.dispatchEvent(
      new CustomEvent("studyconnect:audit-entry", {
        detail: {
          action: "CREATE_COMMUNITY",
          target: newComm.name,
          details: `Provisioned under ${newComm.department}`
        }
      })
    );
  };

  const handleToggleReadOnly = (communityId: string, currentStatus: string, name: string) => {
    const newStatus = currentStatus === "READ_ONLY" ? "ACTIVE" : "READ_ONLY";
    const next = communities.map((c) =>
      c.id === communityId ? { ...c, status: newStatus as any } : c
    );
    updateGovernanceCommunities(next);
    addToast(
      `Switched "${name}" to ${newStatus === "READ_ONLY" ? "Emergency Read-Only Mode (Locked for Exams)" : "Active Mode"}`,
      newStatus === "READ_ONLY" ? "warning" : "success"
    );
    window.dispatchEvent(
      new CustomEvent("studyconnect:audit-entry", {
        detail: {
          action: newStatus === "READ_ONLY" ? "LOCK_COMMUNITY" : "UNLOCK_COMMUNITY",
          target: name,
          details: `Read-only state toggled to ${newStatus}`
        }
      })
    );
  };

  const handleArchive = (communityId: string, name: string) => {
    const next = communities.map((c) =>
      c.id === communityId
        ? { ...c, status: "ARCHIVED" as const, category: "ARCHIVED" as const, onlineCount: 0 }
        : c
    );
    updateGovernanceCommunities(next);
    addToast(`Archived "${name}" study circle.`, "info");
    window.dispatchEvent(
      new CustomEvent("studyconnect:audit-entry", {
        detail: {
          action: "ARCHIVE_COMMUNITY",
          target: name,
          details: "Status updated to ARCHIVED"
        }
      })
    );
  };

  const handleAssignModerator = (communityId: string, newMod: { name: string; role: string; roll: string }) => {
    const next = communities.map((c) =>
      c.id === communityId
        ? {
            ...c,
            moderators: [...c.moderators.filter((m) => m.roll !== newMod.roll), newMod]
          }
        : c
    );
    updateGovernanceCommunities(next);
    window.dispatchEvent(
      new CustomEvent("studyconnect:audit-entry", {
        detail: {
          action: "ASSIGN_MODERATOR",
          target: `${newMod.name} -> Community #${communityId}`,
          details: `Assigned as ${newMod.role}`
        }
      })
    );
  };

  const handleConfirmClear = (communityId: string, scope: string) => {
    try {
      localStorage.removeItem(`studyconnect_messages_${communityId}`);
    } catch {}
    addToast("Chat message cache flushed.", "info");
    window.dispatchEvent(
      new CustomEvent("studyconnect:audit-entry", {
        detail: {
          action: "CLEAR_HISTORY",
          target: `Community #${communityId}`,
          details: `Flushed cache: ${scope}`
        }
      })
    );
  };

  return (
    <div className="space-y-6">
      
      {/* ── 1. Top Action Toolbar & Scope Switcher ────────────────────── */}
      <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
        
        {/* Category Tabs & Create Button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveCategoryTab("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategoryTab === "ALL"
                  ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              All Circles ({communities.length})
            </button>

            <button
              onClick={() => setActiveCategoryTab("BATCH_CIRCLE")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategoryTab === "BATCH_CIRCLE"
                  ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              Official Batch Circles ({batchCount})
            </button>

            <button
              onClick={() => setActiveCategoryTab("LAB_ROOM")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategoryTab === "LAB_ROOM"
                  ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              Subject & Lab Rooms ({labCount})
            </button>

            <button
              onClick={() => setActiveCategoryTab("INTEREST_GROUP")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategoryTab === "INTEREST_GROUP"
                  ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              Student SIGs ({sigCount})
            </button>

            <button
              onClick={() => setActiveCategoryTab("ARCHIVED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategoryTab === "ARCHIVED"
                  ? "bg-slate-700 text-white"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              Archived ({archivedCount})
            </button>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 cursor-pointer self-start lg:self-auto transition-all"
          >
            <PlusCircle size={15} />
            <span>Provision Campus Circle</span>
          </button>
        </div>

        {/* Search & Dept Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="w-full sm:max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search circles by name, department, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              <option value="Computer Science">Computer Science (CSE)</option>
              <option value="Artificial Intelligence">AI & Data Science (AI&DS)</option>
              <option value="Electronics">Electronics (ECE)</option>
            </select>
          </div>
        </div>

      </div>

      {/* ── 2. Community Directory Table ─────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/75 dark:bg-[#080D1A]/75 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">Community Info</th>
                <th className="py-3.5 px-4 font-bold">Channels Architecture</th>
                <th className="py-3.5 px-4 font-bold">Members & Activity</th>
                <th className="py-3.5 px-4 font-bold">Assigned Moderators</th>
                <th className="py-3.5 px-4 font-bold">Room Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Governance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {filteredCommunities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No community circles match the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCommunities.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-[#162544]/40 transition-colors">
                    
                    {/* 1. Community Info */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 text-lg shrink-0">
                          {c.emoji}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100">
                            {c.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                            {c.department}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 2. Channel Architecture */}
                    <td className="py-3.5 px-4 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                        <Hash size={12} className="text-[#1E90FF]" />
                        <span>{c.textChannelsCount} Text Channels</span>
                      </div>
                      {c.voiceStagesCount > 0 && (
                        <div className="flex items-center gap-1.5 text-emerald-500 font-bold mt-0.5">
                          <Volume2 size={12} />
                          <span>{c.voiceStagesCount} Voice Stages</span>
                        </div>
                      )}
                    </td>

                    {/* 3. Member Metrics */}
                    <td className="py-3.5 px-4 text-[11px] tabular-nums">
                      <div className="text-slate-800 dark:text-slate-200 font-bold">
                        {c.membersCount} Verified Students
                      </div>
                      <div className="text-[10px] text-emerald-500 flex items-center gap-1 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>{c.onlineCount} online now</span>
                      </div>
                    </td>

                    {/* 4. Assigned Moderators */}
                    <td className="py-3.5 px-4 text-[11px]">
                      {c.moderators.length === 0 ? (
                        <span className="text-slate-400">Unassigned</span>
                      ) : (
                        <div className="space-y-0.5">
                          {c.moderators.map((m, mIdx) => (
                            <div key={mIdx} className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                              <ShieldCheck size={11} className="text-[#1E90FF] shrink-0" />
                              <span className="truncate max-w-[140px]">{m.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* 5. Room Status Badge */}
                    <td className="py-3.5 px-4">
                      {c.status === "ACTIVE" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <span>ACTIVE</span>
                        </span>
                      )}
                      {c.status === "READ_ONLY" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Lock size={10} />
                          <span>EXAM LOCKED</span>
                        </span>
                      )}
                      {c.status === "ARCHIVED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">
                          <span>ARCHIVED</span>
                        </span>
                      )}
                    </td>

                    {/* 6. Governance Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setAssignModTarget(c)}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#1E90FF] hover:border-[#1E90FF] transition-colors cursor-pointer"
                          title="Assign TA / Faculty Moderator"
                        >
                          <ShieldCheck size={13} />
                        </button>

                        <button
                          onClick={() => handleToggleReadOnly(c.id, c.status, c.name)}
                          className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                            c.status === "READ_ONLY"
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                              : "border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500"
                          }`}
                          title={c.status === "READ_ONLY" ? "Unlock Room" : "Emergency Read-Only Lock"}
                        >
                          {c.status === "READ_ONLY" ? <Unlock size={13} /> : <Lock size={13} />}
                        </button>

                        <button
                          onClick={() => setClearHistoryTarget(c)}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                          title="Flush Message Cache"
                        >
                          <Eraser size={13} />
                        </button>

                        {c.status !== "ARCHIVED" && (
                          <button
                            onClick={() => handleArchive(c.id, c.name)}
                            className="p-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                            title="Archive Room"
                          >
                            <Archive size={13} />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. Sub-Modals ────────────────────────────────────────────── */}
      <AnimatePresence>
        {createModalOpen && (
          <CreateCommunityModal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onCreateCommunity={handleCreateCommunity}
          />
        )}

        {assignModTarget && (
          <AssignModeratorModal
            isOpen={!!assignModTarget}
            onClose={() => setAssignModTarget(null)}
            community={assignModTarget}
            onAssign={handleAssignModerator}
          />
        )}

        {clearHistoryTarget && (
          <ClearHistoryModal
            isOpen={!!clearHistoryTarget}
            onClose={() => setClearHistoryTarget(null)}
            community={clearHistoryTarget}
            onConfirmClear={handleConfirmClear}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default CommunityGovernanceTab;
