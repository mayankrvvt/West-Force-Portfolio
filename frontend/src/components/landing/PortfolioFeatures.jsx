import { useRef } from "react";
import { FileText, Video, BarChart3, Award } from "lucide-react";

import { portfolioFeatures } from "../../constants/siteData";
import useRevealOnce from "./useRevealOnce";

const featureIcons = {
  document: FileText,
  video: Video,
  chart: BarChart3,
  certificate: Award,
};

// Cards rise 12px and fade in, 60ms apart, once (public.css).
export default function PortfolioFeatures() {
  const listRef = useRef(null);
  useRevealOnce(listRef);

  return (
    <section
      id="portfolio"
      className="home-section home-section-frost"
      aria-labelledby="portfolio-title"
    >
      <div className="container">
        <div className="home-section-head">
          <p className="home-kicker">Your portfolio</p>

          <h2 id="portfolio-title">
            The four things employers ask for, in one place
          </h2>

          <p>
            Stop attaching the same files to every application. Each part
            of your portfolio has its own section, and you can update it
            whenever something changes.
          </p>
        </div>

        <ul ref={listRef} className="feature-list">
          {portfolioFeatures.map((feature, index) => {
            const Icon = featureIcons[feature.icon];

            return (
              <li key={feature.title} style={{ "--i": index }}>
                <span className="feature-list-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-list-detail">{feature.detail}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
