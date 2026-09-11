import { Link } from "react-router";

export function Brand({ compact = false, textColor }: { compact?: boolean; textColor?: string }) {
  return (
    <Link to="/dashboard" className="group inline-flex items-center gap-3" aria-label="StudyConnect">
      <span className="grid size-9 place-items-center rounded-xl bg-[#1E90FF] text-sm font-black text-white shadow-lg shadow-[#1E90FF]/25 transition-transform group-hover:-rotate-3">
        SC
      </span>
      {!compact && (
        <span className={`text-[15px] font-semibold tracking-[-0.02em] ${textColor || "text-slate-950 dark:text-white"}`}>
          StudyConnect
        </span>
      )}
    </Link>
  );
}
