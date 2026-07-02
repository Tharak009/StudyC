import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { EVENT_CATEGORIES, type Event, type EventCategory } from "../types/event";

interface EventFormModalProps {
  event: Event | null; // null for Create, object for Edit
  onClose: () => void;
  onSave: (values: any) => void;
}

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electrical Engineering",
  "Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Multidisciplinary",
];

export function EventFormModal({ event, onClose, onSave }: EventFormModalProps) {
  const isEdit = Boolean(event);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory>("Workshop");
  const [department, setDepartment] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(100);
  const [bannerImage, setBannerImage] = useState("");
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      setCategory(event.category || "Workshop");
      setDepartment(event.department || "Computer Science");
      setOrganizer(event.organizer || "");
      setVenue(event.venue || "");
      setDate(event.date || "");
      setTime(event.time || "");
      setRegistrationDeadline(event.registrationDeadline || "");
      setMaxParticipants(event.maxParticipants || 100);
      setBannerImage(event.bannerImage || "");
      setAttachments(event.attachments || []);
      setErrors({});
    } else {
      setTitle("");
      setDescription("");
      setCategory("Workshop");
      setDepartment("Computer Science");
      setOrganizer("");
      setVenue("");
      setDate("");
      setTime("");
      setRegistrationDeadline("");
      setMaxParticipants(100);
      setBannerImage("");
      setAttachments([]);
      setErrors({});
    }
  }, [event]);

  const handleAddAttachment = () => {
    setAttachments((prev) => [...prev, { name: "", url: "" }]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAttachmentChange = (index: number, field: "name" | "url", value: string) => {
    setAttachments((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Event Title is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!organizer.trim()) newErrors.organizer = "Organizer name is required";
    if (!venue.trim()) newErrors.venue = "Venue/Location is required";
    if (!date) newErrors.date = "Event Date is required";
    if (!time) newErrors.time = "Event Time is required";
    if (!registrationDeadline) newErrors.registrationDeadline = "Registration Deadline is required";
    if (maxParticipants <= 0) newErrors.maxParticipants = "Max participants must be greater than 0";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      category,
      department,
      organizer: organizer.trim(),
      venue: venue.trim(),
      date,
      time,
      registrationDeadline,
      maxParticipants,
      bannerImage: bannerImage.trim() || undefined,
      attachments: attachments.filter((att) => att.name.trim() && att.url.trim()),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4 animate-fade-in">
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative my-8 w-full max-w-md transform rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/5 dark:bg-ink-900 transition-all duration-300 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-150 pb-3 dark:border-white/5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {isEdit ? "Edit Event Details" : "Create New Event"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-white/[0.04] dark:hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input
            label="Event Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            placeholder="e.g. Annual Campus Hackathon"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-550 dark:text-slate-400">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white"
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-550 dark:text-slate-400">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Organizer / Club"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              error={errors.organizer}
              placeholder="e.g. Google DSC"
            />

            <Input
              label="Venue / Location"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              error={errors.venue}
              placeholder="e.g. Seminar Hall A"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={errors.date}
            />

            <Input
              label="Time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              error={errors.time}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Registration Deadline"
              type="date"
              value={registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
              error={errors.registrationDeadline}
            />

            <Input
              label="Max Participants"
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              error={errors.maxParticipants}
            />
          </div>

          <Input
            label="Banner Image URL (Optional)"
            value={bannerImage}
            onChange={(e) => setBannerImage(e.target.value)}
            placeholder="https://images.unsplash.com/photo-..."
          />

          {/* Attachments Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-550 dark:text-slate-400">
                Attachments (Optional)
              </label>
              <button
                type="button"
                onClick={handleAddAttachment}
                className="text-[10px] font-bold text-indigo-650 hover:underline dark:text-indigo-400 cursor-pointer"
              >
                + Add Document
              </button>
            </div>

            {attachments.length === 0 ? (
              <span className="block text-[10px] text-slate-400 dark:text-slate-500 italic">
                No attachments added.
              </span>
            ) : (
              <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={att.name}
                      onChange={(e) => handleAttachmentChange(idx, "name", e.target.value)}
                      placeholder="Doc Name (e.g. Brochure)"
                      className="w-1/3 rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-[10px] outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
                    />
                    <input
                      type="text"
                      value={att.url}
                      onChange={(e) => handleAttachmentChange(idx, "url", e.target.value)}
                      placeholder="Document URL"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-[10px] outline-none dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-rose-500 hover:text-rose-600 transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-550 dark:text-slate-400">
              Event Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe event schedule, topics, rules, and outcomes..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-850 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white"
            />
            {errors.description && (
              <span className="mt-1 block text-[10px] text-rose-500">{errors.description}</span>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:text-slate-400 dark:hover:bg-white/[0.03] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <Button type="submit">
              {isEdit ? "Save Changes" : "Create Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
