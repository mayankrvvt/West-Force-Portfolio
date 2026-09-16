import { useRef } from "react";
import {
  FileText,
  Video,
  BarChart3,
  Award,
} from "lucide-react";

import { portfolioFeatures } from "../../constants/siteData";

const featureIcons = [
  FileText,
  Video,
  BarChart3,
  Award,
];

export default function PortfolioFeatures() {
  const sectionRef = useRef(null);

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
    <section
      ref={sectionRef}
      id="portfolio-features"
      className="portfolio-features-section"
    >
      <div className="container">

        <div className="section-heading portfolio-features-heading">
          <p className="eyebrow">
            YOUR PORTFOLIO
          </p>

          <h2>
            Everything employers need, in one place.
          </h2>

          <p>
            Give employers a complete picture of your
            experience, skills and potential without
            sending multiple files.
          </p>
        </div>

        <div className="portfolio-features-grid">
          {portfolioFeatures.map((feature, index) => {
            const Icon = featureIcons[index];

            return (
              <article
                key={feature.title}
                className="portfolio-feature-card"
                onPointerMove={handlePointerMove}
              >
                <div
                  className="portfolio-feature-glow"
                  aria-hidden="true"
                />

                <div className="portfolio-feature-icon">
                  <Icon
                    size={25}
                    strokeWidth={2}
                  />
                </div>

                <div className="portfolio-feature-content">
                  <span className="portfolio-feature-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <h3>
                    {feature.title}
                  </h3>

                  <p>
                    {feature.description}
                  </p>
                </div>

                <span
                  className="portfolio-feature-arrow"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </article>
            );
          })}
        </div>

      </div>
    </section>
  );
}