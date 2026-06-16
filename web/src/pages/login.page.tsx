import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { FormField } from "../components/form-field";
import { getErrorMessage, useLogin } from "../hooks/use-auth";

const schema = z.object({
  email: z.string().email("Enter your college email"),
  password: z.string().min(1, "Enter your password")
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <>
      <div className="mb-9">
        <span className="mb-5 grid size-11 place-items-center rounded-2xl bg-signal-500/10 text-signal-500 dark:bg-signal-400/10 dark:text-signal-300">
          <LockKeyhole size={21} />
        </span>
        <h2 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 dark:text-white">
          Welcome back
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Sign in with your approved college account.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit((values) => login.mutate(values))}>
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
          autoComplete="current-password"
          placeholder="Your password"
          error={errors.password?.message}
          {...register("password")}
        />

        {login.isError && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
            {getErrorMessage(login.error)}
          </p>
        )}

        <button className="primary-button w-full" type="submit" disabled={login.isPending}>
          {login.isPending ? "Signing in..." : "Sign in"}
          {!login.isPending && <ArrowRight size={18} />}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">
        New to StudyConnect?{" "}
        <Link className="font-semibold text-slate-950 hover:text-signal-500 dark:text-white" to="/register">
          Create your account
        </Link>
      </p>
    </>
  );
}
