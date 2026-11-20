import { useNavigate } from "react-router-dom";

import { plans } from "../../constants/pricingData";
import Button from "../common/Button";
import useAuth from "../../hooks/useAuth";
import { useApp } from "../../app/providers";

/**
 * Plan cards. returnTo is where sign-in sends the visitor back to before the
 * payment modal opens. Use headingLevel={1} when this is the whole page.
 */
export default function Pricing({ returnTo = "/", headingLevel = 2 }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPaymentModal } = useApp();

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
      className="home-section"
      aria-labelledby="pricing-title"
    >
      <div className="container">
        <div className="home-section-head">
          <Heading id="pricing-title">
            Simple, group-friendly pricing
          </Heading>

          <p>
            Bring friends, family or colleagues. The more
            candidates you sign up together, the lower the
            price per person.
          </p>
        </div>

        <div className="plan-grid">
          {plans.map((plan) => (
            <article
              key={plan.key}
              className={`plan${plan.featured ? " plan-featured" : ""}`}
              aria-labelledby={`plan-${plan.key}`}
            >
              <div className="plan-head">
                <PlanHeading id={`plan-${plan.key}`}>
                  {plan.name}
                </PlanHeading>

                {plan.featured && (
                  <span className="badge badge-info">
                    Lowest price per person
                  </span>
                )}
              </div>

              <p className="plan-subtitle">{plan.subtitle}</p>

              <p className="plan-price">
                <strong>${plan.price}</strong>
                <span>CAD per person</span>
              </p>

              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <Button
                type="button"
                variant={plan.featured ? "primary" : "secondary"}
                className="plan-button"
                onClick={() => handleCheckout(plan)}
              >
                Choose {plan.name}
              </Button>
            </article>
          ))}
        </div>

        <p className="plan-note">
          All prices in CAD. One-time fee, no monthly subscription.
        </p>
      </div>
    </section>
  );
}
