import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          {label}
        </label>
        <div className="relative rounded-xl shadow-sm">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-600 focus:shadow-focus
              ${leftIcon ? "pl-11" : ""}
              ${rightIcon ? "pr-11" : ""}
              ${
                error
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/15 dark:border-red-500/30"
                  : "border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20"
              }
              ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || hint) && (
          <span className={`mt-1.5 block text-xs ${error ? "text-rose-500" : "text-slate-400"}`}>
            {error ?? hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
