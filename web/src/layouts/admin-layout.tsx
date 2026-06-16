import { Outlet } from "react-router";
import { AdminSidebar } from "../components/admin-sidebar";

export function AdminLayout() {
  return (
    <div className="flex gap-10">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
