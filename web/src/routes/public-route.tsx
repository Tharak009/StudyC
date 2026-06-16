import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../store/auth.store";

export function PublicRoute() {
  const user = useAuthStore((state) => state.user);
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
