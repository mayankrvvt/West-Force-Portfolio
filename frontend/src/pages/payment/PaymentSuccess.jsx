import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import useAuth from "../../hooks/useAuth";
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

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px",
        background:
          "linear-gradient(135deg, #f7fbff, #eef6fb)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          padding: "48px 36px",
          borderRadius: "20px",
          background: "#ffffff",
          boxShadow:
            "0 20px 60px rgba(15, 59, 92, 0.12)",
          textAlign: "center",
        }}
      >
        {paymentStatus === "paid" ? (
          <>
            <div
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 20px",
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                background: "#e8f8ef",
                color: "#16834b",
                fontSize: "30px",
                fontWeight: 700,
              }}
            >
              ✓
            </div>

            <h1>
              Payment successful
            </h1>

            <p>
              Your WestForce Portfolio
              account has been upgraded.
            </p>

            <p>
              Redirecting you to your
              dashboard...
            </p>
          </>
        ) : paymentStatus === "error" ? (
          <>
            <h1>
              We couldn't confirm the
              payment yet
            </h1>

            <p>
              Your payment may still be
              processing. Please check
              your dashboard in a moment.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/dashboard")
              }
            >
              Go to dashboard
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                width: "52px",
                height: "52px",
                margin: "0 auto 20px",
                borderRadius: "50%",
                border:
                  "4px solid #dbeaf4",
                borderTopColor:
                  "#087fbe",
                animation:
                  "westforce-spin 1s linear infinite",
              }}
            />

            <h1>
              Confirming your payment
            </h1>

            <p>
              Stripe has redirected you
              successfully. We're waiting
              for the payment confirmation.
            </p>

            {sessionId && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#71869d",
                  wordBreak:
                    "break-all",
                }}
              >
                Session: {sessionId}
              </p>
            )}
          </>
        )}
      </section>

      <style>
        {`
          @keyframes westforce-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </main>
  );
}