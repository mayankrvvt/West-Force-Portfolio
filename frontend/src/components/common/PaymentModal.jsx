import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";

import { plans } from "../../constants/pricingData";
import useAuth from "../../hooks/useAuth";
import useEntitlement from "../../hooks/useEntitlement";
import { createCheckoutSession } from "../../services/stripe";
import { useApp } from "../../app/providers";
import { auth } from "../../firebase/firebase";
import "../../styles/payment-modal.css";

const EMPTY_GROUP_EMAILS = ["", "", "", ""];

function formatCad(amount) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PaymentModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { emailVerificationRequired } = useEntitlement();
  const {
    paymentModal,
    closePaymentModal,
  } = useApp();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [memberEmails, setMemberEmails] = useState(EMPTY_GROUP_EMAILS);
  const [loadingPlan, setLoadingPlan] = useState("");
  const [error, setError] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");

  useEffect(() => {
    if (!paymentModal.open) {
      return;
    }

    setSelectedPlan(
      plans.find((plan) => plan.key === paymentModal.planKey) || null
    );
    setMemberEmails(EMPTY_GROUP_EMAILS);
    setError("");
  }, [paymentModal.open, paymentModal.planKey]);

  useEffect(() => {
    if (!paymentModal.open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loadingPlan) {
        closePaymentModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paymentModal.open, loadingPlan, closePaymentModal]);

  if (!paymentModal.open) {
    return null;
  }

  const beginCheckout = async (plan) => {
    if (authLoading || loadingPlan) {
      return;
    }

    if (!user) {
      const from = {
        pathname: location.pathname,
        search: location.search,
      };
      closePaymentModal();
      navigate("/auth/sign-in", { state: { from } });
      return;
    }

    const emails = memberEmails
      .map((email) => email.trim().toLowerCase());

    if (
      plan.key === "group5" &&
      (
        emails.some((email) => !email) ||
        emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
        new Set(emails).size !== 4 ||
        emails.includes(user.email?.trim().toLowerCase())
      )
    ) {
      setError(
        "Enter four valid, unique group emails that are different from your account email."
      );
      return;
    }

    try {
      setError("");
      setLoadingPlan(plan.key);

      const result = await createCheckoutSession(
        plan.key,
        plan.key === "group5" ? emails : []
      );

      if (!result.checkoutUrl) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      window.location.assign(result.checkoutUrl);
    } catch (checkoutError) {
      console.error("Could not start Stripe checkout:", checkoutError);

      if (checkoutError.status === 409) {
        setError(checkoutError.message);
      } else {
        setError(
          checkoutError.message ||
          "Unable to start checkout. Please try again."
        );
      }
    } finally {
      setLoadingPlan("");
    }
  };

  const selectPlan = (plan) => {
    if (plan.key === "solo") {
      beginCheckout(plan);
      return;
    }

    setError("");
    setSelectedPlan(plan);
  };

  const selectedTotal = selectedPlan
    ? selectedPlan.price * selectedPlan.quantity
    : 0;

  const sendVerificationEmail = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Please sign in again before verifying your email.");
      return;
    }

    try {
      await sendEmailVerification(currentUser);
      setVerificationMessage(
        "Verification email sent. Verify the address, then sign out and back in to claim a group seat."
      );
      setError("");
    } catch (verificationError) {
      console.error("Could not send email verification:", verificationError);
      setError(
        verificationError.message ||
        "Unable to send a verification email. Please try again."
      );
    }
  };

  return (
    <div
      className="payment-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loadingPlan) {
          closePaymentModal();
        }
      }}
    >
      <section
        className="payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        <button
          className="payment-modal-close"
          type="button"
          onClick={closePaymentModal}
          disabled={Boolean(loadingPlan)}
          aria-label="Close plans"
        >
          ×
        </button>

        <p className="payment-modal-eyebrow">WESTFORCE MEMBERSHIP</p>
        <h2 id="payment-modal-title">
          {selectedPlan?.key === "group5"
            ? "Add your group members"
            : "Unlock your career tools"}
        </h2>
        <p className="payment-modal-description">
          {paymentModal.reason ||
            "Choose a one-time plan to publish your portfolio and use all career tools."}
        </p>

        {emailVerificationRequired && (
          <div className="payment-verification-notice">
            <span>
              Group seats are linked to email addresses. Verify your account
              email before using a seat assigned to you.
            </span>
            <button
              type="button"
              onClick={sendVerificationEmail}
              disabled={Boolean(loadingPlan)}
            >
              Send verification email
            </button>
          </div>
        )}

        {verificationMessage && (
          <p className="payment-modal-success" role="status">
            {verificationMessage}
          </p>
        )}

        {!selectedPlan && (
          <div className="payment-plan-grid">
            {plans.map((plan) => (
              <article
                className={`payment-plan-card ${
                  plan.featured ? "is-featured" : ""
                }`}
                key={plan.key}
              >
                {plan.featured && (
                  <span className="payment-plan-badge">BEST VALUE</span>
                )}
                <h3>{plan.name}</h3>
                <p>{plan.subtitle}</p>
                <strong>{formatCad(plan.price)}</strong>
                <span className="payment-plan-unit">
                  {plan.key === "group5"
                    ? `per person · ${formatCad(plan.price * plan.quantity)} total`
                    : "one-time payment"}
                </span>
                <ul className="payment-plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => selectPlan(plan)}
                  disabled={Boolean(loadingPlan)}
                >
                  {loadingPlan === plan.key
                    ? "Opening Stripe..."
                    : plan.key === "solo"
                      ? "Choose Solo"
                      : "Choose Group of 5"}
                </button>
              </article>
            ))}
          </div>
        )}

        {selectedPlan?.key === "solo" && (
          <div className="payment-selected-plan">
            <div className="payment-group-total">
              <span>Solo one-time payment</span>
              <strong>{formatCad(selectedTotal)}</strong>
            </div>
            <div className="payment-modal-actions">
              <button
                type="button"
                className="payment-button-secondary"
                onClick={() => setSelectedPlan(null)}
                disabled={Boolean(loadingPlan)}
              >
                Back to plans
              </button>
              <button
                type="button"
                className="payment-button-primary"
                onClick={() => beginCheckout(selectedPlan)}
                disabled={Boolean(loadingPlan)}
              >
                {loadingPlan
                  ? "Opening Stripe..."
                  : "Continue to secure checkout"}
              </button>
            </div>
          </div>
        )}

        {selectedPlan?.key === "group5" && (
          <div className="payment-group-form">
            <div className="payment-group-buyer">
              <span>Seat 1 · Account purchasing</span>
              <strong>{user?.email || "Your signed-in account"}</strong>
            </div>

            <p>
              Add four more email addresses. Each person can claim a seat by
              signing in with that email and verifying it.
            </p>

            {memberEmails.map((email, index) => (
              <label key={`member-${index}`}>
                <span>Group member {index + 2} email</span>
                <input
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(event) => {
                    const nextEmails = [...memberEmails];
                    nextEmails[index] = event.target.value;
                    setMemberEmails(nextEmails);
                  }}
                  placeholder="name@example.com"
                  disabled={Boolean(loadingPlan)}
                />
              </label>
            ))}

            <div className="payment-group-total">
              <span>One-time group total</span>
              <strong>{formatCad(selectedTotal)}</strong>
            </div>

            {error && (
              <p className="payment-modal-error" role="alert">
                {error}
              </p>
            )}

            <div className="payment-modal-actions">
              <button
                type="button"
                className="payment-button-secondary"
                onClick={() => setSelectedPlan(null)}
                disabled={Boolean(loadingPlan)}
              >
                Back to plans
              </button>
              <button
                type="button"
                className="payment-button-primary"
                onClick={() => beginCheckout(selectedPlan)}
                disabled={Boolean(loadingPlan)}
              >
                {loadingPlan
                  ? "Opening Stripe..."
                  : "Continue to secure checkout"}
              </button>
            </div>
          </div>
        )}

        {error && selectedPlan?.key !== "group5" && (
          <p className="payment-modal-error" role="alert">
            {error}
          </p>
        )}

        {!selectedPlan && (
          <p className="payment-modal-note">
            One-time payment · Secure checkout powered by Stripe
          </p>
        )}
      </section>
    </div>
  );
}
