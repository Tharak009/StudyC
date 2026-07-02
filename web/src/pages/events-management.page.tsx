import { useState } from "react";
import { useToastStore } from "../store/toast.store";
import { useEventStore } from "../store/event.store";
import { EventTable } from "../components/event-table";
import { CalendarView } from "../components/calendar-view";
import { EventDetailsDrawer } from "../components/event-details-drawer";
import { EventFormModal } from "../components/event-form-modal";
import { ConfirmationDialog } from "../components/confirmation-dialog";
import { DashboardCard } from "../components/dashboard-card";
import { Button } from "../components/button";
import {
  Calendar,
  Grid,
  List,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck,
  Users,
} from "lucide-react";
import type { Event, EventStatus, ApprovalStatus, EventCategory, Participant } from "../types/event";

// Pre-seeded mock participants list
const MOCK_PARTICIPANTS: Participant[] = [
  { id: "p1", fullName: "Aarav Sharma", email: "aarav@college.edu", rollNumber: "CS-2023-01", registrationDate: "2026-06-15", checkedIn: true },
  { id: "p2", fullName: "Meera Patel", email: "meera@college.edu", rollNumber: "IT-2023-08", registrationDate: "2026-06-16", checkedIn: true },
  { id: "p3", fullName: "Kabir Mehta", email: "kabir@college.edu", rollNumber: "ME-2024-12", registrationDate: "2026-06-17", checkedIn: false },
  { id: "p4", fullName: "Dia Reddy", email: "dia@college.edu", rollNumber: "EC-2023-22", registrationDate: "2026-06-18", checkedIn: true },
  { id: "p5", fullName: "Aryan Goel", email: "aryan@college.edu", rollNumber: "CS-2023-14", registrationDate: "2026-06-19", checkedIn: false },
];

const INITIAL_EVENTS: Event[] = [
  {
    _id: "evt-001",
    title: "National Coding Challenge 2026",
    description: "Compete with top coders across the nation to solve complex algorithm challenges in 24 hours.",
    category: "Hackathon",
    department: "Computer Science",
    organizer: "Coding Club",
    venue: "Main Auditorium",
    date: "2026-07-10",
    time: "09:00",
    registrationDeadline: "2026-07-08",
    maxParticipants: 200,
    currentRegistrations: 5,
    status: "UPCOMING",
    approvalStatus: "APPROVED",
    bannerImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=60",
    attachments: [{ name: "Hackathon Guidelines.pdf", url: "#" }],
    createdAt: "2026-06-10T10:00:00Z",
    updatedAt: "2026-06-10T12:00:00Z",
    registeredUsers: [...MOCK_PARTICIPANTS],
  },
  {
    _id: "evt-002",
    title: "AI & ML Technical Seminar",
    description: "Explore the frontiers of deep learning, generative models, and computer vision with research experts.",
    category: "Seminar",
    department: "Information Technology",
    organizer: "AI Synergy Club",
    venue: "Seminar Hall B",
    date: "2026-06-30",
    time: "14:00",
    registrationDeadline: "2026-06-28",
    maxParticipants: 120,
    currentRegistrations: 4,
    status: "ONGOING",
    approvalStatus: "APPROVED",
    bannerImage: "https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=600&auto=format&fit=crop&q=60",
    createdAt: "2026-06-12T09:00:00Z",
    updatedAt: "2026-06-12T09:00:00Z",
    registeredUsers: [...MOCK_PARTICIPANTS].slice(0, 4),
  },
  {
    _id: "evt-003",
    title: "React Web Dev Masterclass",
    description: "A hands-on workshop on Next.js 15, Server Actions, state management, and modern component frameworks.",
    category: "Workshop",
    department: "Computer Science",
    organizer: "Web Developers Guild",
    venue: "Lab 4, CS Block",
    date: "2026-07-05",
    time: "10:30",
    registrationDeadline: "2026-07-03",
    maxParticipants: 50,
    currentRegistrations: 3,
    status: "UPCOMING",
    approvalStatus: "APPROVED",
    bannerImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=60",
    createdAt: "2026-06-15T14:00:00Z",
    updatedAt: "2026-06-15T15:30:00Z",
    registeredUsers: [...MOCK_PARTICIPANTS].slice(0, 3),
  },
  {
    _id: "evt-004",
    title: "Student Project Exhibition",
    description: "Showcase of multidisciplinary engineering innovations and capstone projects developed by senior students.",
    category: "Other",
    department: "Multidisciplinary",
    organizer: "Student Council",
    venue: "Campus Exhibition Center",
    date: "2026-06-20",
    time: "10:00",
    registrationDeadline: "2026-06-18",
    maxParticipants: 300,
    currentRegistrations: 5,
    status: "COMPLETED",
    approvalStatus: "APPROVED",
    createdAt: "2026-05-20T08:00:00Z",
    updatedAt: "2026-06-20T17:00:00Z",
    registeredUsers: [...MOCK_PARTICIPANTS],
  },
  {
    _id: "evt-005",
    title: "CyberSecurity Capture The Flag",
    description: "Jeopardy-style CTF challenge focusing on web exploitation, cryptography, reverse engineering, and forensics.",
    category: "Hackathon",
    department: "Electronics Engineering",
    organizer: "HackerSec Club",
    venue: "Online CTF Portal",
    date: "2026-07-15",
    time: "12:00",
    registrationDeadline: "2026-07-14",
    maxParticipants: 500,
    currentRegistrations: 2,
    status: "UPCOMING",
    approvalStatus: "PENDING",
    bannerImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=60",
    createdAt: "2026-06-18T10:00:00Z",
    updatedAt: "2026-06-18T10:00:00Z",
    registeredUsers: [...MOCK_PARTICIPANTS].slice(0, 2),
  },
];

