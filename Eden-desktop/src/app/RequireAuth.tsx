import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";

export function RequireAuth() {
  const { token, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) {
    return <main className="eden-loading">Loading session...</main>;
  }

  if (!token) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
