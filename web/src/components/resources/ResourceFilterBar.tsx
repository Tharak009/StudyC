import React from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Layers,
  FileText,
  Filter,
  ArrowUpDown,
  Search,
  Bookmark,
  Check
} from "lucide-react";

export const departments = [
  "All Departments",
  "Computer Science & Engineering",
  "Artificial Intelligence & Data Science",
  "Information Technology",
  "Electrical & Electronics",
  "Electronics & Communication",
  "Mechanical Engineering"
];

export const semesters = [
  "All Semesters",
  "Sem 1",
  "Sem 2",
  "Sem 3",
  "Sem 4",
  "Sem 5",
  "Sem 6",
  "Sem 7",
  "Sem 8"
];

export const categories = [
  { id: "all", label: "All Categories" },
  { id: "NOTES", label: "Lecture Notes" },
  { id: "PREVIOUS_PAPERS", label: "Solved Papers" },
  { id: "LAB_RECORDS", label: "Lab Manuals" },
  { id: "ASSIGNMENTS", label: "Cheat Sheets" },
  { id: "PPTS", label: "Presentations" },
  { id: "QUESTION_BANKS", label: "Question Banks" },
  { id: "OTHER", label: "Other" }
];

export const fileFormats = [
  { id: "all", label: "All Formats" },
  { id: "pdf", label: "PDF" },
  { id: "docx", label: "DOCX" },
  { id: "ipynb", label: "Jupyter (.ipynb)" },
  { id: "zip", label: "Code ZIP" },
  { id: "pptx", label: "PPTX" }
];

interface ResourceFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTab: "browse" | "bookmarks";
  onTabChange: (tab: "browse" | "bookmarks") => void;
  selectedDept: string;
  onSelectDept: (dept: string) => void;
  selectedSem: string;
  onSelectSem: (sem: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedFormat: string;
  onSelectFormat: (format: string) => void;
  sortBy: "downloads" | "recent" | "rating";
  onSelectSort: (sort: "downloads" | "recent" | "rating") => void;
}

export function ResourceFilterBar({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  selectedDept,
  onSelectDept,
  selectedSem,
  onSelectSem,
  selectedCategory,
  onSelectCategory,
  selectedFormat,
  onSelectFormat,
  sortBy,
  onSelectSort
}: ResourceFilterBarProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 p-4 sm:p-5 backdrop-blur-xl shadow-md">
      
      {/* ── Row A: Search Input (left) + Navigation Tabs (right) ───────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
        <div className="w-full sm:max-w-md relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search notes, subject code (e.g. CS602), or tags..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] pl-10 pr-4 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] self-stretch sm:self-auto">
          <button
            onClick={() => onTabChange("browse")}
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
            onClick={() => onTabChange("bookmarks")}
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

      {/* ── Row B: Department Selector (left) + Sort By Dropdown (right) ───────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
        {/* Department Selector */}
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-[#1E90FF] shrink-0" />
          <select
            value={selectedDept}
            onChange={(e) => onSelectDept(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1E90FF]"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <ArrowUpDown size={14} className="text-slate-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSelectSort(e.target.value as any)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1E90FF]"
          >
            <option value="downloads">Most Downloaded</option>
            <option value="rating">Highest Rated</option>
            <option value="recent">Newest First</option>
          </select>
        </div>
      </div>

      {/* ── Row C: Semester Selection Tabs ─────────────────────────────────────── */}
      <div className="pb-2 border-b border-slate-200/70 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {semesters.map((sem) => {
            const isActive = selectedSem === sem;
            return (
              <button
                key={sem}
                onClick={() => onSelectSem(sem)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSemTab"
                    className="absolute inset-0 rounded-xl bg-[#1E90FF] shadow-xs shadow-[#1E90FF]/25"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{sem}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Row D: Category Filter Pills ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-200/70 dark:border-slate-800/60">
        <span className="text-[11px] font-bold text-slate-400 mr-1.5 flex items-center gap-1 shrink-0">
          <Filter size={11} /> Category:
        </span>
        {categories.map((cat) => {
          const isCatActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                isCatActive
                  ? "bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/40"
                  : "border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Row E: File Format Filter Pills ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 mr-1.5 flex items-center gap-1 shrink-0">
          <FileText size={11} /> Format:
        </span>
        {fileFormats.map((fmt) => {
          const isFmtActive = selectedFormat === fmt.id;
          return (
            <button
              key={fmt.id}
              onClick={() => onSelectFormat(fmt.id)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                isFmtActive
                  ? "bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/40"
                  : "border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {fmt.label}
            </button>
          );
        })}
      </div>

    </div>
  );
}

export default ResourceFilterBar;
