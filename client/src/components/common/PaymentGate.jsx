import { useNavigate } from "react-router-dom";

import useEntitlement from "../../hooks/useEntitlement";

export default function PaymentGate({
  children,
  fallback,
}) {
  const navigate = useNavigate();

  const {
    isPaid,
    loading,
  } = useEntitlement();

  if (loading) {
    return (
      <div>
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
    <div
      style={{
        padding: "24px",
        borderRadius: "16px",
        background: "#f5f9fc",
        border: "1px solid #dfe8ef",
      }}
    >
      <h3>
        Unlock this feature
      </h3>

      <p>
        Complete your WestForce payment
        to use this feature.
      </p>

      <button
        type="button"
        onClick={() =>
          navigate("/pricing")
        }
      >
        View pricing
      </button>
    </div>
  );
}