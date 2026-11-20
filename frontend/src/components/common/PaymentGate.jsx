import { useApp } from "../../app/providers";
import useEntitlement from "../../hooks/useEntitlement";

export default function PaymentGate({
  children,
  fallback,
}) {
  const { openPaymentModal } = useApp();

  const {
    isPaid,
    loading,
  } = useEntitlement();

  if (loading) {
    return (
      <div className="empty-product" role="status">
        Checking your plan...
      </div>
    );
  }

  if (isPaid) {
    return children;
  }

  if (fallback) {
    return fallback;
  }

  return (
    <div className="empty-product">
      <h2>
        Unlock this feature
      </h2>

      <p>
        Complete your WestForce payment
        to use this feature.
      </p>

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => openPaymentModal("Choose a plan to unlock this feature.")}
      >
        View plans
      </button>
    </div>
  );
}