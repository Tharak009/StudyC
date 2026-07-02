import { useState } from "react";
import { Navigate, Outlet } from "react-router";
import { Sidebar } from "../components/sidebar";
import { TopNavbar } from "../components/top-navbar";
import { useAuthStore } from "../store/auth.store";

export function AdminLayout() {
  const user = useAuthStore((state) => state.user);
  const [collapsed, setCollapsed] = useState(false);

  // Role Access Control Safeguard
  if (!user || user.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ink-950 transition-colors duration-300">
      {/* Collapsible Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main workspace container */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ${
          collapsed ? "pl-0" : "pl-64"
        }`}
      >
        {/* Sticky Header Top Navbar */}
        <TopNavbar onToggleSidebar={() => setCollapsed(!collapsed)} />

        {/* Dashboard subpage container */}
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
