import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Search,
  UploadCloud,
  Bookmark,
  Layers,
  Sparkles,
  Download,
  RotateCcw,
  FileText
} from "lucide-react";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { ResourceFilterBar, departments, semesters, categories, fileFormats } from "../components/resources/ResourceFilterBar";
import { ResourceCard, type VaultResource } from "../components/resources/ResourceCard";
import { DocumentPreviewModal } from "../components/resources/DocumentPreviewModal";
import { UploadResourceModal } from "../components/resources/UploadResourceModal";
import { useToastStore } from "../store/toast.store";

// ── Local Storage Data Key & Helpers ──────────────────────────────────────────

const LOCAL_STORAGE_VAULT_RESOURCES_KEY = "studyconnect_vault_resources";

const loadSavedVaultResources = (): VaultResource[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_VAULT_RESOURCES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export function ConnectionsResourcesPage() {
  const { addToast } = useToastStore();

  const [resources, setResources] = useState<VaultResource[]>(loadSavedVaultResources);
  const [activeTab, setActiveTab] = useState<"browse" | "bookmarks">("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState(departments[0]);
  const [selectedSem, setSelectedSem] = useState(semesters[0]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFormat, setSelectedFormat] = useState("all");
  const [sortBy, setSortBy] = useState<"downloads" | "recent" | "rating">("downloads");

  const [previewResource, setPreviewResource] = useState<VaultResource | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Sync resources to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_VAULT_RESOURCES_KEY, JSON.stringify(resources));
    } catch {
      // ignore
    }
  }, [resources]);

  // ── Filter & Search Logic ──────────────────────────────────────────────────
  const filteredResources = useMemo(() => {
    return resources
      .filter((res) => {
        // Tab filter (Bookmarks)
        if (activeTab === "bookmarks" && !res.isBookmarked) return false;

        // Search match
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = res.title.toLowerCase().includes(q);
          const matchCode = res.subjectCode.toLowerCase().includes(q);
          const matchTags = res.tags.some((t) => t.toLowerCase().includes(q));
          const matchUploader = res.uploader.name.toLowerCase().includes(q);
          if (!matchTitle && !matchCode && !matchTags && !matchUploader) return false;
        }

        // Department filter
        if (selectedDept !== "All Departments" && res.dept !== selectedDept) return false;

        // Semester filter
        if (selectedSem !== "All Semesters" && res.semester !== selectedSem) return false;

        // Category filter
        if (selectedCategory !== "all" && res.category !== selectedCategory) return false;

        // Format filter
        if (selectedFormat !== "all" && res.format !== selectedFormat) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "downloads") return b.downloadCount - a.downloadCount;
        if (sortBy === "rating") return b.rating - a.rating;
        return b.id.localeCompare(a.id);
      });
  }, [
    resources,
    activeTab,
    searchQuery,
    selectedDept,
    selectedSem,
    selectedCategory,
    selectedFormat,
    sortBy
  ]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleToggleBookmark = (resId: string) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === resId ? { ...r, isBookmarked: !r.isBookmarked } : r
      )
    );
    const target = resources.find((r) => r.id === resId);
    if (target?.isBookmarked) {
      addToast("Removed from My Bookmarks", "info");
    } else {
      addToast("Saved to My Bookmarks", "success");
    }
  };

  const handleDownload = (res: VaultResource) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === res.id ? { ...r, downloadCount: r.downloadCount + 1 } : r
      )
    );
    addToast(`Downloading ${res.title}...`, "success");
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDept(departments[0]);
    setSelectedSem(semesters[0]);
    setSelectedCategory("all");
    setSelectedFormat("all");
  };

  const totalNotes = resources.length;
  const activeSubjects = new Set(resources.map((r) => r.subjectCode.toUpperCase())).size;
  const totalDownloads = resources.reduce((acc, r) => acc + (r.downloadCount || 0), 0);
  const formattedDownloads =
    totalDownloads >= 1000
      ? `${(totalDownloads / 1000).toFixed(1)}K`
      : `${totalDownloads}`;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      
      {/* ── 1. Workspace Sidebar ───────────────────────────────────────── */}
      <DashboardSidebar />

      {/* ── 2. Scrollable Vault Content ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* ── Page Header & KPI Stats ───────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#1E90FF]/30 bg-[#1E90FF]/10 px-3 py-1 text-xs font-bold text-[#1E90FF] mb-2">
                <Sparkles size={12} />
                <span>Verified .EDU Academic Repository</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                Academic Resource Vault
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                Peer-reviewed lecture notes, midterm review sheets, and verified code repositories for your batch.
              </p>
            </div>

            {/* Upload Action Button */}
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] px-5 py-3 text-xs font-bold text-white shadow-sm shadow-[#1E90FF]/25 transition-all cursor-pointer self-start md:self-center shrink-0"
            >
              <UploadCloud size={16} />
              <span>Upload Material</span>
            </motion.button>
          </div>

          {/* ── Quick KPI Badges Bar ──────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total Notes</span>
              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">{totalNotes}</div>
            </div>
            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Active Subjects</span>
              <div className="text-lg font-extrabold text-[#1E90FF] tabular-nums">{activeSubjects}</div>
            </div>
            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total Downloads</span>
              <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{formattedDownloads}</div>
            </div>
          </div>

          {/* ── Search Bar & Tab Toggle ───────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="w-full sm:max-w-md relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search notes, subject code (e.g. CS602), or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] shadow-sm"
              />
            </div>

            {/* Tab Switcher: Browse Vault vs Bookmarks */}
            <div className="flex items-center gap-1 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] self-stretch sm:self-auto">
              <button
                onClick={() => setActiveTab("browse")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "browse"
                    ? "bg-[#1E90FF] text-white shadow-xs shadow-[#1E90FF]/25"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers size={13} />
                <span>Browse Vault</span>
              </button>

              <button
                onClick={() => setActiveTab("bookmarks")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "bookmarks"
                    ? "bg-[#1E90FF] text-white shadow-xs shadow-[#1E90FF]/25"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Bookmark size={13} />
                <span>My Bookmarks</span>
              </button>
            </div>
          </div>

          {/* ── Faceted Filter Toolbar ────────────────────────────────── */}
          <ResourceFilterBar
            selectedDept={selectedDept}
            onSelectDept={setSelectedDept}
            selectedSem={selectedSem}
            onSelectSem={setSelectedSem}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedFormat={selectedFormat}
            onSelectFormat={setSelectedFormat}
            sortBy={sortBy}
            onSelectSort={setSortBy}
          />

          {/* ── Resource Cards Grid ───────────────────────────────────── */}
          {filteredResources.length === 0 ? (
            /* Empty State */
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 p-12 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 mb-3">
                <BookOpen size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                {resources.length === 0
                  ? "Your Academic Vault is Empty"
                  : "No matching academic materials found"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
                {resources.length === 0
                  ? "No lecture notes, lab manuals, or question papers have been uploaded yet. Publish your study materials to begin collaborating with your batch."
                  : "Try adjusting your search keywords, semester filters, or category tags."}
              </p>
              {resources.length === 0 ? (
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-xs font-bold text-white shadow-sm shadow-[#1E90FF]/25 transition-all cursor-pointer"
                >
                  <UploadCloud size={14} />
                  <span>Upload First Material</span>
                </button>
              ) : (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#162544] text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1E90FF] transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filteredResources.map((res) => (
                <ResourceCard
                  key={res.id}
                  resource={res}
                  onPreview={setPreviewResource}
                  onDownload={handleDownload}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}
            </motion.div>
          )}

        </main>
      </div>

      {/* ── Document Preview Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {previewResource && (
          <DocumentPreviewModal
            resource={previewResource}
            onClose={() => setPreviewResource(null)}
            onDownload={handleDownload}
          />
        )}
      </AnimatePresence>

      {/* ── Resource Upload Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {uploadModalOpen && (
          <UploadResourceModal
            isOpen={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            onUploadSuccess={(newRes) => setResources((prev) => [newRes, ...prev])}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default ConnectionsResourcesPage;
