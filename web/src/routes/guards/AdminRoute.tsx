import React, { useEffect, useRef } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "../../store/auth.store";
import { useToastStore } from "../../store/toast.store";
import type { Role } from "../../types/auth";

interface AdminRouteProps {
  allowedRoles?: Role[];
  redirectTo?: string;
}

const DEFAULT_ADMIN_ROLES: Role[] = ["ADMIN", "MODERATOR"];

export function AdminRoute({
  allowedRoles = DEFAULT_ADMIN_ROLES,
  redirectTo = "/403"
}: AdminRouteProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  const { addToast } = useToastStore();
  const toastFiredRef = useRef(false);

  // Check if current user possesses required administrative or moderation clearance
  const hasAccess = Boolean(user && allowedRoles.includes(user.role));

  useEffect(() => {
    if (user && !hasAccess && !toastFiredRef.current) {
      toastFiredRef.current = true;
      addToast("Access Denied: Administrative privileges required.", "error");
    }
  }, [user, hasAccess, addToast]);

  // If user is somehow unauthenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If user role is not authorized (e.g. STUDENT), redirect to 403 Forbidden Screen
  if (!hasAccess) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{
          from: location.pathname,
          attemptedRole: user.role,
          requiredRoles: allowedRoles
        }}
      />
    );
  }

  // Render authorized admin sub-tree
  return <Outlet />;
}

export default AdminRoute;
