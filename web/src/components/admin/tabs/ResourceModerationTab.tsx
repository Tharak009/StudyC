import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCheck,
  FileText,
  FileCode,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Download,
  AlertTriangle,
  Star,
  Eye,
  Award,
  MessageSquare,
  Search,
  Filter,
  Check,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router";
import { AdminFilePreviewModal } from "../modals/AdminFilePreviewModal";
import { PurgeResourceModal } from "../modals/PurgeResourceModal";
import { useToastStore } from "../../../store/toast.store";

export interface VaultResourceItem {
  id: string;
  title: string;
  subjectCode: string;
  semester: string;
  department: string;
  category: "Lecture Notes" | "Question Papers" | "Lab Manuals" | "Cheat Sheets" | "Code Archives";
  format: "pdf" | "zip" | "ipynb" | "pptx";
  fileSize: string;
  downloads: number;
  rating: number;
  checksum: string;
  status: "PENDING_INSPECTION" | "APPROVED" | "FLAGGED";
  flagReason?: string;
  uploaderName: string;
  uploaderRoll: string;
  uploaderDept: string;
  uploadedAt: string;
}

function loadVaultResources(): VaultResourceItem[] {
  try {
    const raw = localStorage.getItem("studyconnect_vault_resources");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any, idx: number) => ({
      id: item.id || `res-${idx + 1}`,
      title: item.title || "Untitled Resource",
      subjectCode: item.subjectCode || "GEN101",
      semester: item.semester || "Sem 1",
      department: item.dept || item.department || "General Engineering",
      category: item.category || "Lecture Notes",
      format: (item.format || "pdf").toLowerCase() as any,
      fileSize: item.fileSize || "1.5 MB",
      downloads: item.downloadCount ?? item.downloads ?? 0,
      rating: item.rating ?? 5.0,
      checksum: item.checksum || "e3b0c44298fc1c149afbf4c8996fb924",
      status: item.status || "APPROVED",
      flagReason: item.flagReason,
      uploaderName: item.uploader?.name || item.uploaderName || "Student Contributor",
      uploaderRoll: item.uploader?.roll || item.uploaderRoll || "ST24-001",
      uploaderDept: item.uploader?.dept || item.uploaderDept || "CSE",
      uploadedAt: item.createdAt || item.uploadedAt || "Recently"
    }));
  } catch {
    return [];
  }
}

