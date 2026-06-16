import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { FormField } from "../components/form-field";
import { getErrorMessage, useRegister } from "../hooks/use-auth";

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name").max(100),
  rollNumber: z.string().min(2, "Enter your roll number").max(30),
  department: z.string().min(2, "Enter your department").max(100),
  academicYear: z.coerce.number().int().min(1).max(8),
  email: z.string().email("Enter a valid college email"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/[0-9]/, "Add a number")
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const registration = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { academicYear: 1 }
  });

  return (
    <>
      <div className="mb-8">
        <span className="mb-5 grid size-11 place-items-center rounded-2xl bg-signal-500/10 text-signal-500 dark:bg-signal-400/10 dark:text-signal-300">
          <BadgeCheck size={21} />
        </span>
        <h2 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 dark:text-white">
          Join your campus
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Your college email keeps the network private and relevant.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit((values) => registration.mutate(values))}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Full name"
            placeholder="Aarav Sharma"
            autoComplete="name"
            error={errors.fullName?.message}
            {...register("fullName")}
          />
          <FormField
            label="Roll number"
            placeholder="CS24-104"
            error={errors.rollNumber?.message}
            {...register("rollNumber")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <FormField
            label="Department"
            placeholder="Computer Science"
            error={errors.department?.message}
            {...register("department")}
          />
          <FormField
            label="Year"
            type="number"
            min={1}
            max={8}
            error={errors.academicYear?.message}
            {...register("academicYear", { valueAsNumber: true })}
          />
        </div>
        <FormField
          label="College email"
          type="email"
          autoComplete="email"
          placeholder="you@college.edu"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label="Password"
          type="password"
          showPasswordToggle
          autoComplete="new-password"
          placeholder="8+ characters"
          error={errors.password?.message}
          {...register("password")}
        />

        {registration.isError && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
            {getErrorMessage(registration.error)}
          </p>
        )}

        <button className="primary-button mt-2 w-full" type="submit" disabled={registration.isPending}>
          {registration.isPending ? "Creating account..." : "Create account"}
          {!registration.isPending && <ArrowRight size={18} />}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already registered?{" "}
        <Link className="font-semibold text-slate-950 hover:text-signal-500 dark:text-white" to="/login">
          Sign in
        </Link>
      </p>
    </>
  );
}
