import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Calendar, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import type { CampusEvent } from "./EventCard";
import { getOrganizerName } from "../../types/event";
import { socketService } from "../../services/socket.service";
import { eventsApi } from "../../api/events.api";

interface EventDetailsModalProps {
  event: CampusEvent | null;
  onClose: () => void;
  onToggleRsvp: (eventId: string) => Promise<void> | void;
}

export function FormattedHtmlDescription({ description }: { description: string }) {
  if (!description) return null;

  // Detect if description contains raw HTML tags (e.g. <p>, <strong>, <ul>)
  const containsHtml = /<[a-z][\s\S]*>/i.test(description);

  if (containsHtml) {
    return (
      <div
        className="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed [&_p]:mb-2.5 [&_strong]:font-bold [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
        dangerouslySetInnerHTML={{ __html: description }}
      />
    );
  }

  return (
    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
      {description}
    </p>
  );
}

export function EventDetailsModal({ event, onClose, onToggleRsvp }: EventDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [liveAttendeesCount, setLiveAttendeesCount] = useState(event?.attendeesCount ?? 0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
    if (event?.attendeesCount !== undefined) {
      setLiveAttendeesCount(event.attendeesCount);
    }
  }, [event?.attendeesCount, event?.eventImage?.url, event?.bannerImage]);

  useEffect(() => {
    if (!event) return;
    let isMounted = true;

    const eventId = event.id || event._id;

    if (eventId) {
      eventsApi
        .details(eventId)
        .then((data) => {
          if (isMounted && data) {
            const count =
              data.attendeesCount ??
              (Array.isArray(data.attendees) ? data.attendees.length : event.attendeesCount);
            setLiveAttendeesCount(count);
          }
        })
        .catch(() => {});
    }

    const socket = socketService.connect();
    if (socket) {
      const handleSocketUpdate = (payload: { eventId: string; attendeesCount: number }) => {
        if (payload && (payload.eventId === event.id || payload.eventId === event._id)) {
          if (typeof payload.attendeesCount === "number") {
            setLiveAttendeesCount(payload.attendeesCount);
          }
        }
      };

      socket.on("event:attendeesUpdated", handleSocketUpdate);
      socket.on("eventRsvpUpdated", handleSocketUpdate);

      return () => {
        isMounted = false;
        socket.off("event:attendeesUpdated", handleSocketUpdate);
        socket.off("eventRsvpUpdated", handleSocketUpdate);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [event?.id, event?._id]);

  if (!event) return null;

  const imageUrl = event.eventImage?.url || event.bannerImage;

  const handleRsvpClick = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await onToggleRsvp(event.id);
    } catch {
      // Error is caught and toast displayed in onToggleRsvp
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-md flex justify-center p-0 sm:p-4 md:p-6 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-[#0F1A30] sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200/80 dark:border-slate-800/80 flex flex-col min-h-screen sm:min-h-0 max-h-none sm:max-h-[90vh] overflow-hidden"
      >
        {/* ── Top Header Navigation Bar ──────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center gap-3 bg-white/95 dark:bg-[#0F1A30]/95 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Back to Events"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Event Details
          </h1>
        </div>

        {/* ── Scrollable Body Content ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* 1. Complete Event Poster Image */}
          {imageUrl && !imgError ? (
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-slate-100/60 dark:bg-[#080D1A]/80 flex items-center justify-center p-1 sm:p-2">
              <img
                src={imageUrl}
                alt={event.title}
                className="w-full max-h-[480px] object-contain rounded-xl mx-auto"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="w-full h-44 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-[#1E90FF]/10 to-indigo-500/10 flex items-center justify-center">
              <Calendar size={48} className="text-[#1E90FF]/60" />
            </div>
          )}

          {/* 2. Summary Block (Title, Organizer & Status) */}
          <div className="bg-slate-100/80 dark:bg-[#162544]/80 p-4 sm:p-5 rounded-2xl space-y-1.5 border border-slate-200/60 dark:border-slate-800/60">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 leading-snug">
              {event.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              Organized by <span className="font-semibold text-slate-900 dark:text-slate-100">{getOrganizerName(event.organizer)}</span>
            </p>
            {event.daysLeft && (
              <p className="text-xs italic text-slate-500 dark:text-slate-400 pt-0.5">
                {event.daysLeft}
              </p>
            )}
          </div>

          {/* 3. Event Location & Time Information */}
          <div className="space-y-4 pt-1">
            <div>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Event Venue
              </span>
              <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50">
                <MapPin size={18} className="text-rose-500 shrink-0" />
                <span>{event.venue}</span>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Event Date & Time
              </span>
              <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50">
                <Calendar size={18} className="text-[#1E90FF] shrink-0" />
                <span className="tabular-nums">{event.dateStr} {event.timeStr}</span>
              </div>
            </div>
          </div>

          {/* 4. About This Event Section */}
          <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              About This Event
            </h3>
            <FormattedHtmlDescription description={event.description} />
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {event.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#162544] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

        </div>

        {/* ── Sticky Bottom Action Bar ───────────────────────────────── */}
        <div className="sticky bottom-0 z-10 bg-white/95 dark:bg-[#0F1A30]/95 backdrop-blur-md p-4 sm:px-6 border-t border-slate-200/60 dark:border-slate-800/60 shrink-0 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{liveAttendeesCount}</span> Attending
          </div>

          <button
            onClick={handleRsvpClick}
            disabled={loading}
            className={`px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              loading
                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                : event.isRegistered
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/15 hover:text-rose-500 hover:border-rose-500/30"
                : "bg-[#1E90FF] hover:bg-[#187bcd] text-white shadow-md shadow-[#1E90FF]/25"
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : event.isRegistered ? (
              <>
                <CheckCircle2 size={16} />
                <span>Registered ✓ (Cancel)</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Register Now</span>
              </>
            )}
          </button>
        </div>

      </motion.div>
    </div>
  );
}

export default EventDetailsModal;