export function ResourceModerationTab() {
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const [resources, setResources] = useState<VaultResourceItem[]>(loadVaultResources);
  const [activeStatusTab, setActiveStatusTab] = useState<"PENDING" | "FLAGGED" | "APPROVED" | "ALL">("PENDING");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [previewResource, setPreviewResource] = useState<VaultResourceItem | null>(null);
  const [purgeTargetResource, setPurgeTargetResource] = useState<VaultResourceItem | null>(null);

  const pendingCount = resources.filter((r) => r.status === "PENDING_INSPECTION").length;
  const flaggedCount = resources.filter((r) => r.status === "FLAGGED").length;
  const approvedCount = resources.filter((r) => r.status === "APPROVED").length;

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      // Status Tab
      if (activeStatusTab === "PENDING" && r.status !== "PENDING_INSPECTION") return false;
      if (activeStatusTab === "FLAGGED" && r.status !== "FLAGGED") return false;
      if (activeStatusTab === "APPROVED" && r.status !== "APPROVED") return false;

      // Department Filter
      if (deptFilter !== "ALL" && !r.department.includes(deptFilter)) return false;

      // Category Filter
      if (categoryFilter !== "ALL" && r.category !== categoryFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = escapeRegExp(searchQuery.trim()).toLowerCase();
        const match =
          r.title.toLowerCase().includes(q) ||
          r.subjectCode.toLowerCase().includes(q) ||
          r.uploaderName.toLowerCase().includes(q) ||
          r.uploaderRoll.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [resources, activeStatusTab, deptFilter, categoryFilter, searchQuery]);

  const updateVaultResources = (next: VaultResourceItem[]) => {
    setResources(next);
    try {
      const raw = localStorage.getItem("studyconnect_vault_resources");
      if (raw) {
        const parsed = JSON.parse(raw);
        const remainingIds = new Set(next.map((r) => r.id));
        const updated = parsed
          .filter((r: any) => remainingIds.has(r.id))
          .map((r: any) => {
            const found = next.find((n) => n.id === r.id);
            return found ? { ...r, status: found.status, rating: found.rating } : r;
          });
        localStorage.setItem("studyconnect_vault_resources", JSON.stringify(updated));
      }
    } catch {}
  };

  const handleEndorseBadge = (resourceId: string) => {
    const next = resources.map((r) =>
      r.id === resourceId ? { ...r, status: "APPROVED" as const, rating: 5.0 } : r
    );
    updateVaultResources(next);
    addToast("Document endorsed with Faculty Quality Verification Badge!", "success");
    window.dispatchEvent(
      new CustomEvent("studyconnect:audit-entry", {
        detail: {
          action: "ENDORSE_RESOURCE",
          target: `Resource #${resourceId}`,
          details: "Quality verification badge granted by admin"
        }
      })
    );
  };

  const handleConfirmPurge = (resourceId: string, reason: string, issueWarning: boolean) => {
    const next = resources.filter((r) => r.id !== resourceId);
    updateVaultResources(next);
    addToast("Resource permanently purged from repository.", "info");
    window.dispatchEvent(
      new CustomEvent("studyconnect:audit-entry", {
        detail: {
          action: "PURGE_RESOURCE",
          target: `Resource #${resourceId}`,
          details: reason || "Purged by admin"
        }
      })
    );
  };

  const getFormatBadge = (format: string) => {
    switch (format) {
      case "pdf":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "zip":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "ipynb":
        return "bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/30";
      default:
        return "bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/30";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── 1. Moderation Filter & Status Tabs ───────────────────────── */}
      <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md space-y-4">
        
        {/* Status Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveStatusTab("PENDING")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStatusTab === "PENDING"
                  ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              <span>Pending Quality Review</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] tabular-nums font-bold">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveStatusTab("FLAGGED")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStatusTab === "FLAGGED"
                  ? "bg-rose-500 text-white shadow-sm shadow-rose-500/25"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              <span>Peer Flagged / Copyright</span>
              {flaggedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] tabular-nums font-bold animate-pulse">
                  {flaggedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveStatusTab("APPROVED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStatusTab === "APPROVED"
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              Approved ({approvedCount})
            </button>

            <button
              onClick={() => setActiveStatusTab("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStatusTab === "ALL"
                  ? "bg-slate-700 text-white"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
              }`}
            >
              All Vault Files
            </button>
          </div>

          <span className="text-[11px] tabular-nums text-slate-400">
            Active Repository Materials: <strong className="text-[#1E90FF]">{resources.length} documents</strong>
          </span>
        </div>

        {/* Search & Selectors Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="w-full lg:max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, subject code (e.g. CS602), uploader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] shadow-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Lecture Notes">Lecture Notes</option>
              <option value="Question Papers">Question Papers</option>
              <option value="Lab Manuals">Lab Manuals</option>
              <option value="Cheat Sheets">Cheat Sheets</option>
            </select>
          </div>
        </div>

      </div>

      {/* ── 2. Materials Moderation Table ───────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/75 dark:bg-[#080D1A]/75 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">Document Details</th>
                <th className="py-3.5 px-4 font-bold">Uploader Info</th>
                <th className="py-3.5 px-4 font-bold">Stats & Metrics</th>
                <th className="py-3.5 px-4 font-bold">Status / Flag</th>
                <th className="py-3.5 px-4 font-bold">Uploaded Date</th>
                <th className="py-3.5 px-4 font-bold text-right">Moderator Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                    All Vault submissions in this queue are verified.
                  </td>
                </tr>
              ) : (
                filteredResources.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-[#162544]/40 transition-colors">
                    
                    {/* Document Details */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="flex items-start gap-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 uppercase ${getFormatBadge(item.format)}`}>
                          {item.format}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] tabular-nums text-slate-400 mt-0.5">
                            <span className="text-[#1E90FF] font-bold">{item.subjectCode}</span>
                            <span>•</span>
                            <span>{item.semester}</span>
                            <span>•</span>
                            <span>{item.category}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Uploader Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 dark:text-slate-200 font-bold">
                        {item.uploaderName}
                      </div>
                      <div className="text-[10px] tabular-nums text-slate-400">
                        {item.uploaderRoll} • {item.uploaderDept}
                      </div>
                    </td>

                    {/* Metrics & Stats */}
                    <td className="py-3.5 px-4 tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
                      <div>{item.fileSize} • {item.downloads} downloads</div>
                      <div className="flex items-center gap-1 text-amber-500 text-[10px] font-bold mt-0.5 tabular-nums">
                        <Star size={10} className="fill-current" />
                        <span>{item.rating.toFixed(1)} / 5.0</span>
                      </div>
                    </td>

                    {/* Status & Flag Pill */}
                    <td className="py-3.5 px-4">
                      {item.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 size={11} />
                          <span>Quality Verified</span>
                        </span>
                      )}
                      {item.status === "PENDING_INSPECTION" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/30">
                          <span>Pending Review</span>
                        </span>
                      )}
                      {item.status === "FLAGGED" && (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                            <AlertTriangle size={11} />
                            <span>Peer Flagged</span>
                          </span>
                          {item.flagReason && (
                            <p className="text-[10px] text-rose-500 line-clamp-1 max-w-xs">
                              {item.flagReason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Upload Date */}
                    <td className="py-3.5 px-4 tabular-nums text-slate-400 text-[11px]">
                      {item.uploadedAt}
                    </td>

                    {/* Moderation Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewResource(item)}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#1E90FF] hover:border-[#1E90FF] transition-colors cursor-pointer"
                          title="Inspect Document"
                        >
                          <Eye size={13} />
                        </button>

                        {item.status !== "APPROVED" && (
                          <button
                            onClick={() => handleEndorseBadge(item.id)}
                            className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer"
                            title="Endorse Official Quality Badge"
                          >
                            <Award size={13} />
                          </button>
                        )}

                        <button
                          onClick={() => navigate("/direct-messages")}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-[#1E90FF] transition-colors cursor-pointer"
                          title="Message Uploader"
                        >
                          <MessageSquare size={13} />
                        </button>

                        <button
                          onClick={() => setPurgeTargetResource(item)}
                          className="p-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Purge from Vault"
                        >
                          <Trash2 size={13} />
                        </button>
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
        {previewResource && (
          <AdminFilePreviewModal
            isOpen={!!previewResource}
            onClose={() => setPreviewResource(null)}
            resource={previewResource}
            onEndorse={handleEndorseBadge}
            onPurge={(id) => {
              setPreviewResource(null);
              const target = resources.find((r) => r.id === id) || null;
              setPurgeTargetResource(target);
            }}
          />
        )}

        {purgeTargetResource && (
          <PurgeResourceModal
            isOpen={!!purgeTargetResource}
            onClose={() => setPurgeTargetResource(null)}
            resource={purgeTargetResource}
            onConfirmPurge={handleConfirmPurge}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default ResourceModerationTab;
