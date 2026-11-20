import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="session-loading">
        <p role="status">Checking your session…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/sign-in"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}