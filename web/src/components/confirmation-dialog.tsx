import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  warning?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  warning,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4">
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-300 animate-fade-in"
        onClick={onCancel}
      />

      {/* Dialog box */}
      <div className="relative my-8 w-full max-w-sm transform rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/5 dark:bg-ink-900 transition-all duration-300 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-white/[0.04] dark:hover:text-white transition-all"
        >
          <X size={16} />
        </button>

        {/* Warning Icon & Title */}
        <div className="flex items-center gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
              isDestructive
                ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-455"
                : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-455"
            }`}
          >
            <AlertTriangle size={18} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
            {title}
          </h3>
        </div>

        {/* Details and warnings */}
        <div className="mt-3 space-y-2.5">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {message}
          </p>
          {warning && (
            <p className="rounded-lg bg-rose-50/50 dark:bg-rose-950/10 px-3 py-2 text-[10px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-100/30">
              ⚠️ {warning}
            </p>
          )}
        </div>

        {/* Footer controls */}
        <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/5 dark:text-slate-400 dark:hover:bg-white/[0.03] transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <Button
            onClick={onConfirm}
            loading={isLoading}
            variant={isDestructive ? "gradient" : "secondary"}
            className={isDestructive ? "from-rose-500 to-red-600 font-semibold" : "font-semibold"}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
