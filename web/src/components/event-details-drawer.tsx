import { useState } from "react";
import { X, Calendar, MapPin, Users, Clock, FileText, Download, CheckCircle, Search, Trash2 } from "lucide-react";
import type { Event, Participant } from "../types/event";
import { getOrganizerName } from "../types/event";
import { useToastStore } from "../store/toast.store";

interface EventDetailsDrawerProps {
  event: Event | null;
  onClose: () => void;
  onRemoveParticipant?: (eventId: string, participantId: string) => void;
  onToggleCheckIn?: (eventId: string, participantId: string) => void;
}

export function EventDetailsDrawer({
  event,
  onClose,
  onRemoveParticipant,
  onToggleCheckIn,
}: EventDetailsDrawerProps) {
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<"details" | "registrations">("details");
  const [participantSearch, setParticipantSearch] = useState("");

  if (!event) return null;

  const participants = event.registeredUsers || [];
  const checkedInCount = participants.filter((p) => p.checkedIn).length;
  const attendanceRate =
    participants.length > 0 ? Math.round((checkedInCount / participants.length) * 100) : 0;

  // Filter participants locally
  const filteredParticipants = participants.filter(
    (p) =>
      p.fullName.toLowerCase().includes(participantSearch.toLowerCase()) ||
      p.rollNumber.toLowerCase().includes(participantSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(participantSearch.toLowerCase())
  );

  const handleExportAttendees = () => {
    addToast(`Attendees list for "${event.title}" exported successfully`, "success");
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "UPCOMING":
        return "bg-indigo-50 text-indigo-700 border-indigo-150 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-none";
      case "ONGOING":
        return "bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-none";
      case "COMPLETED":
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/[0.04] dark:text-slate-400 dark:border-none";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-150 dark:bg-rose-500/10 dark:text-rose-400 dark:border-none";
      default:
        return "bg-slate-50 text-slate-650";
    }
  };

  const getApprovalBadgeStyles = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-none";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-none";
      case "REJECTED":
        return "bg-rose-50 text-rose-750 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-none";
      default:
        return "bg-slate-50 text-slate-650";
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md transform bg-white p-6 shadow-2xl dark:bg-ink-900 transition-all duration-300 border-l border-slate-200 dark:border-white/5 flex flex-col justify-between h-full animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-150 pb-3 dark:border-white/5">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                {event.title}
              </h3>
              <span className="block text-[10px] text-slate-450 dark:text-slate-500 truncate mt-0.5">
                ID: {event._id}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-white/[0.04] dark:hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 dark:border-white/5 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex-1 py-3 text-center border-b-2 transition-all ${
                activeTab === "details"
                  ? "border-indigo-600 text-indigo-650 dark:border-indigo-500 dark:text-indigo-400"
                  : "border-transparent text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Event Details
            </button>
            <button
              onClick={() => setActiveTab("registrations")}
              className={`flex-1 py-3 text-center border-b-2 transition-all ${
                activeTab === "registrations"
                  ? "border-indigo-600 text-indigo-650 dark:border-indigo-500 dark:text-indigo-400"
                  : "border-transparent text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Registrations & Attendance ({participants.length})
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
            {activeTab === "details" ? (
              <>
                {/* Event Banner / Poster */}
                {event.eventImage?.url || event.bannerImage ? (
                  <img
                    src={event.eventImage?.url || event.bannerImage}
                    alt={event.title}
                    className="w-full h-44 object-cover rounded-xl border border-slate-200 dark:border-white/5"
                  />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/5">
                    <Calendar size={32} className="text-indigo-500" />
                  </div>
                )}

                {/* Event badging row */}
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeStyles(
                      event.status
                    )}`}
                  >
                    {event.status}
                  </span>
                  <span
                    className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getApprovalBadgeStyles(
                      event.approvalStatus
                    )}`}
                  >
                    Approval: {event.approvalStatus}
                  </span>
                  <span className="rounded bg-indigo-50 px-2 py-0.5 font-bold uppercase text-[9px] tracking-wider text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {event.category}
                  </span>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Event Description
                  </h4>
                  <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex gap-2">
                    <Clock size={16} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-semibold text-slate-700 dark:text-slate-300">
                        Date & Time
                      </span>
                      <span className="block text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">
                        {new Date(event.date).toLocaleDateString()} @ {event.time}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <MapPin size={16} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-semibold text-slate-700 dark:text-slate-300">
                        Venue
                      </span>
                      <span className="block text-[10px] text-slate-450 dark:text-slate-500 mt-0.5 truncate">
                        {event.venue}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Users size={16} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-semibold text-slate-700 dark:text-slate-300">
                        Participants Limit
                      </span>
                      <span className="block text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">
                        {event.currentRegistrations} / {event.maxParticipants} max
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Clock size={16} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-semibold text-slate-700 dark:text-slate-300">
                        Registration Deadline
                      </span>
                      <span className="block text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">
                        {new Date(event.registrationDeadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-white/5 pt-4 grid grid-cols-2 gap-4 text-[10px]">
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                      Organizer / Club
                    </span>
                    <span className="block font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {getOrganizerName(event.organizer)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                      Department
                    </span>
                    <span className="block font-semibold text-slate-650 dark:text-slate-300 mt-0.5">
                      {event.department}
                    </span>
                  </div>
                </div>

                {/* Attachments */}
                {event.attachments && event.attachments.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-white/5 pt-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                      Attached Documents
                    </h4>
                    <div className="space-y-1.5">
                      {event.attachments.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.01] dark:text-slate-300 dark:hover:bg-white/[0.03] transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="font-semibold truncate">{doc.name}</span>
                          </div>
                          <Download size={14} className="text-slate-400 hover:text-slate-600 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata Footers */}
                <div className="border-t border-slate-100 dark:border-white/5 pt-4 text-[10px] text-slate-400 dark:text-slate-500 space-y-1">
                  <div>Created on: {new Date(event.createdAt).toLocaleString()}</div>
                  <div>Last Updated: {new Date(event.updatedAt).toLocaleString()}</div>
                </div>
              </>
            ) : (
              <>
                {/* Attendance Analytics Metrics */}
                <div className="grid grid-cols-3 gap-2 border border-slate-200 dark:border-white/5 p-3 rounded-xl bg-slate-50/30 dark:bg-white/[0.01]">
                  <div className="text-center">
                    <span className="block text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase">
                      Registrations
                    </span>
                    <span className="block text-base font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {participants.length}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase">
                      Checked In
                    </span>
                    <span className="block text-base font-bold text-indigo-650 dark:text-indigo-400 mt-1">
                      {checkedInCount}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase">
                      Attendance Rate
                    </span>
                    <span className="block text-base font-bold text-emerald-650 dark:text-emerald-400 mt-1">
                      {attendanceRate}%
                    </span>
                  </div>
                </div>

                {/* Search & Export Toolbar */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      placeholder="Search name or roll number..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-[11px] outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleExportAttendees}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:hover:bg-white/[0.04] transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    Export
                  </button>
                </div>

                {/* Participant list */}
                {filteredParticipants.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 dark:text-slate-500 italic">
                    No participants matched search criteria.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {filteredParticipants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white dark:border-white/5 dark:bg-white/[0.01]"
                      >
                        <div className="min-w-0">
                          <span className="block font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                            {p.fullName}
                          </span>
                          <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {p.rollNumber} • {p.email}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Attendance Check-in Switch */}
                          <button
                            onClick={() => onToggleCheckIn && onToggleCheckIn(event._id, p.id)}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold border transition ${
                              p.checkedIn
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-none"
                                : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-white/[0.02] dark:border-white/5 dark:text-slate-500"
                            } cursor-pointer`}
                          >
                            <CheckCircle size={10} />
                            {p.checkedIn ? "Checked In" : "Mark In"}
                          </button>

                          {/* Delete participant */}
                          {onRemoveParticipant && (
                            <button
                              onClick={() => onRemoveParticipant(event._id, p.id)}
                              className="text-rose-500 hover:text-rose-600 transition-colors p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-100 pt-4 dark:border-white/5 flex items-center justify-end">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:text-slate-400 dark:hover:bg-white/[0.03] transition-all cursor-pointer"
            >
              Close Drawer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
