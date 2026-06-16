import { Brand } from "./brand";

export function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-white dark:bg-ink-950">
      <div className="flex flex-col items-center gap-5">
        <Brand />
        <span className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-signal-500 dark:border-ink-700 dark:border-t-signal-400" />
        <span className="sr-only">Loading StudyConnect</span>
      </div>
    </div>
  );
}
