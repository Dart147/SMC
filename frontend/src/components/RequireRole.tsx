import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";

export function RequireRole({ role }: { role: string }) {
  const user = useAuth((state) => state.user);
  if (!user || user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
