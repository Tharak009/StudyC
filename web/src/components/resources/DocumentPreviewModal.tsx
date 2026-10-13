import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Star,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Sparkles,
  Presentation,
  Table,
  FileCode,
  Archive,
  ArrowLeftRight,
  Search,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Loader2
} from "lucide-react";
import type { VaultResource } from "./ResourceCard";
import { useToastStore } from "../../store/toast.store";
import { useAuthStore } from "../../store/auth.store";
import { resourcesApi } from "../../api/resources.api";
import { DocumentContentRenderer } from "./DocumentContentRenderer";
import type { SearchMatch } from "./PdfDocumentViewer";

interface DocumentPreviewModalProps {
  resource: VaultResource | null;
  onClose: () => void;
  onDownload: (res: VaultResource) => void;
  onDeleteResource?: (resourceId: string) => void;
  onRequestDelete?: (res: VaultResource) => void;
  onRatingSuccess?: (updatedResource: any) => void;
}

export function DocumentPreviewModal({
  resource,
  onClose,
  onDownload,
  onDeleteResource,
  onRequestDelete,
  onRatingSuccess
}: DocumentPreviewModalProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fitMode, setFitMode] = useState<"page" | "width">("page");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(true);
  const [searchResults, setSearchResults] = useState<{ total: number; matches: SearchMatch[] }>({
    total: 0,
    matches: []
  });
  const [isSearching, setIsSearching] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [navigationTick, setNavigationTick] = useState(0);

  // Ratings
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [submittedRating, setSubmittedRating] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const { addToast } = useToastStore();
  const { user } = useAuthStore();

  const isOwner = Boolean(
    user &&
      resource &&
      (user.role === "ADMIN" ||
        user._id === resource.uploaderId ||
        (user as any)?.id === resource.uploaderId ||
        user._id === (resource.uploader as any)?.id ||
        user._id === (resource.uploader as any)?._id ||
        (user as any)?.id === (resource.uploader as any)?.id ||
        (user as any)?.id === (resource.uploader as any)?._id ||
        user.fullName === (typeof resource.uploader === "string" ? resource.uploader : resource.uploader?.name))
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeof window === "undefined") return;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fullscreen API event listener & Escape key handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F for Find in Document
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen(true);
        setDropdownOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
        return;
      }

      if (e.key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false);
          setSearchQuery("");
          setDropdownOpen(false);
          return;
        }

        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, searchOpen, dropdownOpen, searchQuery]);

  if (!resource) return null;

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (modalRef.current?.requestFullscreen) {
        modalRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const handlePageChange = useCallback((curr: number, total: number) => {
    setCurrentPage((prevCurr) => (prevCurr !== curr ? curr : prevCurr));
    setTotalPages((prevTotal) => (prevTotal !== total ? total : prevTotal));
  }, []);

  const handleSearchResultsChange = useCallback(
    (results: { total: number; matches: SearchMatch[]; isSearching?: boolean }) => {
      setIsSearching(Boolean(results.isSearching));
      setSearchResults((prev) => {
        if (prev.total === results.total && prev.matches === results.matches) {
          return prev;
        }
        return { total: results.total, matches: results.matches };
      });
    },
    []
  );

  const handleSelectMatch = (index: number) => {
    if (searchResults.total === 0) return;
    const validIdx = (index + searchResults.total) % searchResults.total;
    setActiveMatchIndex(validIdx);
    const target = searchResults.matches[validIdx]?.pageNumber;
    if (target) {
      setCurrentPage(target);
      setNavigationTick((t) => t + 1);
    }
  };

  const handleNextMatch = () => {
    handleSelectMatch(activeMatchIndex + 1);
  };

  const handlePrevMatch = () => {
    handleSelectMatch(activeMatchIndex - 1);
  };

  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      handleNextMatch();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      handlePrevMatch();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    }
  };

  const renderSnippetWithHighlight = (snippet: string, query: string) => {
    if (!query || !query.trim()) return snippet;
    const q = query.trim();
    const lowerSnippet = snippet.toLowerCase();
    const lowerQuery = q.toLowerCase();
    const pos = lowerSnippet.indexOf(lowerQuery);

    if (pos === -1) return snippet;

    const before = snippet.substring(0, pos);
    const match = snippet.substring(pos, pos + q.length);
    const after = snippet.substring(pos + q.length);

    return (
      <>
        {before}
        <span className="bg-[#1E90FF]/15 text-[#1E90FF] dark:text-[#60a5fa] font-extrabold px-1 rounded">
          {match}
        </span>
        {after}
      </>
    );
  };


  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource?.id || isSubmittingRating) return;
    setIsSubmittingRating(true);
    try {
      const updatedApiRes = await resourcesApi.rate(resource.id, userRating, reviewText);
      setSubmittedRating(true);
      addToast(`Thank you for rating ${userRating} stars!`, "success");
      setReviewText("");
      if (updatedApiRes) {
        onRatingSuccess?.(updatedApiRes);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to submit rating";
      addToast(msg, "error");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const format = (resource.format || "").toLowerCase();
  const FormatIcon =
    format === "pptx"
      ? Presentation
      : format === "xlsx"
      ? Table
      : format === "ipynb" || format === "zip"
      ? FileCode
      : FileText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 overflow-hidden">
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25 }}
        className={`relative w-full flex flex-col border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-0 z-[100] h-screen w-screen rounded-none p-0 border-none"
            : "max-w-5xl h-[92vh] rounded-3xl"
        }`}
      >
        {/* ── Native StudyConnect Top Header Bar ──────────────────────────── */}
        <div className="h-16 shrink-0 px-6 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#080D1A]/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E90FF]/15 text-[#1E90FF] shrink-0">
              <FormatIcon size={18} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {resource.title}
              </h3>
              <span className="text-[10px] text-slate-400 tabular-nums truncate">
                {resource.subjectCode} • Uploaded by {typeof resource.uploader === "object" ? resource.uploader.name : resource.uploader} ({resource.fileSize})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">

            {/* Full-Screen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Viewer"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Download Original File Button */}
            <button
              onClick={() => onDownload(resource)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span>Download Original ({resource.fileSize})</span>
            </button>

            {/* Close Viewer Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Viewer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Native Custom StudyConnect Toolbar ──────────────────────────── */}
        <div className="h-11 shrink-0 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-[#0F1A30]">
          {/* Page / Slide Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                setNavigationTick((t) => t + 1);
              }}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
              title="Previous Page / Slide"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="tabular-nums text-[11px] font-bold text-slate-700 dark:text-slate-200">
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                setNavigationTick((t) => t + 1);
              }}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
              title="Next Page / Slide"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Zoom, Fit & Find Search Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>

            <button
              onClick={() => setZoomLevel(100)}
              className="tabular-nums text-[11px] font-bold w-12 text-center hover:text-[#1E90FF] transition-colors cursor-pointer"
              title="Reset Zoom (100%)"
            >
              {zoomLevel}%
            </button>

            <button
              onClick={() => setZoomLevel((z) => Math.min(180, z + 10))}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            <button
              onClick={() => setFitMode(fitMode === "page" ? "width" : "page")}
              className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                fitMode === "width"
                  ? "bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/30"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
              title={fitMode === "page" ? "Fit to Width" : "Fit to Page"}
            >
              <ArrowLeftRight size={13} />
              <span>{fitMode === "width" ? "Fit Width" : "Fit Page"}</span>
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            {/* Find Search Toggle Button */}
            <button
              onClick={() => {
                const nextOpen = !searchOpen;
                setSearchOpen(nextOpen);
                if (nextOpen) {
                  setDropdownOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }
              }}
              className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                searchOpen
                  ? "bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/30"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
              title="Find text in document (Ctrl+F)"
            >
              <Search size={13} />
              <span>Find</span>
            </button>
          </div>
        </div>

        {/* ── Text Search Bar Panel & Dropdown Suggestions ──────────────────── */}
        {searchOpen && (
          <div className="relative shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] z-40">
            <div className="h-10 px-6 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onKeyDown={handleSearchInputKeyDown}
                  onFocus={() => setDropdownOpen(true)}
                  onClick={() => setDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveMatchIndex(0);
                    setDropdownOpen(true);
                  }}
                  placeholder="Find in document... (e.g. unit, network)"
                  className="w-full bg-white dark:bg-[#0F1A30] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
                />
                <span className="text-[11px] font-bold text-slate-500 shrink-0 min-w-[70px] text-right tabular-nums flex items-center justify-end gap-1">
                  {isSearching ? (
                    <>
                      <Loader2 size={11} className="animate-spin text-[#1E90FF]" />
                      <span>{searchResults.total > 0 ? `${activeMatchIndex + 1}/${searchResults.total}` : "Searching..."}</span>
                    </>
                  ) : searchResults.total > 0 ? (
                    `${activeMatchIndex + 1} of ${searchResults.total}`
                  ) : searchQuery.trim() ? (
                    "0 matches"
                  ) : (
                    ""
                  )}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={searchResults.total === 0}
                  onClick={handlePrevMatch}
                  className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  title="Previous Match (Up Arrow)"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  disabled={searchResults.total === 0}
                  onClick={handleNextMatch}
                  className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  title="Next Match (Down Arrow)"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer ml-2"
                  title="Close Search (Esc)"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* ── Searchable Dropdown of Matching Headings & Text Passages ──── */}
            {dropdownOpen && searchQuery.trim().length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-6 right-6 z-50 max-h-72 overflow-y-auto bg-white/95 dark:bg-[#0F1A30]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl rounded-2xl mt-1.5 p-2 space-y-1"
              >
                {searchResults.total > 0 ? (
                  searchResults.matches.map((match, idx) => {
                    const isActive = idx === activeMatchIndex;

                    return (
                      <button
                        key={match.id || idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectMatch(idx);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          isActive
                            ? "bg-[#1E90FF]/15 border border-[#1E90FF]/40 text-[#1E90FF] font-bold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {match.isHeading ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#1E90FF]/20 text-[#1E90FF] uppercase tracking-wider shrink-0">
                                Heading / Unit
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-500 shrink-0">
                                Passage
                              </span>
                            )}
                            <span className="text-xs font-bold truncate">
                              {match.headingTitle || match.snippet}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {renderSnippetWithHighlight(match.snippet, searchQuery)}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-[#162544] px-2 py-0.5 rounded-md shrink-0">
                          Page {match.pageNumber}
                        </span>
                      </button>
                    );
                  })
                ) : isSearching ? (
                  <div className="p-4 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                    <Loader2 size={16} className="animate-spin text-[#1E90FF]" />
                    <span>Searching document pages...</span>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    <span>No matches found for "{searchQuery}"</span>
                    {resource.title?.toLowerCase().includes("cns") && (
                      <span className="block mt-1 text-[11px] text-slate-400">
                        (Pages 1–90 contain scanned diagrams without searchable text)
                      </span>
                    )}
                  </div>
                )}
                {searchResults.total > 0 && isSearching && (
                  <div className="px-3 py-1.5 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <Loader2 size={10} className="animate-spin text-[#1E90FF]" />
                    <span>Searching remaining pages...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Main Document View Canvas ───────────────────────────────────── */}
        <div className="flex-1 min-h-0 w-full flex flex-col bg-slate-100 dark:bg-[#080D1A]/95 overflow-hidden">
          <DocumentContentRenderer
            resource={resource}
            zoomLevel={zoomLevel}
            fitMode={fitMode}
            targetPage={currentPage}
            searchQuery={searchQuery}
            activeMatchIndex={activeMatchIndex}
            navigationTick={navigationTick}
            onDownload={onDownload}
            onPageChange={handlePageChange}
            onSearchResultsChange={handleSearchResultsChange}
          />
        </div>

        {/* ── Bottom Rating Dock (Hidden in Fullscreen Mode) ──────────────── */}
        {!isFullscreen && (
          <div className="shrink-0 p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30]">
            <form onSubmit={handleRatingSubmit} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Rate this study resource:
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setUserRating(star)}
                      className="text-amber-400 p-0.5 cursor-pointer"
                    >
                      <Star
                        size={16}
                        className={
                          (hoverRating !== null ? star <= hoverRating : star <= userRating)
                            ? "fill-current"
                            : "text-slate-300 dark:text-slate-600"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Optional review note (e.g. Covered all midsem topics)..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
                />
                <button
                  type="submit"
                  disabled={isSubmittingRating}
                  className="px-4 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isSubmittingRating ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        )}

      </motion.div>


    </div>
  );
}

export default DocumentPreviewModal;
