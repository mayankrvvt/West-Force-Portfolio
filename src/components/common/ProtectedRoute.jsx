import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p>Checking your session...</p>
        </div>
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