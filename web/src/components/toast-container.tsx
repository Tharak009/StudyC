import { useToastStore } from "../store/toast.store";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle size={16} className="text-emerald-500 shrink-0" />,
    error: <AlertCircle size={16} className="text-rose-500 shrink-0" />,
    warning: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
    info: <Info size={16} className="text-blue-500 shrink-0" />,
  };

  const bgColors = {
    success: "bg-emerald-50/95 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30",
    error: "bg-rose-50/95 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30",
    warning: "bg-amber-50/95 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30",
    info: "bg-blue-50/95 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30",
  };

  const textColors = {
    success: "text-slate-800 dark:text-emerald-350",
    error: "text-slate-800 dark:text-rose-350",
    warning: "text-slate-800 dark:text-amber-350",
    info: "text-slate-800 dark:text-blue-350",
  };

  return (
    <div className="fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2 p-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all duration-350 animate-slide-in ${bgColors[toast.type]}`}
        >
          {icons[toast.type]}
          <div className="flex-1">
            <p className={`text-xs font-semibold leading-relaxed ${textColors[toast.type]}`}>
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-350 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
