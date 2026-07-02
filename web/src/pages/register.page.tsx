import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, User, Mail, GraduationCap } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { Input } from "../components/input";
import { PasswordInput } from "../components/password-input";
import { Button } from "../components/button";
import { FormHeader } from "../components/form-header";
import { AuthCard } from "../components/auth-card";
import { getErrorMessage, useRegister } from "../hooks/use-auth";

const schema = z
  .object({
    fullName: z.string().min(2, "Enter your full name").max(100),
    rollNumber: z.string().min(2, "Enter your roll number").max(30),
    department: z.string().min(2, "Enter your department").max(100),
    academicYear: z.coerce
      .number()
      .int()
      .min(1, "Year must be between 1 and 8")
      .max(8, "Year must be between 1 and 8"),
    email: z.string().email("Enter a valid college email"),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/[a-z]/, "Add a lowercase letter")
      .regex(/[0-9]/, "Add a number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms and conditions" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const registration = useRegister();
  const [passwordValue, setPasswordValue] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { academicYear: 1 },
  });

  const onSubmit = (values: FormValues) => {
    const { confirmPassword, acceptTerms, ...registerPayload } = values;
    registration.mutate(registerPayload);
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "None", color: "bg-slate-200" };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    const scoreVal = Math.min(4, score);
    const labels = ["Very Weak", "Weak", "Medium", "Strong", "Very Strong"];
    const colors = [
      "bg-slate-200",
      "bg-rose-500",
      "bg-amber-500",
      "bg-indigo-500",
      "bg-emerald-500",
    ];
    return {
      score: scoreVal,
      label: labels[scoreVal],
      color: colors[scoreVal],
    };
  };

  const strength = getPasswordStrength(passwordValue);

  return (
    <AuthCard className="max-w-[480px]">
      <FormHeader
        icon={<BadgeCheck size={22} />}
        title="Join your campus"
        subtitle="Your college email keeps the network private and relevant"
      />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name"
            placeholder="Aarav Sharma"
            autoComplete="name"
            error={errors.fullName?.message}
            leftIcon={<User size={18} />}
            disabled={registration.isPending}
            {...register("fullName")}
          />
          <Input
            label="Roll number"
            placeholder="CS24-104"
            error={errors.rollNumber?.message}
            leftIcon={<GraduationCap size={18} />}
            disabled={registration.isPending}
            {...register("rollNumber")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Input
            label="Department"
            placeholder="Computer Science"
            error={errors.department?.message}
            disabled={registration.isPending}
            {...register("department")}
          />
          <Input
            label="Year"
            type="number"
            min={1}
            max={8}
            error={errors.academicYear?.message}
            disabled={registration.isPending}
            {...register("academicYear", { valueAsNumber: true })}
          />
        </div>

        <Input
          label="College email"
          type="email"
          autoComplete="email"
          placeholder="you@college.edu"
          error={errors.email?.message}
          leftIcon={<Mail size={18} />}
          disabled={registration.isPending}
          {...register("email")}
        />

        <div>
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            placeholder="min. 8 characters"
            error={errors.password?.message}
            disabled={registration.isPending}
            {...register("password")}
            onChange={(e) => {
              setPasswordValue(e.target.value);
              register("password").onChange(e);
            }}
          />

          {/* Strength Indicator */}
          {passwordValue.length > 0 && (
            <div className="mt-2 space-y-1 animate-fade-in">
              <div className="flex h-1.5 gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full flex-1 rounded-full transition-colors duration-300 ${
                      step <= strength.score ? strength.color : "bg-slate-100 dark:bg-white/5"
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
                <span>Password strength</span>
                <span className="font-semibold text-slate-600 dark:text-slate-350">{strength.label}</span>
              </div>
            </div>
          )}
        </div>

        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Confirm your password"
          error={errors.confirmPassword?.message}
          disabled={registration.isPending}
          {...register("confirmPassword")}
        />

        <div className="space-y-1 select-none">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              disabled={registration.isPending}
              className="mt-0.5 size-4 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04]"
              {...register("acceptTerms")}
            />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              I agree to the{" "}
              <Link to="/terms" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.acceptTerms && (
            <span className="block text-xs text-rose-500 mt-1">{errors.acceptTerms.message}</span>
          )}
        </div>

        {registration.isError && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            {getErrorMessage(registration.error)}
          </p>
        )}

        <Button className="w-full mt-2" type="submit" loading={registration.isPending}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Already registered?{" "}
        <Link className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300" to="/login">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
