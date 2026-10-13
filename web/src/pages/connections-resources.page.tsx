import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Search,
  UploadCloud,
  Bookmark,
  Layers,
  Sparkles,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  AlertTriangle,
  X
} from "lucide-react";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { ResourceFilterBar, departments, semesters } from "../components/resources/ResourceFilterBar";
import { ResourceCard, type VaultResource } from "../components/resources/ResourceCard";
import { DocumentPreviewModal } from "../components/resources/DocumentPreviewModal";
import { UploadResourceModal } from "../components/resources/UploadResourceModal";
import { useToastStore } from "../store/toast.store";
import { useAuthStore } from "../store/auth.store";
import { resourcesApi, type ResourceListParams } from "../api/resources.api";

const LOCAL_STORAGE_VAULT_RESOURCES_KEY = "studyconnect_vault_resources";
const LOCAL_STORAGE_BOOKMARKS_KEY = "studyconnect_vault_bookmarks";

const loadSavedBookmarks = (): string[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_BOOKMARKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const isFakeResource = (r: any) =>
  r?.title?.includes("Transformer Architectures") ||
  r?.title?.includes("Raft Consensus") ||
  r?.title?.includes("Advanced Graph Algorithms") ||
  r?.title?.includes("Autonomous Mobile Robotics");

const loadSavedVaultResources = (): VaultResource[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_VAULT_RESOURCES_KEY);
    if (!data) return [];
    const parsed: VaultResource[] = JSON.parse(data);
    return parsed.filter((r) => !isFakeResource(r));
  } catch {
    return [];
  }
};

export const mapApiResourceToVaultResource = (item: any): VaultResource => {
  const uploaderObj = typeof item.uploadedBy === "object" ? item.uploadedBy : typeof item.uploader === "object" ? item.uploader : null;
  const uploaderId = uploaderObj?._id || uploaderObj?.id || (typeof item.uploadedBy === "string" ? item.uploadedBy : typeof item.uploader === "string" ? item.uploader : "");
  const name = uploaderObj?.fullName || uploaderObj?.name || item.uploaderName || "Student";
  const roll = uploaderObj?.rollNumber || uploaderObj?.roll || item.uploaderRoll || "CS24-100";
  const dept = (item.department || item.dept || "").trim();
  const sem = item.semester ? (String(item.semester).startsWith("Sem") ? String(item.semester) : `Sem ${item.semester}`) : "Sem 4";

  const fileName = (item.fileName || "").toLowerCase();
  const format: "pdf" | "ipynb" | "zip" | "pptx" | "docx" =
    fileName.endsWith(".ipynb")
      ? "ipynb"
      : fileName.endsWith(".zip") || fileName.endsWith(".tar") || fileName.endsWith(".gz") || fileName.endsWith(".7z") || fileName.endsWith(".rar")
      ? "zip"
      : fileName.endsWith(".pptx") || fileName.endsWith(".ppt")
      ? "pptx"
      : fileName.endsWith(".docx") || fileName.endsWith(".doc")
      ? "docx"
      : fileName.endsWith(".pdf")
      ? "pdf"
      : ["pdf", "ipynb", "zip", "pptx", "docx"].includes(String(item.format).toLowerCase())
      ? (String(item.format).toLowerCase() as any)
      : "pdf";

  return {
    id: item._id ? String(item._id) : String(item.id || ""),
    title: item.title,
    fileName: item.fileName || item.title,
    description: item.description || "",
    subjectCode: item.subjectCode || item.tags?.[0]?.toUpperCase() || "ACAD",
    subjectName: item.category || "Course Material",
    dept,
    semester: sem,
    category: item.category?.toUpperCase() || "NOTES",
    format,
    fileSize: typeof item.fileSize === "number" ? `${(item.fileSize / (1024 * 1024)).toFixed(1)} MB` : item.fileSize || "0.1 MB",
    fileUrl: item.fileUrl,
    downloadCount: item.downloadCount || 0,
    rating: typeof item.rating === "number" ? item.rating : 5.0,
    reviewCount: typeof item.reviewCount === "number" ? item.reviewCount : 1,
    tags: item.tags || [],
    uploaderId,
    uploader: {
      id: uploaderId,
      name,
      roll,
      dept,
      isVerified: true
    },
    createdAt: (() => {
      if (!item.createdAt) return "";
      const d = new Date(item.createdAt);
      return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
    })()
  };
};

