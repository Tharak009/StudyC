import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trophy,
  Lightbulb,
  CheckCircle2,
  CalendarCheck,
  CheckSquare,
  Sparkles,
  ExternalLink,
  Volume2,
  Trash2
} from "lucide-react";
import { useToastStore } from "../../store/toast.store";

export interface CampusEvent {
  id: string;
  _id?: string;
  title: string;
  category: "hackathons" | "deadlines" | "workshops" | "reviews";
  organizer: string;
  dateStr: string;
  timeStr: string;
  venue: string;
  isVirtual?: boolean;
  description: string;
  tags: string[];
  attendeesCount: number;
  batchAttendeesCount?: number;
  attendeeInitials?: string[];
  daysLeft?: string;
  isUrgent?: boolean;
  isRegistered?: boolean;
  department?: string;
  createdBy?: any;
}

interface EventCardProps {
  event: CampusEvent;
  onToggleRsvp: (eventId: string) => void;
  onDelete?: (eventId: string) => void;
  canDelete?: boolean;
}

export function EventCard({ event, onToggleRsvp, onDelete, canDelete }: EventCardProps) {
  const { addToast } = useToastStore();
  const [isGoing, setIsGoing] = useState(Boolean(event.isRegistered));
  const [calendarAdded, setCalendarAdded] = useState(false);

  React.useEffect(() => {
    setIsGoing(Boolean(event.isRegistered));
  }, [event.isRegistered]);

  const handleRsvpClick = () => {
    const nextState = !isGoing;
    setIsGoing(nextState);
    onToggleRsvp(event.id);
    if (nextState) {
      addToast(`RSVP Confirmed for "${event.title}"!`, "success");
    } else {
      addToast(`Cancelled RSVP for "${event.title}".`, "info");
    }
  };

  const handleAddToCalendar = () => {
    setCalendarAdded(true);
    addToast(`Added "${event.title}" to your student calendar!`, "success");
  };

  const getCategoryBadge = () => {
    switch (event.category) {
      case "hackathons":
        return {
          label: "Hackathon",
          icon: Trophy,
          badgeClass: "bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/30"
        };
      case "deadlines":
        return {
          label: "Academic Deadline",
          icon: Clock,
          badgeClass: event.isUrgent
            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse"
            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
        };
      case "workshops":
        return {
          label: "Workshop / Talk",
          icon: Lightbulb,
          badgeClass: "bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/30"
        };
      default:
        return {
          label: "Dept Review",
          icon: CheckSquare,
          badgeClass: "bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/30"
        };
    }
  };

  const cat = getCategoryBadge();
  const CategoryIcon = cat.icon;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/85 p-6 backdrop-blur-xl shadow-md hover:border-[#1E90FF]/40 hover:shadow-xl transition-all"
    >
      <div>
        {/* ── Top Header Row: Category Badge & Countdown ──────────────── */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold ${cat.badgeClass}`}
          >
            <CategoryIcon size={12} />
            <span>{cat.label}</span>
          </span>

          <div className="flex items-center gap-1.5">
            {event.daysLeft && (
              <span
                className={`text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-lg border ${
                  event.isUrgent
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                    : "bg-slate-100 dark:bg-[#162544] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                }`}
              >
                {event.daysLeft}
              </span>
            )}
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Delete Event"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* ── Title & Organizer ───────────────────────────────────────── */}
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 line-clamp-2 leading-snug mb-1">
          {event.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {event.organizer}
        </p>

        {/* ── Date, Time & Venue Block ────────────────────────────────── */}
        <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#080D1A]/70 border border-slate-200/60 dark:border-slate-800/60 mb-4 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-[#1E90FF] shrink-0" />
            <span className="tabular-nums">{event.dateStr} • {event.timeStr}</span>
          </div>
          <div className="flex items-center gap-2">
            {event.isVirtual ? (
              <Volume2 size={13} className="text-emerald-500 shrink-0" />
            ) : (
              <MapPin size={13} className="text-rose-500 shrink-0" />
            )}
            <span className="truncate">{event.venue}</span>
          </div>
        </div>

        {/* ── Description & Topic Chips ───────────────────────────────── */}
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
          {event.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {event.tags.map((tag, tIdx) => (
            <span
              key={tIdx}
              className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#162544] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Bottom Section: Attendees & Interactive Actions ───────────── */}
      <div>
        {/* Attendees Stack */}
        <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/60 flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5 overflow-hidden">
              {(event.attendeeInitials || ["EV"]).slice(0, 3).map((init, iIdx) => (
                <div
                  key={iIdx}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E90FF] text-white font-bold text-[9px] border border-white dark:border-[#0F1A30]"
                >
                  {init}
                </div>
              ))}
            </div>
            <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              {event.attendeesCount} Attending {event.batchAttendeesCount ? `(${event.batchAttendeesCount} from batch)` : ""}
            </span>
          </div>

          {/* Add to Calendar Shortcut */}
          <button
            onClick={handleAddToCalendar}
            disabled={calendarAdded}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              calendarAdded
                ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                : "border-slate-200 dark:border-slate-800 text-slate-400 hover:text-[#1E90FF]"
            }`}
            title="Sync with My Calendar"
          >
            <CalendarCheck size={14} />
          </button>
        </div>

        {/* Primary RSVP Action */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleRsvpClick}
          className={`w-full py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            isGoing
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/15 hover:text-rose-500 hover:border-rose-500/30"
              : "bg-[#1E90FF] hover:bg-[#187bcd] text-white shadow-md shadow-[#1E90FF]/25 hover:brightness-105"
          }`}
        >
          {isGoing ? (
            <>
              <CheckCircle2 size={14} />
              <span>Going ✓ (Click to Cancel)</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>RSVP / Register Now</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

export default EventCard;
