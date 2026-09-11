import { NavLink } from "react-router";
import { useLogout } from "../hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  Compass,
  Calendar,
  ShieldAlert,
  Flag,
  Megaphone,
  LineChart,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/communities", label: "Community Management", icon: Compass },
  { to: "/admin/events", label: "Event Management", icon: Calendar },
  { to: "/admin/moderation", label: "Content Moderation", icon: ShieldAlert },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/analytics", label: "Analytics", icon: LineChart },
  { to: "/admin/settings", label: "System Settings", icon: Settings },
  { to: "/admin/profile", label: "Admin Profile", icon: User },
];

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const logout = useLogout();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 flex flex-col bg-white dark:bg-ink-900 transition-all duration-300 ${
        collapsed
          ? "w-0 -translate-x-full border-r-0"
          : "w-64 translate-x-0 border-r border-slate-200 dark:border-white/5"
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-md">
            <ShieldCheck size={20} />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
              StudyConnect
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex size-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation list */}
      <nav className={`flex-1 p-3 space-y-1 scrollbar-none no-scrollbar overflow-x-hidden ${
        collapsed ? "overflow-hidden" : "overflow-y-auto"
      }`}>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? "bg-indigo-50 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400 font-semibold"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.03] dark:hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={`shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                {!collapsed && <span className="truncate">{label}</span>}
                {collapsed && (
                  <div className="absolute left-16 z-30 scale-0 rounded-lg bg-slate-950 px-2 py-1.5 text-xs text-white shadow-md transition-all group-hover:scale-100 dark:bg-white dark:text-slate-900 whitespace-nowrap">
                    {label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer (Logout) */}
      <div className="p-3 border-t border-slate-200 dark:border-white/5">
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          title={collapsed ? "Logout" : undefined}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-200 group relative"
        >
          <LogOut size={18} className="shrink-0 transition-transform group-hover:scale-105" />
          {!collapsed && <span className="truncate">Logout</span>}
          {collapsed && (
            <div className="absolute left-16 z-30 scale-0 rounded-lg bg-rose-600 px-2 py-1.5 text-xs text-white shadow-md transition-all group-hover:scale-100 whitespace-nowrap">
              Logout
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
