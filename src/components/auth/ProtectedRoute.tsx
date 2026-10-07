import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/constants/routes";
import { Loader } from "@/components/ui/Loader";

/**
 * ProtectedRoute - Document 07: protects every /dashboard route.
 * Unauthenticated visitors are redirected to /admin-login, with the
 * originally requested page preserved so they land back on it after
 * signing in.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader label="Checking your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate to={ROUTES.adminLogin} state={{ from: location }} replace />
    );
  }

  return <>{children}</>;
}
