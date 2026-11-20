import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import useAuth from "../../hooks/useAuth";
import AuthLayout from "../../components/layout/AuthLayout";
import Button from "../../components/common/Button";
import { apiRequest } from "../../utils/api";

export default function PaymentSuccess() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const { user, loading: authLoading } =
    useAuth();

  const [paymentStatus, setPaymentStatus] =
    useState("checking");

  const sessionId =
    searchParams.get("session_id");

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate("/auth/sign-in", {
        replace: true,
        state: {
          from: { pathname: "/payment/success" },
        },
      });

      return;
    }

    let cancelled = false;
    let redirectTimer;

    async function confirmPayment() {
      setPaymentStatus("checking");

      if (sessionId) {
        try {
          const confirmation = await apiRequest(
            "/api/payments/confirm",
            {
              method: "POST",
              body: JSON.stringify({ sessionId }),
            }
          );

          if (cancelled) {
            return;
          }

          if (confirmation.isPaid) {
            setPaymentStatus("paid");
            redirectTimer = window.setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 1800);
            return;
          }
        } catch (error) {
          console.error("Checkout session confirmation failed:", error);
        }
      }

      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (cancelled) {
          return;
        }

        try {
          const entitlement = await apiRequest("/api/payments/me");

          if (entitlement.isPaid) {
            setPaymentStatus("paid");
            redirectTimer = window.setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 1800);
            return;
          }

          setPaymentStatus("waiting");
        } catch (error) {
          console.error("Payment status check failed:", error);
          setPaymentStatus("waiting");
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, 1500);
        });
      }

      if (!cancelled) {
        setPaymentStatus("error");
      }
    }

    confirmPayment();

    return () => {
      cancelled = true;
      window.clearTimeout(redirectTimer);
    };
  }, [
    authLoading,
    user,
    navigate,
    sessionId,
  ]);

  if (paymentStatus === "paid") {
    return (
      <AuthLayout
        title="Payment successful"
        lede="Your WestForce Portfolio account has been upgraded."
      >
        <p className="auth-notice" role="status">
          Taking you to your dashboard...
        </p>
      </AuthLayout>
    );
  }

  if (paymentStatus === "error") {
    return (
      <AuthLayout
        title="We could not confirm your payment yet"
        lede="Your payment may still be processing. Open your dashboard in a minute to check your plan."
      >
        <Button
          size="lg"
          className="full-width"
          onClick={() => navigate("/dashboard")}
        >
          Go to dashboard
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Confirming your payment"
      lede="Stripe sent you back to WestForce. We are waiting for the payment confirmation."
    >
      <div className="auth-progress" role="status">
        <span className="auth-spinner" aria-hidden="true" />
        Checking payment status...
      </div>

      {sessionId && (
        <p className="auth-meta">
          Reference: <span className="auth-code">{sessionId}</span>
        </p>
      )}
    </AuthLayout>
  );
}
