import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Plus,
  Search,
  Trash2,
  Trophy,
  Clock,
  Lightbulb,
  CheckSquare,
  Users,
  MapPin,
  Sparkles,
  Loader2,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { eventsApi, type BackendEvent, type CreateEventPayload } from "../../../api/events.api";
import { CreateEventModal } from "../../events/CreateEventModal";
import { ConfirmationDialog } from "../../confirmation-dialog";
import { useToastStore } from "../../../store/toast.store";
import { getOrganizerName } from "../../../types/event";

export function EventsGovernanceTab() {
  const { addToast } = useToastStore();
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<BackendEvent | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eventsApi.list({ approvalStatus: "all" });
      setEvents(data);
    } catch {
      addToast("Failed to load campus events.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleApproveEvent = async (eventId: string) => {
    try {
      const updated = await eventsApi.approve(eventId);
      setEvents((prev) => prev.map((e) => (e._id === eventId ? updated : e)));
      addToast("Event approved and published to Campus Events.", "success");
    } catch {
      addToast("Failed to approve event.", "error");
    }
  };

  const handleRejectEvent = async (eventId: string) => {
    try {
      const updated = await eventsApi.reject(eventId);
      setEvents((prev) => prev.map((e) => (e._id === eventId ? updated : e)));
      addToast("Event rejected.", "info");
    } catch {
      addToast("Failed to reject event.", "error");
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedCategory !== "all" && ev.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchOrg = getOrganizerName(ev.organizer).toLowerCase().includes(q);
        const matchDept = ev.department.toLowerCase().includes(q);
        const matchTags = ev.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchOrg && !matchDept && !matchTags) return false;
      }
      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  const kpis = useMemo(() => {
    const hackathons = events.filter((e) => e.category === "hackathons").length;
    const deadlines = events.filter((e) => e.category === "deadlines").length;
    const workshops = events.filter((e) => e.category === "workshops").length;
    const totalAttendees = events.reduce((acc, e) => acc + (e.attendeesCount || 0), 0);
    const pendingCount = events.filter((e) => (e.approvalStatus || "PENDING") === "PENDING").length;
    return { hackathons, deadlines, workshops, totalAttendees, total: events.length, pendingCount };
  }, [events]);

  const handleCreateEvent = async (payload: CreateEventPayload) => {
    const created = await eventsApi.create(payload);
    setEvents((prev) => [created, ...prev]);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await eventsApi.delete(eventToDelete._id);
      setEvents((prev) => prev.filter((e) => e._id !== eventToDelete._id));
      addToast(`Deleted event "${eventToDelete.title}".`, "info");
    } catch {
      addToast("Failed to delete event.", "error");
    } finally {
      setEventToDelete(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "hackathons":
        return <Trophy size={14} className="text-[#1E90FF]" />;
      case "deadlines":
        return <Clock size={14} className="text-rose-500" />;
      case "workshops":
        return <Lightbulb size={14} className="text-amber-500" />;
      default:
        return <CheckSquare size={14} className="text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & KPI Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">
            Published Campus Events & Academic Calendars
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time university events published to MongoDB Atlas across student and faculty accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadEvents}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#1E90FF] transition-colors"
            title="Refresh events"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Publish Institutional Event</span>
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Published</span>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-1 tabular-nums">
            {kpis.total}
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80">
          <span className="text-[10px] uppercase font-bold text-amber-500">Pending Review</span>
          <p className="text-2xl font-black text-amber-500 mt-1 tabular-nums">
            {kpis.pendingCount}
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80">
          <span className="text-[10px] uppercase font-bold text-[#1E90FF]">Hackathons</span>
          <p className="text-2xl font-black text-[#1E90FF] mt-1 tabular-nums">
            {kpis.hackathons}
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80">
          <span className="text-[10px] uppercase font-bold text-emerald-500">Total RSVPs</span>
          <p className="text-2xl font-black text-emerald-500 mt-1 tabular-nums">
            {kpis.totalAttendees}
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search events, organizers, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-[#1E90FF] transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1">
          {["all", "hackathons", "deadlines", "workshops", "reviews"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#1E90FF] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-[#162544]/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Events Table / List ───────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80">
          <Loader2 className="size-8 animate-spin text-[#1E90FF] mb-3" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Fetching events registry...
          </p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
          <Calendar size={32} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">No events found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No events match your search query."
              : "No campus events have been created yet. Click above to publish one."}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0F1A30]/90 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#162544]/30 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Event</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Schedule</th>
                  <th className="px-5 py-3.5">Venue</th>
                  <th className="px-5 py-3.5">RSVPs</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredEvents.map((ev) => {
                  const creator = typeof ev.createdBy === "object" ? ev.createdBy : null;
                  const status = ev.approvalStatus || "APPROVED";
                  return (
                    <tr key={ev._id} className="hover:bg-slate-50/50 dark:hover:bg-[#162544]/20 transition-colors">
                      <td className="px-5 py-4 max-w-xs">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate" title={ev.title}>
                          {ev.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          By {getOrganizerName(ev.organizer)} {creator ? `(${creator.fullName || (creator as any).name || ""})` : ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            PENDING
                          </span>
                        )}
                        {status === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            APPROVED
                          </span>
                        )}
                        {status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            REJECTED
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-[10px] font-bold capitalize">
                          {getCategoryIcon(ev.category)}
                          <span>{ev.category}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {ev.department}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{ev.dateStr}</p>
                        <p className="text-[10px] text-slate-400">{ev.timeStr}</p>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{ev.venue}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                          <Users size={12} className="text-[#1E90FF]" />
                          <span>{ev.attendeesCount}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveEvent(ev._id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                                title="Approve Event"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectEvent(ev._id)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                                title="Reject Event"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setEventToDelete(ev)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete / Moderate Event"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Event Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {createModalOpen && (
          <CreateEventModal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onCreateEvent={handleCreateEvent}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Dialog ────────────────────────────────── */}
      {eventToDelete && (
        <ConfirmationDialog
          isOpen={Boolean(eventToDelete)}
          title="Delete Campus Event?"
          message={`Are you sure you want to delete "${eventToDelete.title}"? This will permanently remove the event and cancel all student registrations.`}
          confirmText="Delete Event"
          isDestructive
          onConfirm={confirmDelete}
          onCancel={() => setEventToDelete(null)}
        />
      )}
    </div>
  );
}

export default EventsGovernanceTab;
