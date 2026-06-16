import { Link } from "react-router";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/dashboard" className="group inline-flex items-center gap-3" aria-label="StudyConnect">
      <span className="grid size-9 place-items-center rounded-xl bg-signal-500 text-sm font-black text-white shadow-lg shadow-signal-500/20 transition-transform group-hover:-rotate-3">
        SC
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">
          StudyConnect
        </span>
      )}
    </Link>
  );
}
