import { useState } from "react";
import { X, Clock, Calendar, Send } from "lucide-react";
import { scheduleApi } from "../../../api/schedule.api";
import type { MessageType } from "../../../types/chat";

interface ScheduleMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "COMMUNITY" | "DIRECT_MESSAGE";
  targetId: string;
  channelId?: string;
  initialContent?: string;
  onScheduled?: () => void;
}

export function ScheduleMessageModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  channelId,
  initialContent = "",
  onScheduled
}: ScheduleMessageModalProps) {
  const [content, setContent] = useState(initialContent);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const setPresetTime = (minutesFromNow: number) => {
    const target = new Date(Date.now() + minutesFromNow * 60 * 1000);
    // Format YYYY-MM-DDTHH:mm
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, "0");
    const day = String(target.getDate()).padStart(2, "0");
    const hours = String(target.getHours()).padStart(2, "0");
    const minutes = String(target.getMinutes()).padStart(2, "0");
    setScheduledDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const setPresetTomorrowMorning = () => {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(9, 0, 0, 0);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, "0");
    const day = String(target.getDate()).padStart(2, "0");
    setScheduledDateTime(`${year}-${month}-${day}T09:00`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Please enter a message to schedule");
      return;
    }

    if (!scheduledDateTime) {
      setError("Please select a date and time for delivery");
      return;
    }

    const scheduledDate = new Date(scheduledDateTime);
    if (scheduledDate.getTime() <= Date.now() + 10000) {
      setError("Scheduled time must be at least in the future");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await scheduleApi.schedule({
        targetType,
        targetId,
        channelId,
        content: content.trim(),
        scheduledFor: scheduledDate.toISOString()
      });
      onScheduled?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to schedule message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base">
            <Clock className="h-5 w-5 text-primary" />
            <span>Schedule Message</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Message Content *
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type message to be sent automatically at target time..."
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Quick Timing Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPresetTime(30)}
                className="rounded-lg border border-border/70 bg-muted/20 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 hover:border-primary transition-all"
              >
                In 30 mins
              </button>
              <button
                type="button"
                onClick={() => setPresetTime(120)}
                className="rounded-lg border border-border/70 bg-muted/20 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 hover:border-primary transition-all"
              >
                In 2 hours
              </button>
              <button
                type="button"
                onClick={setPresetTomorrowMorning}
                className="rounded-lg border border-border/70 bg-muted/20 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 hover:border-primary transition-all"
              >
                Tomorrow 9 AM
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Exact Date & Time *
            </label>
            <input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Scheduling..." : "Schedule Send"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
