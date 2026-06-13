import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

/**
 * Route-level authentication and authorization guard.
 *
 * - Redirects to `/` when the user is not authenticated.
 * - Redirects to `/` when a `requiredRole` is specified and the
 *   user's role doesn't match.
 * - Preserves the attempted URL in `location.state.from` so the
 *   login page can redirect back after auth.
 */
export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    const isAllowed =
      user?.role === requiredRole ||
      (requiredRole === "user" && user?.role === "admin");

    if (!isAllowed) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
