import { Link } from "react-router-dom";
import { plans } from "../../constants/pricingData";
import Button from "../common/Button";

export default function Pricing() {
  return (
    <section id="pricing" className="pricing-section">
      <div className="container">

        {/* Heading */}
        <div className="pricing-heading">
          <p className="eyebrow">PRICING</p>

          <h2>
            Simple, group-friendly pricing
          </h2>

          <p className="pricing-intro">
            Bring friends, family or colleagues — the more candidates you
            sign up together, the lower the per-person price.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article
                className={`price-card ${plan.featured ? "featured" : ""}`}
                onPointerMove={handlePointerMove}
            >
              {plan.featured && (
                <span className="popular">
                  Most popular
                </span>
              )}

              <div className="price-card-content">

                <div className="price-card-header">
                  <h3>{plan.name}</h3>

                  <p className="plan-subtitle">
                    {plan.subtitle}
                  </p>
                </div>

                <div className="price">
                  <strong>
                    ${plan.price}
                  </strong>

                  <span>
                    CAD per person
                  </span>
                </div>

                <ul className="price-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <span className="feature-dot">
                        •
                      </span>

                      <span>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/auth/sign-up"
                  className="price-button-link"
                >
                  <Button
                    className={`price-button ${
                      plan.featured
                        ? "price-button-featured"
                        : ""
                    }`}
                  >
                    Get started
                  </Button>
                </Link>

              </div>
            </article>
          ))}
        </div>

        {/* Footer note */}
        <p className="pricing-note">
          All prices in CAD. One-time fee — no monthly subscription.
        </p>

      </div>
    </section>
  );
}
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