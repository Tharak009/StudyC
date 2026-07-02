import { Outlet } from "react-router";
import { Brand } from "../components/brand";
import { ThemeToggle } from "../components/theme-toggle";
import {
  ArrowUpRight,
  Bot,
  BookOpen,
  CheckCircle2,
  Code2,
  GraduationCap,
  MessageSquare,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

export function AuthLayout() {
  const featureCards = [
    {
      title: "Live study room",
      description: "Real-time chat, whiteboards, and quick resources in one space.",
      icon: <Users size={18} />,
      accent: "from-sky-500 to-blue-600",
    },
    {
      title: "AI learning assistant",
      description: "Explain concepts, draft notes, and summarize lectures faster.",
      icon: <Bot size={18} />,
      accent: "from-indigo-500 to-violet-600",
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.10),transparent_28%),#f5f7fb] transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.10),transparent_28%),#060913]">
      <header className="absolute inset-x-0 top-0 z-10 flex h-20 items-center justify-between px-6 sm:px-10">
        <Brand />
        <ThemeToggle />
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-[1720px] flex-col lg:grid lg:grid-cols-[1.12fr_0.88fr]">
        <section className="relative overflow-hidden border-b border-slate-200/70 bg-white/30 px-6 pb-10 pt-24 transition-colors duration-300 sm:px-10 lg:order-first lg:min-h-screen lg:border-b-0 lg:border-r lg:border-slate-200/60 lg:px-16 lg:pb-16 lg:pt-28 xl:px-20 dark:border-white/8 dark:bg-white/[0.02]">
          <div className="absolute inset-0 auth-grid opacity-40 pointer-events-none dark:opacity-25" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-[-8%] top-[8%] size-[28rem] rounded-full bg-sky-500/10 blur-[120px] animate-blob-1" />
            <div className="absolute bottom-[8%] right-[-10%] size-[26rem] rounded-full bg-indigo-500/10 blur-[130px] animate-blob-2" />
            <div className="absolute left-[35%] top-[30%] size-[18rem] rounded-full bg-cyan-400/10 blur-[110px] animate-blob-1" />
          </div>

          <div className="relative flex min-h-[52vh] flex-col justify-between gap-8 lg:min-h-[calc(100vh-7rem)]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 shadow-sm backdrop-blur dark:border-sky-400/20 dark:bg-white/5 dark:text-sky-300">
                <Sparkles size={12} />
                Private campus network
              </div>

              <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl xl:text-6xl dark:text-white">
                A smarter space for
                <span className="block bg-gradient-to-r from-sky-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent dark:from-sky-400 dark:via-indigo-400 dark:to-cyan-300">
                  college collaboration.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-400">
                StudyConnect brings together classmates, study rooms, code sharing, video sessions, and an AI learning assistant inside one polished campus workspace.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:p-7 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
              <div className="absolute -left-16 top-6 size-36 rounded-full bg-sky-400/15 blur-3xl" />
              <div className="absolute -right-12 bottom-2 size-36 rounded-full bg-indigo-500/15 blur-3xl" />

              <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(30,64,175,0.92))] p-5 text-white shadow-lg dark:border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-white/12 text-white">
                        <GraduationCap size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Live Study Room</p>
                        <p className="text-xs text-white/70">Active now in your college network</p>
                      </div>
                    </div>
                    <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
                      124 online
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/80">Coding sync</span>
                        <Code2 size={16} className="text-sky-100" />
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <div className="size-9 rounded-full bg-gradient-to-br from-sky-300 to-sky-500 ring-2 ring-slate-950/30" />
                          <div className="size-9 rounded-full bg-gradient-to-br from-indigo-300 to-indigo-500 ring-2 ring-slate-950/30" />
                          <div className="size-9 rounded-full bg-gradient-to-br from-cyan-300 to-cyan-500 ring-2 ring-slate-950/30" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Shared notes</p>
                          <p className="text-xs text-white/70">Collaborative editing live</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/80">Video meeting</span>
                        <Video size={16} className="text-sky-100" />
                      </div>
                      <div className="mt-4 flex items-end gap-2">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-300 to-emerald-500" />
                        <div className="h-16 w-12 rounded-2xl bg-gradient-to-br from-sky-300 to-sky-500" />
                        <div className="h-10 w-12 rounded-2xl bg-gradient-to-br from-indigo-300 to-indigo-500" />
                        <div className="h-14 w-12 rounded-2xl bg-gradient-to-br from-cyan-300 to-cyan-500" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/8 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-100">
                        <Bot size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">AI learning assistant</p>
                        <p className="text-xs text-white/70">Explains concepts, drafts summaries, and helps you revise faster.</p>
                      </div>
                      <ArrowUpRight size={16} className="text-white/70" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {featureCards.map((card) => (
                    <div key={card.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="flex items-start gap-4">
                        <div className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${card.accent} text-white shadow-lg shadow-slate-950/10`}>
                          {card.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-slate-950 dark:text-white">{card.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{card.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                        <BookOpen size={16} className="text-sky-600 dark:text-sky-300" />
                        Resource sharing
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        Notes, PDFs, and links stay organized for every study group.
                      </p>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                        <MessageSquare size={16} className="text-indigo-600 dark:text-indigo-300" />
                        Instant chat
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        Quick messages and room updates keep group work moving smoothly.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300" />
                        Verified campus access
                      </div>
                      <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Secure
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center dark:bg-white/[0.04]">
                        Join rooms
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center dark:bg-white/[0.04]">
                        Share files
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center dark:bg-white/[0.04]">
                        Study together
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                College verified
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                Real-time collaboration
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                Built for mobile and web
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 items-start justify-center px-6 py-10 sm:px-10 sm:py-14 lg:min-h-screen lg:items-center lg:px-12 lg:py-24">
          <div className="flex w-full justify-center animate-fade-up">
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}
