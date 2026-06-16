import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  showPasswordToggle?: boolean;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, showPasswordToggle, className = "", ...props }, ref) => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const isPassword = showPasswordToggle && props.type === "password";
    const actualType = isPassword && passwordVisible ? "text" : props.type;

    return (
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </span>
        <div className="relative">
          <input
            ref={ref}
            className={`field ${error ? "border-red-400 focus:border-red-400 focus:ring-red-400/15" : ""} ${isPassword ? "pr-11" : ""} ${className}`}
            {...props}
            type={actualType}
          />
          {isPassword && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={() => setPasswordVisible(!passwordVisible)}
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          )}
        </div>
        {(error || hint) && (
          <span className={`mt-1.5 block text-xs ${error ? "text-red-500" : "text-slate-500"}`}>
            {error ?? hint}
          </span>
        )}
      </label>
    );
  }
);
FormField.displayName = "FormField";
