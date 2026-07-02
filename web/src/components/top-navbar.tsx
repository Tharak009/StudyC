import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/auth.store";
import { useLogout } from "../hooks/use-auth";
import { ThemeToggle } from "./theme-toggle";
import { Search, Bell, User, Settings, LogOut, Menu } from "lucide-react";
import { Link } from "react-router";

interface TopNavbarProps {
  onToggleSidebar: () => void;
  title?: string;
}

export function TopNavbar({ onToggleSidebar, title = "Admin Dashboard" }: TopNavbarProps) {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md dark:border-white/5 dark:bg-ink-900/80 transition-colors duration-300">
      {/* Title & Mobile Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
          {title}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative hidden sm:block w-48 md:w-64">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="text"
            placeholder="Search dashboard..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-450 focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-500 dark:focus:bg-white/[0.04]"
          />
        </div>

        {/* Notifications Icon Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex size-9 items-center justify-center rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
          >
            <Bell size={18} />
            <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-rose-500" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2.5 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-white/5 dark:bg-ink-900 animate-fade-up">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3 dark:border-white/5">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Notifications
                </h3>
                <span className="text-[10px] text-slate-400">0 unread</span>
              </div>
              <div className="py-6 text-center text-xs text-slate-400">
                <Bell size={24} className="mx-auto text-slate-350 dark:text-slate-500 mb-2" />
                No new administrative alerts
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="flex size-9 items-center justify-center rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] transition-all">
          <ThemeToggle />
        </div>

        {/* Profile Avatar Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-xs font-bold text-white shadow-md cursor-pointer hover:opacity-95 transition-all"
          >
            {initials}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-52 origin-top-right rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xl dark:border-white/5 dark:bg-ink-900 animate-fade-up">
              {/* Profile Overview */}
              <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 mb-1.5">
                <span className="block text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {user?.fullName || "Administrator"}
                </span>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {user?.email || "admin@college.edu"}
                </span>
              </div>

              {/* Menu Links */}
              <Link
                to="/admin/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-white/[0.03] transition-all"
              >
                <User size={15} />
                Admin Profile
              </Link>
              <Link
                to="/admin/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-white/[0.03] transition-all"
              >
                <Settings size={15} />
                System Settings
              </Link>

              {/* Logout Button */}
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout.mutate();
                }}
                disabled={logout.isPending}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all text-left"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
