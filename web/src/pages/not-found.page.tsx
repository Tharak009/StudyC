import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 text-center dark:bg-ink-950">
      <div>
        <p className="text-sm font-bold text-signal-500">404</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white">
          This page is not here.
        </h1>
        <Link to="/dashboard" className="secondary-button mt-7">
          <ArrowLeft size={17} />
          Back to StudyConnect
        </Link>
      </div>
    </main>
  );
}
