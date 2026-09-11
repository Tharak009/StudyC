import React from "react";
import { motion } from "framer-motion";
import {
  Filter,
  Calendar,
  GraduationCap,
  Sparkles,
  Trophy,
  Clock,
  Lightbulb,
  CheckSquare
} from "lucide-react";

export const eventCategories = [
  { id: "all", label: "All Events", icon: Sparkles },
  { id: "hackathons", label: "Hackathons & Contests", icon: Trophy },
  { id: "deadlines", label: "Academic Deadlines", icon: Clock },
  { id: "workshops", label: "Workshops & Talks", icon: Lightbulb },
  { id: "reviews", label: "Dept Reviews", icon: CheckSquare }
];

export const timeframes = [
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "semester", label: "Upcoming Semester" },
  { id: "all", label: "All Time" }
];

export const eventDepartments = [
  "All Departments",
  "Computer Science & Engineering",
  "Artificial Intelligence & Data Science",
  "Information Technology",
  "Electrical & Electronics",
  "Electronics & Communication",
  "Mechanical Engineering"
];

interface EventsFilterBarProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedTimeframe: string;
  onSelectTimeframe: (tf: string) => void;
  selectedDept: string;
  onSelectDept: (dept: string) => void;
  myRsvpsOnly: boolean;
  onToggleMyRsvps: () => void;
}

export function EventsFilterBar({
  selectedCategory,
  onSelectCategory,
  selectedTimeframe,
  onSelectTimeframe,
  selectedDept,
  onSelectDept,
  myRsvpsOnly,
  onToggleMyRsvps
}: EventsFilterBarProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 p-4 sm:p-5 backdrop-blur-xl shadow-md">
      
      {/* ── Category Pill Tabs ───────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {eventCategories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "text-white shadow-md shadow-[#1E90FF]/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeEventCat"
                  className="absolute inset-0 rounded-2xl bg-[#1E90FF]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={14} className="relative z-10" />
              <span className="relative z-10">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Timeframe Tabs, Dept Selector & RSVP Toggle ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800/60">
        
        {/* Timeframe Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-slate-400 mr-1 hidden md:inline">Timeframe:</span>
          {timeframes.map((tf) => (
            <button
              key={tf.id}
              onClick={() => onSelectTimeframe(tf.id)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                selectedTimeframe === tf.id
                  ? "bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/40"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Dept Selector & My RSVPs Only Switch */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <GraduationCap size={15} className="text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => onSelectDept(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1E90FF]"
            >
              {eventDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* My RSVPs Only Switch */}
          <button
            onClick={onToggleMyRsvps}
            className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              myRsvpsOnly
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                myRsvpsOnly ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            <span>My RSVPs Only</span>
          </button>
        </div>

      </div>

    </div>
  );
}

export default EventsFilterBar;
