import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CalendarPlus,
  LayoutGrid,
  CalendarDays,
  Sparkles,
  Trophy,
  Clock,
  Lightbulb,
  Search,
  RotateCcw
} from "lucide-react";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { EventsFilterBar, eventDepartments } from "../components/events/EventsFilterBar";
import { EventCard, type CampusEvent } from "../components/events/EventCard";
import { MonthlyCalendarView } from "../components/events/MonthlyCalendarView";
import { CreateEventModal } from "../components/events/CreateEventModal";

// ── LocalStorage Key & State Loader ──────────────────────────────────────────

const EVENTS_STORAGE_KEY = "studyconnect_campus_events";

function loadSavedEvents(): CampusEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function EventsPage() {
  const [events, setEvents] = useState<CampusEvent[]>(loadSavedEvents);
  const [viewMode, setViewMode] = useState<"feed" | "calendar">("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");
  const [selectedDept, setSelectedDept] = useState(eventDepartments[0]);
  const [myRsvpsOnly, setMyRsvpsOnly] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Sync helper
  const updateEvents = (newEventsOrFn: CampusEvent[] | ((prev: CampusEvent[]) => CampusEvent[])) => {
    setEvents((prev) => {
      const next = typeof newEventsOrFn === "function" ? newEventsOrFn(prev) : newEventsOrFn;
      try {
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // ── Dynamic KPI Calculations ──────────────────────────────────────────────
  const activeDeadlinesCount = useMemo(
    () => events.filter((e) => e.category === "deadlines").length,
    [events]
  );
  const hackathonsCount = useMemo(
    () => events.filter((e) => e.category === "hackathons").length,
    [events]
  );
  const workshopsCount = useMemo(
    () => events.filter((e) => e.category === "workshops").length,
    [events]
  );

  // ── Filter Logic ──────────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // RSVP Filter
      if (myRsvpsOnly && !ev.isRegistered) return false;

      // Category Filter
      if (selectedCategory !== "all" && ev.category !== selectedCategory) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchOrg = ev.organizer.toLowerCase().includes(q);
        const matchTags = ev.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchOrg && !matchTags) return false;
      }

      return true;
    });
  }, [events, myRsvpsOnly, selectedCategory, searchQuery]);

  const handleToggleRsvp = (eventId: string) => {
    updateEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              isRegistered: !e.isRegistered,
              attendeesCount: e.isRegistered ? Math.max(0, e.attendeesCount - 1) : e.attendeesCount + 1
            }
          : e
      )
    );
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedTimeframe("all");
    setSelectedDept(eventDepartments[0]);
    setMyRsvpsOnly(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      
      {/* ── 1. Workspace Sidebar ───────────────────────────────────────── */}
      <DashboardSidebar />

      {/* ── 2. Scrollable Events Stream ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* ── Page Header & Action Controls ─────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#1E90FF]/30 bg-[#1E90FF]/10 px-3 py-1 text-xs font-bold text-[#1E90FF] mb-2">
                <Sparkles size={12} />
                <span>Synchronized Campus Schedules</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                Campus Events & Academic Deadlines
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                Institutional hackathons, lab review schedules, guest symposiums, and exam countdowns.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center shrink-0">
              {/* Submit Event Trigger */}
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#1E90FF]/25 hover:shadow-[#1E90FF]/35 transition-all cursor-pointer"
              >
                <CalendarPlus size={15} />
                <span>Submit Event</span>
              </motion.button>
            </div>
          </div>

          {/* ── KPI Row & View Switcher ───────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* KPI Badges */}
            <div className="grid grid-cols-3 gap-3 flex-1 max-w-xl">
              <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Upcoming Deadlines</span>
                <div className="text-base font-extrabold text-rose-500 flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>{activeDeadlinesCount} Active</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Hackathons</span>
                <div className="text-base font-extrabold text-[#1E90FF] mt-0.5">
                  {hackathonsCount} Available
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Workshops</span>
                <div className="text-base font-extrabold text-[#1E90FF] mt-0.5">
                  {workshopsCount} Scheduled
                </div>
              </div>
            </div>

            {/* View Mode Switcher (Feed vs Calendar) */}
            <div className="flex items-center gap-1 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setViewMode("feed")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "feed"
                    ? "bg-[#1E90FF] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <LayoutGrid size={13} />
                <span>Feed View</span>
              </button>

              <button
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "calendar"
                    ? "bg-[#1E90FF] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CalendarDays size={13} />
                <span>Monthly Calendar</span>
              </button>
            </div>

          </div>

          {/* ── Faceted Filter Toolbar ────────────────────────────────── */}
          <EventsFilterBar
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedTimeframe={selectedTimeframe}
            onSelectTimeframe={setSelectedTimeframe}
            selectedDept={selectedDept}
            onSelectDept={setSelectedDept}
            myRsvpsOnly={myRsvpsOnly}
            onToggleMyRsvps={() => setMyRsvpsOnly(!myRsvpsOnly)}
          />

          {/* ── Main View Renderer: Feed vs Monthly Calendar ───────────── */}
          {viewMode === "feed" ? (
            events.length === 0 ? (
              /* Dedicated Zero Events Empty State */
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 p-12 text-center backdrop-blur-xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 mb-3">
                  <Calendar size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                  No Campus Events or Deadlines Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
                  Submit your first hackathon, lab deadline, workshop, or peer review to build your synchronized campus schedule.
                </p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-xs font-bold text-white shadow-md shadow-[#1E90FF]/25 transition-all cursor-pointer"
                >
                  <CalendarPlus size={15} />
                  <span>Submit First Event</span>
                </button>
              </div>
            ) : filteredEvents.length === 0 ? (
              /* Filter No-Match State */
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 p-12 text-center backdrop-blur-xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 mb-3">
                  <Calendar size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                  No matching events or deadlines found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
                  Try clearing your search terms or toggling other category filters.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#162544] text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1E90FF] transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                {filteredEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onToggleRsvp={handleToggleRsvp}
                  />
                ))}
              </motion.div>
            )
          ) : (
            /* Monthly Calendar View */
            <MonthlyCalendarView
              events={events}
              onSelectEvent={() => {}}
            />
          )}

        </main>
      </div>

      {/* ── Submit Event Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {createModalOpen && (
          <CreateEventModal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onCreateEvent={(newEv) => updateEvents((prev) => [newEv, ...prev])}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default EventsPage;
