import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarPlus,
  X,
  Calendar,
  Clock,
  MapPin,
  Volume2,
  Tag,
  Sparkles,
  Check
} from "lucide-react";
import { eventCategories, eventDepartments } from "./EventsFilterBar";
import { useToastStore } from "../../store/toast.store";
import { useAuthStore } from "../../store/auth.store";
import { dispatchCampusNotification } from "../../utils/notifications";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: (newEvent: any) => void;
}

export function CreateEventModal({
  isOpen,
  onClose,
  onCreateEvent
}: CreateEventModalProps) {
  const user = useAuthStore((state) => state.user);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"hackathons" | "deadlines" | "workshops" | "reviews">("workshops");
  const [organizer, setOrganizer] = useState("");
  const [dateStr, setDateStr] = useState("Sept 15, 2026");
  const [timeStr, setTimeStr] = useState("4:00 PM - 6:00 PM");
  const [isVirtual, setIsVirtual] = useState(false);
  const [venue, setVenue] = useState("");
  const [dept, setDept] = useState(eventDepartments[1]);
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const { addToast } = useToastStore();

  if (!isOpen) return null;

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput("");
      }
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast("Please provide an event title.", "warning");
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      department: dept.trim() || user?.department || "General Campus",
      organizer: organizer.trim() || user?.fullName || "Student Organizer",
      dateStr: dateStr.trim(),
      timeStr: timeStr.trim(),
      venue: isVirtual ? "Drop-in Voice Study Stage 1" : (venue.trim() || "Campus Classroom"),
      isVirtual,
      description: description.trim() || "Peer session and study review open to verified students.",
      tags
    };

    try {
      setSubmitting(true);
      await onCreateEvent(payload);
      dispatchCampusNotification({
        type: "ADMIN_ALERT",
        title: `Event Scheduled: ${payload.title}`,
        message: `${payload.dateStr} (${payload.timeStr}) at ${payload.venue}. Organized by ${payload.organizer}.`,
        categoryTag: payload.category,
        href: "/events",
        senderName: payload.organizer
      });
      addToast(`Published "${title}" to the Campus Events calendar!`, "success");
      onClose();
    } catch {
      addToast("Failed to create event. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/30">
            <CalendarPlus size={16} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            Submit Campus Event / Session
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Schedule a study workshop, hackathon, or project review for verified classmates.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Distributed Consensus & Raft Architecture Workshop"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1E90FF]"
              >
                <option value="workshops">Workshop / Talk</option>
                <option value="hackathons">Hackathon & Contest</option>
                <option value="deadlines">Academic Deadline</option>
                <option value="reviews">Dept Review</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Department Scope
              </label>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1E90FF]"
              >
                {eventDepartments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                type="text"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                placeholder="e.g. Sept 28, 2026"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:border-[#1E90FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Time
              </label>
              <input
                type="text"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                placeholder="e.g. 2:00 PM - 5:00 PM"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:border-[#1E90FF]"
              />
            </div>
          </div>

          {/* Location Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Venue / Location
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setIsVirtual(false)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  !isVirtual
                    ? "border-[#1E90FF] bg-[#1E90FF]/10 text-[#1E90FF]"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <MapPin size={13} />
                <span>Physical Venue</span>
              </button>
              <button
                type="button"
                onClick={() => setIsVirtual(true)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isVirtual
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Volume2 size={13} />
                <span>Voice Study Stage</span>
              </button>
            </div>

            {!isVirtual && (
              <input
                type="text"
                placeholder="e.g. Turing Auditorium, Block C"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Event Description & Agenda
            </label>
            <textarea
              rows={2}
              placeholder="Provide a short overview and prerequisite details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Topic Tags (Press Enter)
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]">
              {tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#1E90FF] bg-[#1E90FF]/10 border border-[#1E90FF]/20 px-2 py-0.5 rounded-md"
                >
                  #{t}
                  <button type="button" onClick={() => removeTag(t)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder={tags.length === 0 ? "Add tag (e.g. Hackathon, Raft)..." : "Add tag..."}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none flex-1 min-w-[80px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 cursor-pointer transition-all"
            >
              <Check size={14} />
              <span>{submitting ? "Publishing..." : "Publish Event"}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default CreateEventModal;
