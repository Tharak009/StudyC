import { type ReactNode } from "react";

interface FormHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
}

export function FormHeader({ icon, title, subtitle }: FormHeaderProps) {
  return (
    <div className="mb-8 text-center sm:text-left">
      <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-500/5 dark:ring-indigo-400/5">
        {icon}
      </div>
      <h2 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}
