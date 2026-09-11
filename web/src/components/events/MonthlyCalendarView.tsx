import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Trophy,
  Lightbulb,
  X
} from "lucide-react";
import type { CampusEvent } from "./EventCard";

interface MonthlyCalendarViewProps {
  events: CampusEvent[];
  onSelectEvent: (event: CampusEvent) => void;
}

export function MonthlyCalendarView({
  events,
  onSelectEvent
}: MonthlyCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(8); // Sept (0-indexed = 8)
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    if (events.length > 0) {
      const match = events[0].dateStr.match(/\b(\d{1,2})\b/);
      if (match) return parseInt(match[1], 10);
    }
    return 10;
  });

  const daysInMonth = 30; // Sept 2026
  const startDayOffset = 2; // Tuesday start (0: Sun, 1: Mon, 2: Tue...)
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Dynamically map user events to day numbers
  const eventsByDay = useMemo(() => {
    const map: Record<number, CampusEvent[]> = {};
    events.forEach((ev) => {
      const match = ev.dateStr.match(/\b(\d{1,2})\b/);
      if (match) {
        const day = parseInt(match[1], 10);
        if (day >= 1 && day <= daysInMonth) {
          if (!map[day]) map[day] = [];
          map[day].push(ev);
        }
      }
    });
    return map;
  }, [events, daysInMonth]);

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const selectedDayEvents = selectedDay ? eventsByDay[selectedDay] || [] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* ── Main Calendar Grid (8 cols) ───────────────────────────────── */}
      <div className="lg:col-span-8 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/85 backdrop-blur-xl shadow-md">
        
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/80 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-[#1E90FF]" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              {monthNames[currentMonth]} {currentYear}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Day Name Headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Empty offset cells */}
          {Array.from({ length: startDayOffset }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-20 sm:h-24 rounded-2xl bg-transparent" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayEvents = eventsByDay[dayNum] || [];
            const isSelected = selectedDay === dayNum;

            return (
              <motion.div
                key={`day-${dayNum}`}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedDay(dayNum)}
                className={`h-20 sm:h-24 p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-[#1E90FF] bg-[#1E90FF]/10 dark:bg-[#1E90FF]/20 shadow-md shadow-[#1E90FF]/15"
                    : "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#080D1A]/50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      isSelected
                        ? "text-[#1E90FF]"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {dayNum}
                  </span>

                  {dayEvents.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1E90FF] animate-pulse" />
                  )}
                </div>

                {/* Event previews in cell */}
                <div className="space-y-1 overflow-hidden">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate bg-[#1E90FF]/15 text-[#1E90FF] dark:text-[#1E90FF] border border-[#1E90FF]/25"
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>

      {/* ── Selected Day Schedule Details (4 cols) ────────────────────── */}
      <div className="lg:col-span-4 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/70 dark:border-slate-800/60">
            <div>
              <span className="text-[10px] text-slate-400">Selected Date</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                September {selectedDay || 10}, {currentYear}
              </h4>
            </div>
            <span className="text-xs font-bold tabular-nums text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded-lg">
              {selectedDayEvents.length} scheduled
            </span>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No campus events or deadlines scheduled for this date.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50 dark:bg-[#080D1A] space-y-2"
                >
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      ev.category === "deadlines"
                        ? ev.isUrgent
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : "bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/25"
                    }`}
                  >
                    {ev.category.toUpperCase()}
                  </span>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {ev.title}
                  </h5>
                  <div className="text-[11px] text-slate-400 tabular-nums space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} />
                      <span>{ev.timeStr}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} />
                      <span>{ev.venue}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default MonthlyCalendarView;
