import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { useApp } from "../../app/providers";
import useEntitlement from "../../hooks/useEntitlement";

export default function PaidAccessRoute() {
  const {
    isPaid,
    loading,
    error,
    emailVerificationRequired,
  } = useEntitlement();
  const { openPaymentModal } = useApp();

  useEffect(() => {
    if (!loading && !error && !isPaid) {
      openPaymentModal(
        emailVerificationRequired
          ? "Verify your email address to claim your group plan seat."
          : "Choose a plan to use this career service."
      );
    }
  }, [
    loading,
    error,
    isPaid,
    emailVerificationRequired,
    openPaymentModal,
  ]);

  if (loading) {
    return (
      <div className="dashboard-product">
        <div className="empty-product" role="status">
          Checking your plan...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-product">
        <div className="empty-product" role="alert">
          <h2>Could not check your plan</h2>
          <p>{error}</p>
          <button
            className="product-button primary"
            type="button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!isPaid) {
    return (
      <div className="dashboard-product">
        <div className="empty-product">
          <h2>This service requires a plan</h2>
          <p>
            Your portfolio draft and preview remain available. Choose a
            one-time plan to unlock this service.
          </p>
          <button
            className="product-button primary"
            type="button"
            onClick={() =>
              openPaymentModal("Choose a plan to unlock this service.")
            }
          >
            View plans
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
