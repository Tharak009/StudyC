import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  RotateCcw,
  Loader2
} from "lucide-react";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { EventsFilterBar, eventDepartments } from "../components/events/EventsFilterBar";
import { EventCard, type CampusEvent } from "../components/events/EventCard";
import { MonthlyCalendarView } from "../components/events/MonthlyCalendarView";
import { CreateEventModal } from "../components/events/CreateEventModal";
import { eventsApi, type BackendEvent, type CreateEventPayload } from "../api/events.api";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";

function mapBackendToCampusEvent(b: BackendEvent, currentUserId?: string): CampusEvent {
  const creator = typeof b.createdBy === "object" ? b.createdBy : null;
  const initials = creator?.fullName
    ? creator.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "EV";

  const isRegistered = Array.isArray(b.attendees)
    ? b.attendees.some((a) => (typeof a === "object" ? a._id === currentUserId : a === currentUserId))
    : false;

  return {
    id: b._id,
    _id: b._id,
    title: b.title,
    category: b.category,
    organizer: b.organizer,
    dateStr: b.dateStr,
    timeStr: b.timeStr,
    venue: b.venue,
    isVirtual: b.isVirtual,
    description: b.description,
    tags: b.tags || [],
    attendeesCount: b.attendeesCount || 1,
    batchAttendeesCount: b.attendeesCount || 1,
    attendeeInitials: [initials],
    daysLeft: "Upcoming",
    isUrgent: b.category === "deadlines",
    isRegistered,
    department: b.department,
    createdBy: b.createdBy
  };
}

export function EventsPage() {
  const currentUser = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"feed" | "calendar">("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");
  const [selectedDept, setSelectedDept] = useState(eventDepartments[0]);
  const [myRsvpsOnly, setMyRsvpsOnly] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Load events from backend
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eventsApi.list();
      setEvents(data.map((item) => mapBackendToCampusEvent(item, currentUser?._id)));
    } catch {
      addToast("Unable to fetch campus events from server.", "error");
    } finally {
      setLoading(false);
    }
  }, [currentUser?._id, addToast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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

  const handleToggleRsvp = async (eventId: string) => {
    try {
      const res = await eventsApi.toggleRsvp(eventId);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                isRegistered: res.isRegistered,
                attendeesCount: res.event.attendeesCount
              }
            : e
        )
      );
    } catch {
      addToast("Failed to update RSVP status.", "error");
    }
  };

  const handleCreateEvent = async (payload: CreateEventPayload) => {
    const created = await eventsApi.create(payload);
    const mapped = mapBackendToCampusEvent(created, currentUser?._id);
    setEvents((prev) => [mapped, ...prev]);
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await eventsApi.delete(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      addToast("Event deleted successfully.", "info");
    } catch {
      addToast("Failed to delete event.", "error");
    }
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
                Institutional hackathons, lab review schedules, guest symposiums, and exam countdowns stored in real-time across the university.
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
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80">
              <Loader2 className="size-8 animate-spin text-[#1E90FF] mb-3" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Loading campus events and deadlines...
              </p>
            </div>
          ) : viewMode === "feed" ? (
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
                {filteredEvents.map((ev) => {
                  const creatorId = typeof ev.createdBy === "object" ? ev.createdBy?._id : ev.createdBy;
                  const canDelete = Boolean(
                    currentUser?.role === "ADMIN" ||
                    currentUser?.role === "MODERATOR" ||
                    (currentUser?._id && creatorId === currentUser._id)
                  );

                  return (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      onToggleRsvp={handleToggleRsvp}
                      onDelete={handleDeleteEvent}
                      canDelete={canDelete}
                    />
                  );
                })}
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
            onCreateEvent={handleCreateEvent}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default EventsPage;
