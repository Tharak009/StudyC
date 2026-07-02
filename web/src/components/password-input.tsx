import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Input } from "./input";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  hint?: string;
  showIcon?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, hint, showIcon = true, ...props }, ref) => {
    const [passwordVisible, setPasswordVisible] = useState(false);

    return (
      <Input
        ref={ref}
        label={label}
        type={passwordVisible ? "text" : "password"}
        error={error}
        hint={hint}
        leftIcon={showIcon ? <LockKeyhole size={18} /> : undefined}
        rightIcon={
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 outline-none focus:text-indigo-500"
            onClick={() => setPasswordVisible(!passwordVisible)}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
        {...props}
      />
    );
  }
);

PasswordInput.displayName = "PasswordInput";