export function EventsManagementPage() {
  const { addToast } = useToastStore();
  const { events, setEvents } = useEventStore();
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

  // Filtering states
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedApproval, setSelectedApproval] = useState("");
  const [selectedOrganizer, setSelectedOrganizer] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Dialog & drawer state handlers
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "cancel" | "publish" | "approve" | "reject";
    event: Event;
  } | null>(null);

  // Apply searching and filtering locally
  let filteredEvents = events.filter((ev) => {
    // Search matching
    const q = search.toLowerCase();
    const matchesSearch =
      ev.title.toLowerCase().includes(q) ||
      ev.organizer.toLowerCase().includes(q) ||
      ev.department.toLowerCase().includes(q) ||
      ev.venue.toLowerCase().includes(q) ||
      ev._id.toLowerCase().includes(q);

    // Filters matching
    const matchesDept = !selectedDept || ev.department === selectedDept;
    const matchesCategory = !selectedCategory || ev.category === selectedCategory;
    const matchesStatus = !selectedStatus || ev.status === selectedStatus;
    const matchesApproval = !selectedApproval || ev.approvalStatus === selectedApproval;
    const matchesOrganizer = !selectedOrganizer || ev.organizer.toLowerCase().includes(selectedOrganizer.toLowerCase());

    return matchesSearch && matchesDept && matchesCategory && matchesStatus && matchesApproval && matchesOrganizer;
  });

  // Apply sorting
  filteredEvents.sort((a, b) => {
    if (sortBy === "date") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    if (sortBy === "name") {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "registrations") {
      return b.currentRegistrations - a.currentRegistrations;
    }
    if (sortBy === "createdDate") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  // Calculate statistics totals
  const totalCount = events.length;
  const upcomingCount = events.filter((e) => e.status === "UPCOMING").length;
  const ongoingCount = events.filter((e) => e.status === "ONGOING").length;
  const completedCount = events.filter((e) => e.status === "COMPLETED").length;
  const cancelledCount = events.filter((e) => e.status === "CANCELLED").length;
  const totalRegistrations = events.reduce((sum, e) => sum + e.currentRegistrations, 0);

  // Form submit handler (Create vs Edit)
  const handleSaveForm = (values: any) => {
    if (editingEvent) {
      // Edit Mode
      setEvents((prev) =>
        prev.map((e) =>
          e._id === editingEvent._id
            ? {
                ...e,
                ...values,
                updatedAt: new Date().toISOString(),
              }
            : e
        )
      );
      addToast("Event Updated", "success");
      setEditingEvent(null);
    } else {
      // Create Mode
      const newEv: Event = {
        _id: `evt-${Math.random().toString(36).substring(2, 9)}`,
        title: values.title,
        description: values.description,
        category: values.category,
        department: values.department,
        organizer: values.organizer,
        venue: values.venue,
        date: values.date,
        time: values.time,
        registrationDeadline: values.registrationDeadline,
        maxParticipants: values.maxParticipants,
        currentRegistrations: 0,
        status: "UPCOMING",
        approvalStatus: "APPROVED",
        bannerImage: values.bannerImage,
        attachments: values.attachments,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        registeredUsers: [],
      };
      setEvents((prev) => [newEv, ...prev]);
      addToast("Event Created Successfully", "success");
      setFormOpen(false);
    }
  };

  // Duplicate Event
  const handleDuplicateEvent = (event: Event) => {
    const duplicated: Event = {
      ...event,
      _id: `evt-${Math.random().toString(36).substring(2, 9)}`,
      title: `${event.title} (Copy)`,
      currentRegistrations: 0,
      registeredUsers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEvents((prev) => [duplicated, ...prev]);
    addToast(`Duplicated event: "${event.title}"`, "success");
  };

  // Participant Moderation Handlers
  const handleRemoveParticipant = (eventId: string, participantId: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e._id === eventId) {
          const updatedUsers = e.registeredUsers?.filter((u) => u.id !== participantId) || [];
          return {
            ...e,
            registeredUsers: updatedUsers,
            currentRegistrations: updatedUsers.length,
          };
        }
        return e;
      })
    );
    // Sync viewing drawer state
    setViewingEvent((prev) => {
      if (prev && prev._id === eventId) {
        const updatedUsers = prev.registeredUsers?.filter((u) => u.id !== participantId) || [];
        return {
          ...prev,
          registeredUsers: updatedUsers,
          currentRegistrations: updatedUsers.length,
        };
      }
      return prev;
    });
    addToast("Participant removed from event", "warning");
  };

  const handleToggleCheckIn = (eventId: string, participantId: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e._id === eventId) {
          return {
            ...e,
            registeredUsers: e.registeredUsers?.map((u) =>
              u.id === participantId ? { ...u, checkedIn: !u.checkedIn } : u
            ),
          };
        }
        return e;
      })
    );
    // Sync viewing drawer state
    setViewingEvent((prev) => {
      if (prev && prev._id === eventId) {
        return {
          ...prev,
          registeredUsers: prev.registeredUsers?.map((u) =>
            u.id === participantId ? { ...u, checkedIn: !u.checkedIn } : u
          ),
        };
      }
      return prev;
    });
    addToast("Attendance check-in status updated", "success");
  };

  // Confirm Actions Dispatcher
  const handleConfirmAction = () => {
    if (!confirmAction) return;

    const { type, event } = confirmAction;

    if (type === "delete") {
      setEvents((prev) => prev.filter((e) => e._id !== event._id));
      addToast("Event Deleted successfully", "success");
    } else if (type === "cancel") {
      setEvents((prev) =>
        prev.map((e) => (e._id === event._id ? { ...e, status: "CANCELLED" as EventStatus } : e))
      );
      addToast("Event Cancelled", "warning");
    } else if (type === "publish") {
      setEvents((prev) =>
        prev.map((e) => (e._id === event._id ? { ...e, status: "UPCOMING" as EventStatus } : e))
      );
      addToast("Event Published to Campus Board", "success");
    } else if (type === "approve") {
      setEvents((prev) =>
        prev.map((e) =>
          e._id === event._id
            ? { ...e, approvalStatus: "APPROVED" as ApprovalStatus, status: "UPCOMING" as EventStatus }
            : e
        )
      );
      addToast("Student Event Approved", "success");
    } else if (type === "reject") {
      setEvents((prev) =>
        prev.map((e) =>
          e._id === event._id ? { ...e, approvalStatus: "REJECTED" as ApprovalStatus } : e
        )
      );
      addToast("Student Event Rejected", "warning");
    }

    setConfirmAction(null);
  };

  return (
    <div className="space-y-6">
      {/* Animated page wrapper */}
      <div className="animate-fade-up space-y-6">
        {/* Breadcrumb & Title Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Admin</span>
              <span>/</span>
              <span className="text-slate-500 dark:text-slate-400">Event Management</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Event Management
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-white/5 dark:bg-white/[0.02]">
              <button
                onClick={() => setViewMode("table")}
                className={`flex size-8 items-center justify-center rounded-lg transition ${
                  viewMode === "table"
                    ? "bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex size-8 items-center justify-center rounded-lg transition ${
                  viewMode === "calendar"
                    ? "bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Grid size={15} />
              </button>
            </div>

            <button
              onClick={() => {
                setEditingEvent(null);
                setFormOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 hover:opacity-95 px-4 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
            >
              <Plus size={15} />
              Create Event
            </button>
          </div>
        </div>

        {/* Statistics Cards Grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <DashboardCard
            title="Total Events"
            value={totalCount}
            icon={<Calendar size={16} />}
            trend={{ value: "+2 new this week", isPositive: true }}
          />
          <DashboardCard
            title="Upcoming"
            value={upcomingCount}
            icon={<Clock size={16} />}
            trend={{ value: "Seeded schedule", isPositive: true }}
          />
          <DashboardCard
            title="Ongoing"
            value={ongoingCount}
            icon={<CheckCircle2 size={16} />}
            trend={{ value: "Live on board", isPositive: true }}
          />
          <DashboardCard
            title="Completed"
            value={completedCount}
            icon={<CheckCircle2 size={16} />}
            trend={{ value: "Archive logs", isPositive: false }}
          />
          <DashboardCard
            title="Cancelled"
            value={cancelledCount}
            icon={<XCircle size={16} />}
            trend={{ value: "Disabled list", isPositive: false }}
          />
          <DashboardCard
            title="Registrations"
            value={totalRegistrations}
            icon={<Users size={16} />}
            trend={{ value: "+14.5% rate", isPositive: true }}
          />
        </div>

        {/* Search and Filters Toolbar */}
        <div className="rounded-2xl border border-slate-150 bg-white p-4 dark:border-white/5 dark:bg-ink-900 transition-all duration-300">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                size={16}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by event title, organizer, venue, or ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-450 focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:placeholder:text-slate-650"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Toggler */}
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                  filtersOpen ||
                  selectedDept ||
                  selectedCategory ||
                  selectedStatus ||
                  selectedApproval ||
                  selectedOrganizer
                    ? "border-indigo-250 bg-indigo-50/30 text-indigo-650 dark:border-indigo-900/50 dark:bg-indigo-500/10 dark:text-indigo-400"
                    : "border-slate-200 bg-white text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-355"
                }`}
              >
                <Filter size={14} />
                Filters
                {(selectedDept ||
                  selectedCategory ||
                  selectedStatus ||
                  selectedApproval ||
                  selectedOrganizer) && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] text-white dark:bg-indigo-500">
                    !
                  </span>
                )}
              </button>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-650 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-355"
              >
                <option value="date">Sort by: Event Date</option>
                <option value="name">Sort by: Event Name</option>
                <option value="registrations">Sort by: Registrations</option>
                <option value="createdDate">Sort by: Created Date</option>
              </select>
            </div>
          </div>

          {/* Expandable Advanced Filters Panel */}
          {filtersOpen && (
            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 dark:border-white/5 sm:grid-cols-2 lg:grid-cols-5 animate-fade-up">
              {/* Department */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Department
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
                >
                  <option value="">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                  <option value="Electronics Engineering">Electronics Engineering</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Multidisciplinary">Multidisciplinary</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
                >
                  <option value="">All Categories</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Hackathon">Hackathon</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Sports">Sports</option>
                  <option value="Webinar">Webinar</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Event Status */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Event Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="ONGOING">Ongoing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Approval Status */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Approval Status
                </label>
                <select
                  value={selectedApproval}
                  onChange={(e) => setSelectedApproval(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
                >
                  <option value="">All Approvals</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Organizer */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Organizer Keyword
                </label>
                <input
                  type="text"
                  value={selectedOrganizer}
                  onChange={(e) => setSelectedOrganizer(e.target.value)}
                  placeholder="e.g. Coding Club"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-850 outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Display (Table vs Calendar) */}
        {viewMode === "table" ? (
          <div className="space-y-4">
            <EventTable
              events={filteredEvents}
              onView={setViewingEvent}
              onEdit={(ev) => {
                setEditingEvent(ev);
                setFormOpen(true);
              }}
              onDelete={(event) => setConfirmAction({ type: "delete", event })}
              onCancel={(event) => setConfirmAction({ type: "cancel", event })}
              onPublish={(event) => setConfirmAction({ type: "publish", event })}
              onApprove={(event) => setConfirmAction({ type: "approve", event })}
              onReject={(event) => setConfirmAction({ type: "reject", event })}
              onDuplicate={handleDuplicateEvent}
            />

            {/* Pagination Info footer */}
            <div className="flex items-center justify-between px-2 pt-2 text-xs font-semibold text-slate-450 dark:text-slate-500">
              <span>
                Showing {filteredEvents.length} of {filteredEvents.length} registered campus events
              </span>
            </div>
          </div>
        ) : (
          <CalendarView events={filteredEvents} onEventClick={setViewingEvent} />
        )}
      </div>

      {/* Drawer and Modal Triggers (outside the animated container to prevent fixed alignment bug) */}
      <EventDetailsDrawer
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        onRemoveParticipant={handleRemoveParticipant}
        onToggleCheckIn={handleToggleCheckIn}
      />

      {formOpen && (
        <EventFormModal
          event={editingEvent}
          onClose={() => {
            setFormOpen(false);
            setEditingEvent(null);
          }}
          onSave={handleSaveForm}
        />
      )}

      <ConfirmationDialog
        isOpen={Boolean(confirmAction)}
        title={
          confirmAction?.type === "delete"
            ? "Permanently Delete Event?"
            : confirmAction?.type === "cancel"
            ? "Cancel Live Event?"
            : confirmAction?.type === "publish"
            ? "Publish Draft Event?"
            : confirmAction?.type === "approve"
            ? "Approve Student Event?"
            : "Reject Student Event?"
        }
        message={
          confirmAction?.type === "delete"
            ? `Are you sure you want to delete "${confirmAction?.event?.title}"? Deleting this event is permanent and cannot be undone.`
            : confirmAction?.type === "cancel"
            ? `Are you sure you want to cancel "${confirmAction?.event?.title}"? This will flag the event as CANCELLED on the student board.`
            : confirmAction?.type === "publish"
            ? `Are you sure you want to publish "${confirmAction?.event?.title}"? It will become visible for campus registration.`
            : confirmAction?.type === "approve"
            ? `Are you sure you want to approve "${confirmAction?.event?.title}"? It will move to active status.`
            : `Are you sure you want to reject "${confirmAction?.event?.title}"? The student organizers will be notified.`
        }
        warning={confirmAction?.type === "delete" ? "Deleting this event is permanent and cannot be undone." : undefined}
        confirmText={
          confirmAction?.type === "delete"
            ? "Delete Permanently"
            : confirmAction?.type === "cancel"
            ? "Cancel Event"
            : confirmAction?.type === "publish"
            ? "Publish"
            : confirmAction?.type === "approve"
            ? "Approve"
            : "Reject Event"
        }
        isDestructive={confirmAction?.type === "delete" || confirmAction?.type === "cancel" || confirmAction?.type === "reject"}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