export function ConnectionsResourcesPage() {
  const { addToast } = useToastStore();
  const { user } = useAuthStore();

  const [resources, setResources] = useState<VaultResource[]>(loadSavedVaultResources);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(loadSavedBookmarks);
  const [activeTab, setActiveTab] = useState<"browse" | "bookmarks">("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState(departments[0]);
  const [selectedSem, setSelectedSem] = useState(semesters[0]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFormat, setSelectedFormat] = useState("all");
  const [sortBy, setSortBy] = useState<"downloads" | "recent" | "rating">("downloads");

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [previewResource, setPreviewResource] = useState<VaultResource | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [resourceToDelete, setResourceToDelete] = useState<VaultResource | null>(null);
  const [isDeletingResource, setIsDeletingResource] = useState(false);

  const handleRatingSuccess = (updatedApiRes: any) => {
    const mapped = mapApiResourceToVaultResource(updatedApiRes);
    setResources((prev) =>
      prev.map((r) =>
        r.id === mapped.id
          ? { ...r, rating: mapped.rating, reviewCount: mapped.reviewCount }
          : r
      )
    );
    setPreviewResource((prev) =>
      prev && prev.id === mapped.id
        ? { ...prev, rating: mapped.rating, reviewCount: mapped.reviewCount }
        : prev
    );
  };

  const handleResourceDeleted = (resourceId: string) => {
    setResources((prev) => {
      const next = prev.filter((r) => r.id !== resourceId);
      try {
        localStorage.setItem(LOCAL_STORAGE_VAULT_RESOURCES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    setTotalItems((prev) => Math.max(0, prev - 1));
    if (previewResource?.id === resourceId) {
      setPreviewResource(null);
    }
  };

  // Close delete confirmation dialog on Escape key
  useEffect(() => {
    if (!resourceToDelete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeletingResource) {
        setResourceToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resourceToDelete, isDeletingResource]);

  const handleConfirmDelete = async () => {
    if (!resourceToDelete || isDeletingResource) return;
    setIsDeletingResource(true);
    const targetId = resourceToDelete.id;
    const targetTitle = resourceToDelete.title;

    try {
      await resourcesApi.delete(targetId);
      setResources((prev) => {
        const next = prev.filter((r) => r.id !== targetId);
        try {
          localStorage.setItem(LOCAL_STORAGE_VAULT_RESOURCES_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      setTotalItems((prev) => Math.max(0, prev - 1));
      if (previewResource?.id === targetId) {
        setPreviewResource(null);
      }
      addToast(`Deleted "${targetTitle}" successfully`, "success");
      setResourceToDelete(null);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setResources((prev) => {
          const next = prev.filter((r) => r.id !== targetId);
          try {
            localStorage.setItem(LOCAL_STORAGE_VAULT_RESOURCES_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
        setTotalItems((prev) => Math.max(0, prev - 1));
        if (previewResource?.id === targetId) {
          setPreviewResource(null);
        }
        addToast(`Resource "${targetTitle}" was already removed`, "info");
        setResourceToDelete(null);
      } else {
        addToast(err?.response?.data?.message || err?.message || "Failed to delete resource", "error");
      }
    } finally {
      setIsDeletingResource(false);
    }
  };

  // Sync resources from API with full filter & sorting options
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const params: ResourceListParams = {
      page,
      limit: 9,
      sort: sortBy
    };

    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedDept !== "All Departments") params.department = selectedDept;
    if (selectedSem !== "All Semesters") params.semester = selectedSem;
    if (selectedCategory !== "all") params.category = selectedCategory;
    if (selectedFormat !== "all") params.format = selectedFormat;

    resourcesApi
      .list(params)
      .then((res) => {
        if (!isMounted || !res) return;
        const mapped = res.items.map(mapApiResourceToVaultResource);
        setResources(mapped);
        setTotalPages(res.pages || 1);
        setTotalItems(res.total || mapped.length);
      })
      .catch(() => {
        // Use cached local resources if offline
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page, searchQuery, selectedDept, selectedSem, selectedCategory, selectedFormat, sortBy, refreshKey]);

  // Sync resources to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_VAULT_RESOURCES_KEY, JSON.stringify(resources));
    } catch {
      // ignore
    }
  }, [resources]);

  // Sync bookmarked IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_BOOKMARKS_KEY, JSON.stringify(bookmarkedIds));
    } catch {
      // ignore
    }
  }, [bookmarkedIds]);

  // Map isBookmarked property onto active resource list
  const mappedResources = useMemo(() => {
    return resources.map((r) => ({
      ...r,
      isBookmarked: bookmarkedIds.includes(r.id)
    }));
  }, [resources, bookmarkedIds]);

  // Filter local resources for current activeTab (browse vs bookmarks)
  const displayedResources = useMemo(() => {
    let list = mappedResources;
    if (activeTab === "bookmarks") {
      list = list.filter((r) => r.isBookmarked);
    }
    return list;
  }, [mappedResources, activeTab]);

  const handleSelectDept = (d: string) => {
    setSelectedDept(d);
    setPage(1);
  };

  const handleSelectSem = (s: string) => {
    setSelectedSem(s);
    setPage(1);
  };

  const handleSelectCategory = (c: string) => {
    setSelectedCategory(c);
    setPage(1);
  };

  const handleSelectFormat = (f: string) => {
    setSelectedFormat(f);
    setPage(1);
  };

  const handleSelectSort = (s: "downloads" | "recent" | "rating") => {
    setSortBy(s);
    setPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  const handleToggleBookmark = (resId: string) => {
    setBookmarkedIds((prev) => {
      const isSaved = prev.includes(resId);
      if (isSaved) {
        addToast("Removed from My Bookmarks", "info");
        return prev.filter((id) => id !== resId);
      } else {
        addToast("Saved to My Bookmarks", "success");
        return [...prev, resId];
      }
    });
  };

  const handleDownload = async (res: VaultResource) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === res.id ? { ...r, downloadCount: r.downloadCount + 1 } : r
      )
    );

    try {
      const urlInfo = await resourcesApi.getDownloadUrl(res.id);
      if (urlInfo?.downloadUrl && urlInfo.downloadUrl !== "#") {
        window.open(urlInfo.downloadUrl, "_blank");
      } else if (res.fileUrl && res.fileUrl !== "#") {
        window.open(res.fileUrl, "_blank");
      }
      addToast(`Downloading ${res.title}...`, "success");
    } catch {
      if (res.fileUrl && res.fileUrl !== "#") {
        window.open(res.fileUrl, "_blank");
      }
      addToast(`Downloading ${res.title}...`, "success");
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDept(departments[0]);
    setSelectedSem(semesters[0]);
    setSelectedCategory("all");
    setSelectedFormat("all");
    setSortBy("downloads");
    setPage(1);
  };

  const totalNotes = totalItems || resources.length;
  const activeSubjects = new Set(resources.map((r) => r.subjectCode.toUpperCase())).size || 1;
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

          <ResourceFilterBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            selectedDept={selectedDept}
            onSelectDept={handleSelectDept}
            selectedSem={selectedSem}
            onSelectSem={handleSelectSem}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
            selectedFormat={selectedFormat}
            onSelectFormat={handleSelectFormat}
            sortBy={sortBy}
            onSelectSort={handleSelectSort}
          />

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 min-h-[250px]">
              <Loader2 size={32} className="animate-spin text-[#1E90FF] mb-2" />
              <p className="text-xs font-semibold">Filtering Academic Vault...</p>
            </div>
          ) : displayedResources.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 p-12 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 mb-3">
                <BookOpen size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                {resources.length === 0
                  ? "No resources available yet"
                  : "No matching academic materials found"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
                {resources.length === 0
                  ? "Be the first to upload a study resource."
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
            <div className="space-y-6">
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {displayedResources.map((res) => (
                  <ResourceCard
                    key={res.id}
                    resource={res}
                    currentUserId={user?._id || (user as any)?.id}
                    userRole={user?.role}
                    onPreview={setPreviewResource}
                    onDownload={handleDownload}
                    onToggleBookmark={handleToggleBookmark}
                    onDelete={(r) => setResourceToDelete(r)}
                  />
                ))}
              </motion.div>

              {/* ── Pagination Controls ───────────────────────────────────── */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Showing page <strong className="text-slate-800 dark:text-slate-200">{page}</strong> of <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({totalItems} total resources)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                      <button
                        key={pNum}
                        onClick={() => setPage(pNum)}
                        className={`h-8 w-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          pNum === page
                            ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                            : "border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {pNum}
                      </button>
                    ))}

                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      <AnimatePresence>
        {previewResource && (
          <DocumentPreviewModal
            resource={previewResource}
            onClose={() => setPreviewResource(null)}
            onDownload={handleDownload}
            onDeleteResource={handleResourceDeleted}
            onRatingSuccess={handleRatingSuccess}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploadModalOpen && (
          <UploadResourceModal
            isOpen={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            onUploadSuccess={(newRes) => {
              const mapped = mapApiResourceToVaultResource(newRes);
              setResources((prev) => [mapped, ...prev.filter((r) => r.id !== mapped.id)]);
              setTotalItems((prev) => prev + 1);
              setPage(1);
              setRefreshKey((k) => k + 1);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Resource Card Deletion Confirmation Modal ───────────────────── */}
      <AnimatePresence>
        {resourceToDelete && (
          <div
            key="delete-resource-dialog-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeletingResource) {
                setResourceToDelete(null);
              }
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              key="delete-resource-dialog-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0F1A30] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
            >
              <button
                type="button"
                disabled={isDeletingResource}
                onClick={() => setResourceToDelete(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 text-rose-500 mb-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10">
                  <AlertTriangle size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Are you sure you want to delete this resource?
                </h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                Are you sure you want to delete "{resourceToDelete.fileName || resourceToDelete.title}"? This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeletingResource}
                  onClick={() => setResourceToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  No
                </button>
                <button
                  type="button"
                  disabled={isDeletingResource}
                  onClick={handleConfirmDelete}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDeletingResource ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Yes, Delete</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default ConnectionsResourcesPage;
