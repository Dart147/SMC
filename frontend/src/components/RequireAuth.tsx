import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";

export function RequireAuth() {
  const token = useAuth((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
