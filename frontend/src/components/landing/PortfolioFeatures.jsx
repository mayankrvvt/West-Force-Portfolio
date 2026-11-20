import { FileText, Video, BarChart3, Award } from "lucide-react";

import { portfolioFeatures } from "../../constants/siteData";

const featureIcons = [FileText, Video, BarChart3, Award];

export default function PortfolioFeatures() {
  return (
    <section
      id="portfolio"
      className="home-section home-section-frost"
      aria-labelledby="portfolio-title"
    >
      <div className="container">
        <div className="home-section-head">
          <h2 id="portfolio-title">
            What employers see when they open your link
          </h2>

          <p>
            Give employers a complete picture of your
            experience, skills and potential without
            sending multiple files.
          </p>
        </div>

        <ul className="feature-list">
          {portfolioFeatures.map((feature, index) => {
            const Icon = featureIcons[index];

            return (
              <li key={feature.title}>
                <Icon
                  className="feature-list-icon"
                  size={22}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
