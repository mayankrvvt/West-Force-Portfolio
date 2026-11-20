import { useRef } from "react";
import { useNavigate } from "react-router-dom";

import { plans } from "../../constants/pricingData";
import Button from "../common/Button";
import { Check } from "lucide-react";

import useRevealOnce from "./useRevealOnce";
import useAuth from "../../hooks/useAuth";
import { useApp } from "../../app/providers";
import { PAUSED_TEXT, useFeature } from "../../hooks/useSiteStatus";

/**
 * Plan cards. returnTo is where sign-in sends the visitor back to before the
 * payment modal opens. Use headingLevel={1} when this is the whole page.
 * tone="frost" gives the section the frost band (home page rhythm).
 * Cards rise in once, 60ms apart (public.css).
 */
export default function Pricing({ returnTo = "/", headingLevel = 2, tone = "white" }) {
  const gridRef = useRef(null);
  useRevealOnce(gridRef);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPaymentModal } = useApp();
  const paymentsOn = useFeature("payments");

  const Heading = headingLevel === 1 ? "h1" : "h2";
  const PlanHeading = headingLevel === 1 ? "h2" : "h3";

  const handleCheckout = (plan) => {
    if (!user) {
      navigate("/auth/sign-in", {
        state: {
          from: {
            pathname: returnTo,
          },
          purchasePlan: plan.key,
        },
      });
      return;
    }

    openPaymentModal("Continue with your selected plan.", plan.key);
  };

  return (
    <section
      id="pricing"
      className={`home-section${tone === "frost" ? " home-section-frost" : ""}`}
      aria-labelledby="pricing-title"
    >
      <div className="container">
        <div className="home-section-head">
          <p className="home-kicker">Pricing</p>

          <Heading id="pricing-title">
            One payment, lower when you join as a group
          </Heading>

          <p>
            Sign up on your own, or with four friends, family
            members or colleagues and each of you pays $300 less.
            There is no monthly fee.
          </p>
        </div>

        <div ref={gridRef} className="plan-grid">
          {plans.map((plan, index) => (
            <article
              key={plan.key}
              className={`plan${plan.featured ? " plan-featured" : ""}`}
              aria-labelledby={`plan-${plan.key}`}
              style={{ "--i": index }}
            >
              {plan.featured && (
                <span className="plan-badge">Best value</span>
              )}

              <PlanHeading id={`plan-${plan.key}`} className="plan-name">
                {plan.name}
              </PlanHeading>

              <p className="plan-subtitle">{plan.subtitle}</p>

              <p className="plan-price">
                <strong>${(plan.price * plan.quantity).toLocaleString("en-CA")}</strong>
                <span>CAD, paid once</span>
              </p>

              <p className="plan-total">
                {plan.quantity > 1
                  ? `$${plan.price} CAD per person for ${plan.quantity} people`
                  : "For one person"}
              </p>

              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check className="plan-feature-check" size={16} strokeWidth={2.5} aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant={plan.featured ? "primary" : "secondary"}
                className="plan-button"
                onClick={() => handleCheckout(plan)}
                disabled={!paymentsOn}
              >
                {paymentsOn ? `Choose ${plan.name}` : PAUSED_TEXT.payments}
              </Button>
            </article>
          ))}
        </div>

        <p className="plan-note">
          All prices in Canadian dollars. You pay once; there is no subscription.
        </p>
      </div>
    </section>
  );
}
