import { Outlet } from "react-router";
import { Brand } from "../components/brand";
import { ThemeToggle } from "../components/theme-toggle";

export function AuthLayout() {
  return (
    <main className="min-h-screen bg-white dark:bg-ink-950">
      <header className="absolute inset-x-0 top-0 z-10 flex h-20 items-center justify-between px-5 sm:px-8">
        <Brand />
        <ThemeToggle />
      </header>

      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(480px,.92fr)]">
        <section className="relative hidden overflow-hidden bg-ink-950 lg:block">
          <div className="absolute inset-0 auth-grid opacity-50" />
          <div className="absolute -left-24 top-1/3 size-[440px] rounded-full bg-signal-500/20 blur-[110px]" />
          <div className="relative flex h-full flex-col justify-end p-14 xl:p-20">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-signal-300">
              College, connected
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-white xl:text-6xl">
              Your campus work deserves one focused place.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
              A private student workspace built around verified college identities and meaningful
              collaboration.
            </p>
            <div className="mt-12 flex items-center gap-3 text-xs font-medium text-slate-500">
              <span className="size-2 rounded-full bg-emerald-400" />
              Phase 1 identity foundation is active
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-28 sm:px-10">
          <div className="w-full max-w-md animate-fade-up">
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}
