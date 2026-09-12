import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Lightbulb,
  CheckCircle2,
  CheckSquare,
  Sparkles,
  Trash2
} from "lucide-react";
import { useToastStore } from "../../store/toast.store";
import { getOrganizerName } from "../../types/event";

export interface CampusEvent {
  id: string;
  _id?: string;
  title: string;
  category: "hackathons" | "deadlines" | "workshops" | "reviews";
  organizer: string | any;
  dateStr: string;
  timeStr: string;
  venue: string;
  isVirtual?: boolean;
  description: string;
  tags: string[];
  eventImage?: {
    key: string;
    url: string;
    originalName: string;
    mimeType: string;
    size: number;
  } | null;
  bannerImage?: string;
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
  onClick?: () => void;
}

export function EventCard({
  event,
  onToggleRsvp,
  onDelete,
  canDelete,
  onClick
}: EventCardProps) {
  const { addToast } = useToastStore();
  const [isGoing, setIsGoing] = useState(Boolean(event.isRegistered));
  const [imgError, setImgError] = useState(false);

  React.useEffect(() => {
    setIsGoing(Boolean(event.isRegistered));
    setImgError(false);
  }, [event.isRegistered, event.eventImage?.url, event.bannerImage]);

  const handleRsvpClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isGoing;
    setIsGoing(nextState);
    onToggleRsvp(event.id);
    if (nextState) {
      addToast(`RSVP Confirmed for "${event.title}"!`, "success");
    } else {
      addToast(`Cancelled RSVP for "${event.title}".`, "info");
    }
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
          label: "Deadline",
          icon: Clock,
          badgeClass: event.isUrgent
            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse"
            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
        };
      case "workshops":
        return {
          label: "Workshop",
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

  const imageUrl = event.eventImage?.url || event.bannerImage;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className="group relative flex flex-row items-center gap-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0F1A30]/90 p-4 backdrop-blur-xl shadow-sm hover:shadow-md hover:border-[#1E90FF]/40 transition-all cursor-pointer"
    >
      {/* ── Small Event Poster Thumbnail (Left Side) ──────────────────── */}
      <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-100 dark:bg-[#080D1A] flex items-center justify-center">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-[#1E90FF]/60 p-2 text-center">
            <CategoryIcon size={24} />
          </div>
        )}
      </div>

      {/* ── Event Summary Details (Right Side) ───────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col justify-between space-y-1.5 py-0.5">
        <div>
          {/* Badge & Delete Action */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${cat.badgeClass}`}
            >
              <CategoryIcon size={11} />
              <span>{cat.label}</span>
            </span>

            {canDelete && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(event.id);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Delete Event"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50 line-clamp-1 leading-snug">
            {event.title}
          </h3>
        </div>

        {/* Location & Time */}
        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin size={13} className="text-rose-500 shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Calendar size={13} className="text-[#1E90FF] shrink-0" />
            <span className="tabular-nums">{event.dateStr} {event.timeStr}</span>
          </div>
        </div>

        {/* Organizer & RSVP Action Button */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[120px] sm:max-w-[180px]">
            {getOrganizerName(event.organizer)}
          </span>
          <button
            type="button"
            onClick={handleRsvpClick}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              isGoing
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-[#1E90FF] hover:bg-[#187bcd] text-white shadow-sm"
            }`}
          >
            {isGoing ? (
              <>
                <CheckCircle2 size={12} />
                <span>Going</span>
              </>
            ) : (
              <>
                <Sparkles size={12} />
                <span>RSVP</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default EventCard;
