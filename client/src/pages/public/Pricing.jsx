import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { plans } from "../../constants/pricingData";
import Button from "../../components/common/Button";
import useAuth from "../../hooks/useAuth";

const STRIPE_PAYMENT_LINKS = {
  solo: "https://buy.stripe.com/test_00w5kDd6z0yv22raag3ks01",
  group5: "https://buy.stripe.com/test_bJeaEX8QjeplayX5U03ks03",
  group10: "https://buy.stripe.com/test_eVq6oH3vZgxt7mL96c3ks04",
};

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loadingPlan, setLoadingPlan] = useState("");
  const [error, setError] = useState("");

  const handleCheckout = (plan) => {
    setError("");

    // User must be logged in first
    if (!user) {
      navigate("/auth/sign-in", {
        state: {
          from: {
            pathname: "/pricing",
          },
        },
      });

      return;
    }

    const paymentLink = STRIPE_PAYMENT_LINKS[plan.key];

    if (!paymentLink) {
      setError(
        `Stripe Payment Link for ${plan.name} has not been configured yet.`
      );
      return;
    }

    setLoadingPlan(plan.key);

    // Redirect user to Stripe Checkout
    window.location.assign(paymentLink);
  };

  const handlePointerMove = (event) => {
    const card = event.currentTarget;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const rect = card.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <section id="pricing" className="pricing-section">
      <div className="container">
        <div className="pricing-heading">
          <p className="eyebrow">PRICING</p>

          <h2>Simple, group-friendly pricing</h2>

          <p className="pricing-intro">
            Bring friends, family or colleagues — the more candidates you
            sign up together, the lower the per-person price.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              margin: "0 auto 24px",
              maxWidth: "720px",
              padding: "14px 18px",
              borderRadius: "10px",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <div className="pricing-grid">
          {plans.map((plan) => {
            const isLoading = loadingPlan === plan.key;

            return (
              <article
                key={plan.key}
                className={`price-card ${plan.featured ? "featured" : ""}`}
                onPointerMove={handlePointerMove}
              >
                {plan.featured && (
                  <span className="popular">Most popular</span>
                )}

                <div className="price-card-content">
                  <div className="price-card-header">
                    <h3>{plan.name}</h3>

                    <p className="plan-subtitle">{plan.subtitle}</p>
                  </div>

                  <div className="price">
                    <strong>${plan.price}</strong>

                    <span>CAD per person</span>
                  </div>

                  <ul className="price-features">
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <span className="feature-dot">•</span>

                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="price-button-link">
                    <Button
                      type="button"
                      onClick={() => handleCheckout(plan)}
                      className={`price-button ${
                        plan.featured ? "price-button-featured" : ""
                      }`}
                    >
                      {isLoading ? "Opening checkout..." : "Get started"}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="pricing-note">
          All prices in CAD. One-time fee — no monthly subscription.
        </p>
      </div>
    </section>
  );
}