import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "secondary" | "gradient";
}

export function Button({
  children,
  loading,
  variant = "gradient",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]";

  const variants = {
    primary:
      "bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-ink-950 dark:hover:bg-slate-100 focus:ring-slate-500/20",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08] focus:ring-slate-500/10",
    gradient:
      "bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 text-white hover:opacity-95 shadow-md shadow-indigo-600/10 dark:shadow-indigo-400/5 hover:shadow-indigo-600/20 focus:ring-indigo-500/25",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <svg
            className="animate-spin h-4.5 w-4.5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}
