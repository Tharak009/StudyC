import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  X,
  Search,
  UserCheck,
  Check,
  Award
} from "lucide-react";
import type { GovernanceCommunity } from "../tabs/CommunityGovernanceTab";
import { useToastStore } from "../../../store/toast.store";

interface AssignModeratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: GovernanceCommunity | null;
  onAssign: (communityId: string, moderator: { name: string; role: string; roll: string }) => void;
}

function getStudentCandidates() {
  try {
    const raw = localStorage.getItem("studyconnect_managed_users");
    if (raw) {
      const users = JSON.parse(raw);
      if (Array.isArray(users) && users.length > 0) {
        return users.slice(0, 5).map((u: any) => ({
          name: u.fullName || u.name || "Student",
          roll: u.rollNumber || u.roll || "CS24-001",
          dept: u.department || u.dept || "Computer Science"
        }));
      }
    }
  } catch {}
  return [
    { name: "Meera Rao", roll: "CS24-110", dept: "Computer Science & Engineering" },
    { name: "Devanshu Sharma", roll: "TA-CS2023", dept: "Teaching Assistant" }
  ];
}

export function AssignModeratorModal({
  isOpen,
  onClose,
  community,
  onAssign
}: AssignModeratorModalProps) {
  const { addToast } = useToastStore();

  const candidates = getStudentCandidates();
  const [selectedRole, setSelectedRole] = useState<"Student TA Moderator" | "Faculty Lead Advisor">("Student TA Moderator");
  const [selectedStudent, setSelectedStudent] = useState(() => candidates[0] || { name: "Student TA", roll: "CS24-001" });

  if (!isOpen || !community) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssign(community.id, {
      name: selectedStudent.name,
      roll: selectedStudent.roll,
      role: selectedRole
    });
    addToast(`Assigned ${selectedStudent.name} as ${selectedRole} in ${community.name}.`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl space-y-4"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/30">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Assign Circle Moderator / Advisor
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {community.name}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Enrolled Student or Faculty
            </label>
            <div className="space-y-2">
              {candidates.map((stu) => (
                <div
                  key={stu.roll}
                  onClick={() => setSelectedStudent(stu)}
                  className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedStudent.roll === stu.roll
                      ? "border-[#1E90FF] bg-[#1E90FF]/10"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{stu.name}</h5>
                    <p className="text-[10px] tabular-nums text-slate-400">{stu.roll} • {stu.dept}</p>
                  </div>
                  {selectedStudent.roll === stu.roll && <Check size={14} className="text-[#1E90FF]" />}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Moderator Permission Tier
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs font-bold"
            >
              <option value="Student TA Moderator">Student TA Moderator (Mute spam, purge messages)</option>
              <option value="Faculty Lead Advisor">Faculty Lead Advisor (Manage all sub-channels & exams)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 cursor-pointer"
            >
              <Award size={14} />
              <span>Confirm Assignment</span>
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}

export default AssignModeratorModal;
