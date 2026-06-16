import { Bell, BookOpen, ChevronRight, MessageCircle, MessagesSquare, ShieldCheck, Video } from "lucide-react";
import { Link } from "react-router";
import { Avatar } from "../components/avatar";
import { ComingSoonRow } from "../components/coming-soon-row";
import { useAuthStore } from "../store/auth.store";

const futureModules = [
  {
    icon: MessagesSquare,
    title: "Community chat",
    description: "Real-time conversations inside the communities you join.",
    stage: "Planned"
  },
  {
    icon: MessageCircle,
    title: "Direct messages",
    description: "Private student-to-student conversations.",
    stage: "Planned"
  },
  {
    icon: BookOpen,
    title: "Resource library",
    description: "Share and discover useful academic materials.",
    stage: "Planned"
  }
];

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)!;
  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="animate-fade-up">
      <section className="flex flex-col justify-between gap-7 border-b border-slate-200 pb-9 dark:border-white/10 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-signal-500 dark:text-signal-300">
            Student workspace
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Good to see you, {firstName}.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Your identity is verified. Complete your profile now so future collaboration starts
            with useful context.
          </p>
        </div>
        <Link to="/profile" className="secondary-button shrink-0">
          Edit profile
          <ChevronRight size={17} />
        </Link>
      </section>

      <div className="grid gap-10 py-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-16">
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.025em]">Coming to StudyConnect</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Product surfaces reserved for future phases.
              </p>
            </div>
            <span className="hidden text-xs font-medium text-slate-400 sm:block">Phase 2+</span>
          </div>
          <div>
            {futureModules.map((module) => (
              <ComingSoonRow key={module.title} {...module} />
            ))}
          </div>

          <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-xl font-semibold tracking-[-0.025em]">Communities are live</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Create and join academic spaces for courses, interview prep, coding, and campus learning groups.
            </p>
            <Link to="/communities" className="secondary-button mt-5 w-fit">
              Browse communities
              <ChevronRight size={17} />
            </Link>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl bg-ink-950 p-6 text-white sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <span className="mb-6 grid size-10 place-items-center rounded-xl bg-white/10 text-signal-300">
                  <Video size={19} />
                </span>
                <h2 className="text-2xl font-semibold tracking-[-0.035em]">Calls are on the roadmap.</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                  Voice, video, and screen sharing will be designed after the collaboration model is
                  established. No WebRTC behavior is active in Phase 1.
                </p>
              </div>
              <span className="hidden size-24 rounded-full border border-white/10 sm:block" />
            </div>
          </div>
        </section>

        <aside className="space-y-8">
          <section>
            <h2 className="mb-4 text-sm font-semibold">Your account</h2>
            <div className="flex items-center gap-4">
              <Avatar name={user.fullName} src={user.profilePicture} className="size-14" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{user.fullName}</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {user.department} · Year {user.academicYear}
                </p>
              </div>
            </div>
            <dl className="mt-6 space-y-4 border-t border-slate-200 pt-5 text-sm dark:border-white/10">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Roll number</dt>
                <dd className="font-medium">{user.rollNumber}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Role</dt>
                <dd className="font-medium">{user.role}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Status</dt>
                <dd className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-current" />
                  {user.status}
                </dd>
              </div>
            </dl>
          </section>

          <section className="border-t border-slate-200 pt-7 dark:border-white/10">
            <div className="flex items-center gap-3">
              <ShieldCheck size={19} className="text-signal-500" />
              <div>
                <h2 className="text-sm font-semibold">Security foundation</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Protected by short-lived access tokens and rotating refresh sessions.
                </p>
              </div>
            </div>
          </section>

          <section className="flex items-center gap-3 border-t border-slate-200 pt-7 text-slate-400 dark:border-white/10">
            <Bell size={17} />
            <p className="text-xs">Notifications are intentionally inactive in Phase 1.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
