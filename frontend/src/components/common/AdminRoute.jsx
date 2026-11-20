import { Navigate, Outlet } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import useIsAdmin from "../../hooks/useIsAdmin";
import PageSkeleton from "../dashboard/Skeleton";

export default function AdminRoute() {
  const { isAdmin, loading, error, refresh } = useIsAdmin();

  if (loading) {
    return (
      <div className="dashboard-product">
        <PageSkeleton layout="list" label="Checking your access" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-product">
        <div className="empty-product" role="alert">
          <span className="empty-product-icon"><AlertCircle size={22} aria-hidden="true" /></span>
          <h2>Could not check your access</h2>
          <p>{error}</p>
          <button className="product-button primary" type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
