import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, GraduationCap, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { Button } from "../components/button";
import { Input } from "../components/input";
import { PasswordInput } from "../components/password-input";
import { AuthCard } from "../components/auth-card";
import { getErrorMessage, useLogin } from "../hooks/use-auth";

const schema = z.object({
  email: z.string().email("Enter your college email"),
  password: z.string().min(1, "Enter your password"),
});

type FormValues = z.infer<typeof schema>;

const trustItems = [
  "College verified",
  "Secure login",
  "Mobile friendly",
];

function GoogleIcon() {
  return (
    <span className="grid size-5 grid-cols-2 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <span className="bg-[#EA4335]" />
      <span className="bg-[#FBBC05]" />
      <span className="bg-[#34A853]" />
      <span className="bg-[#4285F4]" />
    </span>
  );
}

export function LoginPage() {
  const login = useLogin();
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem("studyconnect_remembered_email");
    if (savedEmail) {
      setValue("email", savedEmail);
      setRememberMe(true);
    }
  }, [setValue]);

  const onSubmit = (values: FormValues) => {
    if (rememberMe) {
      localStorage.setItem("studyconnect_remembered_email", values.email);
    } else {
      localStorage.removeItem("studyconnect_remembered_email");
    }
    login.mutate(values);
  };

  return (
    <AuthCard className="relative mx-auto">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
        <div className="absolute -right-16 -top-16 size-40 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-400/10" />
        <div className="absolute -left-12 bottom-0 size-36 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-400/10" />
      </div>

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
          <ShieldCheck size={12} />
          College access only
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-sky-500/20">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">StudyConnect</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">College collaboration platform</p>
          </div>
        </div>

        <h1 className="mt-7 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-[2.15rem]">
          Welcome Back
        </h1>
        <p className="mt-3 max-w-md text-base leading-7 text-slate-600 dark:text-slate-400">
          Sign in to continue your learning journey.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {trustItems.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
            >
              <CheckCircle2 size={12} className="text-sky-600 dark:text-sky-300" />
              {item}
            </span>
          ))}
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="College Email"
            type="email"
            autoComplete="email"
            placeholder="you@college.edu"
            error={errors.email?.message}
            leftIcon={<Mail size={18} />}
            disabled={login.isPending}
            {...register("email")}
          />

          <PasswordInput
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            disabled={login.isPending}
            {...register("password")}
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={login.isPending}
                className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500/20 dark:border-white/15 dark:bg-white/[0.03]"
              />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Remember me</span>
            </label>

            <Link
              className="text-sm font-semibold text-sky-700 transition hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
              to="/forgot-password"
            >
              Forgot Password?
            </Link>
          </div>

          {login.isError && (
            <p
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
            >
              {getErrorMessage(login.error)}
            </p>
          )}

          <Button className="w-full" type="submit" loading={login.isPending} variant="gradient">
            Sign In
            <ArrowRight size={16} />
          </Button>
        </form>

        <div className="relative my-7 flex items-center justify-center">
          <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200 dark:bg-white/10" />
          <span className="relative rounded-full bg-white px-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:bg-slate-950 dark:text-slate-500">
            OR
          </span>
        </div>

        <button
          type="button"
          className="secondary-button w-full justify-center py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          New to StudyConnect?{" "}
          <Link
            className="font-semibold text-sky-700 transition hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
            to="/register"
          >
            Create Account
          </Link>
        </p>

        <p className="mt-4 text-center text-xs leading-6 text-slate-500 dark:text-slate-500">
          By continuing, you agree to our{" "}
          <Link className="font-medium text-slate-700 underline underline-offset-4 dark:text-slate-300" to="/terms">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link className="font-medium text-slate-700 underline underline-offset-4 dark:text-slate-300" to="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </AuthCard>
  );
}
