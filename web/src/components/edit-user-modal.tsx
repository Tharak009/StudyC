import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import type { User, Role, UserStatus } from "../types/auth";

interface EditUserModalProps {
  user: User | null;
  onClose: () => void;
  onSave: (updatedValues: Partial<User>) => void;
}

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electrical Engineering",
  "Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Administration",
];

const ROLES: Role[] = ["STUDENT", "ADMIN", "COMMUNITY_ADMIN", "MODERATOR"];
const STATUSES: UserStatus[] = ["ACTIVE", "SUSPENDED", "DEACTIVATED"];

export function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [academicYear, setAcademicYear] = useState(1);
  const [status, setStatus] = useState<UserStatus>("ACTIVE");
  const [role, setRole] = useState<Role>("STUDENT");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setDepartment(user.department || "");
      setAcademicYear(user.academicYear || 1);
      setStatus(user.status || "ACTIVE");
      setRole(user.role || "STUDENT");
      setErrors({});
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!department) {
      newErrors.department = "Department is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      fullName: fullName.trim(),
      department,
      academicYear,
      status,
      role,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4">
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative my-8 w-full max-w-md transform rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/5 dark:bg-ink-900 transition-all duration-300 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-150 pb-3 dark:border-white/5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Edit User Profile
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-white/[0.04] dark:hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
            placeholder="e.g. Swetha Lakshmi"
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-550 dark:text-slate-400">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-white/[0.04]"
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            {errors.department && (
              <span className="mt-1 block text-[10px] text-rose-500">{errors.department}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-550 dark:text-slate-400">
                Academic Year
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-white/[0.04]"
              >
                {[1, 2, 3, 4].map((year) => (
                  <option key={year} value={year}>
                    Year {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-550 dark:text-slate-400">
                System Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-white/[0.04]"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-550 dark:text-slate-400">
              Account Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as UserStatus)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-white/[0.04]"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/5 dark:text-slate-400 dark:hover:bg-white/[0.03] transition-all"
            >
              Cancel
            </button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
