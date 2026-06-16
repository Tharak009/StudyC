import { BarChart3, Flag, LayoutDashboard, Library, ShieldCheck, UsersRound } from "lucide-react";
import { NavLink } from "react-router";

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: UsersRound },
  { to: "/admin/communities", label: "Communities", icon: BarChart3 },
  { to: "/admin/resources", label: "Resources", icon: Library },
  { to: "/admin/reports", label: "Reports", icon: Flag }
];

export function AdminSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="mb-6 flex items-center gap-2 border-b border-slate-200 pb-4 dark:border-white/10">
        <ShieldCheck size={16} className="text-signal-500" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Admin panel
        </span>
      </div>
      <nav className="space-y-1">
        {adminNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-950 text-white dark:bg-white dark:text-ink-950"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
