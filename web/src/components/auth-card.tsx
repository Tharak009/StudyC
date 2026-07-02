import { type ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
  className?: string;
}

export function AuthCard({ children, className = "" }: AuthCardProps) {
  return (
    <div
      className={`w-full max-w-[560px] rounded-[2rem] border border-slate-200/70 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-slate-950/90 dark:shadow-black/20 sm:p-8 lg:p-10 ${className}`}
    >
      {children}
    </div>
  );
}
