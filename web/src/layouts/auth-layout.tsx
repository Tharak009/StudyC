import { Outlet } from "react-router";
import { Brand } from "../components/brand";
import { ThemeToggle } from "../components/theme-toggle";

export function AuthLayout() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center relative px-4 py-20 overflow-x-hidden transition-colors duration-300">
      
      {/* Absolute Header with Brand & Theme Toggle */}
      <header className="absolute inset-x-0 top-0 z-10 flex h-20 items-center justify-between px-6 sm:px-10">
        <Brand />
        <ThemeToggle />
      </header>

      {/* Decorative premium background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-[#1E90FF]/15 dark:bg-[#1E90FF]/15 rounded-full blur-3xl animate-blob-1" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-[#1E90FF]/10 dark:bg-[#1E90FF]/10 rounded-full blur-3xl animate-blob-2" />
      </div>

      {/* Centered form card container */}
      <div className="relative z-10 w-full flex justify-center items-center mt-8 animate-fade-up">
        <Outlet />
      </div>

    </main>
  );
}
