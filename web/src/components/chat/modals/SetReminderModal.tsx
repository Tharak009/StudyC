import { useState } from "react";
import { X, Bell, Clock } from "lucide-react";
import { remindersApi } from "../../../api/reminders.api";

interface SetReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceType: "COMMUNITY" | "DIRECT_MESSAGE";
  sourceId: string;
  messageId: string;
  channelId?: string;
  messagePreview?: string;
  onReminderSet?: () => void;
}

export function SetReminderModal({
  isOpen,
  onClose,
  sourceType,
  sourceId,
  messageId,
  channelId,
  messagePreview = "",
  onReminderSet
}: SetReminderModalProps) {
  const [remindAtDateTime, setRemindAtDateTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const setPreset = (minutesFromNow: number) => {
    const target = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, "0");
    const day = String(target.getDate()).padStart(2, "0");
    const hours = String(target.getHours()).padStart(2, "0");
    const minutes = String(target.getMinutes()).padStart(2, "0");
    setRemindAtDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const setPresetTomorrow = () => {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(9, 0, 0, 0);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, "0");
    const day = String(target.getDate()).padStart(2, "0");
    setRemindAtDateTime(`${year}-${month}-${day}T09:00`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remindAtDateTime) {
      setError("Please choose a reminder time");
      return;
    }

    const remindDate = new Date(remindAtDateTime);
    if (remindDate.getTime() <= Date.now() + 5000) {
      setError("Reminder must be in the future");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await remindersApi.create({
        sourceType,
        sourceId,
        messageId,
        channelId,
        remindAt: remindDate.toISOString()
      });
      onReminderSet?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to set reminder");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base">
            <Bell className="h-5 w-5 text-amber-500" />
            <span>Remind Me About This</span>
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

        {messagePreview && (
          <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground line-clamp-2 italic border-l-4 border-l-amber-500">
            "{messagePreview}"
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Quick Timing Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreset(30)}
                className="rounded-lg border border-border/70 bg-muted/20 py-2 text-xs font-medium text-foreground hover:bg-muted/50 hover:border-amber-500 transition-all"
              >
                In 30 mins
              </button>
              <button
                type="button"
                onClick={() => setPreset(180)}
                className="rounded-lg border border-border/70 bg-muted/20 py-2 text-xs font-medium text-foreground hover:bg-muted/50 hover:border-amber-500 transition-all"
              >
                In 3 hours
              </button>
              <button
                type="button"
                onClick={setPresetTomorrow}
                className="rounded-lg border border-border/70 bg-muted/20 py-2 text-xs font-medium text-foreground hover:bg-muted/50 hover:border-amber-500 transition-all"
              >
                Tomorrow 9 AM
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Exact Reminder Time *
            </label>
            <input
              type="datetime-local"
              value={remindAtDateTime}
              onChange={(e) => setRemindAtDateTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-amber-500 focus:outline-none"
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Saving..." : "Set Reminder"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
