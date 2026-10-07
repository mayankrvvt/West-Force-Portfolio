import { useNavigate } from "react-router-dom";

import { plans } from "../../constants/pricingData";
import Button from "../common/Button";
import useAuth from "../../hooks/useAuth";
import { useApp } from "../../app/providers";

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPaymentModal } = useApp();

  const handleCheckout = (plan) => {
    if (!user) {
      navigate("/auth/sign-in", {
        state: {
          from: {
            pathname: "/",
          },
          purchasePlan: plan.key,
        },
      });
      return;
    }

    openPaymentModal("Continue with your selected plan.", plan.key);
  };

  const handlePointerMove = (event) => {
    const card = event.currentTarget;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
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
        {/* Heading */}
        <div className="pricing-heading">
          <p className="eyebrow">PRICING</p>

          <h2>Simple, group-friendly pricing</h2>

          <p className="pricing-intro">
            Bring friends, family or colleagues — the more candidates you
            sign up together, the lower the per-person price.
          </p>
        </div>

        {/* Error */}
        {/* Pricing Cards */}
        <div className="pricing-grid">
          {plans.map((plan) => {
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

                    <p className="plan-subtitle">
                      {plan.subtitle}
                    </p>
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
                        plan.featured
                          ? "price-button-featured"
                          : ""
                      }`}
                    >
                      Get started
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="pricing-note">
          All prices in CAD. One-time fee — no monthly subscription.
        </p>
      </div>
    </section>
  );
}