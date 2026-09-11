import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { cn } from "../lib/utils";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  hint?: string;
  showIcon?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, hint, showIcon = true, className = "", ...props }, ref) => {
    const [passwordVisible, setPasswordVisible] = useState(false);

    return (
      <div className="w-full flex flex-col gap-1.5">
        <label htmlFor={props.id} className="text-xs font-semibold text-foreground uppercase tracking-wide">
          {label}
        </label>
        <div className="relative">
          {showIcon ? (
            <LockKeyhole
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          ) : null}
          <input
            ref={ref}
            type={passwordVisible ? "text" : "password"}
            className={cn(
              "w-full rounded-lg border border-border bg-white dark:bg-slate-800/60 text-foreground placeholder:text-muted-foreground/60 text-sm py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1E90FF]/40 focus:border-[#1E90FF] transition-all pr-10",
              showIcon && "pl-9",
              error ? "border-red-400 focus:ring-red-400/40 focus:border-red-400" : "border-border",
              className
            )}
            aria-invalid={Boolean(error)}
            {...props}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground outline-none transition hover:text-foreground focus:text-[#1E90FF]"
            onClick={() => setPasswordVisible(!passwordVisible)}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {(error || hint) && (
          <span className={`mt-1 block text-xs ${error ? "text-red-500" : "text-muted-foreground"}`}>
            {error ?? hint}
          </span>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
