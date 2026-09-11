import React from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Layers,
  FileText,
  Filter,
  ArrowUpDown,
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
  { id: "PPTS", label: "Presentations" }
];

export const fileFormats = [
  { id: "all", label: "All Formats" },
  { id: "pdf", label: "PDF" },
  { id: "ipynb", label: "Jupyter (.ipynb)" },
  { id: "zip", label: "Code ZIP" },
  { id: "pptx", label: "PPTX" }
];

interface ResourceFilterBarProps {
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
      
      {/* ── Top Controls Row: Department & Sort By ───────────────────── */}
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

      {/* ── Semester Horizontal Tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {semesters.map((sem) => {
          const isActive = selectedSem === sem;
          return (
            <button
              key={sem}
              onClick={() => onSelectSem(sem)}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? "text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSemTab"
                  className="absolute inset-0 rounded-xl bg-[#1E90FF] shadow-sm shadow-[#1E90FF]/25"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{sem}</span>
            </button>
          );
        })}
      </div>

      {/* ── Category & Format Chips ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        
        {/* Category Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={11} /> Category:
          </span>
          {categories.map((cat) => {
            const isCatActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  isCatActive
                    ? "bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/40"
                    : "border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]/60 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Format Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <FileText size={11} /> Format:
          </span>
          {fileFormats.map((fmt) => {
            const isFmtActive = selectedFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => onSelectFormat(fmt.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  isFmtActive
                    ? "bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/40"
                    : "border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]/60 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                {fmt.label}
              </button>
            );
          })}
        </div>

      </div>

    </div>
  );
}

export default ResourceFilterBar;
