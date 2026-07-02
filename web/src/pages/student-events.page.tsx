import { Calendar as CalendarIcon, List, Grid, Search, Filter, Plus, Users, MapPin, Clock, Award, ChevronLeft, ChevronRight, X, Download, CalendarCheck, Share2, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { useEventStore } from "../store/event.store";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { Avatar } from "../components/avatar";
import type { Event, EventCategory } from "../types/event";

const CATEGORIES: EventCategory[] = ["Workshop", "Seminar", "Hackathon", "Cultural", "Sports", "Webinar", "Other"];

export function StudentEventsPage() {
  const user = useAuthStore((state) => state.user)!;
  const { addToast } = useToastStore();
  const { events, registerForEvent, cancelRegistration } = useEventStore();

  const [activeTab, setActiveTab] = useState<"upcoming" | "registered" | "past" | "recommended">("upcoming");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | "">("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Pre-set to July 2026 for mock events

  // Filter events based on active tab
  const tabFilteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (e.approvalStatus !== "APPROVED" && e.status !== "COMPLETED") return false;

      if (activeTab === "registered") {
        return e.registeredUsers?.some((u) => u.rollNumber === user.rollNumber);
      }
      if (activeTab === "past") {
        return e.status === "COMPLETED";
      }
      if (activeTab === "recommended") {
        return e.department === user.department && e.status !== "COMPLETED";
      }
      // default: upcoming/ongoing
      return e.status === "UPCOMING" || e.status === "ONGOING";
    });
  }, [events, activeTab, user]);

  // Apply search query and category filters
  const finalFilteredEvents = useMemo(() => {
    return tabFilteredEvents.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.organizer.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !categoryFilter || e.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [tabFilteredEvents, searchQuery, categoryFilter]);

  // Handle Event Registration
  const handleRegister = (event: Event) => {
    const isAlreadyRegistered = event.registeredUsers?.some((u) => u.rollNumber === user.rollNumber);
    if (isAlreadyRegistered) return;

    if (event.currentRegistrations >= event.maxParticipants) {
      addToast("This event has reached full capacity.", "error");
      return;
    }

    registerForEvent(event._id, {
      id: `part-${Date.now()}`,
      fullName: user.fullName,
      email: user.email,
      rollNumber: user.rollNumber,
      registrationDate: new Date().toISOString().split("T")[0],
      checkedIn: false
    });

    addToast(`Successfully registered for ${event.title}!`, "success");
    // Sync modal/drawer view
    const updatedEvent = events.find(e => e._id === event._id);
    if (updatedEvent) setSelectedEvent(updatedEvent);
  };

  const handleCancelRegistration = (event: Event) => {
    cancelRegistration(event._id, user.rollNumber);
    addToast(`Registration cancelled for ${event.title}.`, "info");
    
    // Sync modal/drawer view
    const updatedEvent = events.find(e => e._id === event._id);
    if (updatedEvent) setSelectedEvent(updatedEvent);
  };

  // Add to Calendar ICS download
  const handleAddToCalendar = (event: Event) => {
    try {
      const dateStr = event.date.replace(/-/g, "");
      const timeStr = event.time.replace(/:/g, "") + "00";
      
      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
        `LOCATION:${event.venue}`,
        `DTSTART:${dateStr}T${timeStr}`,
        `DTEND:${dateStr}T${(parseInt(timeStr.slice(0, 2)) + 2).toString().padStart(2, "0")}0000`, // Assume 2-hour duration
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n");

      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${event.title.replace(/\s+/g, "_")}.ics`;
      link.click();
      URL.revokeObjectURL(url);
      
      addToast("Event calendar invite downloaded!", "success");
    } catch (err) {
      addToast("Could not download calendar invite.", "error");
    }
  };

  // Calendar Helpers
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days: Date[] = [];
    
    // Fill leading empty slots
    const dayOfWeek = date.getDay();
    for (let i = 0; i < dayOfWeek; i++) {
      days.push(new Date(year, month, -i));
    }
    days.reverse();

    // Fill days of the month
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <div className="animate-fade-up space-y-8">
      {/* Header section */}
      <header className="flex flex-col justify-between gap-5 pb-5 md:flex-row md:items-end border-b border-slate-200 dark:border-white/5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Student Events
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white sm:text-5xl">
            Campus Event Catalog.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Discover workshops, college technical seminars, coding hackathons, cultural festivals, and webinars.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex rounded-2xl bg-white border border-slate-250 p-1 shadow-sm dark:border-white/5 dark:bg-ink-900">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              viewMode === "list"
                ? "bg-slate-950 text-white dark:bg-white dark:text-ink-950"
                : "text-slate-550 dark:text-slate-400"
            }`}
          >
            <List size={14} />
            List
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              viewMode === "calendar"
                ? "bg-slate-950 text-white dark:bg-white dark:text-ink-950"
                : "text-slate-550 dark:text-slate-400"
            }`}
          >
            <CalendarIcon size={14} />
            Calendar
          </button>
        </div>
      </header>

      {/* Tabs Row */}
      <div className="flex border-b border-slate-200 dark:border-white/5 pb-px">
        {(["upcoming", "registered", "recommended", "past"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 cursor-pointer text-center ${
              activeTab === tab
                ? "border-indigo-600 text-indigo-750 dark:border-indigo-500 dark:text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            {tab} Events
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="field pl-9 text-xs py-2 bg-white dark:bg-ink-900"
            placeholder="Search events by title, organizer, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as EventCategory)}
          className="rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-ink-900 dark:text-white w-full sm:w-44"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {finalFilteredEvents.map((evt) => {
            const isRegistered = evt.registeredUsers?.some((u) => u.rollNumber === user.rollNumber);
            const remainingSeats = evt.maxParticipants - evt.currentRegistrations;
            const isClosed = new Date(evt.registrationDeadline).getTime() < Date.now();

            return (
              <div
                key={evt._id}
                onClick={() => setSelectedEvent(evt)}
                className="group relative rounded-3xl border border-slate-200 bg-white overflow-hidden p-4 shadow-sm hover:shadow-lg dark:border-white/5 dark:bg-ink-900 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Banner Image */}
                  <div className="h-36 overflow-hidden rounded-2xl bg-slate-950 relative">
                    {evt.bannerImage ? (
                      <img src={evt.bannerImage} alt="" className="size-full object-cover opacity-85 group-hover:scale-102 transition-transform duration-300" />
                    ) : (
                      <div className="size-full bg-[linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)]" />
                    )}
                    <span className="absolute top-3 left-3 rounded-lg bg-white/20 border border-white/10 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      {evt.category}
                    </span>
                    {isRegistered && (
                      <span className="absolute top-3 right-3 rounded-lg bg-emerald-500 border border-emerald-450 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        Registered
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="mt-4 space-y-2">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{evt.organizer}</span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed min-h-8">
                      {evt.description}
                    </p>
                  </div>
                </div>

                {/* Footer Info details */}
                <div className="mt-5 border-t border-slate-100 dark:border-white/5 pt-3 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-405 font-medium">
                    <span className="flex items-center gap-1"><CalendarIcon size={12} /> {new Date(evt.date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {evt.venue}</span>
                  </div>
                  
                  {/* Seats progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Seat Occupancy</span>
                      <span>{evt.currentRegistrations}/{evt.maxParticipants}</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 dark:bg-indigo-500"
                        style={{ width: `${(evt.currentRegistrations / evt.maxParticipants) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {finalFilteredEvents.length === 0 && (
            <div className="py-20 text-center border border-dashed border-slate-200 dark:border-white/5 rounded-3xl bg-white dark:bg-ink-900 md:col-span-3">
              <CalendarIcon size={36} className="mx-auto text-slate-350 dark:text-slate-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No events found</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === "calendar" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-850 dark:text-slate-200 uppercase tracking-wider">
              {currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-1.5">
              <button onClick={handlePrevMonth} className="icon-button size-8"><ChevronLeft size={16} /></button>
              <button onClick={handleNextMonth} className="icon-button size-8"><ChevronRight size={16} /></button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="bg-slate-50/50 dark:bg-black/10 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
            {daysInMonth.map((day, idx) => {
              const formattedDate = `${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, "0")}-${day.getDate().toString().padStart(2, "0")}`;
              const dayEvents = events.filter((e) => e.date === formattedDate && e.approvalStatus === "APPROVED");
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();

              return (
                <div
                  key={idx}
                  className={`min-h-24 bg-white dark:bg-ink-900 p-2 border-t border-slate-100 dark:border-white/5 flex flex-col justify-between ${
                    isCurrentMonth ? "" : "opacity-35"
                  }`}
                >
                  <span className="text-xs font-bold text-slate-400">{day.getDate()}</span>
                  <div className="space-y-1 mt-1.5">
                    {dayEvents.map((evt) => (
                      <button
                        key={evt._id}
                        onClick={() => setSelectedEvent(evt)}
                        className="w-full text-left rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2 py-1 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/5 cursor-pointer block truncate"
                      >
                        <span className="text-[9px] font-bold text-indigo-750 dark:text-indigo-400 block truncate">{evt.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EVENT DETAILS OVERLAY DRAWER */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/20 backdrop-blur-[2px]">
          <div className="fixed inset-0" onClick={() => setSelectedEvent(null)} />
          
          <div className="relative w-full max-w-lg bg-white shadow-2xl dark:bg-ink-900 border-l border-slate-200 dark:border-white/5 h-full overflow-y-auto flex flex-col justify-between animate-slide-in">
            
            {/* Upper Section */}
            <div>
              {/* Banner with close */}
              <div className="h-48 overflow-hidden bg-slate-950 relative">
                {selectedEvent.bannerImage ? (
                  <img src={selectedEvent.bannerImage} alt="" className="size-full object-cover opacity-85" />
                ) : (
                  <div className="size-full bg-[linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)]" />
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="absolute right-4 top-4 rounded-full bg-black/20 p-2 text-white hover:bg-black/40 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer content */}
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-750 dark:bg-white/5 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/5">
                      {selectedEvent.category}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:bg-white/5 dark:text-slate-400">
                      {selectedEvent.department}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{selectedEvent.title}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Organized by <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedEvent.organizer}</span></p>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-black/15 border border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <CalendarIcon size={16} className="text-indigo-650 dark:text-indigo-400" />
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Date & Time</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedEvent.date} · {selectedEvent.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={16} className="text-indigo-650 dark:text-indigo-400" />
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Venue Location</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block max-w-[160px]">{selectedEvent.venue}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-indigo-650 dark:text-indigo-400" />
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Seat Availability</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedEvent.maxParticipants - selectedEvent.currentRegistrations} seats left</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-indigo-650 dark:text-indigo-400" />
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Register Deadline</span>
                      <span className="text-xs font-bold text-slate-850 dark:text-slate-300">{selectedEvent.registrationDeadline}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">About the Event</h3>
                  <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-350">{selectedEvent.description}</p>
                </div>

                {/* Schedule Timeline */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Event Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex gap-3 relative">
                      <div className="flex flex-col items-center shrink-0">
                        <span className="z-10 flex size-2 items-center justify-center rounded-full bg-indigo-600 dark:bg-indigo-400" />
                        <span className="absolute bottom-0 top-2 w-0.5 bg-slate-100 dark:bg-slate-800 h-8" />
                      </div>
                      <div className="text-xs leading-none">
                        <span className="font-bold text-slate-800 dark:text-slate-250">{selectedEvent.time}</span>
                        <span className="text-slate-450 ml-3">Opening Ceremony & Welcome Address</span>
                      </div>
                    </div>
                    <div className="flex gap-3 relative">
                      <div className="flex flex-col items-center shrink-0">
                        <span className="z-10 flex size-2 items-center justify-center rounded-full bg-indigo-600 dark:bg-indigo-400" />
                      </div>
                      <div className="text-xs leading-none">
                        <span className="font-bold text-slate-800 dark:text-slate-250">{(parseInt(selectedEvent.time.split(":")[0]) + 1).toString().padStart(2, "0")}:00</span>
                        <span className="text-slate-455 ml-3">Technical Presentation & Workshops</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                {selectedEvent.attachments && selectedEvent.attachments.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Resource Attachments</h3>
                    <div className="space-y-1.5">
                      {selectedEvent.attachments.map((attach, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-xl bg-slate-50 border p-3 dark:bg-black/15 dark:border-white/5 text-xs text-slate-705">
                          <span className="truncate flex-1 font-semibold dark:text-slate-350">{attach.name}</span>
                          <button className="flex size-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/5 text-slate-550 hover:bg-slate-100 cursor-pointer">
                            <Download size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Footer actions bar */}
            <div className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-ink-950 flex gap-3">
              <button
                onClick={() => handleAddToCalendar(selectedEvent)}
                className="secondary-button text-xs py-2 px-4 flex-1 flex items-center justify-center gap-1.5"
              >
                <CalendarCheck size={14} />
                Add to Calendar
              </button>

              {selectedEvent.registeredUsers?.some((u) => u.rollNumber === user.rollNumber) ? (
                <button
                  onClick={() => handleCancelRegistration(selectedEvent)}
                  className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100/60 py-2 px-4 text-xs font-bold text-red-600 flex-1 cursor-pointer shadow-sm text-center"
                >
                  Cancel Registration
                </button>
              ) : (
                <button
                  onClick={() => handleRegister(selectedEvent)}
                  disabled={selectedEvent.currentRegistrations >= selectedEvent.maxParticipants}
                  className="primary-button text-xs py-2 px-4 flex-1 flex items-center justify-center"
                >
                  Register Now
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
