import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { Event } from "../types/event";

interface CalendarViewProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({ events, onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of the month index (0 = Sunday, 1 = Monday, etc.)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Get total days in current month
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Get total days in previous month (to fill leading grid items)
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate calendar day cells
  const dayCells = [];

  // 1. Prepend days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    dayCells.push({
      day: prevMonthTotalDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthTotalDays - i),
    });
  }

  // 2. Append current month days
  for (let i = 1; i <= totalDays; i++) {
    dayCells.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }

  // 3. Append days from next month to round grid to multiple of 7
  const totalSlots = Math.ceil(dayCells.length / 7) * 7;
  const nextMonthDaysCount = totalSlots - dayCells.length;
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    dayCells.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  // Format month title
  const monthTitle = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  // Get category badge color map
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "Workshop":
        return "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-none";
      case "Seminar":
        return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-none";
      case "Hackathon":
        return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-none";
      case "Cultural":
        return "bg-amber-50 text-amber-750 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-none";
      case "Sports":
        return "bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-none";
      case "Webinar":
        return "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-none";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100 dark:bg-white/[0.04] dark:text-slate-400 dark:border-none";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-ink-900 transition-colors duration-300">
      {/* Calendar Header controls */}
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          <Calendar className="text-indigo-600 dark:text-indigo-400" size={18} />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {monthTitle}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-800 dark:border-white/5 dark:bg-white/[0.02] dark:hover:text-white transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:hover:bg-white/[0.04] transition-all"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-800 dark:border-white/5 dark:bg-white/[0.02] dark:hover:text-white transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-white/5 pb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-slate-100 dark:divide-white/5 border-l border-b border-slate-100 dark:border-white/5">
        {dayCells.map((cell, idx) => {
          const dateString = cell.date.toISOString().split("T")[0];

          // Filter events on this specific date
          const dateEvents = events.filter((ev) => ev.date === dateString);
          const isToday = new Date().toDateString() === cell.date.toDateString();

          return (
            <div
              key={idx}
              className={`min-h-[100px] p-2 flex flex-col justify-between transition-colors ${
                cell.isCurrentMonth
                  ? "bg-white dark:bg-ink-900"
                  : "bg-slate-50/50 dark:bg-white/[0.01] text-slate-400 dark:text-slate-600"
              }`}
            >
              {/* Day count number */}
              <div className="flex items-center justify-between">
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                    isToday
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : cell.isCurrentMonth
                      ? "text-slate-800 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-600"
                  }`}
                >
                  {cell.day}
                </span>
                {dateEvents.length > 0 && (
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    {dateEvents.length} {dateEvents.length === 1 ? "event" : "events"}
                  </span>
                )}
              </div>

              {/* Day event list */}
              <div className="mt-2 space-y-1 flex-1 overflow-y-auto max-h-[80px]">
                {dateEvents.map((ev) => (
                  <button
                    key={ev._id}
                    onClick={() => onEventClick(ev)}
                    className={`w-full text-left rounded px-2 py-0.5 border text-[10px] font-semibold truncate block transition hover:scale-[1.02] cursor-pointer ${getCategoryStyles(
                      ev.category
                    )}`}
                  >
                    {ev.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
