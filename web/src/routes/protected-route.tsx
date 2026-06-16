import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "../store/auth.store";

export function ProtectedRoute() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
