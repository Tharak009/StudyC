import {
  ChevronDown,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Settings,
  ShieldCheck,
  UsersRound,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { Avatar } from "../components/avatar";
import { Brand } from "../components/brand";
import { NotificationBell } from "../components/notification-bell";
import { NotificationDropdown } from "../components/notification-dropdown";
import { ThemeToggle } from "../components/theme-toggle";
import { useLogout } from "../hooks/use-auth";
import { useSocketNotifications } from "../hooks/use-socket-notifications";
import { useUnreadCount } from "../hooks/use-notification";
import { useAuthStore } from "../store/auth.store";
import { useNotificationStore } from "../store/notification.store";

const navigation = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/communities", label: "Communities", icon: UsersRound },
  { to: "/direct-messages", label: "Messages", icon: Mail },
  { to: "/profile", label: "Profile", icon: CircleUserRound }
];

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const user = useAuthStore((state) => state.user)!;
  const logout = useLogout();

  useSocketNotifications();
  const { data: unreadData } = useUnreadCount();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  useEffect(() => {
    if (unreadData?.count !== undefined) {
      setUnreadCount(unreadData.count);
    }
  }, [unreadData?.count, setUnreadCount]);

  const navItems = [
    ...navigation,
    ...(user.role === "ADMIN"
      ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }]
      : [])
  ];

  const nav = (
    <nav className="mt-9 space-y-1">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-slate-950 text-white dark:bg-white dark:text-ink-950"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-ink-950 dark:text-white">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-ink-900 lg:block">
        <Brand />
        {nav}
        <div className="absolute inset-x-5 bottom-5">
          <div className="mb-3 flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
            <Avatar name={user.fullName} src={user.profilePicture} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.fullName}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.rollNumber}</p>
            </div>
            <ChevronDown size={15} className="text-slate-400" />
          </div>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(82vw,300px)] bg-white p-5 shadow-2xl dark:bg-ink-900">
            <div className="flex items-center justify-between">
              <Brand />
              <button className="icon-button" onClick={() => setMenuOpen(false)} type="button">
                <X size={19} />
              </button>
            </div>
            {nav}
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="absolute inset-x-5 bottom-6 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500"
            >
              <LogOut size={17} />
              Sign out
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-slate-50/85 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-ink-950/80 sm:px-7 lg:px-10">
          <button
            type="button"
            className="icon-button lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <p className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 sm:block">
            Verified campus workspace
          </p>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <NotificationBell
                onClick={() => setNotifOpen(!notifOpen)}
                hasNotifications={(unreadData?.count ?? 0) > 0}
              />
              {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
            </div>
            <ThemeToggle />
            <NavLink to="/profile" className="icon-button" aria-label="Profile settings">
              <Settings size={18} />
            </NavLink>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-7 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
