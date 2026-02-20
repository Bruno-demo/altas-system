// What this does: blocks access if not logged in, and restricts routes by role
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({
  children,
  roles,
  allowedRoles,
  allowPasswordChange,
}) {
  const { user, token } = useAuth();
  const roleList =
    Array.isArray(roles) && roles.length > 0 ? roles : allowedRoles;

  if (!token || !user) return <Navigate to="/login" replace />;

  // What this does: forces password change when backend returns mustChangePassword=true
  if (user.mustChangePassword && !allowPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  // What this does: checks role-based authorization when roles are provided
  if (roleList && roleList.length > 0 && !roleList.includes(user.role)) {
    return <Navigate to="/not-allowed" replace />;
  }

  return children || <Outlet />;
}
