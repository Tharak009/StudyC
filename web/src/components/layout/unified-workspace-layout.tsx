import { ArrowLeft, MessageCircle, Phone, Users, LockKeyhole, Settings, Video } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useChatPrivacyStore } from "../../store/chat-privacy.store";

const primarySections = [
  { to: "/chat", label: "Chats", icon: MessageCircle },
  { to: "/communities", label: "Study Circles", icon: Users },
  { to: "/calls", label: "Call History", icon: Phone },
  { to: "/study-meetings", label: "Study Meetings", icon: Video },
  { to: "/locked-chats", label: "Locked Chats", icon: LockKeyhole },
];

const accountSections = [
  { to: "/messaging-settings", label: "Settings", icon: Settings },
];

export function UnifiedWorkspaceLayout() {
  const location = useLocation();
  const lockedConversationCount = useChatPrivacyStore((state) => state.lockedConversationIds.length);
  const renderLink = ({ to, label, icon: Icon }: (typeof primarySections)[number] | (typeof accountSections)[number]) => {
    const active = to === "/communities" || to === "/messaging-settings"
      ? location.pathname.startsWith(to)
      : to === "/study-meetings"
        ? location.pathname.startsWith(to)
        : location.pathname === to;
    return (
      <NavLink key={to} to={to} aria-label={label} title={label} aria-current={active ? "page" : undefined}
        className={`group flex size-11 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] ${active ? "bg-[#1E90FF]/12 text-[#1E90FF] dark:bg-[#1E90FF]/20 dark:text-[#55B5FF]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"}`}>
        <Icon size={19} strokeWidth={active ? 2.4 : 1.9} className="shrink-0" />
      </NavLink>
    );
  };

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100">
      <nav aria-label="Main navigation" className="z-20 flex w-[68px] shrink-0 flex-col items-center border-r border-slate-200 bg-white px-2 py-3 dark:border-white/10 dark:bg-[#0B132B]">
        <div aria-label="StudyConnect" title="StudyConnect" className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[#1E90FF] text-xs font-black text-white shadow-sm">SC</div>
        <NavLink to="/dashboard" aria-label="Back to Dashboard" title="Back to Dashboard" className="mb-4 flex size-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#1E90FF] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-[#55B5FF]">
          <ArrowLeft size={19} />
        </NavLink>
        <div className="flex flex-1 flex-col items-center gap-1">
          {primarySections
            .filter((section) => section.to !== "/locked-chats" || lockedConversationCount > 0)
            .map(renderLink)}
        </div>

        <div className="my-3 w-full border-t border-slate-200 dark:border-white/10" />
        <div className="flex flex-col items-center gap-1">
          {accountSections.map(renderLink)}
        </div>
      </nav>
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden"><Outlet /></div>
    </div>
  );
}
